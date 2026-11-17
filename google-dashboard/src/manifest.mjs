// Validation for the _manifest.json written by the Rust full-snapshot exporter.
//
// The manifest is the contract between OmniMed Core and the dashboard pipeline.
// A snapshot is accepted only when it is complete enough to load and cannot
// escape the configured folder through a crafted file name.

export class ManifestError extends Error {
  constructor(message) {
    super(message);
    this.name = "ManifestError";
  }
}

const SNAPSHOT_ID = /^snapshot_\d{8}_\d{6}_[a-f0-9]{6}(?:-\d+)?$/;
const SAFE_TABLE = /^[a-z][a-z0-9_]*$/;
const SAFE_FILE = /^[a-z][a-z0-9_]*\.csv$/;

export function isSnapshotId(value) {
  return SNAPSHOT_ID.test(String(value ?? ""));
}

export function snapshotTimestamp(snapshotId) {
  const match = /^snapshot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(
    String(snapshotId)
  );
  if (!match) return null;
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  );
}

/**
 * @param {unknown} manifest
 * @returns {{version: 1, exportedAt: number, tenantId: string, files: Array<{table: string, file: string, rows: number, columns: string[]}>, excludedColumns: string[], skippedTables: string[]}}
 */
export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ManifestError("Manifest is not an object");
  }
  if (manifest.version !== 1) {
    throw new ManifestError(`Unsupported manifest version: ${manifest.version}`);
  }
  const exportedAt = Number(manifest.exported_at);
  if (!Number.isFinite(exportedAt) || exportedAt <= 0) {
    throw new ManifestError("Manifest exported_at is missing or invalid");
  }
  const tenantId = String(manifest.tenant_id ?? "").trim();
  if (!tenantId) {
    throw new ManifestError("Manifest tenant_id is blank");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new ManifestError("Manifest has no files");
  }

  const tables = new Set();
  const files = [];
  for (const entry of manifest.files) {
    if (!entry || typeof entry !== "object") {
      throw new ManifestError("Manifest file entry is not an object");
    }
    const table = String(entry.table ?? "").trim();
    const file = String(entry.file ?? "").trim();
    if (!SAFE_TABLE.test(table)) {
      throw new ManifestError(`Unsafe table name: ${table || "(blank)"}`);
    }
    if (!SAFE_FILE.test(file)) {
      throw new ManifestError(`Unsafe file name: ${file || "(blank)"}`);
    }
    if (file !== `${table}.csv`) {
      throw new ManifestError(`File ${file} does not match table ${table}`);
    }
    if (tables.has(table)) {
      throw new ManifestError(`Duplicate table in manifest: ${table}`);
    }
    tables.add(table);

    const rows = Number(entry.rows);
    if (!Number.isSafeInteger(rows) || rows < 0) {
      throw new ManifestError(`Invalid row count for ${table}`);
    }
    if (!Array.isArray(entry.columns) || entry.columns.length === 0) {
      throw new ManifestError(`Manifest has no columns for ${table}`);
    }
    const columns = entry.columns.map((column) => String(column).trim());
    if (columns.some((column) => !column)) {
      throw new ManifestError(`Manifest has a blank column for ${table}`);
    }
    if (new Set(columns.map((column) => column.toLowerCase())).size !== columns.length) {
      throw new ManifestError(`Manifest has duplicate columns for ${table}`);
    }

    files.push({ table, file, rows, columns });
  }

  return {
    version: 1,
    exportedAt,
    tenantId,
    files,
    excludedColumns: Array.isArray(manifest.excluded_columns)
      ? manifest.excluded_columns.map(String)
      : [],
    skippedTables: Array.isArray(manifest.skipped_tables)
      ? manifest.skipped_tables.map(String)
      : [],
  };
}
