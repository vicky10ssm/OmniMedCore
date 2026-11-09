// Data access layer.
//
// One interface, three implementations:
//   1. SqlJsSource — SQLite compiled to WASM. In the browser it persists to
//      IndexedDB; in the Tauri desktop shell it persists to a real SQLite file
//      under the OS user's app-data directory (same SQL, migrations and
//      transactions in both cases).
//   2. ReadOnlySource — read-only IndexedDB snapshot for hosted monitoring.
//   3. CloudApiSource — read-only cloud queries, planned.
//
// The interface is async so a future native SQLite/HTTP backend can replace the
// storage layer without changing UI code.

import initSqlJs, { type Database } from "sql.js";
import { MIGRATIONS, SEED_SQL, splitSqlStatements } from "./schema";
import { getDeviceId, now, setDeviceId } from "./helpers";
import { hashPassword } from "../auth/crypto";
import { isMonitor } from "../app/mode";
import { ensureDefaultTenant, getCurrentTenantId } from "./tenant";
import { ensureStarterTests } from "./starterTests";
import { ensureStarterParameters } from "./starterParameters";
import { ensureStarterSections } from "./starterSections";
import { ensureStarterPackages } from "./starterPackages";
import { ensureStarterReferences } from "./starterReferences";
import { isTauriRuntime } from "./tauriStorage";
import { TauriSqlSource } from "./tauriSqlSource";
import {
  decryptBytes,
  encryptBytes,
  isLocked,
  loadEnvelope,
  type EncryptedBlob,
} from "./encryption";

export interface DataSource {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<void>;
  /** Runs fn inside a transaction; rolls back if it throws. */
  tx<T>(fn: () => Promise<T>): Promise<T>;
  /** Forces any pending persistence to finish (used before quit/backup). */
  flush(): Promise<void>;
}

// ---- IndexedDB persistence for the WASM database ----
//
// Two records are stored:
//   "main"  — the database bytes. Plain on a legacy install, encrypted once
//             encryption has been set up.
//   "envelope" — how to unwrap the device key. Its PRESENCE is what tells us the
//             database is encrypted; there is no separate flag to fall out of
//             sync with the data.
//
// Nothing else in the app knows about any of this: the rest of the code calls
// loadBytes/saveBytes exactly as before, so encryption is confined to this file.

const DB_STORE = "diagbill";
const DB_KEY = "sqlite-bytes";

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_STORE, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_KEY);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // Without this, a second tab holding the database leaves the request
    // pending forever: "blocked" fires and the promise never settles, so the
    // app would sit on "Opening database" with no error and no way forward.
    req.onblocked = () =>
      reject(
        new Error(
          "The database is open in another tab. Close it there first, then reload."
        )
      );
  });
}

