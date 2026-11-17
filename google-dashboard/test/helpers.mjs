import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DASHBOARD_TABLES } from "../src/dashboardSchema.mjs";

export const TENANT = "tenant-a";
export const SNAPSHOT_ID = "snapshot_20261116_120000_abcdef";

function valueFor(table, column) {
  if (column === "id") return `${table}-1`;
  if (column === "tenant_id") return TENANT;
  if (column === "deleted") return "0";
  if (column === "is_active") return "1";
  if (column === "status") return table === "tenants" ? "active" : "paid";
  if (column === "gender") return "female";
  if (column === "age") return "34";
  if (column === "type") return "diagnostic";
  if (column === "name") return `${table} name`;
  if (column === "category") return "Pathology";
  if (column === "mode" || column === "payment_mode") return "cash";
  if (column === "modules") return '["Diagnostics"]';
  if (column === "item_type") return "test";
  if (column === "description") return "Complete Blood Count";
  if (column.endsWith("_at") || column.endsWith("_date") || column.endsWith("_on")) {
    return "1763200000000";
  }
  if (column.includes("paise")) return "11200";
  if (column.includes("rate_bp") || column === "qty" || column === "line_no") return "100";
  return `${table}-${column}`;
}

export function makeCsv(table, columns, rows) {
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = String(row[column] ?? "");
          return /[",\r\n]/.test(value)
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(",")
    )
    .join("\r\n");
  return `${header}\r\n${body}\r\n`;
}

export function buildSnapshotFiles({
  tables = Object.keys(DASHBOARD_TABLES),
  rowCounts = {},
} = {}) {
  const files = [];
  const contents = new Map();
  for (const table of tables) {
    const contract = DASHBOARD_TABLES[table];
    const count = rowCounts[table] ?? 1;
    const rows = Array.from({ length: count }, (_, index) => {
      const row = {};
      for (const column of contract.columns) {
        row[column] = valueFor(table, column);
      }
      if (table === "tenants") row.id = TENANT;
      else row.id = `${table}-${index + 1}`;
      return row;
    });
    const header = [...contract.columns, "patient_name", "notes"];
    // Include extra disallowed PII columns in the source CSV to prove they are
    // dropped before BigQuery.
    const extraRows = rows.map((row) => ({
      ...row,
      patient_name: "Sensitive Patient",
      notes: "Sensitive clinical note",
    }));
    contents.set(`${table}.csv`, makeCsv(table, header, extraRows));
    files.push({
      table,
      file: `${table}.csv`,
      rows: count,
      columns: header,
    });
  }
  return { files, contents };
}

export async function writeSnapshot({
  root,
  snapshotId = SNAPSHOT_ID,
  tables,
  rowCounts,
  manifestOverride,
} = {}) {
  const base = root ?? (await mkdtemp(join(tmpdir(), "omnimed-snapshot-")));
  const folder = join(base, snapshotId);
  await mkdir(folder, { recursive: true });
  const { files, contents } = buildSnapshotFiles({ tables, rowCounts });
  for (const [name, text] of contents) {
    await writeFile(join(folder, name), text, "utf8");
  }
  const manifest = {
    version: 1,
    exported_at: 1763200000000,
    tenant_id: TENANT,
    files,
    excluded_columns: [
      "users.password_hash",
      "users.totp_secret",
      "users.recovery_codes",
      "users.totp_last_step",
    ],
    skipped_tables: [],
    ...manifestOverride,
  };
  await writeFile(
    join(folder, "_manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
  return { base, folder, manifest };
}

export class FakeWarehouse {
  constructor() {
    this.active = null;
    this.actions = [];
    this.runs = [];
    this.failOnTable = "";
  }

  async hasActiveSnapshot(snapshotId) {
    this.actions.push(`check:${snapshotId}`);
    return this.active === snapshotId;
  }

  async ensureInfrastructure(tables) {
    this.actions.push("ensure");
    this.tables = tables;
  }

  async beginSnapshot({ snapshotId }) {
    this.actions.push(`begin:${snapshotId}`);
  }

  async appendSnapshotTable({ table }) {
    this.actions.push(`append:${table}`);
    if (table === this.failOnTable) throw new Error(`load failed for ${table}`);
  }

  async activateSnapshot({ snapshotId }) {
    this.actions.push(`activate:${snapshotId}`);
    this.active = snapshotId;
  }

  async recordRun(run) {
    this.actions.push(`run:${run.status}`);
    this.runs.push(run);
  }
}
