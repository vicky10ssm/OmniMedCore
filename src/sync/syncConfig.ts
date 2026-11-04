// Local Google Drive sync-folder configuration.
//
// The desktop app never sends these rows over the network. It writes a new CSV
// into a Google Drive desktop-sync folder, and Google Drive performs the upload
// independently. The path is stored locally so the app can remember it.

export const DEFAULT_GOOGLE_DRIVE_SYNC_PATH = "C:\\Users\\Public\\MedicalApp_Sync";

const SYNC_PATH_KEY = "medicore.sync.exportPath";

// Remove credentials left by the retired network sync implementation.
try {
  localStorage.removeItem("medicore.sync.endpoint");
  localStorage.removeItem("medicore.sync.token");
} catch {
  // Nothing to clean up when localStorage is unavailable.
}

function readStoredPath(): string {
  try {
    const value = (localStorage.getItem(SYNC_PATH_KEY) || "").trim();
    return value || DEFAULT_GOOGLE_DRIVE_SYNC_PATH;
  } catch {
    return DEFAULT_GOOGLE_DRIVE_SYNC_PATH;
  }
}

/**
 * Global local export path. The Rust exporter also creates the directory when
 * it is missing, so a fresh machine can use the default without setup.
 */
export let GOOGLE_DRIVE_SYNC_PATH = readStoredPath();

export function getGoogleDriveSyncPath(): string {
  return GOOGLE_DRIVE_SYNC_PATH;
}

export function setGoogleDriveSyncPath(path: string): void {
  const next = path.trim() || DEFAULT_GOOGLE_DRIVE_SYNC_PATH;
  GOOGLE_DRIVE_SYNC_PATH = next;
  try {
    localStorage.setItem(SYNC_PATH_KEY, next);
  } catch {
    // The current session still uses the in-memory path.
  }
}

export function resetGoogleDriveSyncPath(): void {
  setGoogleDriveSyncPath(DEFAULT_GOOGLE_DRIVE_SYNC_PATH);
}
