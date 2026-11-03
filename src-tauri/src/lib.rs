use serde::Serialize;
use std::fs::{self, File};
use std::io::Write;
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
    Ok(app_data_dir(app)?.join("backups"))
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
    let backup_dir = data_dir.join("backups");
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
    fs::copy(&path, &destination)
        .map_err(|e| format!("Could not copy the database to {}: {e}", destination.display()))?;
    copy_sidecar(&path, &destination);
    Ok(destination.to_string_lossy().to_string())
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
        .setup(|app| {
            let dir = app
                .path()
                .app_config_dir()
                .map_err(|e| format!("Could not resolve app-config directory: {e}"))?;
            fs::create_dir_all(&dir)?;
            fs::create_dir_all(dir.join("backups"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            database_info,
            backup_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running MediCore");
}
