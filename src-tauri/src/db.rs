// SQLCipher-backed desktop database.
//
// The database key is generated once per Windows user, stored in Windows
// Credential Manager, and never written to a configuration file. Existing
// plaintext databases are exported into SQLCipher in place on first launch.

use base64::Engine as _;
use rusqlite::types::Value as SqlValue;
use rusqlite::{params_from_iter, Connection, OptionalExtension};
use serde::Serialize;
use serde_json::{Map, Value};
use std::fs::{self, File};
use std::io::{copy, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use zeroize::Zeroizing;

const DB_FILE_NAME: &str = "medicore.db";
const SQLITE_HEADER: &[u8] = b"SQLite format 3\0";
const KEYRING_SERVICE: &str = "in.medicore.desktop";
const KEYRING_USER: &str = "sqlcipher-database-key-v1";
const KEY_BYTES: usize = 32;

#[derive(Clone, Default)]
pub struct DbState {
    conn: Arc<Mutex<Option<Connection>>>,
}

#[derive(Serialize)]
pub struct EncryptionInfo {
    key_present: bool,
    key_backend: String,
    file_encrypted: bool,
    cipher_version: String,
    database_path: String,
}

#[derive(Debug, Serialize)]
pub struct BackupValidation {
    encrypted: bool,
    schema_version: i64,
    table_count: i64,
    integrity: String,
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("Could not resolve the MediCore application-data directory: {e}"))
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(DB_FILE_NAME))
}

fn backup_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("Backups"))
}

fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| format!("Windows Credential Manager is unavailable: {e}"))
}

fn read_key() -> Result<Option<Zeroizing<Vec<u8>>>, String> {
    match keyring_entry()?.get_password() {
        Ok(encoded) => {
            let key = hex::decode(encoded.trim()).map_err(|_| {
                "The database key in Windows Credential Manager is invalid.".to_string()
            })?;
            if key.len() != KEY_BYTES {
                return Err(
                    "The database key in Windows Credential Manager has the wrong length.".into(),
                );
            }
            Ok(Some(Zeroizing::new(key)))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!(
            "Could not read the database key from Windows Credential Manager: {e}"
        )),
    }
}

fn store_key(key: &[u8]) -> Result<(), String> {
    keyring_entry()?
        .set_password(&hex::encode(key))
        .map_err(|e| format!("Could not save the database key to Windows Credential Manager: {e}"))
}

fn ensure_key() -> Result<Zeroizing<Vec<u8>>, String> {
    if let Some(key) = read_key()? {
        return Ok(key);
    }
    let mut key = Zeroizing::new(vec![0u8; KEY_BYTES]);
    getrandom::getrandom(&mut key)
        .map_err(|e| format!("Could not generate a random database key: {e}"))?;
    store_key(&key)?;
    Ok(key)
}

fn file_has_sqlite_header(path: &Path) -> bool {
    let Ok(mut file) = File::open(path) else {
        return false;
    };
    let mut header = [0u8; 16];
    file.read_exact(&mut header).is_ok() && header == SQLITE_HEADER
}

fn file_has_bytes(path: &Path) -> bool {
    fs::metadata(path)
        .map(|meta| meta.len() > 0)
        .unwrap_or(false)
}

fn open_encrypted(path: &Path, key: &[u8], wal: bool) -> Result<Connection, String> {
    let conn = Connection::open(path)
        .map_err(|e| format!("Could not open the local SQLCipher database: {e}"))?;
    let _ = conn.busy_timeout(std::time::Duration::from_secs(5));
    let key_sql = format!("PRAGMA key = \"x'{}'\"", hex::encode(key));
    conn.execute_batch(&key_sql)
        .map_err(|e| format!("Could not apply the local database key: {e}"))?;
    let _ = conn.execute_batch("PRAGMA cipher_memory_security = ON");
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(()))
        .map_err(|e| {
            format!(
                "The SQLCipher database could not be read. The Windows Credential Manager key may not match this database. {e}"
            )
        })?;
    conn.execute_batch("PRAGMA foreign_keys = ON")
        .map_err(|e| format!("Could not enable SQLite foreign keys: {e}"))?;
    if wal {
        let _: String = conn
            .query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))
            .map_err(|e| format!("Could not enable SQLite WAL mode: {e}"))?;
    }
    Ok(conn)
}

fn escape_sql_path(path: &Path) -> String {
    path.to_string_lossy().replace('\'', "''")
}

