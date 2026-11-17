import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BigQuery } from "@google-cloud/bigquery";
import {
  DASHBOARD_TABLES,
  selectedColumns,
} from "./dashboardSchema.mjs";

const META_COLUMNS = [
  { name: "_snapshot_id", type: "STRING" },
  { name: "_run_id", type: "STRING" },
  { name: "_exported_at", type: "TIMESTAMP" },
  { name: "_ingested_at", type: "TIMESTAMP" },
];

function safeIdentifier(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return value;
}

function safeProjectId(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`Invalid project id: ${value}`);
  }
  return value;
}

function quoteDataset(projectId, dataset) {
  return `\`${safeProjectId(projectId)}.${safeIdentifier(dataset, "dataset")}\``;
}

function rawTableName(table) {
  return `raw_${table}`;
}

function rawSchema(table) {
  const contract = DASHBOARD_TABLES[table];
  return [
    ...contract.columns.map((name) => ({ name, type: "STRING" })),
    ...META_COLUMNS,
  ];
}

function currentSnapshotTable(projectId, dataset) {
  return `${quoteDataset(projectId, dataset)}.\`_current_snapshot\``;
}

function runsTable(projectId, dataset) {
  return `${quoteDataset(projectId, dataset)}.\`pipeline_runs\``;
}

function rawTable(projectId, dataset, table) {
  return `${quoteDataset(projectId, dataset)}.\`${rawTableName(table)}\``;
}

