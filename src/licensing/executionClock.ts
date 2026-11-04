// Execution-time high-water mark.
//
// Two local stores are updated together:
//   - the SQLCipher `meta` table (encrypted desktop database), and
//   - a DPAPI-protected native state file (works even if the DB is unavailable).
//
// Taking the maximum means deleting or rolling back one store does not hide an
// earlier execution time. If the current clock is earlier than that maximum,
// licence validation fails before expiry is evaluated.

import { invoke } from "@tauri-apps/api/core";
import { getDb } from "../db";
import { isTauriRuntime } from "../db/tauriStorage";

export const CLOCK_TAMPER_EVENT = "medicore:clock-tampered";
export const LAST_EXECUTION_META_KEY = "last_known_execution_time";

export class ClockManipulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClockManipulationError";
  }
}

function tamperMessage(): string {
  return "System Clock Manipulation Detected. The system clock is earlier than the last recorded MediCore execution time. Correct the clock and restart MediCore.";
}

function notifyClockTamper(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<string>(CLOCK_TAMPER_EVENT, { detail: message })
  );
}

async function readDbHighWaterMark(): Promise<number> {
  try {
    const db = await getDb();
    const row = await db.get<{ value: string }>(
      "SELECT value FROM meta WHERE key = ?",
      [LAST_EXECUTION_META_KEY]
    );
    const value = Number(row?.value ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    // The DB may not be open yet (or monitoring is read-only). The native
    // DPAPI state still enforces the mark in the desktop app.
    return 0;
  }
}

async function writeDbHighWaterMark(value: number): Promise<void> {
  try {
    const db = await getDb();
    await db.run(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [LAST_EXECUTION_META_KEY, String(value)]
    );
  } catch {
    // Native DPAPI state is the primary desktop guard; a failed DB mirror must
    // not make every business action fail.
  }
}

/**
 * UpdateExecutionTimestamp()
 *
 * Call at app startup, before licence-expiry evaluation, and after critical
 * business actions (invoice printing, lab-report creation/printing). Throws a
 * ClockManipulationError when the machine clock has moved backwards.
 */
export async function UpdateExecutionTimestamp(): Promise<number> {
  const now = Date.now();
  if (!Number.isFinite(now) || now <= 0) {
    const message = "System Clock Manipulation Detected. The system clock is not valid.";
    notifyClockTamper(message);
    throw new ClockManipulationError(message);
  }

  const dbLast = await readDbHighWaterMark();
  if (dbLast > now) {
    const message = tamperMessage();
    notifyClockTamper(message);
    throw new ClockManipulationError(message);
  }

  let last = dbLast;
  if (isTauriRuntime()) {
    try {
      const nativeLast = await invoke<number>("license_update_execution_timestamp");
      if (Number.isFinite(nativeLast)) last = Math.max(last, nativeLast);
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const message = raw.includes("System Clock Manipulation Detected")
        ? raw
        : `System Clock Manipulation Detected. The protected execution-time state could not be verified (${raw}).`;
      notifyClockTamper(message);
      throw new ClockManipulationError(message);
    }
  }

  const next = Math.max(now, last);
  if (next > dbLast) {
    await writeDbHighWaterMark(next);
  }
  return next;
}
