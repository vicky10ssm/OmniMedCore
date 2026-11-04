// Local Google Drive CSV export.
//
// The frontend only sends already-masked rows. This module creates a brand-new
// file with create_new(true), so it can never append to or overwrite an older
// export. The filesystem work runs in spawn_blocking, off the UI thread.

use serde::Deserialize;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

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
    bytes[16..22]
        .iter()
        .all(|byte| byte.is_ascii_hexdigit())
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
        return Err(format!("The sync path is not a directory: {}", directory.display()));
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
        let first = write_export(
            dir.path(),
            "tx_20261104_120000_abcdef.csv",
            &[row()],
        )
        .expect("first export");
        let contents = fs::read_to_string(&first).expect("read export");
        assert!(contents.contains("Sync_Timestamp,Transaction_ID,Module_Type,Masked_Patient_ID,Total_Amount"));
        assert!(contents.contains("Diagnostics"));
        assert!(contents.contains("MASK-ABC123"));

        let error = write_export(
            dir.path(),
            "tx_20261104_120000_abcdef.csv",
            &[row()],
        )
        .expect_err("duplicate filename");
        assert!(error.contains("new export file"));
    }

    #[test]
    fn rejects_path_traversal_and_malformed_filenames() {
        let dir = tempfile::tempdir().expect("temp dir");
        assert!(write_export(dir.path(), "../tx_20261104_120000_abcdef.csv", &[row()]).is_err());
        assert!(write_export(dir.path(), "tx_bad.csv", &[row()]).is_err());
    }
}
