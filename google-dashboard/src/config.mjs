const DEFAULTS = {
  bqLocation: "asia-south1",
  bqDataset: "omnimed_reporting",
  bqRawDataset: "omnimed_reporting_raw",
  maxSnapshotAgeHours: 48,
  maxFileBytes: 100 * 1024 * 1024,
  maxRowsPerTable: 500_000,
  maxColumns: 256,
  maxFieldChars: 1_000_000,
  allowMissingTables: false,
  rawRetentionDays: 90,
};

function bool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function integer(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function loadConfig(env = process.env) {
  const config = {
    driveFolderId: String(env.DRIVE_FOLDER_ID ?? "").trim(),
    projectId: String(
      env.GOOGLE_CLOUD_PROJECT ?? env.GCLOUD_PROJECT ?? ""
    ).trim(),
    bqLocation: String(env.BQ_LOCATION ?? DEFAULTS.bqLocation).trim(),
    bqDataset: String(env.BQ_DATASET ?? DEFAULTS.bqDataset).trim(),
    bqRawDataset: String(
      env.BQ_RAW_DATASET ?? DEFAULTS.bqRawDataset
    ).trim(),
    maxSnapshotAgeHours: integer(
      env.MAX_SNAPSHOT_AGE_HOURS,
      DEFAULTS.maxSnapshotAgeHours
    ),
    maxFileBytes: integer(env.MAX_FILE_BYTES, DEFAULTS.maxFileBytes),
    maxRowsPerTable: integer(
      env.MAX_ROWS_PER_TABLE,
      DEFAULTS.maxRowsPerTable
    ),
    maxColumns: integer(env.MAX_COLUMNS, DEFAULTS.maxColumns),
    maxFieldChars: integer(env.MAX_FIELD_CHARS, DEFAULTS.maxFieldChars),
    allowMissingTables: bool(env.ALLOW_MISSING_TABLES, false),
    requireFreshSnapshot: bool(env.REQUIRE_FRESH_SNAPSHOT, false),
    rawRetentionDays: integer(
      env.RAW_RETENTION_DAYS,
      DEFAULTS.rawRetentionDays
    ),
    datasetLocation: String(env.BQ_LOCATION ?? DEFAULTS.bqLocation).trim(),
  };

  if (!config.bqDataset || !config.bqRawDataset) {
    throw new Error("BQ_DATASET and BQ_RAW_DATASET must be set");
  }
  if (config.bqDataset === config.bqRawDataset) {
    throw new Error("BQ_DATASET and BQ_RAW_DATASET must be different");
  }
  return config;
}

export function requireDriveConfig(config) {
  if (!config.driveFolderId) {
    throw new Error("DRIVE_FOLDER_ID is required for Drive ingestion");
  }
}

export function requireBigQueryConfig(config) {
  if (!config.projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT is required for BigQuery ingestion");
  }
}

export function snapshotIsStale(exportedAt, config, now = Date.now()) {
  const ageHours = (now - exportedAt) / 3_600_000;
  return ageHours > config.maxSnapshotAgeHours;
}
