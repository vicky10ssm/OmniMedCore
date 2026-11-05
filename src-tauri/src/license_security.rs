// Native security primitives for OmniMed Core's offline licence.
//
// Three layers live here because all three need the operating system:
//   1. A stable machine fingerprint derived from immutable hardware identifiers.
//   2. DPAPI-protected licence storage (never plain JSON / browser localStorage).
//   3. A DPAPI-protected monotonic execution-time high-water mark.
//
// The signed licence remains the root of trust. These primitives protect the
// device binding and the local copy of that signed payload; they never replace
// signature verification in the frontend.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::ptr;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::Manager;
use zeroize::Zeroize;

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
use windows_sys::Win32::Foundation::{LocalFree, HLOCAL};
#[cfg(windows)]
use windows_sys::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
};

const LICENSE_FILE_NAME: &str = "license.dpapi";
const TIME_STATE_FILE_NAME: &str = "license-state.dpapi";
const DPAPI_ENTROPY: &[u8] = b"MediCore.License.DPAPI.v1";
const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const WMI_QUERY_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Debug, Serialize)]
pub struct MachineIdentity {
    pub fingerprint: String,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExecutionState {
    version: u8,
    last_known_execution_time: i64,
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Could not resolve the OmniMed Core application-data directory: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create the application-data directory: {e}"))?;
    Ok(dir)
}

fn license_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(LICENSE_FILE_NAME))
}

fn time_state_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(TIME_STATE_FILE_NAME))
}

fn system_time_ms() -> Result<i64, String> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "System clock is before the Unix epoch.".to_string())?
        .as_millis();
    i64::try_from(millis).map_err(|_| "System clock value is out of range.".to_string())
}

/// Atomic write so a crash cannot leave a half-written protected blob.
fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Protected licence path has no parent directory.".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|e| format!("Could not create the protected-licence directory: {e}"))?;
    let mut temp = tempfile::NamedTempFile::new_in(parent)
        .map_err(|e| format!("Could not create a temporary protected-licence file: {e}"))?;
    temp.write_all(bytes)
        .map_err(|e| format!("Could not write the protected licence: {e}"))?;
    temp.as_file()
        .sync_all()
        .map_err(|e| format!("Could not flush the protected licence: {e}"))?;
    temp.persist(path)
        .map_err(|e| format!("Could not finalize the protected licence: {e}"))?;
    Ok(())
}

#[cfg(windows)]
fn dpapi_error(context: &str) -> String {
    let code = std::io::Error::last_os_error()
        .raw_os_error()
        .unwrap_or_default();
    format!("{context} (Windows error {code}).")
}

