import { randomUUID } from "node:crypto";
import { CsvError, readCsvTable } from "./csv.mjs";
import {
  ManifestError,
  validateManifest,
} from "./manifest.mjs";
import {
  PlanError,
  buildSnapshotPlan,
  chooseLatestSnapshot,
} from "./plan.mjs";

export class PipelineError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "PipelineError";
    this.details = details;
  }
}

function asBufferLength(text) {
  return Buffer.byteLength(text, "utf8");
}

function canonicalRows(header, rows, columns) {
  const headerByLower = new Map(
    header.map((column) => [column.toLowerCase(), column])
  );
  return rows.map((row) => {
    const record = {};
    for (const column of columns) {
      const source = headerByLower.get(column.toLowerCase());
      record[column] = source ? row[source] ?? "" : "";
    }
    return record;
  });
}

function verifyTenant(table, rows, tenantId) {
  if (table === "tenants") {
    for (const row of rows) {
      if (row.id && row.id !== tenantId) {
        throw new PipelineError(
          `Snapshot ${tenantId} contains a tenants row for ${row.id}`
        );
      }
    }
    return;
  }
  for (const row of rows) {
    if (row.tenant_id && row.tenant_id !== tenantId) {
      throw new PipelineError(
        `Snapshot ${tenantId} contains ${table} rows for ${row.tenant_id}`
      );
    }
  }
}

/**
 * Validates and loads one full snapshot.
 *
 * Safety invariants:
 * - nothing is activated until every approved table has loaded successfully
 * - any malformed/mismatched table leaves the previous snapshot active
 * - a previously activated snapshot is skipped, so retries are harmless
 */
