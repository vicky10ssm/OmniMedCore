---
name: DiagBill Test Catalogue
description: Use when adding, changing, reviewing or debugging OmniMed Core tests, test parameters, starter packages, package composition, catalogue counts, or seeding behavior. This skill is the complete test/parameter/package reference and must be updated with every catalogue change.
---

# OmniMed Core test and parameter catalogue

This skill is the durable reference for **every starter test, parameter and package** in OmniMed Core.
Load it before touching the test catalogue.

## Read first

- `references/test-catalogue.md` — every test with category, department, specimen, container, method,
  report type, price, GST and all parameters.
- `references/packages.md` — every combined package and its component test codes.
- `references/regenerate.md` — how to regenerate the two reference files from the live database.
- `src/db/starterTests.ts` — source of truth for starter tests.
- `src/db/starterParameters.ts` — source of truth for panel/single-test parameters.
- `src/db/starterPackages.ts` — source of truth for combined packages.
- `src/db/index.ts` and `src/db/tauriSqlSource.ts` — boot seeding call sites.
- `src/pages/Tests.tsx` — test/package catalogue UI and default 0% GST/price behavior.
- `src/pages/Reports.tsx` — report entry and parameter table behavior.

## Current catalogue snapshot

- Tests: **229**
- Pathology: **186**
- X-ray/radiography: **43**
- Other: **0**
- Active parameters: **383**
- Combined packages: **29** total (27 seeded by this skill, plus 2 original packages)
- Schema: **25**
- Current release at time of writing: **0.27.0**

Counts change when tests/parameters/packages are added. The generated reference files are authoritative
for the current snapshot; the source modules are authoritative if they disagree.

## Non-negotiable invariants

1. Every **Pathology** test has at least one parameter.
2. Every **X-ray** test has **no parameters**. X-rays use the radiology findings/impression form,
   radiologist signature and disclaimer.
3. A package is a price/name wrapper. It does **not** own parameters. Component tests keep their own
   parameters and report workflows.
4. Parameter names must be unique per test, case-insensitively.
5. Seeding is additive and idempotent:
   - tests match by stable seed id, code and case-insensitive name;
   - parameters match by stable seed id and case-insensitive name per test;
   - packages match by stable seed id or case-insensitive name;
   - package items match by test id, including deleted items.
6. Custom tests, renamed/deleted starter tests, custom parameters and deleted package items are
   preserved. Do not resurrect something the clinic deliberately removed.
7. Tests with recorded results must not be reshaped. Historical single-result reports are mapped into a
   new one-parameter template only when reopened.
8. A previously seeded generic parameter is removed only when it is replaced by a richer panel and no
   report value references it.
9. New tests/packages ship with **0% GST** and **price 0**. The Tests screen shows **Set price** until
   the clinic sets a rate.
10. Starter reference intervals are filled, including sex/age variants where applicable. The laboratory
    must still validate intervals for its methods and population.
11. Do not rename or repurpose a test code without checking packages, report orders, historical report
    snapshots and the generated catalogue.
12. A scanned radiologist signature is not a digital signature/DSC.

## Test data model

`starterTests.ts` entries use:

- `code`, `name`, `category` (`Pathology` or `X-Ray`), `department`
- `specimenType`, `containerType`, `method`
- optional `unit`, `reportType` (`text`/`numeric`)
- defaults: `price_paise = 0`, `gst_rate_bp = 0`, `is_active = 1`

`starterParameters.ts` entries use:

- `name`, `unit`, `reportType` (`text`/`numeric`/`select`)
- optional `refRange`, `refMin`, `refMax`
- panel maps are keyed by test **code**; unmapped pathology tests get one parameter named after the test.

`starterPackages.ts` entries use:

- `name`, `testCodes[]`
- all component codes must exist in the test catalogue
- package price/GST default to 0

## Single-analyte vs panel rules

- Single-analyte tests get **one** parameter named after the test. This is correct even though it is
  only one parameter: Haemoglobin, TSH, HbA1c, creatinine, electrolytes, troponin, ABG components are
  separate tests only where the catalogue defines them as separate tests.
- Panels get all component parameters. Examples:
  - CBC 20 (including HCT, RDW-CV, RDW-SD, MPV, PDW, PCT, P-LCR, P-LCC), LFT 11, KFT 9, Lipid 8, Urine Routine 18
  - Differential count 5, PT/INR 2, blood group/Rh 2
  - Dengue 3, Widal 8, urine microscopy 6, stool 6, semen 8
  - CSF 8, pleural 8, ascitic 7, synovial 6
  - Histopathology 5, bone marrow 4, cytology 3, IHC/special stain 3
  - ABG 13: pH, pCO2, pO2, HCO3, base excess, O2 saturation, lactate, sodium, potassium,
    ionised calcium, glucose, FiO2, interpretation
