// Local Google Drive CSV export.
//
// The frontend only sends already-masked rows. This module creates a brand-new
// file with create_new(true), so it can never append to or overwrite an older
// export. The filesystem work runs in spawn_blocking, off the UI thread.

use base64::Engine as _;
use rusqlite::{params, types::ValueRef, Connection};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRow {
    sync_timestamp: String,
    transaction_id: String,
    module_type: String,
    masked_patient_id: String,
    total_amount: String,
}

fn valid_filename(filename: &str) -> bool {
    let Some(stem) = filename
        .strip_prefix("tx_")
        .and_then(|value| value.strip_suffix(".csv"))
    else {
        return false;
    };
    if stem.len() != 22 {
        return false;
    }
    let bytes = stem.as_bytes();
    if !bytes[0..8].iter().all(u8::is_ascii_digit)
        || bytes[8] != b'_'
        || !bytes[9..15].iter().all(u8::is_ascii_digit)
        || bytes[15] != b'_'
    {
        return false;
    }
    bytes[16..22].iter().all(|byte| byte.is_ascii_hexdigit())
}

fn csv_field(value: &str) -> String {
    if value.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn write_export(directory: &Path, filename: &str, rows: &[ExportRow]) -> Result<PathBuf, String> {
    if rows.is_empty() {
        return Err("No export rows were supplied.".into());
    }
    if !valid_filename(filename) {
        return Err("The export filename does not match tx_YYYYMMDD_HHMMSS_XXXXXX.csv.".into());
    }
    if !directory.exists() {
        fs::create_dir_all(directory)
            .map_err(|e| format!("Could not create the sync folder: {e}"))?;
    }
    if !directory.is_dir() {
        return Err(format!(
            "The sync path is not a directory: {}",
            directory.display()
        ));
    }

    let path = directory.join(filename);
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|e| format!("Could not create a new export file: {e}"))?;

    let write_result = (|| -> Result<(), std::io::Error> {
        writeln!(
            file,
            "Sync_Timestamp,Transaction_ID,Module_Type,Masked_Patient_ID,Total_Amount"
        )?;
        for row in rows {
            writeln!(
                file,
                "{},{},{},{},{}",
                csv_field(&row.sync_timestamp),
                csv_field(&row.transaction_id),
                csv_field(&row.module_type),
                csv_field(&row.masked_patient_id),
                csv_field(&row.total_amount)
            )?;
        }
        file.sync_all()
    })();

    if let Err(error) = write_result {
        drop(file);
        let _ = fs::remove_file(&path);
        return Err(format!("Could not finish the CSV export: {error}"));
    }
    Ok(path)
}

#[tauri::command]
pub async fn export_sync_csv(
    directory: String,
    filename: String,
    rows: Vec<ExportRow>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        write_export(Path::new(&directory), &filename, &rows)
            .map(|path| path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("The CSV export worker stopped unexpectedly: {e}"))?
}

#[derive(Clone, Debug, Serialize)]
pub struct FullExportFile {
    pub table: String,
    pub file: String,
    pub rows: u64,
    pub columns: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct FullExportResult {
    pub directory: String,
    pub exported_at: i64,
    pub files: Vec<FullExportFile>,
    pub excluded_columns: Vec<String>,
    pub skipped_tables: Vec<String>,
}

#[derive(Serialize)]
struct FullExportManifest {
    version: u8,
    exported_at: i64,
    tenant_id: String,
    files: Vec<FullExportFile>,
    excluded_columns: Vec<String>,
    skipped_tables: Vec<String>,
    note: &'static str,
}

const SENSITIVE_COLUMNS: &[(&str, &[&str])] = &[(
    "users",
    &[
        "password_hash",
        "totp_secret",
        "recovery_codes",
        "totp_last_step",
    ],
)];

fn full_csv_field(value: &str, guard_formula: bool) -> String {
    let mut value = value.to_string();
    if guard_formula && value.starts_with(['=', '+', '-', '@', '\t', '\r']) {
        value.insert(0, '\'');
    }
    if value.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value
    }
}