function idbGet<T>(record: string): Promise<T | undefined> {
  return openStore().then(
    (store) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = store.transaction(DB_KEY, "readonly");
        const req = tx.objectStore(DB_KEY).get(record);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPut(record: string, value: unknown): Promise<void> {
  return openStore().then(
    (store) =>
      new Promise<void>((resolve, reject) => {
        const tx = store.transaction(DB_KEY, "readwrite");
        tx.objectStore(DB_KEY).put(value, record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// function idbDelete(record: string): Promise<void> {
//   return openStore().then(
//     (store) =>
//       new Promise<void>((resolve, reject) => {
//         const tx = store.transaction(DB_KEY, "readwrite");
//         tx.objectStore(DB_KEY).delete(record);
//         tx.oncomplete = () => resolve();
//         tx.onerror = () => reject(tx.error);
//       })
//   );
// }

/**
 * The device key for this session, held in memory only. It is never persisted
 * unwrapped, so closing the app relocks the database.
 */
let deviceKey: CryptoKey | null = null;

export function getDeviceKey(): CryptoKey | null {
  return deviceKey;
}

export function setSessionDeviceKey(key: CryptoKey): void {
  deviceKey = key;
}

async function loadBytes(): Promise<Uint8Array | null> {
  const stored = await idbGet<EncryptedBlob | Uint8Array>("main");
  if (!stored) return null;
  // Legacy plain bytes: readable without a key so the app can start and offer to
  // turn encryption on. This is the one case where the file is not protected.
  if (stored instanceof Uint8Array) return stored;
  if (deviceKey) return decryptBytes(deviceKey, stored);
  throw new Error("This database is encrypted. Unlock it to continue.");
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  if (!deviceKey) {
    // Only reachable before encryption is enabled; once an envelope exists the
    // boot sequence refuses to open the database without a key.
    await idbPut("main", bytes);
    return;
  }
  await idbPut("main", await encryptBytes(deviceKey, bytes));
}

// ---- Source implementation ----

class SqlJsSource implements DataSource {
  private db!: Database;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> = Promise.resolve();
  private inTx = false;
  private pendingPersist = false;

  static async create(): Promise<SqlJsSource> {
    // An encrypted database cannot be opened without its key, and the key only
    // exists after someone unlocks. Failing here — with a message the boot
    // screen understands — is what stops an encrypted file being read as if it
    // were plain SQLite, which would surface as "file is not a database".
    if ((await loadEnvelope()) && isLocked()) {
      throw new Error("ENCRYPTED_LOCKED");
    }
    const SQL = await initSqlJs({
      locateFile: (file: string) => `/${file}`,
    });
    const src = new SqlJsSource();
    const existing = await loadBytes();
    src.db = existing ? new SQL.Database(existing) : new SQL.Database();
    src.migrate();
    await src.ensureAdmin();
    // Pass the source in. Calling getDb() here would deadlock: it returns the
    // pending promise that is waiting on this very call.
    await ensureDefaultTenant(src);
    await ensureStarterTests(src);
    await ensureStarterParameters(src);
    await ensureStarterSections(src);
    await ensureStarterReferences(src);
    await ensureStarterPackages(src);
    src.persist();
    return src;
  }

  /** First boot: create the admin account (forces a password change at first sign-in). */
  private async ensureAdmin(): Promise<void> {
    // Scoped to the current tenant: a device that serves two centres must get
    // an admin for each of them, not one admin for the whole device.
    const tenantId = getCurrentTenantId();
    const count = await this.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM users WHERE tenant_id = ? AND deleted = 0",
      [tenantId]
    );
    if ((count?.n ?? 0) > 0) return;
    const hash = await hashPassword("admin123");
    await this.run(
      `INSERT INTO users (id, username, full_name, role, password_hash, must_change_password,
         is_active, can_authorize_reports, created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,'admin',?,1,1,1,?,?,?,1,0,?)`,
      [
        crypto.randomUUID(),
        "admin",
        "Administrator",
        hash,
        now(),
        now(),
        getDeviceId(),
        getCurrentTenantId(),
      ]
    );
  }

  private migrate(): void {
    // Fresh database → meta doesn't exist yet; treat as version 0.
    let current = 0;
    try {
      const verRow = this.db.exec(
        "SELECT value FROM meta WHERE key = 'schema_version'"
      );
      if (verRow.length) current = Number(verRow[0].values[0][0]);
    } catch {
      current = 0;
    }
    // The seed runs when this database is brand new — that is, when it starts at
    // version 0. It must be gated on the ORIGINAL version, not on a per-migration
    // check, and `current` must advance as we go: seeding once per pending
    // migration would re-insert rows that already exist. `meta` has a primary
    // key, so a second seed aborts boot with "UNIQUE constraint failed: meta.key"
    // — which is exactly what a fresh database used to do as soon as there was
    // more than one migration to apply.
    const wasFresh = current === 0;
    for (const m of MIGRATIONS) {
      if (m.version > current) {
        if (m.tolerant) {
          // Data repair: run each statement on its own so one failure cannot
          // leave the rest of the repair unapplied. A statement that fails is
          // reported, not thrown — a half-finished repair is worse than a
          // reported one, and the next boot retries it.
          for (const stmt of splitSqlStatements(m.sql)) {
            try {
              this.db.exec(stmt);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              console.warn(
                `migration ${m.version} (${m.name}): statement failed -> ${msg}`
              );
            }
          }
        } else {
          try {
            // Run the migration as a single script. Do NOT split on ';' here:
            // comments contain semicolons (e.g. "-- ... fully paid; negative
            // entries are ..."), and splitting mid-comment leaves SQLite trying
            // to parse prose as SQL ("near \"negative\": syntax error").
            this.db.exec(m.sql);
          } catch (e) {
            // A migration may be re-run over a database that already has some of
            // its columns (v1 already includes tenant_id, so the v4 ALTERs can
            // collide on a fresh install). Those specific errors are expected and
            // harmless; anything else is a real failure and must surface.
            const msg = e instanceof Error ? e.message : String(e);
            const benign =
              msg.includes("duplicate column name") || msg.includes("already exists");
            if (!benign) throw e;
          }
        }
        // Repair after EVERY migration, not just at the end. `exec` aborts a
        // script at the first error, so a migration that hits a duplicate
        // column leaves the later statements in that script unapplied. If the
        // next migration then builds an index on one of those missing columns,
        // it fails hard and the app cannot open. Repairing here keeps every
        // later migration working on a consistent schema.
        this.ensureTenantColumns();
        current = m.version;
        this.db.exec(
          `INSERT INTO meta (key, value) VALUES ('schema_version', '${m.version}') ` +
            `ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        );
      }
    }
    if (wasFresh) {
      // Seed *after* the schema is fully up to date, so the inserts land in
      // their final shape and a failed schema step can't leave seed rows behind.
      this.db.exec(SEED_SQL);
    } else {
      // Self-heal a half-seeded database. An older build could seed once per
      // pending migration, so a fresh database with two migrations to apply
      // wrote its catalogue, then aborted on the duplicate `meta` row and saved
      // that partial state. Since the seed is now idempotent, re-running it
      // completes the missing rows harmlessly; without this the app would stay
      // permanently unable to open. `bootstrapped_at` only ever gets written by
      // the seed, so its absence is the marker for "seed never finished".
      const done = this.db.exec(
        "SELECT value FROM meta WHERE key = 'bootstrapped_at'"
      );
      if (!done.length) this.db.exec(SEED_SQL);
    }
    // Repair any table the tenant migration did not reach. `exec` is not
    // transactional, so a single failing ALTER stops the rest of that script.
    // Checking the real schema (rather than trusting the version number) makes
    // the upgrade idempotent and safe to run on every boot.
    this.ensureTenantColumns();
    // NABL/ISO 15189 compliance fields self-heal
    this.ensureComplianceColumns();
    // Assign this terminal its identity (sync source + invoice device code)
    const dev = this.db.exec("SELECT value FROM meta WHERE key = 'device_id'");
    if (!dev.length) {
      const id = crypto.randomUUID();
      this.db.exec(
        `INSERT INTO meta (key, value) VALUES ('device_id', '${id}')`
      );
      setDeviceId(id);
    } else {
      setDeviceId(String(dev[0].values[0][0]));
    }
    this.persist();
  }

  /**
   * Adds `tenant_id` to any business table that is missing it.
   *
   * Cheap (a handful of PRAGMA reads) and idempotent, so it runs on every boot.
   * This is what makes a partially applied tenant migration recoverable instead
   * of leaving the app permanently unable to query those tables.
   */
  private ensureTenantColumns(): void {
    const tables = [
      "settings",
      "users",
      "audit_log",
      "patients",
      "tests",
      "packages",
      "package_items",
      "doctors",
      "invoice_blocks",
      "invoices",
      "invoice_items",
      "payments",
      "expense_categories",
      "expenses",
      "payouts",
      "commission_entries",
      "report_orders",
      "radiologists",
      "pathologists",
      "test_parameters",
      "report_parameters",
      "samples",
      "report_result_revisions",
      "abdm_consents",
      "abdm_outbox",
      "admissions",
      "hospital_services",
      "hospital_charges",
      "hospital_bill_payments",
      "sync_queue",
      "sync_ack",
      "local_export_queue",
      "medicines",
      "pharmacy_batches",
      "pharmacy_sales",
      "pharmacy_sale_items",
    ];
    for (const table of tables) {
      try {
        const info = this.db.exec(`PRAGMA table_info(${table})`);
        if (!info.length) continue; // table does not exist yet
        const hasTenant = info[0].values.some((row) => row[1] === "tenant_id");
        if (!hasTenant) {
          this.db.exec(
            `ALTER TABLE ${table} ADD COLUMN tenant_id TEXT NOT NULL DEFAULT ''`
          );
        }
      } catch {
        // A table that cannot be inspected will be reported by the migration
        // itself; don't turn a repair attempt into a boot failure.
      }
    }
  }

  private ensureComplianceColumns(): void {
    const repairs: Array<[string, string]> = [
      // patients
      ["patients", "dob TEXT NOT NULL DEFAULT ''"],
      ["patients", "id_proof_type TEXT NOT NULL DEFAULT ''"],
      ["patients", "id_proof_no TEXT NOT NULL DEFAULT ''"],
      ["patients", "abha_id TEXT NOT NULL DEFAULT ''"],
      ["patients", "consent_given INTEGER NOT NULL DEFAULT 0"],
      ["patients", "consent_at INTEGER"],
      // tests
      ["tests", "method TEXT NOT NULL DEFAULT ''"],
      ["tests", "specimen_type TEXT NOT NULL DEFAULT ''"],
      ["tests", "container_type TEXT NOT NULL DEFAULT ''"],
      ["tests", "equipment_id TEXT NOT NULL DEFAULT ''"],
      ["tests", "loinc_code TEXT NOT NULL DEFAULT ''"],
      ["tests", "turnaround_time_hours INTEGER"],
      ["tests", "department TEXT NOT NULL DEFAULT ''"],
      ["tests", "accreditation_status TEXT NOT NULL DEFAULT ''"],
      // doctors
      ["doctors", "council_name TEXT NOT NULL DEFAULT ''"],
      ["doctors", "digital_signature_path TEXT NOT NULL DEFAULT ''"],
      ["doctors", "is_reporting_pathologist INTEGER NOT NULL DEFAULT 0"],
      // invoices
      ["invoices", "sample_ids TEXT NOT NULL DEFAULT '[]'"],
      ["invoices", "reporting_pathologist_id TEXT NOT NULL DEFAULT ''"],
      // report_orders
      ["report_orders", "sample_id TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "specimen_collected_at INTEGER"],
      ["report_orders", "specimen_received_at INTEGER"],
      ["report_orders", "analysis_started_at INTEGER"],
      ["report_orders", "analysis_completed_at INTEGER"],
      ["report_orders", "equipment_id TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "reagent_lot TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "comments TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "technologist_notes TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "approval_status TEXT NOT NULL DEFAULT 'pending'"],
      ["report_orders", "approved_by TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "approved_at INTEGER"],
      ["report_orders", "pathologist_id TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "pathologist_name TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "pathologist_qualification TEXT NOT NULL DEFAULT ''"],
      ["report_orders", "pathologist_signature TEXT NOT NULL DEFAULT ''"],
      // clinical authorization and ABDM-compatible parameter coding
      ["users", "can_authorize_reports INTEGER NOT NULL DEFAULT 0"],
      ["test_parameters", "loinc_code TEXT NOT NULL DEFAULT ''"],
      ["test_parameters", "section_name TEXT NOT NULL DEFAULT ''"],
      ["report_parameters", "loinc_code TEXT NOT NULL DEFAULT ''"],
      ["report_parameters", "section_name TEXT NOT NULL DEFAULT ''"],
    ];
    for (const [table, colDef] of repairs) {
      try {
        const info = this.db.exec(`PRAGMA table_info(${table})`);
        if (!info.length) continue;
        const colName = colDef.split(/\s+/)[0];
        const hasCol = info[0].values.some((row) => row[1] === colName);
        if (!hasCol) {
          this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
        }
      } catch {
        // ignore
      }
    }
  }

  private persist(): void {
    // Never export mid-transaction (a half-applied snapshot could be saved).
    if (this.inTx) {
      this.pendingPersist = true;
      return;
    }
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saving = this.saving.then(async () => {
        try {
          await saveBytes(this.db.export());
        } catch (e) {
          console.error("DB persist failed", e);
        }
      });
    }, 150);
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.saving;
    if (this.inTx) return;
    await saveBytes(this.db.export());
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never[]);
      stmt.step();
    } finally {
      stmt.free();
    }
    this.persist();
  }

  async tx<T>(fn: () => Promise<T>): Promise<T> {
    this.db.exec("BEGIN");
    this.inTx = true;
    let result!: T;
    try {
      result = await fn();
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    } finally {
      this.inTx = false;
      if (this.pendingPersist) {
        this.pendingPersist = false;
        this.persist();
      }
    }
    this.persist();
    return result;
  }
}

// ---- Read-only source (monitoring mode) ----

/**
 * Opens the existing database for reading and refuses every write.
 *
 * The monitor UI hides editing controls anyway, but this is the enforcement
 * layer: a stray write path — a future page, a console call, a compromised
 * bundle — throws instead of silently mutating a terminal's records. `run()`
 * and `tx()` have no legitimate use in a monitoring session, so they are not
 * implemented as no-ops: failing loudly is the point.
 *
 * It never writes the snapshot back to IndexedDB, so a monitoring session
 * cannot corrupt the terminal's database even if it is opened by mistake.
 */
class ReadOnlySource implements DataSource {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  static async create(): Promise<ReadOnlySource> {
    const SQL = await initSqlJs({ locateFile: (file: string) => `/${file}` });
    const existing = await loadBytes();
    if (!existing) {
      throw new Error(
        "No local database on this machine yet. Monitoring shows data that a terminal has already recorded."
      );
    }
    return new ReadOnlySource(new SQL.Database(existing));
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }

  async run(): Promise<void> {
    throw new Error("This is a read-only monitoring view — records can't be changed here.");
  }

  async tx<T>(): Promise<T> {
    throw new Error("This is a read-only monitoring view — records can't be changed here.");
  }

  async flush(): Promise<void> {
    // Nothing is ever written, so there is nothing to flush.
  }
}

let dbPromise: Promise<DataSource> | null = null;
let restoreInProgress = false;

/**
 * True when another tab of this app already owns the database.
 *
 * IndexedDB holds the entire SQLite file under one key, and each tab keeps a
 * private in-memory copy that it writes back wholesale. Two live tabs would
 * therefore overwrite each other's bills, so we refuse to start a second one
 * instead of silently losing data. (Real terminals are separate machines with
 * separate databases — this only guards the dev/browser case.)
 */
function claimLock(): boolean {
  const KEY = "diagbill.dbowner";
  const existing = localStorage.getItem(KEY);
  if (existing) {
    const age = Date.now() - Number(existing);
    // A stale stamp (crash, no heartbeat for 30s) can be taken over.
    if (Number.isFinite(age) && age < 30_000) return false;
  }
  localStorage.setItem(KEY, String(Date.now()));
  window.setInterval(() => {
    localStorage.setItem(KEY, String(Date.now()));
  }, 5_000);
  window.addEventListener("beforeunload", () => {
    if (localStorage.getItem(KEY) !== null) localStorage.removeItem(KEY);
  });
  return true;
}

export function getDb(): Promise<DataSource> {
  if (restoreInProgress) {
    return Promise.reject(new Error("The database is being restored. Please wait for reload."));
  }
  if (!dbPromise) {
    if (isMonitor()) {
      // Monitoring never takes the writer lock: several people may watch at
      // once, and it must not block the terminal from running.
      dbPromise = ReadOnlySource.create();
      return dbPromise;
    }
    if (isTauriRuntime()) {
      // The desktop shell enforces a single application instance in Rust and
      // uses an SQLCipher connection whose key is kept in Windows Credential
      // Manager.
      dbPromise = TauriSqlSource.create();
    } else {
      if (!claimLock()) {
        return Promise.reject(
          new Error(
            "This app is already open in another tab. Close it there first — two tabs would overwrite each other's data."
          )
        );
      }
      dbPromise = SqlJsSource.create();
    }
  }
  return dbPromise;
}

/**
 * Re-opens the database after an unlock.
 *
 * `getDb` caches its promise, so the failed attempt made while the database was
 * still locked would otherwise be returned forever. The lock is released first
 * so the retry does not trip over its own stale stamp.
 */
export function reopenAfterUnlock(): Promise<DataSource> {
  dbPromise = null;
  releaseLock();
  return getDb();
}

/** Flushes and closes the active database so a restore can replace the file. */
export async function closeDatabaseForRestore(): Promise<void> {
  restoreInProgress = true;
  const current = dbPromise;
  dbPromise = null;
  releaseLock();
  if (!current) return;
  const db = await current;
  await db.flush();
  if (db instanceof TauriSqlSource) await db.close();
}

// Re-exported so pages deal with one module for storage concerns.
export {
  generateDeviceKey,
  wrapDeviceKey,
  unwrapDeviceKey,
  generateRecoveryCode,
  passphraseOk,
  MIN_PASSPHRASE_LENGTH,
  isLocked,
  loadEnvelope,
  enableEncryption,
  unlockWithPassphrase,
  unlockWithRecoveryCode,
  changePassphrase,
  encryptBytes,
  decryptBytes,
  type EncryptedBlob,
  type KeyEnvelope,
} from "./encryption";

/** Releases the single-writer stamp so a retry (or reload) can claim it. */
function releaseLock(): void {
  try {
    localStorage.removeItem("diagbill.dbowner");
  } catch {
    // Nothing to do: a missing stamp simply reads as "unlocked".
  }
}

// Dev-only inspection hook: window.__diagbillDb().all(...) in the console.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__diagbillDb = getDb;
}

/** Persist immediately on page hide/close (desktop window close, tab switch). */
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    void dbPromise?.then((db) => db.flush());
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void dbPromise?.then((db) => db.flush());
    }
  });
}
