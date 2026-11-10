// Documentation consistency gate.
//
// A release is not "done" when the binary is built. The version, schema and
// release notes must agree across the product metadata and the documentation
// set. This script fails `npm run check` when they drift, so a release cannot
// silently ship stale docs.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!existsSync(join(root, relativePath))) {
    failures.push(`${relativePath}: required document is missing`);
    return "";
  }
  return read(relativePath);
}

function requireContains(relativePath, needle, label = needle) {
  const text = requireFile(relativePath);
  if (text && !text.includes(needle)) {
    failures.push(`${relativePath}: missing ${label}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
const version = packageJson.version;
const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargoToml = read("src-tauri/Cargo.toml");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const cargoLock = read("src-tauri/Cargo.lock");
const cargoLockVersion = cargoLock.match(
  /\[\[package\]\]\s*\nname = "medicore"\s*\nversion = "([^"]+)"/
)?.[1];
const packageLock = JSON.parse(read("package-lock.json"));
const packageLockVersion =
  packageLock.packages?.[""]?.version ?? packageLock.version;

const schemaVersions = [...read("src/db/schema.ts").matchAll(/^\s*version:\s*(\d+),/gm)]
  .map((match) => Number(match[1]))
  .filter(Number.isFinite);
const schema = schemaVersions.length ? Math.max(...schemaVersions) : 0;

for (const [label, actual] of [
  ["src-tauri/tauri.conf.json", tauri.version],
  ["src-tauri/Cargo.toml", cargoVersion],
  ["src-tauri/Cargo.lock", cargoLockVersion],
  ["package-lock.json", packageLockVersion],
]) {
  if (actual !== version) {
    failures.push(
      `${label}: version ${actual ?? "(missing)"} does not match package.json ${version}`
    );
  }
}

if (!schema) {
  failures.push("src/db/schema.ts: could not determine the latest migration version");
}

const versionedDocs = {
  "docs/README.md": [
    `Product version: \`${version}\``,
    `Database schema: \`${schema}\``,
  ],
  "docs/architecture.md": [
    `Current product version: \`${version}\``,
    `Current schema: \`${schema}\``,
  ],
  "docs/productionization-plan.md": [
    `Current product version: \`${version}\``,
    `Current schema: \`${schema}\``,
  ],
  "docs/deployment-and-readiness.md": [`Current schema: \`${schema}\``],
  "PRODUCTION_COMMERCIAL_READINESS.md": [
    `Product version: \`${version}\``,
    `Database schema: \`${schema}\``,
  ],
  "LOCAL_CSV_EXPORT.md": [
    `Applies to: OmniMed Core desktop \`${version}+`,
    `schema \`${schema}+`,
  ],
  ".opencode/skills/diagbill-test-catalogue/SKILL.md": [
    `Schema: **${schema}**`,
    `Current release at time of writing: **${version}**`,
  ],
};

for (const [file, needles] of Object.entries(versionedDocs)) {
  if (!requireFile(file)) continue;
  for (const needle of needles) {
    requireContains(file, needle);
  }
}

const changelog = requireFile("CHANGELOG.md");
const firstRelease = changelog.match(/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})$/m);
if (!firstRelease) {
  failures.push("CHANGELOG.md: no release heading found");
} else if (firstRelease[1] !== version) {
  failures.push(
    `CHANGELOG.md: top release is ${firstRelease[1]}, expected ${version}`
  );
}

for (const file of [
  "README.md",
  "CHANGELOG.md",
  "RELEASE_TESTING.md",
  "BACKUP_RESTORE.md",
  "PRE_RELEASE_CHECKLIST.md",
  "docs/README.md",
  "docs/architecture.md",
  "docs/product-capabilities.md",
]) {
  requireFile(file);
}

requireContains("docs/README.md", "../RELEASE_TESTING.md", "docs map link to RELEASE_TESTING.md");
requireContains("README.md", "RELEASE_TESTING.md", "README link to RELEASE_TESTING.md");
requireContains("PRE_RELEASE_CHECKLIST.md", "RELEASE_TESTING.md", "checklist link to RELEASE_TESTING.md");

if (process.argv.includes("--release")) {
  const notesPath = `release/v${version}/RELEASE_NOTES.md`;
  const notes = requireFile(notesPath);
  if (notes) {
    if (!notes.includes(version)) {
      failures.push(`${notesPath}: does not mention ${version}`);
    }
    if (!/schema/i.test(notes)) {
      failures.push(`${notesPath}: no schema or upgrade note`);
    }
    if (!/backup/i.test(notes)) {
      failures.push(`${notesPath}: no backup or upgrade instruction`);
    }
  }

  const sumsPath = `release/v${version}/SHA256SUMS.txt`;
  const sums = requireFile(sumsPath);
  if (sums && !/OmniMed\.Core_/.test(sums)) {
    failures.push(`${sumsPath}: no OmniMed Core installer checksums found`);
  }
}

if (failures.length) {
  console.error("FAIL documentation is inconsistent with the release\n");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\nUpdate the version/schema references, CHANGELOG entry and release notes, then rerun."
  );
  process.exit(1);
}

console.log(`PASS documentation matches version ${version} and schema ${schema}`);
