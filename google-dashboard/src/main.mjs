#!/usr/bin/env node

import { loadConfig, requireBigQueryConfig, requireDriveConfig } from "./config.mjs";
import { createLocalSource } from "./localSource.mjs";
import { runSnapshot } from "./pipeline.mjs";
import { PipelineError } from "./pipeline.mjs";

const logger = {
  info: (message) => console.log(JSON.stringify({ level: "info", message })),
  warn: (message) => console.warn(JSON.stringify({ level: "warn", message })),
  error: (message) => console.error(JSON.stringify({ level: "error", message })),
};

function parseArgs(argv) {
  const args = { source: "auto", dryRun: false, folder: "", snapshot: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--source") args.source = argv[++index] ?? "";
    else if (arg === "--folder") args.folder = argv[++index] ?? "";
    else if (arg === "--snapshot") args.snapshot = argv[++index] ?? "";
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node src/main.mjs --source local --folder "<path to full-export>" [--dry-run]
  node src/main.mjs --source drive [--dry-run] [--snapshot snapshot_YYYYMMDD_HHMMSS_abcdef]

Environment:
  DRIVE_FOLDER_ID, GOOGLE_CLOUD_PROJECT, BQ_LOCATION, BQ_DATASET, BQ_RAW_DATASET
  MAX_SNAPSHOT_AGE_HOURS, MAX_FILE_BYTES, MAX_ROWS_PER_TABLE, ALLOW_MISSING_TABLES
  REQUIRE_FRESH_SNAPSHOT`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const config = loadConfig();
  const source =
    args.source === "local" || (args.source === "auto" && args.folder)
      ? createLocalSource(args.folder, logger)
      : await createDriveSourceFromConfig(config);
  if (source.kind === "drive") requireDriveConfig(config);

  if (args.dryRun) {
    const result = await runSnapshot({
      source,
      warehouse: dryRunWarehouse(),
      config,
      logger,
      requestedSnapshotId: args.snapshot,
      dryRun: true,
    });
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }

  requireBigQueryConfig(config);
  const warehouse = await createBigQueryWarehouseFromConfig(config);
  const result = await runSnapshot({
    source,
    warehouse,
    config,
    logger,
    requestedSnapshotId: args.snapshot,
  });
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

function dryRunWarehouse() {
  return {
    async hasActiveSnapshot() {
      return false;
    },
    async ensureInfrastructure() {
      throw new Error("Dry-run warehouse must not be used for writes");
    },
    async beginSnapshot() {
      throw new Error("Dry-run warehouse must not be used for writes");
    },
    async appendSnapshotTable() {
      throw new Error("Dry-run warehouse must not be used for writes");
    },
    async activateSnapshot() {
      throw new Error("Dry-run warehouse must not be used for writes");
    },
    async recordRun() {
      throw new Error("Dry-run warehouse must not be used for writes");
    },
  };
}

async function createDriveSourceFromConfig(config) {
  const { createDriveSource } = await import("./googleDrive.mjs");
  return createDriveSource(config.driveFolderId, logger);
}

async function createBigQueryWarehouseFromConfig(config) {
  const { createBigQueryWarehouse } = await import("./googleBigQuery.mjs");
  return createBigQueryWarehouse(config, logger);
}

main().catch((error) => {
  if (error instanceof PipelineError) {
    logger.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details));
  } else {
    logger.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
});
