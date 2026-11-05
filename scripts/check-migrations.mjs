// Headless check of the migration path.
// Runs the real schema through sql.js the same way the app does, so a broken
// migration is caught here instead of in the browser.
//
//   node scripts/check-migrations.mjs
//
// Cases:
//   1. Fresh database (version 0) - all migrations + seed must succeed.
//   2. Database already at v2 - tenant migrations must upgrade it in place.
//   3. Database with tenant_id already present - must not fail on duplicates.

import initSqlJs from "sql.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Pull the schema straight out of the TypeScript source so the test always
// exercises what the app actually ships.
const schemaSrc = readFileSync(join(root, "src/db/schema.ts"), "utf8");

/** Reads a `const NAME = \`...\`;` template out of the source. */
function extractConst(name) {
  const re = new RegExp(`const ${name}\\s*=\\s*\`([\\s\\S]*?)\`;`);
  const m = schemaSrc.match(re);
  if (!m) throw new Error(`${name} not found in schema.ts`);
  return m[1];
}

const SYNC_COLUMNS = extractConst("SYNC_COLUMNS");
const TENANT_COLUMN = extractConst("TENANT_COLUMN");

function extractBlock(name) {
  const start = schemaSrc.indexOf(`export const ${name}`);
  if (start === -1) throw new Error(`${name} not found in schema.ts`);
  const arrStart = schemaSrc.indexOf("[", start);
  const arrEnd = schemaSrc.indexOf("\n];", arrStart);
  const body = schemaSrc.slice(arrStart, arrEnd + 3);
  // eslint-disable-next-line no-new-func
  return new Function(
    "SYNC_COLUMNS",
    "TENANT_COLUMN",
    `return ${body.replace(/\bas Migration\[\]/g, "")}`
  )(SYNC_COLUMNS, TENANT_COLUMN);
}

const MIGRATIONS = extractBlock("MIGRATIONS");
const SEED_SQL = extractConst("SEED_SQL");

const SQL = await initSqlJs({ locateFile: (f) => join(root, "node_modules/sql.js/dist", f) });

function freshDb() {
  return new SQL.Database();
}

function versionOf(db) {
  try {
    const r = db.exec("SELECT value FROM meta WHERE key = 'schema_version'");
    return r.length ? Number(r[0].values[0][0]) : 0;
  } catch {
    return 0;
  }
}

// Mirrors splitSqlStatements() in src/db/schema.ts.
function splitSqlStatements(sql) {
  const out = [];
  let current = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      current += ch;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "\\" && quote !== "'") {
          current += sql[i] + (sql[i + 1] ?? "");
          i += 2;
          continue;
        }
        current += sql[i];
        if (sql[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (ch === ";") {
      if (current.trim()) out.push(current.trim());
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

// Mirrors SqlJsSource.migrate() in src/db/index.ts.
function migrate(db) {
  let current = versionOf(db);
  const wasFresh = current === 0;
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      if (m.tolerant) {
        for (const stmt of splitSqlStatements(m.sql)) {
          try {
            db.exec(stmt);
          } catch (e) {
            console.log(
              `  migration ${m.version}: statement failed -> ${e.message}`
            );
          }
        }
      } else {
        try {
          db.exec(m.sql);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const benign =
            msg.includes("duplicate column name") || msg.includes("already exists");
          if (!benign) throw new Error(`migration ${m.version} (${m.name}): ${msg}`);
          console.log(`  migration ${m.version}: skipped benign error -> ${msg}`);
        }
      }
      // Repair after every migration, so a later migration never runs against
      // a half-migrated schema.
      ensureTenantColumns(db);
      current = m.version;
      db.exec(
        `INSERT INTO meta (key, value) VALUES ('schema_version', '${m.version}') ` +
          `ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      );
    }
  }
  if (wasFresh) {
    db.exec(SEED_SQL);
  } else {
    const done = db.exec("SELECT value FROM meta WHERE key = 'bootstrapped_at'");
    if (!done.length) db.exec(SEED_SQL);
  }
  ensureTenantColumns(db);
  return current;
}

// Mirrors SqlJsSource.ensureTenantColumns() in src/db/index.ts.
const TENANT_TABLES = [
  "settings", "users", "audit_log", "patients", "tests", "packages",
  "package_items", "doctors", "invoice_blocks", "invoices", "invoice_items",
  "payments", "expense_categories", "expenses", "payouts",
  "commission_entries", "report_orders", "radiologists", "test_parameters",
  "report_parameters", "samples", "report_result_revisions", "abdm_consents",
  "abdm_outbox", "admissions", "hospital_services", "hospital_charges",
  "hospital_bill_payments", "sync_queue", "sync_ack", "local_export_queue",
  "medicines", "pharmacy_batches", "pharmacy_sales", "pharmacy_sale_items",
];

function ensureTenantColumns(db) {
  for (const table of TENANT_TABLES) {
    try {
      const info = db.exec(`PRAGMA table_info(${table})`);
      if (!info.length) continue;
      const hasTenant = info[0].values.some((r) => r[1] === "tenant_id");
      if (!hasTenant) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT NOT NULL DEFAULT ''`);
        console.log(`  self-heal: added tenant_id to ${table}`);
      }
    } catch {
      /* the migration itself reports unusable tables */
    }
  }
}