fn export_plain_to_encrypted(
    plain_path: &Path,
    encrypted_path: &Path,
    key: &[u8],
) -> Result<(), String> {
    let plain = Connection::open(plain_path)
        .map_err(|e| format!("Could not open the plaintext database for encryption: {e}"))?;
    let _ = plain.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |_| Ok(()));
    let attach = format!(
        "ATTACH DATABASE '{}' AS encrypted KEY \"x'{}'\";",
        escape_sql_path(encrypted_path),
        hex::encode(key)
    );
    plain
        .execute_batch(&attach)
        .map_err(|e| format!("Could not create the encrypted database: {e}"))?;
    plain
        .execute_batch("SELECT sqlcipher_export('encrypted');")
        .map_err(|e| format!("Could not export the database into SQLCipher: {e}"))?;
    plain
        .execute_batch("DETACH DATABASE encrypted;")
        .map_err(|e| format!("Could not finish the SQLCipher export: {e}"))?;
    Ok(())
}

fn atomic_copy_file(source: &Path, destination: &Path) -> Result<(), String> {
    let parent = destination
        .parent()
        .ok_or_else(|| "Backup destination has no parent directory".to_string())?;
    fs::create_dir_all(parent).map_err(|e| format!("Could not create backup directory: {e}"))?;
    let mut source_file =
        File::open(source).map_err(|e| format!("Could not open {}: {e}", source.display()))?;
    let mut temp = tempfile::NamedTempFile::new_in(parent)
        .map_err(|e| format!("Could not create a temporary backup file: {e}"))?;
    copy(&mut source_file, &mut temp)
        .map_err(|e| format!("Could not copy the database snapshot: {e}"))?;
    temp.as_file()
        .sync_all()
        .map_err(|e| format!("Could not flush the database snapshot: {e}"))?;
    temp.persist(destination)
        .map_err(|e| format!("Could not finalize {}: {e}", destination.display()))?;
    Ok(())
}

fn copy_sidecar(source: &Path, destination: &Path) {
    let source_name = source
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_default();
    let destination_name = destination
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_default();
    for suffix in ["-wal", "-shm"] {
        let from = source.with_file_name(format!("{source_name}{suffix}"));
        if from.exists() {
            let _ = fs::copy(
                &from,
                destination.with_file_name(format!("{destination_name}{suffix}")),
            );
        }
    }
}

fn remove_sidecars(path: &Path) {
    let name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| DB_FILE_NAME.to_string());
    let _ = fs::remove_file(path.with_file_name(format!("{name}-wal")));
    let _ = fs::remove_file(path.with_file_name(format!("{name}-shm")));
}

fn remove_sidecars_checked(path: &Path) -> Result<(), String> {
    let name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| DB_FILE_NAME.to_string());
    for suffix in ["-wal", "-shm"] {
        let sidecar = path.with_file_name(format!("{name}{suffix}"));
        if sidecar.exists() {
            fs::remove_file(&sidecar).map_err(|e| {
                format!(
                    "Could not remove plaintext SQLite sidecar {}; refusing to finish encryption: {e}",
                    sidecar.display()
                )
            })?;
        }
    }
    Ok(())
}

fn validate_connection(conn: &Connection, encrypted: bool) -> Result<BackupValidation, String> {
    let integrity: String = conn
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|e| format!("Could not run SQLite integrity checking: {e}"))?;
    if integrity.to_ascii_lowercase() != "ok" {
        return Err("The backup failed SQLite integrity checking.".into());
    }
    let schema: String = conn
        .query_row(
            "SELECT value FROM meta WHERE key = 'schema_version'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Could not read the backup schema version: {e}"))?
        .ok_or_else(|| "The backup has no MediCore schema version.".to_string())?;
    let schema_version = schema
        .parse::<i64>()
        .map_err(|_| "The backup has an invalid MediCore schema version.".to_string())?;
    let tables: Vec<String> = {
        let mut statement = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
            .map_err(|e| format!("Could not inspect the backup tables: {e}"))?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Could not inspect the backup tables: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Could not inspect the backup tables: {e}"))?
    };
    for required in [
        "meta", "tenants", "users", "patients", "invoices", "settings",
    ] {
        if !tables.iter().any(|table| table == required) {
            return Err(format!("Backup is missing the required {required} table."));
        }
    }
    Ok(BackupValidation {
        encrypted,
        schema_version,
        table_count: tables.len() as i64,
        integrity,
    })
}

