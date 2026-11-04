// Storage for the signed licence.
//
// The packaged Windows app (Tauri) writes a DPAPI-protected binary file in the
// app-data directory. Browser builds use a localStorage fallback only because a
// browser has no DPAPI; the desktop app never stores the raw licence JSON there.

import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../db/tauriStorage";

const LEGACY_STORAGE_KEY = "medicore.license.v1";

export function readLegacyBrowserLicense(): string | null {
  try {
    return localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearLegacyBrowserLicense(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable; the secure store is still authoritative.
  }
}

export async function loadStoredLicense(): Promise<string | null> {
  if (!isTauriRuntime()) return readLegacyBrowserLicense();
  return invoke<string | null>("license_secure_load");
}

export async function storeLicense(text: string): Promise<void> {
  if (!isTauriRuntime()) {
    localStorage.setItem(LEGACY_STORAGE_KEY, text);
    return;
  }
  await invoke("license_secure_store", { payloadJson: text });
  // Remove the old plaintext copy even if a previous version wrote one.
  clearLegacyBrowserLicense();
}

export async function clearStoredLicense(): Promise<void> {
  try {
    if (isTauriRuntime()) {
      await invoke("license_secure_clear");
    }
  } finally {
    clearLegacyBrowserLicense();
  }
}
