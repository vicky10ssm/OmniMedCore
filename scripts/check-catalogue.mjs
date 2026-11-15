// Audit every exported catalogue parameter.
//
// Usage:
//   node scripts/check-catalogue.mjs <catalogue.json>
//
// The JSON is produced by
// .opencode/skills/diagbill-test-catalogue/scripts/export-catalogue.js
// against a running app.
//
// Exit code 1 means a hard error (missing parameters, duplicate names, invalid
// limits, or a numeric parameter with a range-like reference but null limits).
// Warnings list numeric parameters whose reference is qualitative/method-
// specific and therefore has no numeric limits.

import { existsSync, readFileSync } from "node:fs";

const input =
  process.argv[2] ||
  process.env.CATALOGUE_JSON ||
  "omnimed-catalogue.json";
if (!existsSync(input)) {
  console.error(`Catalogue JSON not found: ${input}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(input, "utf8"));
const tests = Array.isArray(data.tests) ? data.tests : [];
const parameters = Array.isArray(data.parameters) ? data.parameters : [];
const errors = [];
const warnings = [];

const normalize = (value) =>
  String(value ?? "")
    .replace(/,/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

function hasRangeLike(refRange) {
  const text = normalize(refRange);
  if (!text) return false;
  const rangeRe = /([+-]?\d+(?:\.\d+)?)\s*(?:-|to)\s*([+]?\d+(?:\.\d+)?)/gi;
  let match;
  while ((match = rangeRe.exec(text))) {
    const after = text.slice(match.index + match[0].length).trimStart();
    if (/^(y|yr|yrs|year|years)\b/i.test(after)) continue;
    return true;
  }
  return /(?:<=|<|>=|>)\s*[+-]?\d+(?:\.\d+)?/.test(text);
}

const testByCode = new Map();
const seenCodes = new Set();
const seenNames = new Set();
for (const test of tests) {
  const code = String(test.code ?? "").trim();
  const name = String(test.name ?? "").trim().toLowerCase();
  if (!code) errors.push(`Test with empty code: ${test.name}`);
  if (seenCodes.has(code)) errors.push(`Duplicate test code: ${code}`);
  if (name && seenNames.has(name)) errors.push(`Duplicate test name: ${test.name}`);
  seenCodes.add(code);
  if (name) seenNames.add(name);
  testByCode.set(code, test);
}

const paramsByCode = new Map();
for (const parameter of parameters) {
  const code = String(parameter.test_code ?? "").trim();
  const list = paramsByCode.get(code) ?? [];
  list.push(parameter);
  paramsByCode.set(code, list);
}

for (const test of tests) {
  const code = String(test.code ?? "").trim();
  const list = paramsByCode.get(code) ?? [];
  if (String(test.category) === "X-Ray") {
    if (list.length > 0) {
      errors.push(`X-ray ${code} has ${list.length} parameter(s); X-rays must have none`);
    }
    continue;
  }
  if (list.length === 0) {
    errors.push(`Pathology ${code} has no parameters`);
    continue;
  }
  const names = new Set();
  for (const parameter of list) {
    const name = String(parameter.name ?? "").trim().toLowerCase();
    if (names.has(name)) {
      errors.push(`Duplicate parameter '${parameter.name}' on ${code}`);
    }
    names.add(name);
  }
}

for (const parameter of parameters) {
  const code = String(parameter.test_code ?? "").trim();
  const label = `${code} / ${parameter.name}`;
  const refRange = String(parameter.ref_range ?? "").trim();
  const min = parameter.ref_min;
  const max = parameter.ref_max;
  const numeric = String(parameter.report_type ?? "") === "numeric";

  if (!refRange) errors.push(`${label}: blank reference range`);

  if (numeric) {
    if (min != null && max != null && Number(min) > Number(max)) {
      errors.push(`${label}: ref_min ${min} is greater than ref_max ${max}`);
    }
    if (min == null && max == null) {
      if (hasRangeLike(refRange)) {
        errors.push(`${label}: range-like reference but null numeric limits`);
      } else {
        warnings.push(
          `${label}: numeric with no limits (qualitative/method-specific): ${refRange}`
        );
      }
    }
    if (min != null && max != null && refRange) {
      const text = normalize(refRange);
      const hasMin = text.includes(String(min));
      const hasMax = text.includes(String(max));
      if (!hasMin || !hasMax) {
        warnings.push(`${label}: limits ${min}-${max} do not fully appear in reference text`);
      }
    }
    const unitless = new Set(["ph", "specific gravity"]);
    if (
      !String(parameter.unit ?? "").trim() &&
      !unitless.has(String(parameter.name ?? "").trim().toLowerCase())
    ) {
      warnings.push(`${label}: numeric parameter has no unit`);
    }
  }
}

const pathology = tests.filter((test) => String(test.category) !== "X-Ray");
const xray = tests.filter((test) => String(test.category) === "X-Ray");
const numeric = parameters.filter((p) => String(p.report_type ?? "") === "numeric");
const unresolved = numeric.filter((p) => p.ref_min == null && p.ref_max == null);

console.log(`Catalogue: ${input}`);
console.log(
  `Tests: ${tests.length} (${pathology.length} pathology, ${xray.length} X-ray)`
);
console.log(`Parameters: ${parameters.length} (${numeric.length} numeric)`);
console.log(`Numeric without limits: ${unresolved.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length) {
  console.log("\nErrors:");
  for (const error of errors) console.log(`  - ${error}`);
}
if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (errors.length) process.exit(1);
console.log("\nPASS parameter catalogue checks");
