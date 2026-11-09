// Render the OmniMed Core test/parameter/package catalogue from a JSON export.
//
// Usage:
//   node scripts/render-catalogue.mjs <catalogue.json> <references-dir>
//
// The JSON shape is produced by the live database query documented in
// references/regenerate.md. The source of truth remains:
//   src/db/starterTests.ts
//   src/db/starterParameters.ts
//   src/db/starterPackages.ts

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [input, outputDir] = process.argv.slice(2);
if (!input || !outputDir) {
  console.error("Usage: node render-catalogue.mjs <catalogue.json> <references-dir>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(input, "utf8"));
const tests = Array.isArray(data.tests) ? data.tests : [];
const parameters = Array.isArray(data.parameters) ? data.parameters : [];
const packages = Array.isArray(data.packages) ? data.packages : [];

const paramsByTest = new Map();
for (const parameter of parameters) {
  const list = paramsByTest.get(parameter.test_code) ?? [];
  list.push(parameter);
  paramsByTest.set(parameter.test_code, list);
}

const packagesByName = new Map();
for (const item of packages) {
  const list = packagesByName.get(item.package_name) ?? [];
  list.push(item);
  packagesByName.set(item.package_name, list);
}

const md = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const inr = (paise) => `₹${(Number(paise ?? 0) / 100).toFixed(2)}`;
const unique = (values) => [...new Set(values.filter(Boolean))];

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
}).format(new Date());
const pathology = tests.filter((test) => test.category === "Pathology");
const xray = tests.filter((test) => test.category === "X-Ray");
const other = tests.filter(
  (test) => test.category !== "Pathology" && test.category !== "X-Ray"
);

const lines = [
  "# OmniMed Core starter test catalogue",
  "",
  `Generated: ${today}`,
  "",
  "> This is a generated snapshot. If it disagrees with the database/code, fix the source and regenerate.",
  "> Source of truth: `src/db/starterTests.ts`, `src/db/starterParameters.ts` and",
  "> `src/db/starterPackages.ts`.",
  "",
  "## Counts",
  "",
  `- Tests: **${tests.length}**`,
  `- Pathology: **${pathology.length}**`,
  `- X-ray: **${xray.length}**`,
  `- Other: **${other.length}**`,
  `- Active parameters: **${parameters.length}**`,
  `- Packages with at least one item: **${packagesByName.size}**`,
  "",
  "Every pathology test has at least one parameter. X-ray tests intentionally have none and use the",
  "radiology findings/impression form. A package is a price/name wrapper; its component tests keep their",
  "own parameters.",
  "",
];

function renderTests(title, rows) {
  lines.push(`## ${title}`, "");
  const departments = unique(rows.map((row) => row.department || "Unspecified"));
  for (const department of departments) {
    lines.push(`### ${department}`, "");
    const departmentTests = rows
      .filter((row) => (row.department || "Unspecified") === department)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const test of departmentTests) {
      const testParams = paramsByTest.get(test.code) ?? [];
      lines.push(`#### \`${md(test.code)}\` — ${md(test.name)}`, "");
      lines.push(
        `- Category: ${md(test.category)}`
      );
      lines.push(
        `- Specimen: ${md(test.specimen_type || "—")} | Container: ${md(test.container_type || "—")}`
      );
      lines.push(
        `- Method: ${md(test.method || "—")} | Report type: ${md(test.report_type || "—")}`
      );
      lines.push(
        `- Price: ${inr(test.price_paise)} | GST: ${Number(test.gst_rate_bp ?? 0) / 100}%`
      );
      if (testParams.length === 0) {
        lines.push("- Parameters: **none** (text-only/radiology report)");
      } else {
        lines.push(`- Parameters (${testParams.length}):`);
        for (const parameter of testParams) {
          const ref = parameter.ref_range
            ? `; ref ${md(parameter.ref_range)}`
            : "";
          const unit = parameter.unit ? ` ${md(parameter.unit)}` : "";
          const type = parameter.report_type ? `; ${md(parameter.report_type)}` : "";
          const section = parameter.section_name
            ? `[${md(parameter.section_name)}] `
            : "";
          lines.push(`  - ${section}${md(parameter.name)}${unit}${ref}${type}`);
        }
      }
      lines.push("");
    }
  }
}

renderTests("Pathology", pathology);
if (xray.length) {
  renderTests("X-ray / Radiography", xray);
}
if (other.length) {
  renderTests("Other", other);
}

const packageLines = [
  "# OmniMed Core starter combined packages",
  "",
  `Generated: ${today}`,
  "",
  "> This is a generated snapshot. Source of truth: `src/db/starterPackages.ts`.",
  "> A package is a price/name wrapper; every component test keeps its own parameters.",
  "",
  "## Packages",
  "",
];

for (const [name, items] of [...packagesByName.entries()].sort((a, b) =>
  a[0].localeCompare(b[0])
)) {
  const first = items[0];
  packageLines.push(`### ${md(name)}`, "");
  packageLines.push(
    `- Price: ${inr(first.price_paise)} | GST: ${Number(first.gst_rate_bp ?? 0) / 100}%`
  );
  packageLines.push(`- Tests (${items.length}):`);
  for (const item of items) {
    packageLines.push(`  - \`${md(item.test_code)}\` — ${md(item.test_name)} (${md(item.category)})`);
  }
  packageLines.push("");
}

writeFileSync(join(outputDir, "test-catalogue.md"), `${lines.join("\n").trim()}\n`);
writeFileSync(join(outputDir, "packages.md"), `${packageLines.join("\n").trim()}\n`);
console.log(
  `Rendered ${tests.length} tests, ${parameters.length} parameters and ${packagesByName.size} packages.`
);