const TABLES = [
  "settings", "users", "audit_log", "patients", "tests", "packages",
  "package_items", "doctors", "invoice_blocks", "invoices", "invoice_items",
  "payments", "expense_categories", "expenses", "payouts",
  "commission_entries", "report_orders", "radiologists", "test_parameters",
  "report_parameters", "samples", "report_result_revisions", "abdm_consents",
  "abdm_outbox", "admissions", "hospital_services", "hospital_charges",
  "hospital_bill_payments", "sync_queue", "sync_ack", "local_export_queue",
  "medicines", "pharmacy_batches", "pharmacy_sales", "pharmacy_sale_items",
];

function checkTenantColumns(db, label) {
  const missing = [];
  for (const t of TABLES) {
    const info = db.exec(`PRAGMA table_info(${t})`);
    if (!info.length) { missing.push(`${t} (table missing)`); continue; }
    if (!info[0].values.some((r) => r[1] === "tenant_id")) missing.push(t);
  }
  if (missing.length) {
    throw new Error(`${label}: tables missing tenant_id -> ${missing.join(", ")}`);
  }
}

function checkStarterParameters(db, label) {
  const expected = {
    "test-cbc": 14,
    "test-lft": 11,
    "test-kft": 9,
    "test-lipid": 8,
    "test-urine": 18,
  };
  for (const [testId, count] of Object.entries(expected)) {
    const result = db.exec(
      `SELECT COUNT(*) FROM test_parameters
       WHERE test_id = '${testId}' AND deleted = 0 AND tenant_id = 'tenant-default'`
    );
    const actual = Number(result[0].values[0][0]);
    if (actual !== count) {
      throw new Error(`${label}: ${testId} has ${actual} parameters, expected ${count}`);
    }
  }
}

let failures = 0;
function scenario(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL  ${name}\n      ${e.message}`);
  }
}

// ---- Case 1: migration order ------------------------------------------------
scenario("migration versions are strictly increasing", () => {
  for (let i = 1; i < MIGRATIONS.length; i++) {
    if (MIGRATIONS[i].version <= MIGRATIONS[i - 1].version) {
      throw new Error(
        `migration ${MIGRATIONS[i].version} follows ${MIGRATIONS[i - 1].version}`
      );
    }
  }
});

// ---- Case 2: fresh database -------------------------------------------------
scenario("fresh database: migrate + seed", () => {
  const db = freshDb();
  const v = migrate(db);
  if (v !== MIGRATIONS[MIGRATIONS.length - 1].version) {
    throw new Error(`expected final version, got ${v}`);
  }
  checkTenantColumns(db, "fresh");
  checkStarterParameters(db, "fresh");
  const n = db.exec("SELECT COUNT(*) AS n FROM tests")[0].values[0][0];
  if (Number(n) < 10) throw new Error(`expected seeded test catalogue, got ${n}`);
  const t = db.exec("SELECT COUNT(*) AS n FROM tenants")[0].values[0][0];
  if (Number(t) < 1) throw new Error("expected a default tenant row");
  console.log(`      version=${v}, tests=${n}, tenants=${t}`);
});

// ---- Case 2: an existing pre-tenant database (v2) ----------------------------
scenario("existing v2 database: upgrade in place", () => {
  const db = freshDb();
  // Build the database as it looked before multi-tenant: only v1 + v2.
  for (const m of MIGRATIONS.filter((m) => m.version <= 2)) {
    db.exec(m.sql);
    db.exec(
      `INSERT INTO meta (key, value) VALUES ('schema_version', '${m.version}') ` +
        `ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
  }
  db.exec(SEED_SQL);
  const before = db.exec("SELECT COUNT(*) AS n FROM patients")[0].values[0][0];
  const v = migrate(db);
  checkTenantColumns(db, "v2 upgrade");
  const after = db.exec("SELECT COUNT(*) AS n FROM patients")[0].values[0][0];
  if (Number(after) !== Number(before)) {
    throw new Error(`row count changed during upgrade: ${before} -> ${after}`);
  }
  console.log(`      version=${v}, patients preserved=${after}`);
});

