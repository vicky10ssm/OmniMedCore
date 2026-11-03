// Lightweight Tauri background sync loop.
//
// This runs while the desktop app is open. It is intentionally small:
//   - polls the configured cloud endpoint every 30 seconds
//   - reads append-only sync_queue rows not covered by sync_ack
//   - posts a batch to /sync/push
//   - appends ACKs to sync_ack
//
// It is not an OS service and does not run while the app is closed.

import { getDb } from "../db";
import { getCurrentTenantId } from "../db/tenant";
import { now } from "../db/helpers";
import { readSyncConfig } from "./syncConfig";

export type SyncPhase =
  | "unconfigured"
  | "idle"
  | "offline"
  | "checking"
  | "syncing"
  | "error";

export interface SyncStatus {
  phase: SyncPhase;
  pending: number;
  lastSyncAt: number | null;
  lastError: string;
}

interface SyncQueueRow {
  id: string;
  tenant_id: string;
  device_id: string;
  entity_type: "invoice" | "report" | "admission";
  entity_id: string;
  operation: "upsert" | "cancel";
  payload_json: string;
  created_at: number;
}

interface SyncAck {
  queueId: string;
  ackId: string;
}

const EVENT = "medicore:sync-status";
const LAST_SYNC_KEY = "medicore.sync.lastSync";
const INTERVAL_MS = 30_000;
const BATCH_SIZE = 100;

let current: SyncStatus = {
  phase: "unconfigured",
  pending: 0,
  lastSyncAt: null,
  lastError: "",
};
let running = false;
let started = false;

function emit(next: SyncStatus): void {
  current = next;
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(next.lastSyncAt ?? ""));
  } catch {
    // Best effort only.
  }
  window.dispatchEvent(new CustomEvent<SyncStatus>(EVENT, { detail: next }));
}

function lastSyncFromStorage(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getSyncStatus(): SyncStatus {
  return { ...current, lastSyncAt: current.lastSyncAt ?? lastSyncFromStorage() };
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
     FROM sync_queue q
     LEFT JOIN sync_ack a ON a.queue_id = q.id AND a.tenant_id = q.tenant_id
     WHERE a.queue_id IS NULL AND q.tenant_id = ?`,
    [tenant]
  );
  return row?.n ?? 0;
}

async function checkConnectivity(endpoint: string, token: string): Promise<boolean> {
  if (!navigator.onLine) return false;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${endpoint}/health`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    });
    // Any HTTP response means the network path exists. An HTML 404 from a
    // reverse proxy should not be mistaken for a successful sync endpoint,
    // but a 401/403 is surfaced by the push request itself.
    return response.status < 500;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function syncNow(): Promise<SyncStatus> {
  if (running) return getSyncStatus();

  const config = readSyncConfig();
  if (!config) {
    emit({ ...getSyncStatus(), phase: "unconfigured", pending: await safePending(), lastError: "" });
    return getSyncStatus();
  }

  running = true;
  emit({ ...getSyncStatus(), phase: "checking", lastError: "" });
  try {
    const db = await getDb();
    const tenant = getCurrentTenantId();
    const pending = await pendingSyncCount();
    emit({ ...getSyncStatus(), phase: "checking", pending });

    if (!(await checkConnectivity(config.endpoint, config.token))) {
      emit({ ...getSyncStatus(), phase: "offline", pending, lastError: "Cloud endpoint unavailable" });
      return getSyncStatus();
    }

    const rows = await db.all<SyncQueueRow>(
      `SELECT q.*
       FROM sync_queue q
       LEFT JOIN sync_ack a ON a.queue_id = q.id AND a.tenant_id = q.tenant_id
       WHERE a.queue_id IS NULL AND q.tenant_id = ?
       ORDER BY q.created_at
       LIMIT ?`,
      [tenant, BATCH_SIZE]
    );

    if (rows.length === 0) {
      emit({
        ...getSyncStatus(),
        phase: "idle",
        pending: 0,
        lastSyncAt: now(),
        lastError: "",
      });
      return getSyncStatus();
    }

    emit({ ...getSyncStatus(), phase: "syncing", pending, lastError: "" });

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch(`${config.endpoint}/sync/push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: rows.map((row) => ({
            queueId: row.id,
            tenantId: row.tenant_id,
            deviceId: row.device_id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            operation: row.operation,
            payload: JSON.parse(row.payload_json),
            occurredAt: row.created_at,
          })),
        }),
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Cloud sync returned HTTP ${response.status}`);
    }

    const body = (await response.json()) as { acks?: SyncAck[] };
    const acks = Array.isArray(body.acks) ? body.acks : [];
    const known = new Map(rows.map((row) => [row.id, row]));
    const valid = acks.filter(
      (ack) => typeof ack.queueId === "string" && known.has(ack.queueId)
    );

    if (valid.length > 0) {
      const ts = now();
      await db.tx(async () => {
        for (const ack of valid) {
          const row = known.get(ack.queueId);
          if (!row) continue;
          await db.run(
            `INSERT OR IGNORE INTO sync_ack (queue_id, tenant_id, ack_id, synced_at)
             VALUES (?,?,?,?)`,
            [ack.queueId, row.tenant_id, String(ack.ackId || ""), ts]
          );
        }
      });
    }

    const remaining = await pendingSyncCount();
    emit({
      ...getSyncStatus(),
      phase: "idle",
      pending: remaining,
      lastSyncAt: now(),
      lastError: "",
    });
    return getSyncStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cloud sync failed";
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

/** Starts one loop per app process; safe to call more than once. */
export function startBackgroundSync(): void {
  if (started) return;
  started = true;
  current = {
    phase: readSyncConfig() ? "idle" : "unconfigured",
    pending: 0,
    lastSyncAt: lastSyncFromStorage(),
    lastError: "",
  };
  emit(current);
  void syncNow();
  window.setInterval(() => {
    void syncNow();
  }, INTERVAL_MS);
}
