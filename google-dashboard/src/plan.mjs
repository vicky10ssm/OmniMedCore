import {
  DASHBOARD_TABLES,
  selectedColumns,
} from "./dashboardSchema.mjs";
import { isSnapshotId, snapshotTimestamp } from "./manifest.mjs";

export class PlanError extends Error {
  constructor(message) {
    super(message);
    this.name = "PlanError";
  }
}

export function chooseLatestSnapshot(snapshots, requestedId = "") {
  const valid = snapshots
    .filter((snapshot) => isSnapshotId(snapshot.id))
    .slice()
    .sort((left, right) => {
      const a = snapshotTimestamp(left.id) ?? 0;
      const b = snapshotTimestamp(right.id) ?? 0;
      if (a !== b) return b - a;
      return String(right.id).localeCompare(String(left.id));
    });
  if (requestedId) {
    const match = valid.find((snapshot) => snapshot.id === requestedId);
    if (!match) throw new PlanError(`Snapshot not found: ${requestedId}`);
    return match;
  }
  if (valid.length === 0) {
    throw new PlanError("No complete snapshot folders found");
  }
  return valid[0];
}

export function buildSnapshotPlan(snapshot, options = {}) {
  const allowMissingTables = options.allowMissingTables === true;
  const warn = options.warn ?? (() => undefined);
  const manifest = snapshot.manifest;
  if (!manifest) throw new PlanError(`Snapshot ${snapshot.id} has no manifest`);
  if (String(snapshot.id) !== String(manifest.snapshotId ?? snapshot.id)) {
    throw new PlanError(`Snapshot id mismatch for ${snapshot.id}`);
  }

  const fileByTable = new Map(manifest.files.map((file) => [file.table, file]));
  const tenantId = String(manifest.tenantId ?? manifest.tenant_id ?? "");
  const exportedAt = Number(manifest.exportedAt ?? manifest.exported_at);
  if (!tenantId) throw new PlanError(`Snapshot ${snapshot.id} has no tenant id`);
  if (!Number.isFinite(exportedAt)) {
    throw new PlanError(`Snapshot ${snapshot.id} has no export timestamp`);
  }
  const tables = [];
  const missingRequired = [];

  for (const [table, contract] of Object.entries(DASHBOARD_TABLES)) {
    const file = fileByTable.get(table);
    if (!file) {
      if (contract.required && !allowMissingTables) missingRequired.push(table);
      else if (contract.required) {
        warn(`Required table is missing but allowed by configuration: ${table}`);
      }
      continue;
    }

    const columns = selectedColumns(table, file.columns);
    if (columns.length === 0) {
      throw new PlanError(`No approved dashboard columns found for ${table}`);
    }
    if (table !== "tenants" && !columns.includes("tenant_id")) {
      throw new PlanError(`Approved columns for ${table} do not include tenant_id`);
    }
    const manifestColumnSet = new Set(
      file.columns.map((column) => column.toLowerCase())
    );
    const missingApproved = contract.columns.filter(
      (column) => !manifestColumnSet.has(column.toLowerCase())
    );
    if (missingApproved.length > 0) {
      warn(
        `Optional dashboard columns absent from ${table}: ${missingApproved.join(", ")}`
      );
    }

    tables.push({
      table,
      file: file.file,
      manifestRows: file.rows,
      manifestColumns: file.columns,
      columns,
      required: contract.required,
    });
  }

  if (missingRequired.length > 0) {
    throw new PlanError(
      `Snapshot is missing required dashboard tables: ${missingRequired.join(", ")}`
    );
  }

  return {
    snapshotId: snapshot.id,
    tenantId,
    exportedAt,
    tables,
  };
}
