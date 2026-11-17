import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, readCsvTable, unguardFormula } from "../src/csv.mjs";
import { validateManifest } from "../src/manifest.mjs";
import {
  chooseLatestSnapshot,
  buildSnapshotPlan,
} from "../src/plan.mjs";
import { runSnapshot } from "../src/pipeline.mjs";
import { createLocalSource } from "../src/localSource.mjs";
import { DASHBOARD_TABLES } from "../src/dashboardSchema.mjs";
import {
  FakeWarehouse,
  SNAPSHOT_ID,
  TENANT,
  writeSnapshot,
} from "./helpers.mjs";

const quiet = { info() {}, warn() {}, error() {} };

test("CSV parser handles quotes, embedded newlines, CRLF and formula guards", () => {
  const text =
    'A,B,C\r\n"hello, world","line 1\nline 2","he said ""hi"""\r\n\'=1+1,plain,\r\n';
  const table = readCsvTable(text);
  assert.deepEqual(table.header, ["A", "B", "C"]);
  assert.equal(table.rows[0].A, "hello, world");
  assert.equal(table.rows[0].B, "line 1\nline 2");
  assert.equal(table.rows[0].C, 'he said "hi"');
  assert.equal(table.rows[1].A, "=1+1");
  assert.equal(unguardFormula("'=1+1"), "=1+1");
  assert.equal(unguardFormula("'ordinary"), "'ordinary");
});

test("CSV parser rejects malformed headers and unbalanced quotes", () => {
  assert.throws(() => readCsvTable("A,A\n1,2\n"), /duplicate column/);
  assert.throws(() => readCsvTable('A,B\n"unterminated,2\n'), /Unterminated/);
  assert.throws(() => parseCsv('A\n"x"y\n'), /closing quote/);
  assert.throws(() => readCsvTable("A\n1,2\n"), /header has/);
});

test("manifest validation rejects unsafe or incomplete snapshots", async () => {
  const { base, manifest } = await writeSnapshot();
  const valid = validateManifest(manifest);
  assert.equal(valid.tenantId, TENANT);

  assert.throws(
    () =>
      validateManifest({
        ...manifest,
        files: [
          { ...manifest.files[0], table: "../escape", file: "escape.csv" },
        ],
      }),
    /Unsafe table/
  );
  assert.throws(
    () =>
      validateManifest({
        ...manifest,
        files: [
          { ...manifest.files[0], file: "other.csv" },
        ],
      }),
    /does not match/
  );
  assert.throws(
    () => validateManifest({ ...manifest, files: [] }),
    /no files/
  );
  await rm(base, { recursive: true, force: true });
});

test("plan selects the newest snapshot and removes unapproved PII columns", async () => {
  const { base } = await writeSnapshot();
  const source = createLocalSource(base, quiet);
  const snapshots = await source.listSnapshots();
  const latest = chooseLatestSnapshot(snapshots);
  const plan = buildSnapshotPlan(latest, { warn() {} });

  assert.equal(plan.snapshotId, SNAPSHOT_ID);
  assert.equal(plan.tenantId, TENANT);
  const invoices = plan.tables.find((table) => table.table === "invoices");
  assert.ok(invoices);
  assert.ok(!invoices.columns.includes("patient_name"));
  assert.ok(!invoices.columns.includes("notes"));
  assert.ok(invoices.columns.includes("tenant_id"));
  await rm(base, { recursive: true, force: true });
});

test("plan fails closed when a required table is missing", async () => {
  const { base } = await writeSnapshot({ tables: ["tenants", "invoices"] });
  const source = createLocalSource(base, quiet);
  const [snapshot] = await source.listSnapshots();
  assert.throws(
    () => buildSnapshotPlan(snapshot, { warn() {} }),
    /missing required dashboard tables/
  );
  await rm(base, { recursive: true, force: true });
});

test("pipeline loads every table before activating the snapshot", async () => {
  const { base } = await writeSnapshot();
  const source = createLocalSource(base, quiet);
  const warehouse = new FakeWarehouse();
  const result = await runSnapshot({
    source,
    warehouse,
    config: { maxFileBytes: 10_000_000, maxRowsPerTable: 1000, maxColumns: 100, maxFieldChars: 100_000, allowMissingTables: false },
    logger: quiet,
  });

  assert.equal(result.tenantId, TENANT);
  assert.equal(warehouse.active, SNAPSHOT_ID);
  const activateIndex = warehouse.actions.indexOf(`activate:${SNAPSHOT_ID}`);
  assert.ok(activateIndex > 0);
  for (const action of warehouse.actions) {
    if (action.startsWith("append:")) {
      assert.ok(warehouse.actions.indexOf(action) < activateIndex);
    }
  }
  assert.equal(warehouse.runs.at(-1).status, "success");
  await rm(base, { recursive: true, force: true });
});