/// Protect with current-user DPAPI scope. Omitting CRYPTPROTECT_LOCAL_MACHINE
/// binds the blob to this Windows account and machine, not to every user on the
/// terminal.
#[cfg(windows)]
fn dpapi_protect(clear: &[u8]) -> Result<Vec<u8>, String> {
    let mut input = clear.to_vec();
    let mut input_blob = CRYPT_INTEGER_BLOB {
        cbData: u32::try_from(input.len())
            .map_err(|_| "Licence payload is too large for DPAPI.".to_string())?,
        pbData: input.as_mut_ptr(),
    };
    let mut entropy = DPAPI_ENTROPY.to_vec();
    let mut entropy_blob = CRYPT_INTEGER_BLOB {
        cbData: u32::try_from(entropy.len()).unwrap_or(0),
        pbData: entropy.as_mut_ptr(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();

    let ok = unsafe {
        CryptProtectData(
            &mut input_blob,
            ptr::null(),
            &mut entropy_blob,
            ptr::null(),
            ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    input.zeroize();
    entropy.zeroize();
    if ok == 0 {
        return Err(dpapi_error("Windows DPAPI encryption failed"));
    }

    let protected = unsafe {
        if output.pbData.is_null() || output.cbData == 0 {
            Vec::new()
        } else {
            std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec()
        }
    };
    unsafe {
        if !output.pbData.is_null() {
            LocalFree(output.pbData as HLOCAL);
        }
    }
    if protected.is_empty() {
        return Err("Windows DPAPI returned an empty protected blob.".to_string());
    }
    Ok(protected)
}

#[cfg(windows)]
fn dpapi_unprotect(protected: &[u8]) -> Result<Vec<u8>, String> {
    if protected.is_empty() {
        return Err("The protected licence file is empty.".to_string());
    }
    let mut input = protected.to_vec();
    let mut input_blob = CRYPT_INTEGER_BLOB {
        cbData: u32::try_from(input.len())
            .map_err(|_| "Protected licence is too large.".to_string())?,
        pbData: input.as_mut_ptr(),
    };
    let mut entropy = DPAPI_ENTROPY.to_vec();
    let mut entropy_blob = CRYPT_INTEGER_BLOB {
        cbData: u32::try_from(entropy.len()).unwrap_or(0),
        pbData: entropy.as_mut_ptr(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    let mut description: *mut u16 = ptr::null_mut();

    let ok = unsafe {
        CryptUnprotectData(
            &mut input_blob,
            &mut description,
            &mut entropy_blob,
            ptr::null(),
            ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    entropy.zeroize();
    unsafe {
        if !description.is_null() {
            LocalFree(description as HLOCAL);
        }
    }
    if ok == 0 {
        return Err(dpapi_error(
            "The protected licence could not be decrypted on this Windows account/machine",
        ));
    }

    let clear = unsafe {
        if output.pbData.is_null() || output.cbData == 0 {
            Vec::new()
        } else {
            std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec()
        }
    };
    unsafe {
        if !output.pbData.is_null() {
            LocalFree(output.pbData as HLOCAL);
        }
    }
    if clear.is_empty() {
        return Err("Windows DPAPI returned an empty licence payload.".to_string());
    }
    Ok(clear)
}

#[cfg(not(windows))]
fn dpapi_protect(_clear: &[u8]) -> Result<Vec<u8>, String> {
    Err("DPAPI licence storage is only available on Windows.".to_string())
}

#[cfg(not(windows))]
fn dpapi_unprotect(_protected: &[u8]) -> Result<Vec<u8>, String> {
    Err("DPAPI licence storage is only available on Windows.".to_string())
}

/// Encrypt the validated licence JSON and replace the local protected copy.
#[tauri::command]
pub fn license_secure_store(app: tauri::AppHandle, payload_json: String) -> Result<(), String> {
    if payload_json.trim().is_empty() {
        return Err("Cannot store an empty licence payload.".to_string());
    }
    let protected = dpapi_protect(payload_json.as_bytes())?;
    atomic_write(&license_path(&app)?, &protected)
}

/// Decrypt the local licence copy. A blob copied from another PC fails here.
#[tauri::command]
pub fn license_secure_load(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = license_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let protected =
        fs::read(&path).map_err(|e| format!("Could not read the protected licence file: {e}"))?;
    let clear = dpapi_unprotect(&protected).map_err(|e| {
        format!("Licence storage is invalid or belongs to another Windows account/machine: {e}")
    })?;
    String::from_utf8(clear)
        .map(Some)
        .map_err(|_| "The decrypted licence is not valid UTF-8.".to_string())
}

#[tauri::command]
pub fn license_secure_clear(app: tauri::AppHandle) -> Result<(), String> {
    let path = license_path(&app)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Could not remove the protected licence file: {e}")),
    }
}

fn load_execution_state(path: &Path) -> Result<Option<ExecutionState>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let protected =
        fs::read(path).map_err(|e| format!("Could not read the execution-time state: {e}"))?;
    let clear = dpapi_unprotect(&protected).map_err(|e| {
        format!("System Clock Manipulation Detected: the execution-time state is not readable on this machine ({e}).")
    })?;
    let state: ExecutionState = serde_json::from_slice(&clear).map_err(|e| {
        format!("System Clock Manipulation Detected: invalid execution-time state ({e}).")
    })?;
    if state.version != 1 {
        return Err(
            "System Clock Manipulation Detected: unsupported execution-time state.".to_string(),
        );
    }
    Ok(Some(state))
}

fn save_execution_state(path: &Path, state: &ExecutionState) -> Result<(), String> {
    let clear = serde_json::to_vec(state)
        .map_err(|e| format!("Could not serialize execution-time state: {e}"))?;
    let protected = dpapi_protect(&clear)?;
    atomic_write(path, &protected)
}

fn advance_execution_time(now: i64, last_known: i64) -> Result<i64, String> {
    if now < last_known {
        return Err(
            "System Clock Manipulation Detected. The system clock is earlier than the last recorded OmniMed Core execution time. Correct the clock and restart OmniMed Core."
                .to_string(),
        );
    }
    Ok(now.max(last_known))
}

/// Update the monotonic high-water mark and reject a system clock rollback.
///
/// Call this at startup, before expiry evaluation, and from critical business
/// actions. A current time earlier than the stored mark immediately fails.
#[tauri::command]
pub fn license_update_execution_timestamp(app: tauri::AppHandle) -> Result<i64, String> {
    let now = system_time_ms()?;
    let path = time_state_path(&app)?;
    let current = load_execution_state(&path)?.unwrap_or(ExecutionState {
        version: 1,
        last_known_execution_time: 0,
    });
    let last_known = advance_execution_time(now, current.last_known_execution_time)?;
    let next = ExecutionState {
        version: 1,
        last_known_execution_time: last_known,
    };
    if next.last_known_execution_time != current.last_known_execution_time || !path.exists() {
        save_execution_state(&path, &next)?;
    }
    Ok(next.last_known_execution_time)
}

fn normalize_component(value: &str) -> Option<String> {
    let normalized: String = value.chars().filter(|c| !c.is_whitespace()).collect();
    if normalized.is_empty() {
        return None;
    }
    let lowered = normalized.to_ascii_lowercase();
    const PLACEHOLDERS: &[&str] = &[
        "none",
        "unknown",
        "defaultstring",
        "tobefilledbyo.e.m.",
        "tobefilledbyoem",
        "notapplicable",
        "notavailable",
        "n/a",
        "0",
        "00000000",
        "ffffffff",
    ];
    if PLACEHOLDERS
        .iter()
        .any(|placeholder| lowered == *placeholder)
    {
        None
    } else {
        Some(normalized)
    }
}

fn fingerprint_from_components(
    board: Option<String>,
    cpu: Option<String>,
) -> Option<(String, String)> {
    let material = match (board, cpu) {
        (Some(board), Some(cpu)) => format!("{board}{cpu}"),
        _ => return None,
    };
    let mut hasher = Sha256::new();
    hasher.update(material.as_bytes());
    Some((hex::encode(hasher.finalize()), "wmi".to_string()))
}

fn volume_serial_fingerprint(serial: &str) -> Option<(String, String)> {
    let serial = normalize_component(serial)?.to_ascii_uppercase();
    let mut hasher = Sha256::new();
    hasher.update(serial.as_bytes());
    Some((hex::encode(hasher.finalize()), "volume-serial".to_string()))
}

fn run_with_timeout(
    mut command: Command,
    timeout: Duration,
) -> Result<std::process::Output, String> {
    let mut child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Could not start native system query: {e}"))?;
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if started.elapsed() < timeout => thread::sleep(Duration::from_millis(50)),
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Native system query timed out.".to_string());
            }
            Err(e) => {
                let _ = child.kill();
                return Err(format!("Native system query failed: {e}"));
            }
        }
    }
    child
        .wait_with_output()
        .map_err(|e| format!("Could not read native system query output: {e}"))
}

fn powershell_ids() -> Result<(Option<String>, Option<String>, Option<String>), String> {
    let script = concat!(
        "$ErrorActionPreference='SilentlyContinue';",
        "$b=(Get-CimInstance Win32_BaseBoard | Select-Object -First 1 -ExpandProperty SerialNumber);",
        "$c=(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty ProcessorId);",
        "$d=(Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='$env:SystemDrive'\" | Select-Object -First 1 -ExpandProperty VolumeSerialNumber);",
        "[pscustomobject]@{b=[string]$b;c=[string]$c;d=[string]$d} | ConvertTo-Json -Compress"
    );
    let mut command = Command::new("powershell.exe");
    command.args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ]);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let output = run_with_timeout(command, WMI_QUERY_TIMEOUT)?;
    if !output.status.success() {
        return Err("Windows WMI/CIM query did not complete.".to_string());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let value: serde_json::Value = serde_json::from_str(text.trim())
        .map_err(|e| format!("Could not parse Windows WMI/CIM output: {e}"))?;
    let field = |name: &str| {
        value
            .get(name)
            .and_then(|v| v.as_str())
            .and_then(normalize_component)
    };
    Ok((field("b"), field("c"), field("d")))
}

#[cfg(windows)]
fn primary_volume_serial() -> Option<String> {
    use windows_sys::Win32::Storage::FileSystem::GetVolumeInformationW;

    let drive = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string());
    let root = format!("{drive}\\");
    let mut root_wide: Vec<u16> = root.encode_utf16().collect();
    root_wide.push(0);
    let mut serial: u32 = 0;
    let ok = unsafe {
        GetVolumeInformationW(
            root_wide.as_ptr(),
            ptr::null_mut(),
            0,
            &mut serial,
            ptr::null_mut(),
            ptr::null_mut(),
            ptr::null_mut(),
            0,
        )
    };
    if ok == 0 || serial == 0 {
        None
    } else {
        normalize_component(&format!("{serial:08X}"))
    }
}

#[cfg(not(windows))]
fn primary_volume_serial() -> Option<String> {
    None
}

fn machine_identity() -> Result<MachineIdentity, String> {
    let (board, cpu, disk) = powershell_ids().unwrap_or((None, None, None));
    if let Some((fingerprint, source)) = fingerprint_from_components(
        board.and_then(|v| normalize_component(&v)),
        cpu.and_then(|v| normalize_component(&v)),
    ) {
        return Ok(MachineIdentity {
            fingerprint,
            source,
        });
    }

    let serial = disk.or_else(primary_volume_serial);
    if let Some(serial) = serial {
        if let Some((fingerprint, source)) = volume_serial_fingerprint(&serial) {
            return Ok(MachineIdentity {
                fingerprint,
                source,
            });
        }
    }

    Err(
        "OmniMed Core could not read a stable hardware identifier. WMI may be restricted and the primary drive serial is unavailable."
            .to_string(),
    )
}

/// Query motherboard serial + CPU Processor ID and SHA-256 the whitespace-free
/// concatenation. Falls back to the primary volume serial when WMI is blocked.
#[tauri::command]
pub fn get_machine_fingerprint() -> Result<MachineIdentity, String> {
    machine_identity()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalization_strips_whitespace_and_placeholders() {
        assert_eq!(
            normalize_component("  ABC 123 \t").as_deref(),
            Some("ABC123")
        );
        assert_eq!(normalize_component("To be filled by O.E.M."), None);
        assert_eq!(normalize_component("   "), None);
    }

    #[test]
    fn fingerprint_is_stable_and_order_sensitive() {
        let first =
            fingerprint_from_components(Some("BOARD123".to_string()), Some("CPU456".to_string()))
                .expect("fingerprint");
        let second =
            fingerprint_from_components(Some("BOARD123".to_string()), Some("CPU456".to_string()))
                .expect("fingerprint");
        let different =
            fingerprint_from_components(Some("CPU456".to_string()), Some("BOARD123".to_string()))
                .expect("fingerprint");
        assert_eq!(first, second);
        assert_ne!(first.0, different.0);
        assert_eq!(first.0.len(), 64);
    }

    #[test]
    fn clock_rollback_is_rejected() {
        assert_eq!(advance_execution_time(200, 100).expect("forward"), 200);
        assert_eq!(advance_execution_time(100, 100).expect("equal"), 100);
        let error = advance_execution_time(99, 100).expect_err("rollback");
        assert!(error.contains("System Clock Manipulation Detected"));
    }

    #[cfg(windows)]
    #[test]
    fn execution_state_round_trip_is_dpapi_protected() {
        let root = tempfile::tempdir().expect("temp dir");
        let path = root.path().join(TIME_STATE_FILE_NAME);
        let state = ExecutionState {
            version: 1,
            last_known_execution_time: 1_700_000_000_000,
        };
        save_execution_state(&path, &state).expect("save state");
        let stored = fs::read(&path).expect("read state");
        assert_ne!(stored, serde_json::to_vec(&state).expect("json"));
        let loaded = load_execution_state(&path)
            .expect("load state")
            .expect("state");
        assert_eq!(
            loaded.last_known_execution_time,
            state.last_known_execution_time
        );
    }

    #[cfg(windows)]
    #[test]
    fn volume_serial_is_an_eight_hex_digit_fallback() {
        let serial = primary_volume_serial().expect("volume serial");
        assert_eq!(serial.len(), 8);
        assert!(serial.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    #[ignore]
    fn machine_identity_smoke() {
        let identity = machine_identity().expect("machine identity");
        assert_eq!(identity.fingerprint.len(), 64);
        eprintln!(
            "source={} fingerprint={}",
            identity.source, identity.fingerprint
        );
    }

    #[cfg(windows)]
    #[test]
    fn dpapi_round_trip_protects_payload() {
        let clear = b"{\"payload\":{\"licenseId\":\"TEST\"},\"signature\":\"test\"}";
        let protected = dpapi_protect(clear).expect("protect");
        assert_ne!(protected, clear);
        let recovered = dpapi_unprotect(&protected).expect("unprotect");
        assert_eq!(recovered, clear);
    }

    #[cfg(windows)]
    #[test]
    fn dpapi_rejects_a_tampered_blob() {
        let clear = b"{\"payload\":{\"licenseId\":\"TEST\"},\"signature\":\"test\"}";
        let mut protected = dpapi_protect(clear).expect("protect");
        let last = protected.len() - 1;
        protected[last] ^= 0x5a;
        assert!(dpapi_unprotect(&protected).is_err());
    }
}
