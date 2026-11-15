---
name: DiagBill Parameter Validation
description: Use when adding or changing test parameters, reference intervals, numeric limits, abnormal flags, or when auditing the whole catalogue before a release. Ensures every parameter has a checked reference and that Low/High flags work.
---

# OmniMed Core parameter validation

Use this skill for every change to `test_parameters`, `report_parameters`, reference intervals,
numeric limits, abnormal flags, or the test/parameter catalogue.

The catalogue is only clinically useful if every parameter has a valid reference and the result-entry
screen can flag **Low** and **High**. A printable reference string without numeric `ref_min`/`ref_max`
is not enough.

## Read first

- `../../../src/db/starterTests.ts` — test rows
- `../../../src/db/starterParameters.ts` — parameter templates and the boot repair
- `../../../src/db/starterReferences.ts` — reference text and overrides
- `../../../src/db/referenceLimits.ts` — parser that derives missing numeric limits
- `../../../src/pages/Reports.tsx` — `numericValue`, `parameterFlag` and result entry
- `../../../scripts/check-catalogue.mjs` — full catalogue audit
- `../../../.opencode/skills/diagbill-test-catalogue/SKILL.md` — catalogue snapshot and regeneration
- `../../../.opencode/skills/diagbill-pathology-reports/SKILL.md` — report entry and release rules

## Non-negotiable checks

1. Every **Pathology** test has at least one parameter.
2. Every **X-ray** test has no parameters.
3. Parameter names are unique per test, case-insensitively.
4. Every parameter has a non-blank printable reference range.
5. Every numeric parameter whose reference text contains a numeric range or bound has
   `ref_min` and/or `ref_max`.
6. `ref_min` is never greater than `ref_max`.
7. Numeric result parsing accepts plain and comma/space thousands separators:
   `50000`, `50,000`, `1,50,000`.
8. Low/High flags use the same numeric limits in the live entry screen and in the saved
   `report_parameters.abnormal` / `report_orders.abnormal`.
9. Existing tenant rows are repaired additively. Do not overwrite a locally edited reference or an
   explicit limit.
10. The generated catalogue references are regenerated after any catalogue change.

## Allowed numeric-without-limits exceptions

The audit reports these as warnings, not errors. Each must be deliberate:

- qualitative numeric codes such as viral load **Not detected**
- fluid-specific differentials such as ascitic/pleural **Cell Count**, **Polymorphs**, **Lymphocytes**
- chart-based tests such as **IGF-1** (“report against reference chart”)
- single-number values that are not a normal range, such as **FiO2** room air 21%
- analyser/method-specific intervals that the laboratory must configure locally

A range-like reference such as `7.35-7.45`, `<150`, `>90` or `-2 to +2` must never remain without
numeric limits.

## Procedure

1. Export the live catalogue from a running app:
   - use `.opencode/skills/diagbill-test-catalogue/scripts/export-catalogue.js` with the CDP helper
   - save the JSON to a temp file
2. Run the full audit:

   ```powershell
   npm run check:catalogue -- <catalogue.json>
   ```

   Expected final state: **0 errors**. Warnings must all match the allowed exceptions above. The
   0.28.0 baseline is 229 tests, 383 parameters (221 numeric), 0 errors and 13 deliberate
   numeric-without-limits warnings.

3. Fix source rows for every error:
   - add or correct the numeric limits in `starterParameters.ts` or the migration seed
   - for existing tenants, add a pair to `STARTER_LIMIT_REPAIRS` (exact old seeded values only) or rely
     on the generic `deriveReferenceLimits` backfill in `ensureReferenceLimits`
   - never overwrite a non-null local limit
4. Regenerate the catalogue references:
   - export again
   - run `render-catalogue.mjs`
5. Test one low and one high value in the report entry:
   - plain and comma-formatted (`50000`, `50,000`)
   - confirm **Low**/**High**
   - save a draft and confirm `abnormal = 1` and the correct `result_value`
6. Run `npm run check`, both production builds and the Rust tests.

## Adding a numeric parameter

- Prefer the `nr(name, unit, referenceText, refMin, refMax)` helper when both bounds are known.
- For a one-sided reference (`<150` or `>90`), store the display text and allow
  `deriveReferenceLimits` to fill the open side.
- For a purely zero reference (`0%`, `0/uL`), the parser treats it as `0-0`, so any positive value is
  flagged High.
- For a sex/age-variant reference, the parser uses the broadest combined range. State the variants in
  the reference text and validate locally.
- Never add a numeric parameter with a range-like reference and null limits.

## Release checklist

- [ ] `npm run check:catalogue -- <json>` reports 0 errors
- [ ] Every warning is an allowed exception
- [ ] All numeric parameters with range-like references have limits
- [ ] Low and High flags verified with plain and comma values
- [ ] Saved `result_value` and `abnormal` verified
- [ ] Generated catalogue references regenerated
- [ ] `npm run check`, terminal build, monitor build and Rust tests pass
- [ ] Release notes mention any reference/limit repair