export function createBigQueryWarehouse(config, logger = console) {
  const bq = new BigQuery({
    projectId: config.projectId,
    location: config.bqLocation,
  });
  const reporting = quoteDataset(config.projectId, config.bqDataset);
  const raw = quoteDataset(config.projectId, config.bqRawDataset);

  async function ensureDataset(name) {
    const dataset = bq.dataset(name);
    const [exists] = await dataset.exists();
    if (!exists) {
      await bq.createDataset(name, { location: config.bqLocation });
      logger.info?.(`Created BigQuery dataset ${name}`);
    }
  }

  async function runQuery(query, params = {}) {
    const [job] = await bq.createQueryJob({
      query,
      params,
      location: config.bqLocation,
      useLegacySql: false,
    });
    const [rows] = await job.getQueryResults();
    return rows;
  }

  return {
    kind: "bigquery",

    async ensureInfrastructure(tables = Object.keys(DASHBOARD_TABLES)) {
      await ensureDataset(config.bqDataset);
      await ensureDataset(config.bqRawDataset);

      for (const table of tables) {
        const fields = rawSchema(table)
          .map((field) => `\`${field.name}\` ${field.type}`)
          .join(",\n  ");
        await runQuery(
          `CREATE TABLE IF NOT EXISTS ${rawTable(
            config.projectId,
            config.bqRawDataset,
            table
          )} (
  ${fields}
)
PARTITION BY DATE(_ingested_at)
OPTIONS (partition_expiration_days = ${Number(config.rawRetentionDays) || 90})`
        );
      }

      await runQuery(`CREATE TABLE IF NOT EXISTS ${currentSnapshotTable(
        config.projectId,
        config.bqRawDataset
      )} (
  singleton INT64 NOT NULL,
  snapshot_id STRING NOT NULL,
  tenant_id STRING NOT NULL,
  exported_at TIMESTAMP NOT NULL,
  activated_at TIMESTAMP NOT NULL,
  run_id STRING NOT NULL,
  table_counts JSON
)`);

      await runQuery(`CREATE TABLE IF NOT EXISTS ${runsTable(
        config.projectId,
        config.bqRawDataset
      )} (
  run_id STRING NOT NULL,
  snapshot_id STRING NOT NULL,
  tenant_id STRING,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  status STRING NOT NULL,
  error STRING,
  table_counts JSON
)
PARTITION BY DATE(started_at)
CLUSTER BY status, snapshot_id
OPTIONS (partition_expiration_days = 400)`);

      const views = await readFile(
        new URL("../sql/views.sql", import.meta.url),
        "utf8"
      );
      const rendered = views
        .replaceAll("__PROJECT__", config.projectId)
        .replaceAll("__RAW__", config.bqRawDataset)
        .replaceAll("__REPORTING__", config.bqDataset);
      for (const statement of rendered
        .split(/;\s*(?:\r?\n|$)/)
        .map((query) => query.trim())
        .filter(Boolean)) {
        await runQuery(statement);
      }
    },

    async hasActiveSnapshot(snapshotId) {
      try {
        const rows = await runQuery(
          `SELECT snapshot_id FROM ${currentSnapshotTable(
            config.projectId,
            config.bqRawDataset
          )} WHERE singleton = 1 LIMIT 1`
        );
        return rows[0]?.snapshot_id === snapshotId;
      } catch (error) {
        const message = String(error?.message ?? error);
        if (/not found|404|does not exist/i.test(message)) return false;
        throw error;
      }
    },

    async beginSnapshot({ snapshotId, tables }) {
      for (const table of tables) {
        await runQuery(
          `DELETE FROM ${rawTable(
            config.projectId,
            config.bqRawDataset,
            table
          )} WHERE _snapshot_id = @snapshotId`,
          { snapshotId }
        );
      }
    },

    async appendSnapshotTable({
      snapshotId,
      runId,
      exportedAt,
      table,
      rows,
    }) {
      if (rows.length === 0) {
        logger.info?.(`No rows to load for ${table}`);
        return;
      }
      const contract = DASHBOARD_TABLES[table];
      const tempDir = await mkdtemp(join(tmpdir(), "omnimed-dashboard-"));
      const path = join(tempDir, `${table}.ndjson`);
      try {
        const ingestedAt = new Date().toISOString();
        const exported = new Date(Number(exportedAt)).toISOString();
        const lines = rows.map((row) => {
          const record = {};
          for (const column of contract.columns) record[column] = row[column] ?? "";
          record._snapshot_id = snapshotId;
          record._run_id = runId;
          record._exported_at = exported;
          record._ingested_at = ingestedAt;
          return JSON.stringify(record);
        });
        await writeFile(path, `${lines.join("\n")}\n`, "utf8");
        const [job] = await bq
          .dataset(config.bqRawDataset)
          .table(rawTableName(table))
          .createLoadJob(path, {
            sourceFormat: "NEWLINE_DELIMITED_JSON",
            schema: { fields: rawSchema(table) },
            writeDisposition: "WRITE_APPEND",
            location: config.bqLocation,
          });
        await job.promise();
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    },

    async activateSnapshot({
      snapshotId,
      runId,
      tenantId,
      exportedAt,
      tables,
    }) {
      const counts = Object.fromEntries(
        tables.map((entry) => [entry.table, entry.rows])
      );
      await runQuery(`BEGIN TRANSACTION;
DELETE FROM ${currentSnapshotTable(
        config.projectId,
        config.bqRawDataset
      )} WHERE singleton = 1;
INSERT INTO ${currentSnapshotTable(
        config.projectId,
        config.bqRawDataset
      )} (singleton, snapshot_id, tenant_id, exported_at, activated_at, run_id, table_counts)
VALUES (1, @snapshotId, @tenantId, @exportedAt, CURRENT_TIMESTAMP(), @runId, PARSE_JSON(@counts));
COMMIT;`, {
        snapshotId,
        tenantId,
        exportedAt: new Date(Number(exportedAt)).toISOString(),
        runId,
        counts: JSON.stringify(counts),
      });
    },

    async recordRun({
      runId,
      snapshotId,
      tenantId = "",
      startedAt,
      finishedAt = new Date().toISOString(),
      status,
      error = "",
      tables = [],
    }) {
      const counts = Object.fromEntries(
        tables.map((entry) => [entry.table, entry.rows])
      );
      await runQuery(
        `INSERT INTO ${runsTable(
          config.projectId,
          config.bqRawDataset
        )} (run_id, snapshot_id, tenant_id, started_at, finished_at, status, error, table_counts)
         VALUES (@runId, @snapshotId, @tenantId, @startedAt, @finishedAt, @status, @error, PARSE_JSON(@counts))`,
        {
          runId,
          snapshotId,
          tenantId,
          startedAt,
          finishedAt,
          status,
          error: String(error).slice(0, 4000),
          counts: JSON.stringify(counts),
        }
      );
    },

    async selectedColumnsFor(table, manifestColumns) {
      return selectedColumns(table, manifestColumns);
    },

    // Exposed for tests and operators that want to inspect the dataset prefix.
    datasetPrefix: reporting,
    rawPrefix: raw,
  };
}