export async function runSnapshot({
  source,
  warehouse,
  config,
  logger = console,
  requestedSnapshotId = "",
  dryRun = false,
}) {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const snapshots = await source.listSnapshots();
  const snapshot = chooseLatestSnapshot(snapshots, requestedSnapshotId);

  let manifest;
  try {
    manifest = validateManifest(snapshot.manifest);
  } catch (error) {
    if (error instanceof ManifestError) {
      throw new PipelineError(`${snapshot.id}: ${error.message}`, {
        snapshotId: snapshot.id,
        runId,
        status: "quarantined",
      });
    }
    throw error;
  }

  let plan;
  try {
    plan = buildSnapshotPlan(
      { id: snapshot.id, manifest: { ...manifest, snapshotId: snapshot.id } },
      {
        allowMissingTables: config.allowMissingTables,
        warn: (message) => logger.warn?.(message),
      }
    );
  } catch (error) {
    if (error instanceof PlanError) {
      throw new PipelineError(`${snapshot.id}: ${error.message}`, {
        snapshotId: snapshot.id,
        runId,
        status: "quarantined",
      });
    }
    throw error;
  }

  if (dryRun) {
    return {
      runId,
      snapshotId: snapshot.id,
      tenantId: plan.tenantId,
      exportedAt: plan.exportedAt,
      tables: plan.tables.map((table) => ({
        table: table.table,
        rows: table.manifestRows,
        columns: table.columns.length,
      })),
      dryRun: true,
    };
  }

  if (
    config.requireFreshSnapshot &&
    Number.isFinite(config.maxSnapshotAgeHours) &&
    Date.now() - plan.exportedAt > config.maxSnapshotAgeHours * 3_600_000
  ) {
    throw new PipelineError(
      `Snapshot ${snapshot.id} is older than ${config.maxSnapshotAgeHours} hours`,
      { snapshotId: snapshot.id, runId, status: "stale" }
    );
  }

  if (await warehouse.hasActiveSnapshot(snapshot.id)) {
    logger.info?.(`Snapshot ${snapshot.id} is already active; skipping`);
    return {
      runId,
      snapshotId: snapshot.id,
      tenantId: plan.tenantId,
      exportedAt: plan.exportedAt,
      skipped: true,
      tables: [],
    };
  }

  const prepared = [];
  for (const table of plan.tables) {
    let text;
    try {
      text = await source.readFile(snapshot, table.file);
    } catch (error) {
      await safeRecordFailure(warehouse, logger, {
        runId,
        snapshotId: snapshot.id,
        tenantId: plan.tenantId,
        startedAt,
        status: "failed",
        error: `Could not read ${table.file}: ${error.message}`,
      });
      throw new PipelineError(
        `Could not read ${table.file} from ${snapshot.id}: ${error.message}`,
        { snapshotId: snapshot.id, runId }
      );
    }

    const bytes = asBufferLength(text);
    if (bytes > config.maxFileBytes) {
      throw new PipelineError(
        `${table.file} is ${bytes} bytes, above the ${config.maxFileBytes} byte limit`,
        { snapshotId: snapshot.id, runId }
      );
    }

    let parsed;
    try {
      parsed = readCsvTable(text, {
        maxColumns: config.maxColumns,
        maxFieldChars: config.maxFieldChars,
      });
    } catch (error) {
      if (error instanceof CsvError) {
        await safeRecordFailure(warehouse, logger, {
          runId,
          snapshotId: snapshot.id,
          tenantId: plan.tenantId,
          startedAt,
          status: "quarantined",
          error: `${table.file}: ${error.message}`,
        });
        throw new PipelineError(`${table.file}: ${error.message}`, {
          snapshotId: snapshot.id,
          runId,
        });
      }
      throw error;
    }

    if (parsed.rows.length !== table.manifestRows) {
      const message = `${table.file} has ${parsed.rows.length} rows but the manifest says ${table.manifestRows}`;
      await safeRecordFailure(warehouse, logger, {
        runId,
        snapshotId: snapshot.id,
        tenantId: plan.tenantId,
        startedAt,
        status: "quarantined",
        error: message,
      });
      throw new PipelineError(message, { snapshotId: snapshot.id, runId });
    }
    if (parsed.rows.length > config.maxRowsPerTable) {
      throw new PipelineError(
        `${table.file} has ${parsed.rows.length} rows, above the ${config.maxRowsPerTable} row limit`,
        { snapshotId: snapshot.id, runId }
      );
    }

    const rows = canonicalRows(parsed.header, parsed.rows, table.columns);
    verifyTenant(table.table, rows, plan.tenantId);
    prepared.push({ ...table, rows });
  }

  await warehouse.ensureInfrastructure();

  try {
    await warehouse.beginSnapshot({
      snapshotId: snapshot.id,
      runId,
      tables: prepared.map((table) => table.table),
    });
    for (const table of prepared) {
      await warehouse.appendSnapshotTable({
        snapshotId: snapshot.id,
        runId,
        tenantId: plan.tenantId,
        exportedAt: plan.exportedAt,
        table: table.table,
        columns: table.columns,
        rows: table.rows,
      });
    }
    await warehouse.activateSnapshot({
      snapshotId: snapshot.id,
      runId,
      tenantId: plan.tenantId,
      exportedAt: plan.exportedAt,
      tables: prepared.map((table) => ({
        table: table.table,
        rows: table.rows.length,
      })),
    });
  } catch (error) {
    await safeRecordFailure(warehouse, logger, {
      runId,
      snapshotId: snapshot.id,
      tenantId: plan.tenantId,
      startedAt,
      status: "failed",
      error: error.message,
    });
    throw new PipelineError(
      `Snapshot ${snapshot.id} was not activated: ${error.message}`,
      { snapshotId: snapshot.id, runId }
    );
  }

  await safeRecordSuccess(warehouse, logger, {
    runId,
    snapshotId: snapshot.id,
    tenantId: plan.tenantId,
    startedAt,
    tables: prepared.map((table) => ({
      table: table.table,
      rows: table.rows.length,
    })),
  });

  return {
    runId,
    snapshotId: snapshot.id,
    tenantId: plan.tenantId,
    exportedAt: plan.exportedAt,
    tables: prepared.map((table) => ({
      table: table.table,
      rows: table.rows.length,
      columns: table.columns.length,
    })),
  };
}

async function safeRecordFailure(warehouse, logger, run) {
  try {
    await warehouse.recordRun({ ...run, status: run.status ?? "failed" });
  } catch (error) {
    logger.error?.(`Could not record failed pipeline run: ${error.message}`);
  }
}

async function safeRecordSuccess(warehouse, logger, run) {
  try {
    await warehouse.recordRun({
      ...run,
      status: "success",
      error: "",
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error?.(`Could not record successful pipeline run: ${error.message}`);
  }
}