fn value_text(value: ValueRef<'_>) -> (String, bool) {
    match value {
        ValueRef::Null => (String::new(), false),
        ValueRef::Integer(number) => (number.to_string(), false),
        ValueRef::Real(number) => (number.to_string(), false),
        ValueRef::Text(text) => (String::from_utf8_lossy(text).to_string(), true),
        ValueRef::Blob(bytes) => (
            base64::engine::general_purpose::STANDARD.encode(bytes),
            true,
        ),
    }
}

fn valid_identifier(value: &str) -> bool {
    !value.is_empty() && value.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn quoted_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn table_exists(conn: &Connection, table: &str) -> Result<bool, String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            [table],
            |row| row.get(0),
        )
        .map_err(|e| format!("Could not inspect table {table}: {e}"))?;
    Ok(count > 0)
}

fn write_full_snapshot(
    conn: &Connection,
    directory: &Path,
    snapshot_name: &str,
    tenant_id: &str,
    tables: &[String],
) -> Result<FullExportResult, String> {
    if snapshot_name.is_empty()
        || !snapshot_name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("Invalid full-export snapshot name.".to_string());
    }
    if !directory.exists() {
        fs::create_dir_all(directory)
            .map_err(|e| format!("Could not create the export directory: {e}"))?;
    }
    if !directory.is_dir() {
        return Err(format!(
            "The sync path is not a directory: {}",
            directory.display()
        ));
    }

    let mut snapshot_dir = directory.join(snapshot_name);
    let mut suffix = 1_u32;
    while snapshot_dir.exists() {
        snapshot_dir = directory.join(format!("{snapshot_name}-{suffix}"));
        suffix += 1;
        if suffix > 1000 {
            return Err("Could not create a unique full-export snapshot directory.".to_string());
        }
    }
    fs::create_dir(&snapshot_dir)
        .map_err(|e| format!("Could not create the full-export snapshot directory: {e}"))?;

    let exported_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0);
    let mut files = Vec::new();
    let mut skipped_tables = Vec::new();
    let mut excluded_columns = Vec::new();

    let result = (|| -> Result<(), String> {
        for table in tables {
            if !valid_identifier(table) {
                return Err(format!("Invalid export table name: {table}"));
            }
            if !table_exists(conn, table)? {
                skipped_tables.push(table.clone());
                continue;
            }

            let columns_sql = format!("PRAGMA table_info({})", quoted_identifier(table));
            let mut statement = conn
                .prepare(&columns_sql)
                .map_err(|e| format!("Could not inspect columns for {table}: {e}"))?;
            let all_columns = statement
                .query_map([], |row| row.get::<_, String>(1))
                .map_err(|e| format!("Could not read columns for {table}: {e}"))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("Could not read columns for {table}: {e}"))?;
            drop(statement);

            let sensitive = SENSITIVE_COLUMNS
                .iter()
                .find(|(name, _)| *name == table)
                .map(|(_, columns)| *columns)
                .unwrap_or(&[]);
            let columns: Vec<String> = all_columns
                .into_iter()
                .filter(|column| !sensitive.contains(&column.as_str()))
                .collect();
            for column in sensitive {
                excluded_columns.push(format!("{table}.{column}"));
            }
            if columns.is_empty() {
                skipped_tables.push(table.clone());
                continue;
            }

            let has_tenant = columns.iter().any(|column| column == "tenant_id");
            let has_id = columns.iter().any(|column| column == "id");
            let select_columns = columns
                .iter()
                .map(|column| quoted_identifier(column))
                .collect::<Vec<_>>()
                .join(", ");
            let filter = if has_tenant {
                Some("WHERE \"tenant_id\" = ?1")
            } else if table == "tenants" && has_id {
                Some("WHERE \"id\" = ?1")
            } else {
                None
            };
            let sql = match filter {
                Some(filter) => format!(
                    "SELECT {select_columns} FROM {} {filter}",
                    quoted_identifier(table)
                ),
                None => format!("SELECT {select_columns} FROM {}", quoted_identifier(table)),
            };

            let path = snapshot_dir.join(format!("{table}.csv"));
            let mut file = OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&path)
                .map_err(|e| format!("Could not create {}: {e}", path.display()))?;
            let mut rows_written = 0_u64;

            writeln!(
                file,
                "{}",
                columns
                    .iter()
                    .map(|column| full_csv_field(column, false))
                    .collect::<Vec<_>>()
                    .join(",")
            )
            .map_err(|e| format!("Could not write {}: {e}", path.display()))?;

            let mut statement = conn
                .prepare(&sql)
                .map_err(|e| format!("Could not read table {table}: {e}"))?;
            let mut rows = if filter.is_some() {
                statement
                    .query(params![tenant_id])
                    .map_err(|e| format!("Could not read table {table}: {e}"))?
            } else {
                statement
                    .query([])
                    .map_err(|e| format!("Could not read table {table}: {e}"))?
            };
            while let Some(row) = rows
                .next()
                .map_err(|e| format!("Could not read a row from {table}: {e}"))?
            {
                let mut values = Vec::with_capacity(columns.len());
                for index in 0..columns.len() {
                    let value = row
                        .get_ref(index)
                        .map_err(|e| format!("Could not read {table} column {index}: {e}"))?;
                    let (text, guard_formula) = value_text(value);
                    values.push(full_csv_field(&text, guard_formula));
                }
                writeln!(file, "{}", values.join(","))
                    .map_err(|e| format!("Could not write {}: {e}", path.display()))?;
                rows_written += 1;
            }
            drop(rows);
            drop(statement);
            file.sync_all()
                .map_err(|e| format!("Could not flush {}: {e}", path.display()))?;
            files.push(FullExportFile {
                table: table.clone(),
                file: path
                    .file_name()
                    .map(|name| name.to_string_lossy().to_string())
                    .unwrap_or_else(|| format!("{table}.csv")),
                rows: rows_written,
                columns,
            });
        }

        let manifest = FullExportManifest {
            version: 1,
            exported_at,
            tenant_id: tenant_id.to_string(),
            files: files.clone(),
            excluded_columns: excluded_columns.clone(),
            skipped_tables: skipped_tables.clone(),
            note: "Full MediCore business-data snapshot. Authentication secrets and internal runtime state are excluded. Treat this folder as confidential patient data.",
        };
        let manifest_path = snapshot_dir.join("_manifest.json");
        fs::write(
            &manifest_path,
            serde_json::to_vec_pretty(&manifest)
                .map_err(|e| format!("Could not serialize full-export manifest: {e}"))?,
        )
        .map_err(|e| format!("Could not write {}: {e}", manifest_path.display()))?;
        Ok(())
    })();

    if let Err(error) = result {
        let _ = fs::remove_dir_all(&snapshot_dir);
        return Err(error);
    }

    Ok(FullExportResult {
        directory: snapshot_dir.to_string_lossy().to_string(),
        exported_at,
        files,
        excluded_columns,
        skipped_tables,
    })
}