pub fn validate_backup_bytes(bytes: &[u8]) -> Result<BackupValidation, String> {
    if bytes.is_empty() {
        return Err("The selected backup is empty.".into());
    }
    let dir = tempfile::tempdir()
        .map_err(|e| format!("Could not create a backup validation directory: {e}"))?;
    let path = dir.path().join("backup.db");
    fs::write(&path, bytes)
        .map_err(|e| format!("Could not write the backup for validation: {e}"))?;

    let encrypted = !bytes.starts_with(SQLITE_HEADER);
    let conn = if encrypted {
        let key = read_key()?.ok_or_else(|| {
            "This backup is encrypted, but Windows Credential Manager has no database key."
                .to_string()
        })?;
        open_encrypted(&path, &key, false).map_err(|e| {
            format!(
                "This encrypted backup could not be opened with the key in Windows Credential Manager. It may belong to another computer or Windows user. {e}"
            )
        })?
    } else {
        Connection::open(&path).map_err(|e| format!("Could not open the plaintext backup: {e}"))?
    };
    validate_connection(&conn, encrypted)
}

fn ensure_encrypted_database(app: &tauri::AppHandle) -> Result<(), String> {
    let target = database_path(app)?;
    let data_dir = app_data_dir(app)?;
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Could not create the application-data directory: {e}"))?;

    if !file_has_bytes(&target) {
        // A missing or zero-length file is a new installation.
        if target.exists() {
            let _ = fs::remove_file(&target);
            remove_sidecars(&target);
        }
        let _ = ensure_key()?;
        return Ok(());
    }

    if !file_has_sqlite_header(&target) {
        // Already SQLCipher. A missing key must fail closed; never create a new
        // key over an encrypted database that may still contain live records.
        if read_key()?.is_none() {
            return Err(
                "ENCRYPTED_KEY_MISSING: This MediCore database is encrypted, but the database key is missing from Windows Credential Manager."
                    .into(),
            );
        }
        return Ok(());
    }

    // Existing plaintext database: generate/store a key if this is the first
    // encrypted build, then replace the plaintext file with a SQLCipher export.
    let key = ensure_key()?;
    let temp = tempfile::Builder::new()
        .prefix(".medicore-encrypting-")
        .suffix(".db")
        .tempfile_in(&data_dir)
        .map_err(|e| format!("Could not create a temporary encrypted database: {e}"))?;
    let temp_path = temp.into_temp_path();
    let _ = fs::remove_file(&temp_path);

    export_plain_to_encrypted(&target, &temp_path, &key)?;
    remove_sidecars_checked(&target)?;
    {
        let conn = open_encrypted(&temp_path, &key, false)?;
        let validation = validate_connection(&conn, true)?;
        if validation.schema_version < 1 {
            return Err("The database encryption check produced an invalid schema version.".into());
        }
    }

    let dir = backup_dir(app)?;
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create the backup directory: {e}"))?;
    let safety = dir.join(format!("pre-encryption-{}.db", timestamp()));
    atomic_copy_file(&temp_path, &safety)?;

    temp_path.persist(&target).map_err(|e| {
        format!("Could not replace the plaintext database with its encrypted copy: {e}")
    })?;
    remove_sidecars_checked(&target)?;
    Ok(())
}

#[tauri::command]
pub fn db_open(app: tauri::AppHandle, state: tauri::State<'_, DbState>) -> Result<(), String> {
    let mut guard = state
        .conn
        .lock()
        .map_err(|_| "The local database lock is poisoned.".to_string())?;
    if guard.is_some() {
        return Ok(());
    }
    ensure_encrypted_database(&app)?;
    let key =
        read_key()?.ok_or_else(|| "Windows Credential Manager has no database key.".to_string())?;
    let path = database_path(&app)?;
    let conn = open_encrypted(&path, &key, true)?;
    *guard = Some(conn);
    Ok(())
}

#[tauri::command]
pub fn db_close(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let mut guard = state
        .conn
        .lock()
        .map_err(|_| "The local database lock is poisoned.".to_string())?;
    if let Some(conn) = guard.take() {
        let _ = conn.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |_| Ok(()));
        conn.close()
            .map_err(|(_, e)| format!("Could not close the local SQLCipher database: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn db_checkpoint(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let guard = state
        .conn
        .lock()
        .map_err(|_| "The local database lock is poisoned.".to_string())?;
    let conn = guard
        .as_ref()
        .ok_or_else(|| "The local database is not open.".to_string())?;
    let _ = conn.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |_| Ok(()));
    Ok(())
}

fn to_sql_value(value: &Value) -> Result<SqlValue, String> {
    Ok(match value {
        Value::Null => SqlValue::Null,
        Value::Bool(value) => SqlValue::Integer(if *value { 1 } else { 0 }),
        Value::Number(value) => {
            if let Some(integer) = value.as_i64() {
                SqlValue::Integer(integer)
            } else {
                SqlValue::Real(
                    value
                        .as_f64()
                        .ok_or_else(|| "SQL parameter number is invalid.".to_string())?,
                )
            }
        }
        Value::String(value) => SqlValue::Text(value.clone()),
        _ => return Err("Unsupported SQL parameter type.".into()),
    })
}

fn from_sql_value(value: rusqlite::types::ValueRef<'_>) -> Value {
    use rusqlite::types::ValueRef;
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(value) => Value::Number(value.into()),
        ValueRef::Real(value) => serde_json::Number::from_f64(value)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        ValueRef::Text(bytes) => Value::String(String::from_utf8_lossy(bytes).to_string()),
        ValueRef::Blob(bytes) => {
            Value::String(base64::engine::general_purpose::STANDARD.encode(bytes))
        }
    }
}