// ---- Case 3: re-running migrations over an already-migrated database ---------
scenario("idempotent: migrate twice on the same database", () => {
  const db = freshDb();
  migrate(db);
  // Force it to re-run every migration by rewinding the version marker.
  db.exec("UPDATE meta SET value = '0' WHERE key = 'schema_version'");
  migrate(db);
  checkTenantColumns(db, "second pass");
  checkStarterParameters(db, "second pass");
  const n = db.exec("SELECT COUNT(*) AS n FROM tests")[0].values[0][0];
  console.log(`      re-migrated cleanly, tests=${n}`);
});

// ---- Case 4: a torn migration (some tables got the column, some did not) -----
scenario("self-heal: repairs a partially applied tenant migration", () => {
  // Build a LEGACY database: the old v1 schema, which had no tenant_id at all.
  // Dropping the column lines also drops a trailing comma, so clean those up.
  const v1 = MIGRATIONS.find((m) => m.version === 1);
  const legacySql = v1.sql
    .split(/\r?\n/)
    .filter((line) => !line.includes("tenant_id"))
    .join("\n")
    .replace(/,(\s*\))/g, "$1");

  const db = freshDb();
  db.exec(legacySql);
  db.exec("INSERT INTO meta (key, value) VALUES ('schema_version', '1')");
  const v2 = MIGRATIONS.find((m) => m.version === 2);
  db.exec(v2.sql);
  db.exec("UPDATE meta SET value = '2' WHERE key = 'schema_version'");

  // Simulate a torn tenant migration: v3 ran, then only SOME of the v4 ALTERs
  // landed before the script aborted on the first duplicate.
  db.exec(MIGRATIONS.find((m) => m.version === 3).sql);
  db.exec("UPDATE meta SET value = '3' WHERE key = 'schema_version'");
  for (const t of ["settings", "patients", "invoices"]) {
    db.exec(`ALTER TABLE ${t} ADD COLUMN tenant_id TEXT NOT NULL DEFAULT ''`);
  }

  const v = migrate(db);
  checkTenantColumns(db, "self-heal");
  if (v !== MIGRATIONS[MIGRATIONS.length - 1].version) {
    throw new Error(`expected final version, got ${v}`);
  }
  console.log(`      repaired, version=${v}`);
});

// ---- Case 5: the SQL text itself contains no stray semicolons in comments ----
scenario("no semicolons inside SQL comments", () => {
  const offenders = [];
  for (const m of MIGRATIONS) {
    m.sql.split(/\r?\n/).forEach((line, i) => {
      if (/^\s*--/.test(line) && line.includes(";")) {
        offenders.push(`migration ${m.version} line ${i + 1}`);
      }
    });
  }
  if (offenders.length) throw new Error(offenders.join("; "));
});