- Optional subfields are deliberately split where clinically relevant:
  - malaria species/stage/density/RBC parasitised/interpretation
  - malaria antigen Pf/Pan/interpretation
  - VDRL/TPHA result/titre
  - peripheral smear RBC/WBC/platelet morphology/impression
  - histopathology specimen/gross/microscopic/diagnosis/comment
  - FNAC/Pap/urine/sputum/fluid cytology specimen/findings/diagnosis
  - IHC/special stain marker/stain, result, interpretation
  - MRSA/VRE result/organism
  - stool ova/cyst split.

## Package catalogue

The 27 seeded packages cover popular health-check combinations:

- Basic/Master/Full Body/Executive
- Diabetic, Cardiac Risk, Thyroid, Anemia, Iron, Vitamin, Metabolic Syndrome
- Fever, Dengue, Arthritis, Respiratory, Gut Health, UTI, Tuberculosis
- Women's Health, Men's Health, Senior Citizen, PCOS, Bone Health
- Pre-employment, Pre-operative, Pregnancy
- Chest X-Ray + CBC

The two original packages are:

- Fasting Sugar + Lipid Combo
- Master Health Check (Basic)

See `references/packages.md` for exact component codes and counts.

## Adding or changing a test

1. Edit `src/db/starterTests.ts` to add/change the test. Use a stable code; do not reuse an existing code
   for an unrelated test.
2. If the test is pathology and has multiple components, add a `STARTER_PARAMETERS` map keyed by the
   new code. If it is single-analyte, no map is needed; the fallback creates one parameter.
3. If the test should be part of a package, add its code to the relevant package in
   `src/db/starterPackages.ts`.
4. Run the app to trigger boot seeding and verify:
   - the test exists once per tenant;
   - pathology has at least one parameter;
   - X-ray has zero parameters;
   - no duplicate test code/name or parameter name.
5. Regenerate `references/test-catalogue.md` and `references/packages.md` using
   `references/regenerate.md`.
6. Update `README.md`, `CHANGELOG.md`, `PRE_RELEASE_CHECKLIST.md`, product capabilities and the
   pathology-reports skill when the user-visible catalogue changes.
7. Follow `diagbill-change-delivery` for versioning, PR, signed release and verification when shipping
   product code or user-facing documentation.

## Adding a package

1. Add a `pkg("Name", ["CODE", ...])` entry in `src/db/starterPackages.ts`.
2. Confirm every code exists; missing codes are skipped silently at runtime, so check the resulting
   package test count.
3. Set the package price in the UI later; seeded price is 0.
4. Regenerate `references/packages.md`.
5. Verify no empty package, no duplicate name and no duplicate package/test link.
6. Do not add parameters to the package; they belong to the component tests.

## Verification queries

The reference files are generated from:

- tests: `tests` where `deleted = 0`
- parameters: `test_parameters` joined to tests where both are not deleted
- packages: `packages` joined to `package_items` and tests where all are not deleted

Useful checks:

```sql
-- Tests by category
SELECT category, COUNT(*) FROM tests WHERE deleted = 0 GROUP BY category;

-- Pathology tests without parameters
SELECT t.code, t.name
FROM tests t
WHERE t.deleted = 0 AND t.category = 'Pathology'
  AND NOT EXISTS (
    SELECT 1 FROM test_parameters tp
    WHERE tp.test_id = t.id AND tp.deleted = 0 AND tp.tenant_id = t.tenant_id
  );

-- X-rays with parameters (must be zero)
SELECT COUNT(*)
FROM tests t
WHERE t.deleted = 0 AND t.category = 'X-Ray'
  AND EXISTS (
    SELECT 1 FROM test_parameters tp
    WHERE tp.test_id = t.id AND tp.deleted = 0 AND tp.tenant_id = t.tenant_id
  );

-- Duplicate parameter names per test (must be zero)
SELECT test_id, lower(name), COUNT(*)
FROM test_parameters
WHERE deleted = 0
GROUP BY test_id, lower(name)
HAVING COUNT(*) > 1;

-- Packages without items (must be zero)
SELECT p.name
FROM packages p
WHERE p.deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM package_items pi
    WHERE pi.package_id = p.id AND pi.deleted = 0 AND pi.tenant_id = p.tenant_id
  );
```

## Known gaps / intentional exclusions

- X-ray tests have no numeric parameters by design.
- Histopathology/cytology use narrative parameters, not every possible structured field.
- Starter reference intervals are filled; numeric abnormal flags still use each report parameter's numeric
  limits, so validate sex/age-specific flags locally.
- The catalogue is broad but not a claim that every esoteric/send-out assay exists. Custom tests are
  the escape hatch for local methods and rare assays.
- No analyzer interfacing is implied by a test entry.
- A package price/name wrapper does not create package-level parameters.

## Always update this skill

Any PR that adds, removes, renames or changes a starter test, parameter, package or catalogue count
must update the generated reference files in the same PR. Do not leave this skill stale.

**Never claim the catalogue is complete without checking `references/test-catalogue.md`.**
