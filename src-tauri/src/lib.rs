use base64::Engine as _;
use serde::Serialize;
use std::fs::{self, File};
use std::io::{copy, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

const DB_FILE_NAME: &str = "medicore.db";

#[derive(Serialize)]
struct DatabaseInfo {
    data_dir: String,
    database_path: String,
    backup_dir: String,
    database_exists: bool,
    database_bytes: u64,
    writable: bool,
}

#[derive(Serialize)]
struct SnapshotResult {
    local_files: Vec<String>,
    secondary_files: Vec<String>,
    secondary_error: Option<String>,
}

/// tauri-plugin-sql resolves `sqlite:medicore.db` under the app config dir.
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
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn safe_label(label: &str) -> String {
    let value: String = label
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .take(80)
        .collect();
    if value.is_empty() {
        format!("backup-{}", timestamp())
    } else {
        value
    }
}

#[tauri::command]
fn database_info(app: tauri::AppHandle) -> Result<DatabaseInfo, String> {
    let data_dir = app_data_dir(&app)?;
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Could not create the application-data directory: {e}"))?;
    let database_path = data_dir.join(DB_FILE_NAME);
    let backup_dir = data_dir.join("Backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Could not create the backup directory: {e}"))?;

    let write_test = data_dir.join(".write-test");
    let writable = File::create(&write_test)
        .and_then(|mut f| f.write_all(b"ok"))
        .is_ok();
    let _ = fs::remove_file(&write_test);

    let database_bytes = fs::metadata(&database_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(DatabaseInfo {
        data_dir: data_dir.to_string_lossy().to_string(),
        database_path: database_path.to_string_lossy().to_string(),
        backup_dir: backup_dir.to_string_lossy().to_string(),
        database_exists: database_path.exists(),
        database_bytes,
        writable,
    })
}

fn copy_sidecar(source: &Path, destination: &Path) {
    let suffix = source
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    for sidecar in ["-wal", "-shm"] {
        let from = source.with_file_name(format!("{suffix}{sidecar}"));
        if from.exists() {
            let to = destination.with_file_name(format!(
                "{}{sidecar}",
                destination
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default()
            ));
            let _ = fs::copy(from, to);
        }
    }
}

#[tauri::command]
fn backup_database(app: tauri::AppHandle, label: String) -> Result<String, String> {
    let path = database_path(&app)?;
    if !path.exists() {
        return Err("No database file exists yet; there is nothing to back up.".into());
    }
    let dir = backup_dir(&app)?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create the backup directory: {e}"))?;
    let destination = dir.join(format!("{}-{}.db", safe_label(&label), timestamp()));
    atomic_copy_file(&path, &destination)?;
    copy_sidecar(&path, &destination);
    Ok(destination.to_string_lossy().to_string())
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

fn prune_snapshots(dir: &Path, kind: &str, keep: usize) {
    let prefix = format!("MediCore-{kind}-");
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut files: Vec<(String, PathBuf)> = entries
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            let name = path.file_name()?.to_string_lossy().to_string();
            if path.is_file() && name.starts_with(&prefix) && name.ends_with(".db") {
                Some((name, path))
            } else {
                None
            }
        })
        .collect();
    files.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, path) in files.into_iter().skip(keep) {
        let _ = fs::remove_file(&path);
        let _ = fs::remove_file(path.with_extension("db-wal"));
        let _ = fs::remove_file(path.with_extension("db-shm"));
    }
}

fn write_snapshot_set(
    source: &Path,
    dir: &Path,
    daily_label: &str,
    weekly_label: &str,
    monthly_label: &str,
) -> Result<Vec<String>, String> {
    fs::create_dir_all(dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    let categories = [
        ("daily", daily_label, 7_usize),
        ("weekly", weekly_label, 4_usize),
        ("monthly", monthly_label, 12_usize),
    ];
    let mut written = Vec::new();
    for (kind, label, keep) in categories {
        let destination = dir.join(format!("MediCore-{kind}-{}.db", safe_label(label)));
        atomic_copy_file(source, &destination)?;
        prune_snapshots(dir, kind, keep);
        written.push(destination.to_string_lossy().to_string());
    }
    Ok(written)
}

#[tauri::command]
fn create_snapshot(
    app: tauri::AppHandle,
    daily_label: String,
    weekly_label: String,
    monthly_label: String,
    secondary_dir: Option<String>,
) -> Result<SnapshotResult, String> {
    let source = database_path(&app)?;
    if !source.exists() {
        return Err("No database file exists yet; there is nothing to back up.".into());
    }

    let local = backup_dir(&app)?;
    let local_files = write_snapshot_set(
        &source,
        &local,
        &daily_label,
        &weekly_label,
        &monthly_label,
    )?;

    let mut secondary_files = Vec::new();
    let mut secondary_error = None;
    if let Some(selected) = secondary_dir.filter(|value| !value.trim().is_empty()) {
        let target = PathBuf::from(selected.trim()).join("MediCore Backups");
        match write_snapshot_set(
            &source,
            &target,
            &daily_label,
            &weekly_label,
            &monthly_label,
        ) {
            Ok(files) => secondary_files = files,
            Err(error) => secondary_error = Some(error),
        }
    }

    Ok(SnapshotResult {
        local_files,
        secondary_files,
        secondary_error,
    })
}

fn restore_database_bytes(
    target: &Path,
    data_dir: &Path,
    safety_dir: &Path,
    bytes: &[u8],
) -> Result<(), String> {
    fs::create_dir_all(data_dir)
        .map_err(|e| format!("Could not create the application-data directory: {e}"))?;

    if target.exists() {
        fs::create_dir_all(safety_dir)
            .map_err(|e| format!("Could not create the backup directory: {e}"))?;
        let safety = safety_dir.join(format!("pre-restore-{}.db", timestamp()));
        atomic_copy_file(target, &safety)?;
        copy_sidecar(target, &safety);
    }

    let mut temp = tempfile::NamedTempFile::new_in(data_dir)
        .map_err(|e| format!("Could not create a temporary restore file: {e}"))?;
    temp.write_all(bytes)
        .map_err(|e| format!("Could not write the restore file: {e}"))?;
    temp.as_file()
        .sync_all()
        .map_err(|e| format!("Could not flush the restore file: {e}"))?;
    temp.persist(target)
        .map_err(|e| format!("Could not replace the active database: {e}"))?;

    let target_name = target
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| DB_FILE_NAME.to_string());
    let _ = fs::remove_file(target.with_file_name(format!("{target_name}-wal")));
    let _ = fs::remove_file(target.with_file_name(format!("{target_name}-shm")));
    Ok(())
}

