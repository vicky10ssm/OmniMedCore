// Full Google Drive data snapshot.
//
// Unlike the transaction outbox (five-column summaries), this writes one CSV
// per database table so every business module, including patients, is present
// in Google Drive. Authentication secrets and internal runtime state are still
// excluded; see the Rust exporter's manifest.

import { invoke } from "@tauri-apps/api/core";
import { TENANT_TABLES } from "../db/tenant";
import { getCurrentTenantId } from "../db/tenant";
import { isTauriRuntime } from "../db/tauriStorage";
import { getGoogleDriveSyncPath } from "./syncConfig";

export const FULL_EXPORT_ALL_TABLES: string[] = [
  ...TENANT_TABLES,
  "tenants",
  "meta",
];

export interface FullExportFile {
  table: string;
  file: string;
  rows: number;
  columns: string[];
}

export interface FullExportResult {
  directory: string;
  exported_at: number;
  files: FullExportFile[];
  excluded_columns: string[];
  skipped_tables: string[];
}

export interface FullExportStatus {
  phase: "idle" | "exporting" | "error";
  lastPath: string;
  lastAt: number | null;
  lastError: string;
}

const LAST_PATH_KEY = "medicore.fullExport.lastPath";
const LAST_AT_KEY = "medicore.fullExport.lastAt";
const LAST_DAY_KEY = "medicore.fullExport.lastDate";
const EVENT = "medicore:full-export-status";
const CHECK_INTERVAL_MS = 5 * 60_000;

let running = false;
let started = false;
let current: FullExportStatus = readStatus();

function readNumber(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key) || 0);
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

function readString(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function readStatus(): FullExportStatus {
  return {
    phase: "idle",
    lastPath: readString(LAST_PATH_KEY),
    lastAt: readNumber(LAST_AT_KEY),
    lastError: "",
  };
}

function localDateKey(date = new Date()): string {
  const two = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function snapshotName(date = new Date()): string {
  const two = (value: number) => String(value).padStart(2, "0");
  const stamp =
    `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}_` +
    `${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
  const random = new Uint8Array(3);
  crypto.getRandomValues(random);
  const suffix = Array.from(random)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `snapshot_${stamp}_${suffix}`;
}

function fullExportParent(): string {
  const base = getGoogleDriveSyncPath().trim().replace(/[\\/]+$/, "");
  return `${base}\\full-export`;
}

function emit(next: FullExportStatus): void {
  current = next;
  try {
    if (next.lastPath) localStorage.setItem(LAST_PATH_KEY, next.lastPath);
    if (next.lastAt) localStorage.setItem(LAST_AT_KEY, String(next.lastAt));
  } catch {
    // Best effort only.
  }
  window.dispatchEvent(new CustomEvent<FullExportStatus>(EVENT, { detail: next }));
}

export function getFullExportStatus(): FullExportStatus {
  return { ...current };
}

export function subscribeFullExportStatus(
  listener: (status: FullExportStatus) => void
): () => void {
  const handler = (event: Event) =>
    listener((event as CustomEvent<FullExportStatus>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export async function exportFullSnapshotNow(): Promise<FullExportResult> {
  if (!isTauriRuntime()) {
    throw new Error("Full data export requires the packaged desktop app.");
  }
  if (running) {
    throw new Error("A full data export is already running.");
  }
  running = true;
  emit({ ...current, phase: "exporting", lastError: "" });
  try {
    const result = await invoke<FullExportResult>("export_full_snapshot", {
      directory: fullExportParent(),
      snapshotName: snapshotName(),
      tenantId: getCurrentTenantId(),
      tables: FULL_EXPORT_ALL_TABLES,
    });
    const at = Date.now();
    try {
      localStorage.setItem(LAST_DAY_KEY, localDateKey());
    } catch {
      // The export itself succeeded; only the daily marker is best-effort.
    }
    emit({
      phase: "idle",
      lastPath: result.directory,
      lastAt: at,
      lastError: "",
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit({ ...current, phase: "error", lastError: message });
    throw error;
  } finally {
    running = false;
  }
}

async function runIfDue(): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    if (localStorage.getItem(LAST_DAY_KEY) === localDateKey()) return;
  } catch {
    // If localStorage is unavailable, still attempt the export.
  }
  try {
    await exportFullSnapshotNow();
  } catch (error) {
    console.warn("Full Google Drive snapshot failed; it will retry later.", error);
  }
}

/** Runs one full business-data snapshot per day while the desktop app is open. */
export function startFullExportScheduler(): void {
  if (!isTauriRuntime() || started) return;
  started = true;
  current = readStatus();
  emit(current);
  // Let the database unlock and the first render settle.
  window.setTimeout(() => void runIfDue(), 15_000);
  window.setInterval(() => void runIfDue(), CHECK_INTERVAL_MS);
}