#[tauri::command]
pub async fn export_full_snapshot(
    state: tauri::State<'_, crate::db::DbState>,
    directory: String,
    snapshot_name: String,
    tenant_id: String,
    tables: Vec<String>,
) -> Result<FullExportResult, String> {
    let handle = state.connection_handle();
    tauri::async_runtime::spawn_blocking(move || {
        let guard = handle
            .lock()
            .map_err(|_| "The local database lock is poisoned.".to_string())?;
        let conn = guard
            .as_ref()
            .ok_or_else(|| "The local database is not open.".to_string())?;
        write_full_snapshot(
            conn,
            Path::new(&directory),
            &snapshot_name,
            &tenant_id,
            &tables,
        )
    })
    .await
    .map_err(|e| format!("The full-export worker stopped unexpectedly: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row() -> ExportRow {
        ExportRow {
            sync_timestamp: "2026-11-04T12:00:00.000Z".into(),
            transaction_id: "invoice-1".into(),
            module_type: "Diagnostics".into(),
            masked_patient_id: "MASK-ABC123".into(),
            total_amount: "112.00".into(),
        }
    }

    #[test]
    fn writes_a_new_unique_csv_and_never_overwrites() {
        let dir = tempfile::tempdir().expect("temp dir");
        let first = write_export(dir.path(), "tx_20261104_120000_abcdef.csv", &[row()])
            .expect("first export");
        let contents = fs::read_to_string(&first).expect("read export");
        assert!(contents
            .contains("Sync_Timestamp,Transaction_ID,Module_Type,Masked_Patient_ID,Total_Amount"));
        assert!(contents.contains("Diagnostics"));
        assert!(contents.contains("MASK-ABC123"));

        let error = write_export(dir.path(), "tx_20261104_120000_abcdef.csv", &[row()])
            .expect_err("duplicate filename");
        assert!(error.contains("new export file"));
    }

    #[test]
    fn rejects_path_traversal_and_malformed_filenames() {
        let dir = tempfile::tempdir().expect("temp dir");
        assert!(write_export(dir.path(), "../tx_20261104_120000_abcdef.csv", &[row()]).is_err());
        assert!(write_export(dir.path(), "tx_bad.csv", &[row()]).is_err());
    }

    #[test]
    fn full_snapshot_is_tenant_scoped_and_omits_auth_secrets() {
        let conn = Connection::open_in_memory().expect("memory db");
        conn.execute_batch(
            r#"
            CREATE TABLE patients (
                id TEXT, tenant_id TEXT, name TEXT, notes TEXT, deleted INTEGER
            );
            CREATE TABLE users (
                id TEXT, tenant_id TEXT, username TEXT, password_hash TEXT,
                totp_secret TEXT, recovery_codes TEXT, totp_last_step INTEGER
            );
            CREATE TABLE tenants (id TEXT, name TEXT, deleted INTEGER);
            CREATE TABLE meta (key TEXT, value TEXT);
            INSERT INTO patients VALUES
                ('p1', 'tenant-default', '=formula patient', 'keep', 0),
                ('p2', 'other-tenant', 'Other tenant', '', 0);
            INSERT INTO users VALUES
                ('u1', 'tenant-default', 'operator', 'secret-hash', 'secret-totp',
                 'secret-recovery', 7);
            INSERT INTO tenants VALUES ('tenant-default', 'Default', 0);
            INSERT INTO meta VALUES ('schema_version', '18');
            "#,
        )
        .expect("fixture schema");

        let tables = vec![
            "patients".to_string(),
            "users".to_string(),
            "tenants".to_string(),
            "meta".to_string(),
            "missing_table".to_string(),
        ];
        let root = tempfile::tempdir().expect("temp dir");
        let result = write_full_snapshot(
            &conn,
            root.path(),
            "full-test_001",
            "tenant-default",
            &tables,
        )
        .expect("full export");

        let snapshot = PathBuf::from(&result.directory);
        let patients = fs::read_to_string(snapshot.join("patients.csv")).expect("patients csv");
        assert!(patients.contains("'=formula patient"));
        assert!(!patients.contains("Other tenant"));

        let users = fs::read_to_string(snapshot.join("users.csv")).expect("users csv");
        assert!(users.contains("operator"));
        assert!(!users.contains("secret-hash"));
        assert!(!users.contains("secret-totp"));
        assert!(!users.contains("secret-recovery"));

        assert!(snapshot.join("_manifest.json").exists());
        assert!(result.skipped_tables.contains(&"missing_table".to_string()));
        assert!(result
            .excluded_columns
            .contains(&"users.password_hash".to_string()));
    }
}
