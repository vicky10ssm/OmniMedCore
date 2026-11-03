// Daily local snapshots and restore helpers for the Tauri desktop build.
//
// The scheduler only runs while the desktop app is open. Snapshots are copied
// with SQLite checkpointing first; retention is enforced by the Rust side.

import { invoke } from "@tauri-apps/api/core";
import { getDb } from "../db";
import { isTauriRuntime } from "../db/tauriStorage";

export interface SnapshotResult {
  localFiles: string[];
  secondaryFiles: string[];
  secondaryError: string | null;
}

export type BackupPhase = "idle" | "backing-up" | "error";

export interface BackupStatus {
  phase: BackupPhase;
  lastBackupAt: number | null;
  lastDate: string;
  localFiles: string[];
  secondaryFiles: string[];
  secondaryError: string | null;
  error: string;
}

const SECONDARY_KEY = "medicore.backup.secondaryDir";
const LAST_DATE_KEY = "medicore.backup.lastDate";
const LAST_AT_KEY = "medicore.backup.lastAt";
const STATUS_EVENT = "medicore:backup-status";

let status: BackupStatus = {
  phase: "idle",
  lastBackupAt: readNumber(LAST_AT_KEY),
  lastDate: localStorage.getItem(LAST_DATE_KEY) || "",
  localFiles: [],
  secondaryFiles: [],
  secondaryError: null,
  error: "",
};
let running = false;
let started = false;

function readNumber(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key) || 0);
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

function two(value: number): string {
  return String(value).padStart(2, "0");
}

function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function isoWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${two(week)}`;
}

export function getSecondaryBackupDir(): string {
  try {
    return localStorage.getItem(SECONDARY_KEY) || "";
  } catch {
    return "";
  }
}

export function setSecondaryBackupDir(path: string): void {
  if (path.trim()) localStorage.setItem(SECONDARY_KEY, path.trim());
  else localStorage.removeItem(SECONDARY_KEY);
  emit({ ...status });
}

export function getBackupStatus(): BackupStatus {
  return { ...status };
}

export function subscribeBackupStatus(listener: (next: BackupStatus) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<BackupStatus>).detail);
  window.addEventListener(STATUS_EVENT, handler);
  return () => window.removeEventListener(STATUS_EVENT, handler);
}

function emit(next: BackupStatus): void {
  status = next;
  window.dispatchEvent(new CustomEvent<BackupStatus>(STATUS_EVENT, { detail: next }));
}

export async function createSnapshotNow(): Promise<SnapshotResult> {
  if (!isTauriRuntime()) {
    throw new Error("Backup snapshots require the desktop app.");
  }
  if (running) throw new Error("A backup is already running.");
  running = true;
  emit({ ...status, phase: "backing-up", error: "" });
  try {
    const db = await getDb();
    await db.flush();
    try {
      await db.run("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
      // Full checkpoint is best-effort; the committed database remains valid.
    }

    const now = new Date();
    const result = await invoke<{
      local_files: string[];
      secondary_files: string[];
      secondary_error: string | null;
    }>("create_snapshot", {
      dailyLabel: localDate(now),
      weeklyLabel: isoWeek(now),
      monthlyLabel: `${now.getFullYear()}-${two(now.getMonth() + 1)}`,
      secondaryDir: getSecondaryBackupDir() || null,
    });

    const at = Date.now();
    localStorage.setItem(LAST_DATE_KEY, localDate(now));
    localStorage.setItem(LAST_AT_KEY, String(at));
    const next: BackupStatus = {
      phase: result.secondary_error ? "error" : "idle",
      lastBackupAt: at,
      lastDate: localDate(now),
      localFiles: result.local_files,
      secondaryFiles: result.secondary_files,
      secondaryError: result.secondary_error,
      error: result.secondary_error || "",
    };
    emit(next);
    return {
      localFiles: result.local_files,
      secondaryFiles: result.secondary_files,
      secondaryError: result.secondary_error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    emit({ ...status, phase: "error", error: message });
    throw error;
  } finally {
    running = false;
  }
}

export function startBackupScheduler(): void {
  if (started || !isTauriRuntime()) return;
  started = true;

  const check = () => {
    if (running) return;
    if (localStorage.getItem(LAST_DATE_KEY) === localDate()) return;
    void createSnapshotNow().catch((error) => {
      console.error("Daily backup failed", error);
    });
  };

  window.setTimeout(check, 30_000);
  window.setInterval(check, 60 * 60 * 1000);
}