#[tauri::command]
fn restore_database(app: tauri::AppHandle, bytes_base64: String) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(bytes_base64.as_bytes())
        .map_err(|e| format!("Backup payload is not valid base64: {e}"))?;
    if !bytes.starts_with(b"SQLite format 3\0") {
        return Err("Selected file is not a SQLite database.".into());
    }

    let target = database_path(&app)?;
    restore_database_bytes(&target, &app_data_dir(&app)?, &backup_dir(&app)?, &bytes)?;
    Ok(target.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app
                .path()
                .app_config_dir()
                .map_err(|e| format!("Could not resolve app-config directory: {e}"))?;
            fs::create_dir_all(&dir)?;
            fs::create_dir_all(dir.join("Backups"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            database_info,
            backup_database,
            create_snapshot,
            restore_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running MediCore");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_retention_keeps_daily_weekly_monthly_sets() {
        let root = tempfile::tempdir().expect("temp dir");
        let source = root.path().join("source.db");
        fs::write(&source, b"SQLite format 3\0test").expect("source file");

        let dir = root.path().join("Backups");
        fs::create_dir_all(&dir).expect("backup dir");
        fs::write(dir.join("pre-migration-v16-1.db"), b"keep me").expect("pre-migration file");

        for i in 1..=15 {
            write_snapshot_set(
                &source,
                &dir,
                &format!("2026-11-{i:02}"),
                &format!("2026-W{i:02}"),
                &format!("2026-{i:02}"),
            )
            .expect("snapshot set");
        }

        let count = |kind: &str| {
            fs::read_dir(&dir)
                .expect("read backups")
                .filter_map(Result::ok)
                .filter(|entry| {
                    let name = entry.file_name().to_string_lossy().to_string();
                    name.starts_with(&format!("MediCore-{kind}-")) && name.ends_with(".db")
                })
                .count()
        };

        assert_eq!(count("daily"), 7);
        assert_eq!(count("weekly"), 4);
        assert_eq!(count("monthly"), 12);
        assert!(dir.join("pre-migration-v16-1.db").exists());
    }

    #[test]
    fn restore_replaces_database_and_keeps_pre_restore_copy() {
        let root = tempfile::tempdir().expect("temp dir");
        let data_dir = root.path().join("data");
        let safety_dir = root.path().join("Backups");
        fs::create_dir_all(&data_dir).expect("data dir");

        let target = data_dir.join("medicore.db");
        fs::write(&target, b"old database").expect("old database");
        fs::write(data_dir.join("medicore.db-wal"), b"old wal").expect("old wal");
        fs::write(data_dir.join("medicore.db-shm"), b"old shm").expect("old shm");

        restore_database_bytes(
            &target,
            &data_dir,
            &safety_dir,
            b"SQLite format 3\0new database",
        )
        .expect("restore");

        assert_eq!(fs::read(&target).expect("restored file"), b"SQLite format 3\0new database");
        assert!(!data_dir.join("medicore.db-wal").exists());
        assert!(!data_dir.join("medicore.db-shm").exists());

        let safety_files: Vec<PathBuf> = fs::read_dir(&safety_dir)
            .expect("safety dir")
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .map(|name| {
                        let name = name.to_string_lossy();
                        name.starts_with("pre-restore-") && name.ends_with(".db")
                    })
                    .unwrap_or(false)
            })
            .collect();
        assert_eq!(safety_files.len(), 1);
        assert_eq!(
            fs::read(&safety_files[0]).expect("safety file"),
            b"old database"
        );
    }
}