#[tauri::command]
pub fn db_select(
    state: tauri::State<'_, DbState>,
    sql: String,
    values: Vec<Value>,
) -> Result<Vec<Value>, String> {
    let guard = state
        .conn
        .lock()
        .map_err(|_| "The local database lock is poisoned.".to_string())?;
    let conn = guard
        .as_ref()
        .ok_or_else(|| "The local database is not open.".to_string())?;
    let sql_values = values
        .iter()
        .map(to_sql_value)
        .collect::<Result<Vec<_>, _>>()?;
    let mut statement = conn
        .prepare(&sql)
        .map_err(|e| format!("Could not prepare the SQLite query: {e}"))?;
    let names = (0..statement.column_count())
        .map(|index| {
            statement
                .column_name(index)
                .map(str::to_string)
                .unwrap_or_else(|_| format!("column_{index}"))
        })
        .collect::<Vec<_>>();
    let mut rows = statement
        .query(params_from_iter(sql_values.iter()))
        .map_err(|e| format!("Could not run the SQLite query: {e}"))?;
    let mut result = Vec::new();
    while let Some(row) = rows
        .next()
        .map_err(|e| format!("Could not read the SQLite result row: {e}"))?
    {
        let mut object = Map::new();
        for (index, name) in names.iter().enumerate() {
            let value = row
                .get_ref(index)
                .map_err(|e| format!("Could not read SQLite column {name}: {e}"))?;
            object.insert(name.clone(), from_sql_value(value));
        }
        result.push(Value::Object(object));
    }
    Ok(result)
}

#[derive(Serialize)]
pub struct ExecuteResult {
    rows_affected: i64,
    last_insert_rowid: i64,
}

#[tauri::command]
pub fn db_execute(
    state: tauri::State<'_, DbState>,
    sql: String,
    values: Vec<Value>,
) -> Result<ExecuteResult, String> {
    let guard = state
        .conn
        .lock()
        .map_err(|_| "The local database lock is poisoned.".to_string())?;
    let conn = guard
        .as_ref()
        .ok_or_else(|| "The local database is not open.".to_string())?;
    let sql_values = values
        .iter()
        .map(to_sql_value)
        .collect::<Result<Vec<_>, _>>()?;
    let mut statement = conn
        .prepare(&sql)
        .map_err(|e| format!("Could not prepare the SQLite statement: {e}"))?;
    {
        let mut rows = statement
            .query(params_from_iter(sql_values.iter()))
            .map_err(|e| format!("Could not run the SQLite statement: {e}"))?;
        while rows
            .next()
            .map_err(|e| format!("Could not finish the SQLite statement: {e}"))?
            .is_some()
        {}
    }
    Ok(ExecuteResult {
        rows_affected: conn.changes() as i64,
        last_insert_rowid: conn.last_insert_rowid(),
    })
}