test("pipeline never activates a snapshot when a table load fails", async () => {
  const { base } = await writeSnapshot();
  const source = createLocalSource(base, quiet);
  const warehouse = new FakeWarehouse();
  warehouse.failOnTable = "payments";

  await assert.rejects(
    () =>
      runSnapshot({
        source,
        warehouse,
        config: { maxFileBytes: 10_000_000, maxRowsPerTable: 1000, maxColumns: 100, maxFieldChars: 100_000, allowMissingTables: false },
        logger: quiet,
      }),
    /was not activated/
  );
  assert.equal(warehouse.active, null);
  assert.equal(warehouse.runs.at(-1).status, "failed");
  await rm(base, { recursive: true, force: true });
});

test("pipeline is idempotent for an already active snapshot", async () => {
  const { base } = await writeSnapshot();
  const source = createLocalSource(base, quiet);
  const warehouse = new FakeWarehouse();
  warehouse.active = SNAPSHOT_ID;
  const result = await runSnapshot({
    source,
    warehouse,
    config: { maxFileBytes: 10_000_000, maxRowsPerTable: 1000, maxColumns: 100, maxFieldChars: 100_000, allowMissingTables: false },
    logger: quiet,
  });
  assert.equal(result.skipped, true);
  assert.deepEqual(warehouse.actions, [`check:${SNAPSHOT_ID}`]);
  await rm(base, { recursive: true, force: true });
});

test("pipeline rejects a row-count mismatch without activating", async () => {
  const { base, folder } = await writeSnapshot();
  const manifestPath = join(folder, "_manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.files.find((file) => file.table === "invoices").rows = 99;
  await writeFile(manifestPath, JSON.stringify(manifest), "utf8");

  const source = createLocalSource(base, quiet);
  const warehouse = new FakeWarehouse();
  await assert.rejects(
    () =>
      runSnapshot({
        source,
        warehouse,
        config: { maxFileBytes: 10_000_000, maxRowsPerTable: 1000, maxColumns: 100, maxFieldChars: 100_000, allowMissingTables: false },
        logger: quiet,
      }),
    /manifest says 99/
  );
  assert.equal(warehouse.active, null);
  await rm(base, { recursive: true, force: true });
});

test("dashboard allowlists never contain patient names, notes or secrets", () => {
  const forbidden = [
    "patient_name",
    "phone",
    "address",
    "dob",
    "abha_id",
    "password_hash",
    "totp_secret",
    "recovery_codes",
    "notes",
    "comments",
    "findings",
    "impression",
  ];
  for (const [table, contract] of Object.entries(DASHBOARD_TABLES)) {
    for (const column of forbidden) {
      assert.ok(
        !contract.columns.includes(column),
        `${table} must not expose ${column}`
      );
    }
  }
});

test("BigQuery views reference only approved raw tables and columns", async () => {
  const views = await readFile(
    new URL("../sql/views.sql", import.meta.url),
    "utf8"
  );
  const tables = [...views.matchAll(/__RAW__\.raw_([a-z_]+)/g)].map(
    (match) => match[1]
  );
  assert.ok(tables.length > 0);
  for (const table of new Set(tables)) {
    assert.ok(DASHBOARD_TABLES[table], `view references unknown table ${table}`);
  }
  for (const forbidden of [
    "patient_name",
    "password_hash",
    "totp_secret",
    "recovery_codes",
    "clinical_history",
    "findings_text",
    "impression_text",
    "signature",
  ]) {
    assert.ok(
      !views.includes(forbidden),
      `view must not expose ${forbidden}`
    );
  }
});

test("desktop sync source has no dashboard, cloud or network dependency", async () => {
  const root = new URL("../../", import.meta.url);
  const syncEngine = await readFile(new URL("src/sync/syncEngine.ts", root), "utf8");
  const fullExport = await readFile(new URL("src/sync/fullExport.ts", root), "utf8");
  for (const text of [syncEngine, fullExport]) {
    assert.ok(!/googleapis|@google-cloud\/bigquery|google-dashboard/i.test(text));
    assert.ok(!/\bfetch\s*\(/.test(text));
    assert.ok(!/https?:\/\//.test(text));
  }
});
