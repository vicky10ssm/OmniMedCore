// Static tenant-scope check.
//
// Every business table carries a tenant_id. A query that omits the tenant
// predicate will read (or write) another centre's data the moment a second
// tenant exists, and that is a silent leak — nothing crashes, the numbers
// just quietly mix.
//
// This script reads the source and asserts that every database call touching
// a tenant table is either:
//
//   SELECT / UPDATE / DELETE  ->  the call uses a tenant predicate helper
//                                 (tenantAnd / tenantWhere / tenantAndOn /
//                                 tenantFilter) or names tenant_id explicitly
//   INSERT                     ->  the column list includes tenant_id
//
// It is a lint, not a proof: it catches the common mistake of adding a new
// query and forgetting the scope. Run it with `npm run check:scope`.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");

/**
 * The tables that carry a tenant_id, read from TENANT_TABLES in
 * src/db/tenant.ts so there is exactly one list to keep up to date.
 */
function readTenantTables() {
  const src = readFileSync(join(SRC, "db", "tenant.ts"), "utf8");
  const block = src.match(/TENANT_TABLES\s*=\s*\[([\s\S]*?)\]/);
  if (!block) {
    console.error("Could not find TENANT_TABLES in src/db/tenant.ts");
    process.exit(1);
  }
  const names = [...block[1].matchAll(/["']([a-z_]+)["']/g)].map((m) => m[1]);
  if (names.length === 0) {
    console.error("TENANT_TABLES in src/db/tenant.ts is empty");
    process.exit(1);
  }
  return new Set(names);
}

const TENANT_TABLES = readTenantTables();

/** Files that legitimately talk to the tenant registry or the schema itself. */
const EXEMPT_FILES = new Set(["src/db/schema.ts", "src/db/tenant.ts"]);

/** Helpers that inject a tenant predicate into a query. */
const PREDICATE_HELPERS = [
  "tenantAnd",
  "tenantWhere",
  "tenantAndOn",
  "tenantFilter",
];

const failures = [];
const checked = { calls: 0, scoped: 0 };

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/**
 * Splits a source file into its string/template literals.
 * Returns { text, start } where text has the literal's *contents*.
 */
function literals(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      let body = "";
      while (j < src.length) {
        if (src[j] === "\\" && quote !== "`") {
          body += src[j] + src[j + 1];
          j += 2;
          continue;
        }
        if (src[j] === "\\" && quote === "`") {
          // Inside a template literal a backslash escapes the next char.
          body += src[j] + src[j + 1];
          j += 2;
          continue;
        }
        if (src[j] === quote) break;
        body += src[j];
        j += 1;
      }
      out.push({ quote, body, start: i });
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return out;
}

/** Returns the index just past the matching close paren, or -1. */
function matchParen(src, open) {
  let depth = 0;
  let i = open;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") i += 1;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return -1;
}

/** The first argument of a call, as source text. */
function firstArg(callText, openOffset) {
  const inner = callText.slice(openOffset + 1, callText.length - 1);
  let depth = 0;
  let i = 0;
  while (i < inner.length) {
    const ch = inner[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < inner.length && inner[i] !== quote) {
        if (inner[i] === "\\") i += 1;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
    else if (ch === "," && depth === 0) return inner.slice(0, i);
    i += 1;
  }
  return inner;
}

function tablesReferenced(sql) {
  const found = new Set();
  const re = /\b(?:FROM|JOIN|INTO|UPDATE)\s+`?([A-Za-z_][A-Za-z0-9_]*)`?/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const name = m[1].toLowerCase();
    if (TENANT_TABLES.has(name)) found.add(name);
  }
  return [...found];
}

function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

function checkFile(file) {
  const rel = relative(ROOT, file).split("\\").join("/");
  if (EXEMPT_FILES.has(rel)) return;

  const src = readFileSync(file, "utf8");

  // Find every db.<method>( ... ) call. The method may carry a generic type
  // argument (db.get<UserRow>(...)), which must not be mistaken for the call.
  const callRe = /\b(?:db|this|src)\.(all|get|run)\s*(?:<[^<>]*>)?\s*\(/g;
  let m;
  while ((m = callRe.exec(src)) !== null) {
    const open = src.indexOf("(", m.index);
    const end = matchParen(src, open);
    if (end === -1) continue;

    const callText = src.slice(open, end);
    const sqlArg = firstArg(callText, 0);

    // Reconstruct the SQL as it will actually be sent: the first argument is
    // either a bare string or a template literal with ${...} holes.
    const litMatch = sqlArg.match(/^\s*(["'`])([\s\S]*)\1\s*$/);
    if (!litMatch) continue;
    const sql = litMatch[2];
    if (!/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql)) continue;

    const tables = tablesReferenced(sql);
    if (tables.length === 0) continue;

    checked.calls += 1;
    const line = lineOf(src, open);

    if (/^\s*INSERT/i.test(sql)) {
      // The column list must carry tenant_id.
      const cols = sql.match(/\(([^)]*)\)/);
      const colList = cols ? cols[1] : "";
      if (!/\btenant_id\b/i.test(colList)) {
        failures.push(
          `${rel}:${line}  INSERT into ${tables.join(", ")} does not set tenant_id`
        );
      } else {
        checked.scoped += 1;
      }
      continue;
    }

    // SELECT / UPDATE / DELETE: the call must apply a tenant predicate.
    // The predicate is injected by a helper, so it shows up in the source as a
    // ${tenantClause} hole; an explicit `tenant_id` in the SQL counts too.
    const hasPredicate = /tenant/i.test(sqlArg);
    if (hasPredicate) checked.scoped += 1;
    else {
      failures.push(
        `${rel}:${line}  ${sql.slice(0, 60).replace(/\s+/g, " ").trim()}… ` +
          `(table ${tables.join(", ")}) is not tenant-scoped`
      );
    }

    // A write with no WHERE clause rewrites the whole table. It reads as
    // tenant-scoped when the predicate helper is interpolated, but without the
    // keyword "WHERE" SQLite folds "AND tenant_id = ?" into the SET list as an
    // expression and every row is overwritten. See src/db/settings.ts.
    if (/^\s*(UPDATE|DELETE)/i.test(sql)) {
      if (!/\bWHERE\b/i.test(sql) && !hasWhereClause(src, m.index, sqlArg)) {
        failures.push(
          `${rel}:${line}  ${sql.slice(0, 60).replace(/\s+/g, " ").trim()}… ` +
            `(table ${tables.join(", ")}) has no WHERE clause — it would rewrite every row`
        );
      }
    }
  }
}

/**
 * True when the statement gets its WHERE clause from an interpolated helper.
 *
 * `tenantWhere()` expands to "WHERE tenant_id = ?" and is safe to use on a
 * statement that has no WHERE of its own. `tenantAnd()` and `tenantAndOn()`
 * expand to "AND …", which is only valid after an existing WHERE — used on a
 * bare UPDATE, SQLite parses the AND as part of the SET list and rewrites
 * every row. The helper is found by looking back from the call site for the
 * nearest destructuring of the hole's name.
 */
function hasWhereClause(src, callIndex, sqlArg) {
  const holes = [...sqlArg.matchAll(/\$\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}/g)];
  for (const hole of holes) {
    const name = hole[1];
    // Nearest preceding `const [name, ...] = tenantWhere(` wins.
    const re = new RegExp(
      `const\\s*\\[\\s*${name}\\s*,[^\\]]*\\]\\s*=\\s*(tenantWhere|tenantAnd|tenantAndOn|tenantFilter)\\s*\\(`,
      "g"
    );
    let last = null;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m.index > callIndex) break;
      last = m;
    }
    if (last && last[1] === "tenantWhere") return true;
  }
  return false;
}

const files = walk(SRC);
for (const file of files) checkFile(file);

if (failures.length > 0) {
  console.error(
    `\n✗ ${failures.length} tenant-scope problem(s) found:\n` +
      failures.map((f) => `   ${f}`).join("\n") +
      "\n"
  );
  console.error(
    "Use tenantAnd() / tenantWhere() / tenantAndOn() from src/db/tenant.ts,\n" +
      "and set tenant_id on every INSERT.\n"
  );
  process.exit(1);
}

console.log(
  `✓ tenant scope OK — ${checked.calls} database call(s) checked, ` +
    `${checked.scoped} tenant-scoped, 0 unscoped.`
);