#[tauri::command]
pub fn db_encryption_info(
    app: tauri::AppHandle,
    state: tauri::State<'_, DbState>,
) -> Result<EncryptionInfo, String> {
    let path = database_path(&app)?;
    let key_present = read_key()?.is_some();
    let file_encrypted = file_has_bytes(&path) && !file_has_sqlite_header(&path);
    let cipher_version = {
        let guard = state
            .conn
            .lock()
            .map_err(|_| "The local database lock is poisoned.".to_string())?;
        if let Some(conn) = guard.as_ref() {
            conn.query_row("PRAGMA cipher_version", [], |row| row.get::<_, String>(0))
                .optional()
                .map_err(|e| format!("Could not read the SQLCipher version: {e}"))?
                .unwrap_or_else(|| "SQLCipher 4.20".to_string())
        } else {
            "SQLCipher 4.20".to_string()
        }
    };
    Ok(EncryptionInfo {
        key_present,
        key_backend: "Windows Credential Manager".to_string(),
        file_encrypted,
        cipher_version,
        database_path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn validate_backup(bytes_base64: String) -> Result<BackupValidation, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(bytes_base64.as_bytes())
        .map_err(|e| format!("Backup payload is not valid base64: {e}"))?;
    validate_backup_bytes(&bytes)
}

#[tauri::command]
pub fn restore_database(
    app: tauri::AppHandle,
    state: tauri::State<'_, DbState>,
    bytes_base64: String,
) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(bytes_base64.as_bytes())
        .map_err(|e| format!("Backup payload is not valid base64: {e}"))?;
    let validation = validate_backup_bytes(&bytes)?;
    let key =
        read_key()?.ok_or_else(|| "Windows Credential Manager has no database key.".to_string())?;

    let target = database_path(&app)?;
    let data_dir = app_data_dir(&app)?;
    let safety_dir = backup_dir(&app)?;
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Could not create the application-data directory: {e}"))?;

    {
        let guard = state
            .conn
            .lock()
            .map_err(|_| "The local database lock is poisoned.".to_string())?;
        if guard.is_some() {
            return Err("Close the local database before restoring it.".into());
        }
    }

    if target.exists() {
        fs::create_dir_all(&safety_dir)
            .map_err(|e| format!("Could not create the backup directory: {e}"))?;
        let safety = safety_dir.join(format!("pre-restore-{}.db", timestamp()));
        atomic_copy_file(&target, &safety)?;
        copy_sidecar(&target, &safety);
    }

    let encrypted_bytes = if validation.encrypted {
        bytes
    } else {
        let plain = tempfile::Builder::new()
            .prefix(".medicore-restore-plain-")
            .suffix(".db")
            .tempfile_in(&data_dir)
            .map_err(|e| format!("Could not create a temporary restore file: {e}"))?;
        plain
            .as_file()
            .write_all(&bytes)
            .map_err(|e| format!("Could not write the restore file: {e}"))?;
        plain
            .as_file()
            .sync_all()
            .map_err(|e| format!("Could not flush the restore file: {e}"))?;
        let plain_path = plain.into_temp_path();
        let encrypted = tempfile::Builder::new()
            .prefix(".medicore-restore-encrypted-")
            .suffix(".db")
            .tempfile_in(&data_dir)
            .map_err(|e| format!("Could not create a temporary encrypted restore file: {e}"))?;
        let encrypted_path = encrypted.into_temp_path();
        let _ = fs::remove_file(&encrypted_path);
        export_plain_to_encrypted(&plain_path, &encrypted_path, &key)?;
        let conn = open_encrypted(&encrypted_path, &key, false)?;
        validate_connection(&conn, true)?;
        drop(conn);
        fs::read(&encrypted_path)
            .map_err(|e| format!("Could not read the encrypted restore file: {e}"))?
    };

    let mut temp = tempfile::NamedTempFile::new_in(&data_dir)
        .map_err(|e| format!("Could not create a temporary restore file: {e}"))?;
    temp.write_all(&encrypted_bytes)
        .map_err(|e| format!("Could not write the restore file: {e}"))?;
    temp.as_file()
        .sync_all()
        .map_err(|e| format!("Could not flush the restore file: {e}"))?;
    temp.persist(&target)
        .map_err(|e| format!("Could not replace the active database: {e}"))?;
    remove_sidecars(&target);
    Ok(target.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sqlcipher_round_trip_and_plain_export() {
        let dir = tempfile::tempdir().expect("temp dir");
        let plain = dir.path().join("plain.db");
        let encrypted = dir.path().join("encrypted.db");
        let key = vec![7u8; KEY_BYTES];
        {
            let conn = Connection::open(&plain).expect("plain db");
            conn.execute_batch("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL); INSERT INTO meta VALUES ('schema_version','17');")
                .expect("plain schema");
        }
        export_plain_to_encrypted(&plain, &encrypted, &key).expect("export");
        assert!(!file_has_sqlite_header(&encrypted));
        let conn = open_encrypted(&encrypted, &key, false).expect("open encrypted");
        let value: String = conn
            .query_row(
                "SELECT value FROM meta WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            )
            .expect("read encrypted");
        assert_eq!(value, "17");
    }

    #[test]
    fn validation_rejects_missing_core_tables() {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = dir.path().join("backup.db");
        {
            let conn = Connection::open(&path).expect("backup db");
            conn.execute_batch("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL); INSERT INTO meta VALUES ('schema_version','17');")
                .expect("backup schema");
        }
        let bytes = fs::read(&path).expect("read backup");
        let error = validate_backup_bytes(&bytes).expect_err("missing tables");
        assert!(error.contains("required"));
    }
}