// ---- Case 6: rows written before tenants existed are adopted -------------------
scenario("legacy rows are adopted by the default tenant", () => {
  const db = freshDb();
  migrate(db);

  // Simulate a database written by a build that never set tenant_id: the
  // column exists (it has since v1) but every row holds the default ''.
  db.exec("UPDATE patients SET tenant_id = ''");
  db.exec("UPDATE invoices SET tenant_id = ''");
  db.exec("UPDATE invoice_items SET tenant_id = ''");
  db.exec("UPDATE payments SET tenant_id = ''");
  db.exec("UPDATE users SET tenant_id = ''");
  db.exec(
    "INSERT INTO patients (id, phone, name, created_at, updated_at, device_id, dirty, deleted, tenant_id)" +
      " VALUES ('legacy-p1', '9999999999', 'Legacy Patient', 1, 1, '', 0, 0, '')"
  );
  db.exec(
    "INSERT INTO invoices (id, invoice_no, invoice_date, patient_id, patient_name, total_paise," +
      " created_at, updated_at, device_id, dirty, deleted, tenant_id)" +
      " VALUES ('legacy-i1', 'INV-LEGACY-1', 1, 'legacy-p1', 'Legacy Patient', 100, 1, 1, '', 0, 0, '')"
  );
  // A bootstrap admin for the default tenant, colliding with the legacy one.
  db.exec(
    "INSERT INTO users (id, username, full_name, role, password_hash, must_change_password," +
      " is_active, created_at, updated_at, device_id, dirty, deleted, tenant_id)" +
      " VALUES ('legacy-u1', 'admin', 'Administrator', 'admin', 'legacy-hash', 0, 1, 1, 1, '', 0, 0, '')"
  );
  db.exec(
    "INSERT INTO users (id, username, full_name, role, password_hash, must_change_password," +
      " is_active, created_at, updated_at, device_id, dirty, deleted, tenant_id)" +
      " VALUES ('bootstrap-u1', 'admin', 'Administrator', 'admin', 'x', 1, 1, 1, 1, '', 0, 0, 'tenant-default')"
  );

  // Rewind the version so the adoption migration runs again.
  db.exec("UPDATE meta SET value = '6' WHERE key = 'schema_version'");
  const v = migrate(db);
  if (v !== MIGRATIONS[MIGRATIONS.length - 1].version) {
    throw new Error(`expected final version, got ${v}`);
  }

  const orphan = db.exec(
    "SELECT COUNT(*) FROM patients WHERE tenant_id <> 'tenant-default'"
  )[0].values[0][0];
  if (Number(orphan) !== 0) {
    throw new Error(`${orphan} patient row(s) still outside the default tenant`);
  }
  const patient = db.exec(
    "SELECT tenant_id FROM patients WHERE id = 'legacy-p1'"
  )[0].values[0][0];
  if (patient !== "tenant-default") {
    throw new Error(`legacy patient landed in ${JSON.stringify(patient)}`);
  }
  const invoice = db.exec(
    "SELECT tenant_id FROM invoices WHERE id = 'legacy-i1'"
  )[0].values[0][0];
  if (invoice !== "tenant-default") {
    throw new Error(`legacy invoice landed in ${JSON.stringify(invoice)}`);
  }
  // The legacy account is the real one — it holds the password the user chose
  // and their two-factor enrolment — so it must win, and the bootstrap
  // duplicate must be gone.
  const admins = db.exec(
    "SELECT id, tenant_id, password_hash FROM users WHERE username = 'admin'"
  )[0].values;
  if (admins.length !== 1) {
    throw new Error(`expected 1 admin after adoption, got ${admins.length}`);
  }
  if (admins[0][0] !== "legacy-u1") {
    throw new Error(`the wrong admin survived: ${admins[0][0]}`);
  }
  if (admins[0][1] !== "tenant-default") {
    throw new Error(`surviving admin is in ${admins[0][1]}, not tenant-default`);
  }
  if (admins[0][2] !== "legacy-hash") {
    throw new Error("the surviving admin lost its password hash");
  }
  console.log(`      adopted, version=${v}, admins=${admins.length}`);
});

// ---- Case 7: the adoption migration's tenant id matches the application -------
scenario("adoption migration uses the application's DEFAULT_TENANT_ID", () => {
  const tenantSrc = readFileSync(join(root, "src/db/tenant.ts"), "utf8");
  const m = tenantSrc.match(/DEFAULT_TENANT_ID\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("DEFAULT_TENANT_ID not found in src/db/tenant.ts");
  const adopt = MIGRATIONS.find((x) => x.name.includes("adopt legacy rows"));
  if (!adopt) throw new Error("adoption migration not found");
  const literals = [...adopt.sql.matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
  const wrong = literals.filter((l) => l !== m[1]);
  if (wrong.length) {
    throw new Error(
      `adoption migration uses ${wrong.join(", ")} but DEFAULT_TENANT_ID is ${m[1]}`
    );
  }
  console.log(`      DEFAULT_TENANT_ID=${m[1]}`);
});

// ---- Case 8: a tolerant migration never leaves a statement unapplied ---------
scenario("tolerant migration applies every statement", () => {
  const db = freshDb();
  migrate(db);
  db.exec("UPDATE invoice_items SET tenant_id = ''");
  db.exec("UPDATE meta SET value = '6' WHERE key = 'schema_version'");
  migrate(db);
  const left = db.exec(
    "SELECT COUNT(*) FROM invoice_items WHERE tenant_id <> 'tenant-default'"
  )[0].values[0][0];
  if (Number(left) !== 0) {
    throw new Error(`${left} invoice_items row(s) were left behind`);
  }
  console.log(`      all statements applied`);
});

console.log("");
console.log(failures === 0 ? "All migration checks passed." : `${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
