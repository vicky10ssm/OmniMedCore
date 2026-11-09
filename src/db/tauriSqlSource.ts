// Native SQLCipher data source for the Tauri desktop build.
//
// Rust owns one SQLCipher connection and the database key lives in Windows
// Credential Manager. The application SQL uses `?` placeholders, so this adapter
// rewrites them to SQLite `$1`, `$2`, ... placeholders before invoking Rust.

import { invoke } from "@tauri-apps/api/core";
import { hashPassword } from "../auth/crypto";
import { getDeviceId, now, setDeviceId } from "./helpers";
import { MIGRATIONS, SEED_SQL, splitSqlStatements } from "./schema";
import { ensureDefaultTenant, getCurrentTenantId } from "./tenant";
import { ensureStarterTests } from "./starterTests";
import { ensureStarterParameters } from "./starterParameters";
import { ensureStarterSections } from "./starterSections";
import { ensureStarterPackages } from "./starterPackages";
import { ensureStarterReferences } from "./starterReferences";
import { backupDatabase, databaseInfo } from "./tauriStorage";
import type { DataSource } from "./index";

function rewritePositionalPlaceholders(sql: string): string {
  let output = "";
  let index = 0;
  let parameter = 1;
  let quote: "'" | '"' | "`" | "]" | null = null;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (quote) {
      output += char;
      if (char === quote) {
        if (quote === "]" || next !== quote) {
          quote = null;
        } else {
          // Escaped quote inside the literal: copy the second one too.
          output += next;
          index += 1;
        }
      }
      index += 1;
      continue;
    }

    if (char === "-" && next === "-") {
      while (index < sql.length && sql[index] !== "\n") {
        output += sql[index];
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      output += "/*";
      index += 2;
      while (index < sql.length && !(sql[index] === "*" && sql[index + 1] === "/")) {
        output += sql[index];
        index += 1;
      }
      if (index < sql.length) {
        output += "*/";
        index += 2;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`" || char === "[") {
      quote = char === "[" ? "]" : char;
      output += char;
      index += 1;
      continue;
    }

    if (char === "?") {
      output += `$${parameter}`;
      parameter += 1;
      index += 1;
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

function normalizeParams(params: unknown[] = []): unknown[] {
  return params.map((value) => {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === undefined) return null;
    return value;
  });
}

export class TauriSqlSource implements DataSource {
  private inTx = false;

  private constructor() {}

  static async create(): Promise<TauriSqlSource> {
    const info = await databaseInfo();
    if (!info.writable) {
      throw new Error(
        `The OmniMed Core database folder is not writable: ${info.dataDir}. Check Windows permissions or free disk space.`
      );
    }

    try {
      await invoke("db_open");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Could not open the local SQLCipher database at ${info.databasePath}. ${message}`
      );
    }

    const source = new TauriSqlSource();
    await source.prepare();
    await source.migrate();
    await source.ensureAdmin();
    await ensureDefaultTenant(source);
    await ensureStarterTests(source);
    await ensureStarterParameters(source);
    await ensureStarterSections(source);
    await ensureStarterReferences(source);
    await ensureStarterPackages(source);
    return source;
  }

  private async prepare(): Promise<void> {
    await this.run("PRAGMA foreign_keys = ON");
    await this.run("PRAGMA busy_timeout = 5000");
    await this.all("PRAGMA journal_mode = WAL");

    const check = await this.all<Record<string, unknown>>("PRAGMA quick_check");
    const result = check[0] ? Object.values(check[0])[0] : "unknown";
    if (String(result ?? "").toLowerCase() !== "ok") {
      throw new Error(`The local SQLCipher database failed its integrity check: ${String(result)}`);
    }
  }

  private async schemaVersion(): Promise<number> {
    try {
      const rows = await this.all<{ value: string }>(
        "SELECT value FROM meta WHERE key = 'schema_version'"
      );
      return rows.length ? Number(rows[0].value) : 0;
    } catch {
      return 0;
    }
  }

  private async ensureAdmin(): Promise<void> {
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

  private async ensureTenantColumns(): Promise<void> {
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
        const info = await this.all<Record<string, unknown>>(
          `PRAGMA table_info(${table})`
        );
        if (!info.length) continue;
        if (!info.some((row) => row.name === "tenant_id")) {
          await this.run(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT NOT NULL DEFAULT ''`);
        }
      } catch {
        // A table that cannot be inspected will be handled by the migration.
      }
    }
  }

  private async ensureComplianceColumns(): Promise<void> {
    const repairs: Array<[string, string]> = [
      ["patients", "dob TEXT NOT NULL DEFAULT ''"],
      ["patients", "id_proof_type TEXT NOT NULL DEFAULT ''"],
      ["patients", "id_proof_no TEXT NOT NULL DEFAULT ''"],
      ["patients", "abha_id TEXT NOT NULL DEFAULT ''"],
      ["patients", "consent_given INTEGER NOT NULL DEFAULT 0"],
      ["patients", "consent_at INTEGER"],
      ["tests", "method TEXT NOT NULL DEFAULT ''"],
      ["tests", "specimen_type TEXT NOT NULL DEFAULT ''"],
      ["tests", "container_type TEXT NOT NULL DEFAULT ''"],
      ["tests", "equipment_id TEXT NOT NULL DEFAULT ''"],
      ["tests", "loinc_code TEXT NOT NULL DEFAULT ''"],
      ["tests", "turnaround_time_hours INTEGER"],
      ["tests", "department TEXT NOT NULL DEFAULT ''"],
      ["tests", "accreditation_status TEXT NOT NULL DEFAULT ''"],
      ["doctors", "council_name TEXT NOT NULL DEFAULT ''"],
      ["doctors", "digital_signature_path TEXT NOT NULL DEFAULT ''"],
      ["doctors", "is_reporting_pathologist INTEGER NOT NULL DEFAULT 0"],
      ["invoices", "sample_ids TEXT NOT NULL DEFAULT '[]'"],
      ["invoices", "reporting_pathologist_id TEXT NOT NULL DEFAULT ''"],
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
      ["users", "can_authorize_reports INTEGER NOT NULL DEFAULT 0"],
      ["test_parameters", "loinc_code TEXT NOT NULL DEFAULT ''"],
      ["test_parameters", "section_name TEXT NOT NULL DEFAULT ''"],
      ["report_parameters", "loinc_code TEXT NOT NULL DEFAULT ''"],
      ["report_parameters", "section_name TEXT NOT NULL DEFAULT ''"],
    ];

    for (const [table, definition] of repairs) {
      try {
        const info = await this.all<Record<string, unknown>>(
          `PRAGMA table_info(${table})`
        );
        if (!info.length) continue;
        const column = definition.split(/\s+/)[0];
        if (!info.some((row) => row.name === column)) {
          await this.run(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
        }
      } catch {
        // Retry on the next boot.
      }
    }
  }

  private async executeScript(sql: string, tolerant: boolean): Promise<void> {
    for (const statement of splitSqlStatements(sql)) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      try {
        await this.run(trimmed);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const benign =
          message.includes("duplicate column name") || message.includes("already exists");
        if (benign) continue;
        if (tolerant) {
          console.warn(`tolerant migration statement failed: ${message}`);
          continue;
        }
        throw e;
      }
    }
  }

  private async migrate(): Promise<void> {
    let current = await this.schemaVersion();
    const latest = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? current;

    if (current > 0 && current < latest) {
      // Consolidate WAL before copying so the backup is a single consistent file.
      try {
        await this.run("PRAGMA wal_checkpoint(FULL)");
      } catch {
        // Older SQLite/journal modes still produce a usable file copy.
      }
      const path = await backupDatabase(`pre-migration-v${current}`);
      console.info(`Pre-migration SQLite backup created: ${path}`);
    }

    const wasFresh = current === 0;
    for (const migration of MIGRATIONS) {
      if (migration.version <= current) continue;
      await this.executeScript(migration.sql, Boolean(migration.tolerant));
      await this.ensureTenantColumns();
      await this.run(
        "INSERT INTO meta (key, value) VALUES ('schema_version', $1) " +
          "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [String(migration.version)]
      );
      current = migration.version;
    }

    if (wasFresh) {
      await this.executeScript(SEED_SQL, false);
    } else {
      const bootstrapped = await this.all<Record<string, unknown>>(
        "SELECT value FROM meta WHERE key = 'bootstrapped_at'"
      );
      if (!bootstrapped.length) await this.executeScript(SEED_SQL, false);
    }

    await this.ensureTenantColumns();
    await this.ensureComplianceColumns();

    const device = await this.all<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'device_id'"
    );
    if (device.length) {
      setDeviceId(device[0].value);
    } else {
      const id = crypto.randomUUID();
      await this.run("INSERT INTO meta (key, value) VALUES ('device_id', $1)", [id]);
      setDeviceId(id);
    }
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return invoke<T[]>("db_select", {
      sql: rewritePositionalPlaceholders(sql),
      values: normalizeParams(params),
    });
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    await invoke("db_execute", {
      sql: rewritePositionalPlaceholders(sql),
      values: normalizeParams(params),
    });
  }

  async tx<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inTx) throw new Error("Nested SQLite transactions are not supported");
    await this.run("BEGIN IMMEDIATE");
    this.inTx = true;
    try {
      const result = await fn();
      await this.run("COMMIT");
      return result;
    } catch (e) {
      await this.run("ROLLBACK");
      throw e;
    } finally {
      this.inTx = false;
    }
  }

  async flush(): Promise<void> {
    if (this.inTx) return;
    try {
      await invoke("db_checkpoint");
    } catch {
      // WAL may not be enabled; SQLite still persists committed data.
    }
  }

  /** Closes the SQLCipher connection before a restore replaces the file. */
  async close(): Promise<void> {
    if (this.inTx) throw new Error("Cannot close the database inside a transaction");
    await invoke("db_close");
  }
}
