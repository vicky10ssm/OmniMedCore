---
name: DiagBill Pathology Reports
description: Use when changing test-parameter templates, pathology result entry, parameter selection, units/reference intervals, abnormal flags, report printing, or diagnostic-report test data.
---

# DiagBill pathology reporting

Use this skill for parameter-based pathology reports and the current diagnostic-report compliance baseline.

## Read first

- `../../../src/pages/Reports.tsx` — worklist, result entry, selection, verification, report preview
- `../../../src/pages/Tests.tsx` — tests, packages, parameter-template manager
- `../../../src/db/types.ts` — `ReportOrderRow`, `TestParameterRow`, `ReportParameterRow`
- `../../../src/db/schema.ts` — parameter tables, report traceability fields, starter templates
- `../../../src/db/invoicing.ts` — report-order creation from billed tests/packages

## Implemented reporting model

- Billing creates one `report_orders` row per test; packages expand into their tests.
- `test_parameters` is the reusable template for a test: name, order, unit, displayed reference range, numeric limits, result type, and active state.
- `report_parameters` stores a snapshot for a particular patient's report. Later template edits must not silently rewrite issued historical values.
- Tests without templates retain the traditional single-result workflow.
- New parameter-based orders select all available parameters by default. The pathologist can include/exclude rows, enter results, and edit units/reference ranges for that report.
- Excluded parameters remain as tombstones (`deleted = 1`) so draft/reopen preserves the selection. Entry loads active and excluded snapshots; printing uses only `deleted = 0` rows.
- Verification requires at least one selected parameter and a result for every selected parameter. Drafts may be incomplete.
- **Sample disposal is gated on result entry.** An accepted sample can only be disposed after every linked
  `report_orders` row is either `done` or has complete saved results (every selected report parameter
  filled, or the single result field populated). Empty drafts, partially filled parameters and samples
  with no linked tests must not be disposable. Enforce this in both the Samples UI and the action handler;
  do not rely on a disabled button alone.
- Numeric limits drive low/high/abnormal flags. Displayed reference text and numeric limits are related but independently stored; edit both deliberately.
- A report becomes printable only when every order on that invoice is `done`. Parameter rows print under their test heading with result, unit, reference range, and abnormal indication.
- X-ray reports use the radiology form, not the parameter table. Administrators maintain multiple radiologists (name, qualification, signature image) under Settings -> Radiologists.
- X-ray release requires selecting an active radiologist with a signature image. The report stores the radiologist id/name/qualification/signature snapshot; printing uses that snapshot so later catalogue edits or deletions cannot rewrite an issued report.
- Inactive/deleted radiologists already captured on a report remain available as an inactive historical choice when amending, and their saved signature remains printable.

## Starter test catalogue

`src/db/starterTests.ts` seeds a broad 227-entry library (184 pathology and 43 X-ray) on app boot for
every active tenant. Seeding is additive and idempotent:

- matches by stable seed id, code and case-insensitive name
- preserves custom tests
- does not resurrect renamed or deleted starter tests
- new entries ship with 0% GST, price 0 and blank reference intervals
- labs must set prices and validate reference intervals before billing or clinical use
- this is a broad routine/specialty library, not a claim that every possible esoteric test exists

`src/db/starterParameters.ts` seeds 371 pathology parameter templates after the test catalogue:

- every pathology test has at least one parameter
- single-analyte tests receive one parameter named after the test
- panels receive explicit component maps (CBC/LFT/KFT/Lipid/Urine base templates plus DC, PT/INR,
  blood group/Rh, dengue, Widal, urine microscopy, stool, semen, fluid analysis, Hb electrophoresis,
  ANA and cultures)
- X-ray tests remain parameter-free and use the radiology form
- seeding is additive/idempotent and preserves custom parameters
- tests with recorded results are not reshaped; historical single-result reports map into their new
  one-parameter template on amendment
- complex reports split optional subfields for malaria, VDRL/TPHA titre, peripheral smear,
  histopathology, cytology, IHC/special stains and MRSA/VRE screens
- a previously seeded generic parameter is removed only when no report value references it
- new panel reference intervals are blank and must be validated locally

`src/db/starterPackages.ts` seeds 27 combined health-check packages from pathology and X-ray tests.
Packages are price/name wrappers; each item keeps its own parameters/report workflow. Seeding matches
packages by id/name and items by test id (including deleted items), so custom and deleted content is
preserved. New package prices default to 0 and must be configured before billing.

## Starter templates

Schema migration 10 added editable starter sets for the default catalogue:

- CBC: 14
- LFT: 11
- KFT: 9
- Lipid Profile: 8
- Urine Routine: 18

Insertion avoids duplicates by test/name and preserves custom rows. These are starter values, not universally valid clinical intervals. The laboratory must validate intervals for its methods, analysers, and patient population before clinical use.

## Safe change workflow

1. Decide whether a field belongs in the reusable template, the per-report snapshot, or both. Never confuse the two.
2. Preserve selection tombstones and snapshot history when editing save/reopen logic.
3. Use a transaction for multi-row result saves so a failure cannot leave a half-written report.
4. Test template add/edit/remove, first entry, incomplete draft, deselection, draft reopen, verification, re-edit, and print.
5. Test a multi-parameter profile, a no-template single-result test, and an X-ray report with a selected signature image.
6. Confirm removed templates do not erase existing report snapshots and new template parameters do not unexpectedly alter an already saved selection.
7. Test sample disposal before/after result entry: no results or partial parameters → Dispose disabled/blocked;
   complete selected results or verified report → Dispose allowed; direct/manipulated action must still fail.
8. Keep all queries tenant-scoped and include `tenant_id` in inserted rows.

## Compliance boundary

The schema also contains initial fields for ABHA/consent, method/specimen/equipment/LOINC metadata, sample and analysis timestamps, reagent lots, and approval metadata. Their presence is only a foundation. Full NABL/ABDM/ISO 15189 alignment is not complete: critical-value notifications, QC/EQA, personnel competency, QMS, and real ABDM exchange still require explicit implementation and validation.

For clinical traceability:

- A pathology result must not be released without an accepted, patient-linked sample.
- Do not dispose an accepted sample until results are entered for every linked test. Disposal before
  result entry breaks the release path and the post-examination traceability chain.
- Record collection, receipt, acceptance/rejection, analysis start/completion, authorizing user, timestamps and any amendment reason.
- Issued reports are amended, never silently overwritten. Keep revision evidence containing the result snapshot and reason.
- `DiagnosticReportRecord`/`DiagnosticReportLab` require a person/organization responsible for interpretation and release.
- Use the skill `diagbill-india-compliance` for the current NABL 112A and ABDM FHIR v6.5.0 source references and evidence matrix.

Do not call a scanned signature image a digital signature, and do not add accreditation logos or claim certification merely because fields exist.

## Verification

Run `npm run check` and both production builds. In the browser, inspect the printed preview and query `test_parameters`, `report_parameters`, and `report_orders` in DEV to verify selected/tombstoned rows, tenant IDs, status, abnormal flags, and saved snapshots.
