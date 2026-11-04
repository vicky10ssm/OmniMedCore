// Local Google Drive CSV exporter.
//
// This runs while the desktop app is open. It does not call an API and does not
// use fetch. Each batch is written as a brand-new file in the configured Google
// Drive sync folder; Google Drive is responsible for the actual upload.
//
// The file write itself happens in Rust via tauri::async_runtime::spawn_blocking,
// so CSV I/O never runs on the UI thread.

import { invoke } from "@tauri-apps/api/core";
import { getDb } from "../db";
import { getCurrentTenantId } from "../db/tenant";
import { now } from "../db/helpers";
import { getGoogleDriveSyncPath } from "./syncConfig";

export type SyncPhase = "idle" | "exporting" | "error";

export interface SyncStatus {
  phase: SyncPhase;
  pending: number;
  lastExportAt: number | null;
  lastFile: string;
  lastError: string;
}

interface LocalExportRow {
  id: string;
  tenant_id: string;
  module_type: "Pharmacy" | "Diagnostics" | "Hospital";
  transaction_id: string;
  patient_id: string;
  total_amount_paise: number;
  occurred_at: number;
}

interface CsvRow {
  syncTimestamp: string;
  transactionId: string;
  moduleType: LocalExportRow["module_type"];
  maskedPatientId: string;
  totalAmount: string;
}

const EVENT = "medicore:sync-status";
const LAST_EXPORT_KEY = "medicore.sync.lastExport";
const LAST_FILE_KEY = "medicore.sync.lastExportFile";
const ERROR_LOG_KEY = "medicore.sync.exportErrors";
const INTERVAL_MS = 30_000;
const BATCH_SIZE = 100;

let current: SyncStatus = {
  phase: "idle",
  pending: 0,
  lastExportAt: readNumber(LAST_EXPORT_KEY),
  lastFile: readString(LAST_FILE_KEY),
  lastError: "",
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

function readString(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function emit(next: SyncStatus): void {
  current = next;
  try {
    if (next.lastExportAt) localStorage.setItem(LAST_EXPORT_KEY, String(next.lastExportAt));
    if (next.lastFile) localStorage.setItem(LAST_FILE_KEY, next.lastFile);
  } catch {
    // Best effort only.
  }
  window.dispatchEvent(new CustomEvent<SyncStatus>(EVENT, { detail: next }));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Local CSV export failed";
}

function logFailure(message: string): void {
  console.error("Local CSV export failed", message);
  try {
    const previous = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || "[]") as Array<{
      at: number;
      message: string;
    }>;
    const entries = [{ at: Date.now(), message }, ...previous].slice(0, 20);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(entries));
  } catch {
    // The visible status still carries the error if localStorage is unavailable.
  }
}

export function getSyncStatus(): SyncStatus {
  return { ...current };
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<SyncStatus>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export async function pendingSyncCount(): Promise<number> {
  const db = await getDb();
  const tenant = getCurrentTenantId();
  const row = await db.get<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM local_export_queue
     WHERE tenant_id = ? AND exported_at IS NULL`,
    [tenant]
  );
  return row?.n ?? 0;
}

async function maskPatientId(patientId: string): Promise<string> {
  if (!patientId.trim()) return "WALK-IN";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(patientId.trim())
  );
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 6)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `MASK-${hex.toUpperCase()}`;
}

function two(value: number): string {
  return String(value).padStart(2, "0");
}

function exportFilename(date = new Date()): string {
  const stamp =
    `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}_` +
    `${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
  const random = new Uint8Array(3);
  crypto.getRandomValues(random);
  const suffix = Array.from(random)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `tx_${stamp}_${suffix}.csv`;
}

async function toCsvRow(row: LocalExportRow, syncTimestamp: string): Promise<CsvRow> {
  return {
    syncTimestamp,
    transactionId: row.transaction_id,
    moduleType: row.module_type,
    maskedPatientId: await maskPatientId(row.patient_id),
    totalAmount: (row.total_amount_paise / 100).toFixed(2),
  };
}

async function recordFailure(rows: LocalExportRow[], message: string): Promise<void> {
  logFailure(message);
  if (rows.length === 0) return;
  try {
    const db = await getDb();
    const tenant = getCurrentTenantId();
    const at = now();
    await db.tx(async () => {
      for (const row of rows) {
        await db.run(
          `UPDATE local_export_queue
           SET last_error = ?, last_attempt_at = ?
           WHERE id = ? AND tenant_id = ?`,
          [message.slice(0, 500), at, row.id, tenant]
        );
      }
    });
  } catch (error) {
    console.error("Could not record local export failure in the queue", error);
  }
}

export async function exportNow(): Promise<SyncStatus> {
  if (running) return getSyncStatus();

  running = true;
  emit({ ...getSyncStatus(), phase: "exporting", lastError: "" });
  let batch: LocalExportRow[] = [];
  try {
    const db = await getDb();
    const tenant = getCurrentTenantId();
    const pending = await pendingSyncCount();
    emit({ ...getSyncStatus(), phase: "exporting", pending });

    batch = await db.all<LocalExportRow>(
      `SELECT id, tenant_id, module_type, transaction_id, patient_id,
              total_amount_paise, occurred_at
       FROM local_export_queue
       WHERE tenant_id = ? AND exported_at IS NULL
       ORDER BY created_at
       LIMIT ?`,
      [tenant, BATCH_SIZE]
    );

    if (batch.length === 0) {
      emit({
        ...getSyncStatus(),
        phase: "idle",
        pending: 0,
        lastError: "",
      });
      return getSyncStatus();
    }

    const exportedAt = now();
    const syncTimestamp = new Date(exportedAt).toISOString();
    const rows: CsvRow[] = [];
    for (const row of batch) rows.push(await toCsvRow(row, syncTimestamp));

    const file = await invoke<string>("export_sync_csv", {
      directory: getGoogleDriveSyncPath(),
      filename: exportFilename(),
      rows,
    });

    await db.tx(async () => {
      for (const row of batch) {
        await db.run(
          `UPDATE local_export_queue
           SET exported_at = ?, export_file = ?, last_error = '', last_attempt_at = ?
           WHERE id = ? AND tenant_id = ?`,
          [exportedAt, file, exportedAt, row.id, tenant]
        );
      }
    });

    const remaining = await pendingSyncCount();
    emit({
      ...getSyncStatus(),
      phase: "idle",
      pending: remaining,
      lastExportAt: exportedAt,
      lastFile: file,
      lastError: "",
    });
    return getSyncStatus();
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(batch, message);
    emit({
      ...getSyncStatus(),
      phase: "error",
      pending: await safePending(),
      lastError: message,
    });
    return getSyncStatus();
  } finally {
    running = false;
  }
}

async function safePending(): Promise<number> {
  try {
    return await pendingSyncCount();
  } catch {
    return current.pending;
  }
}

/** Starts one export loop per app process; safe to call more than once. */
export function startLocalExportScheduler(): void {
  if (started) return;
  started = true;
  current = {
    phase: "idle",
    pending: 0,
    lastExportAt: readNumber(LAST_EXPORT_KEY),
    lastFile: readString(LAST_FILE_KEY),
    lastError: "",
  };
  emit(current);
  void exportNow();
  window.setInterval(() => {
    void exportNow();
  }, INTERVAL_MS);
}
