# Changelog

All notable changes to OmniMed Core are recorded here. This project follows semantic versioning once
production releases begin.

## [0.27.0] - 2026-11-12

### Added

- Added **Malaria Parasite by Quantitative Buffy Coat (QBC)** as a Haematology starter test.
  - Code: `QBC`
  - Specimen: Capillary Blood / QBC tube (heparinised, acridine orange)
  - Method: Quantitative buffy coat / fluorescence microscopy
  - Parameters: Parasite Species, Parasite Stage, Parasite Density (/uL), RBC Parasitised (%),
    Interpretation
  - References: No parasites seen; not applicable; 0/uL; 0%; negative for malaria parasites
- Existing tenants receive QBC additively on the next boot. Custom, renamed and deleted tests remain
  preserved.

### Changed

- Starter catalogue counts are now **229 tests** (186 pathology + 43 X-ray) and **383 active pathology
  parameters**. Packages remain 29.
- Regenerated the test-catalogue and packages references from the live database.

### Database

- No schema change. Schema remains **25**.

### Verified

- `npm run check`, terminal build, monitor build and Rust tests pass.
- Live catalogue export rendered **229 tests, 383 parameters and 29 packages**.
- QBC appears under Haematology with all five parameters and filled references.
- Existing catalogue entries and packages are unchanged.

## [0.26.0] - 2026-11-12

### Added

- **Amend bill** action on the invoice screen. It edits an existing invoice without changing its
  number, date or patient.
- The amendment form supports quantities, rates, discounts, referring doctor, notes and adding
  tests/packages.
- New tests/packages create their report orders and expected samples automatically.
- Removed lines are soft-deleted with their work-free orders, samples and parameters.
- The invoice status is recalculated from existing payments, and an `invoice.amend` audit event records
  the old/new total and line count.

### Safety

- A line can only be removed while its linked orders are pending with no entered results and its sample
  is still expected. Collected, received, accepted, rejected or disposed samples block removal.
- An existing line's test/package identity cannot be changed; remove it and add the correct item.
- The amendment is blocked when the new total would fall below payments already collected. Refund or
  cancel/reissue remains the fallback.
- Cancelled invoices cannot be amended.
- Payments, cancellations and issued reports remain append-only.

### Database

- No schema change. Schema remains **25**.

### Verified

- `npm run check`, terminal build, monitor build and Rust tests pass.
- Changing the CBC rate and adding AEC updated the invoice total and created the AEC report order and
  expected sample.
- Removing a work-free line soft-deleted its order/sample and updated the total.
- Removing a line whose sample was collected was blocked with a clear message.
- Reducing a paid invoice below the collected amount disabled save and showed the warning.
- `invoice.amend` audit events were written.

## [0.25.0] - 2026-11-12

### Added

- Added the **Absolute Eosinophil Count (AEC)** starter test under Haematology.
  - Code: `AEC`
  - Specimen: Whole Blood / EDTA (lavender top)
  - Method: Automated analyser / microscopy
  - One numeric parameter: `Absolute Eosinophil Count`, unit `cells/cmm`,
    reference `Adult: 40-440 cells/cmm`, numeric limits 40-440
- Existing tenants receive AEC additively on the next boot. Custom, renamed and deleted tests remain
  preserved.

### Changed

- Starter catalogue counts are now **228 tests** (185 pathology + 43 X-ray) and **378 active pathology
  parameters**. Packages remain 29.
- Regenerated the test-catalogue and packages references from the live database.
- Starter reference seeding moved to version 4 so existing tenants receive the source reference set,
  including the full sex/age HCT text and the AEC reference interval.

### Database

- No schema change. Schema remains **25**.

### Verified

- `npm run check`, terminal build, monitor build and Rust tests pass.
- Live catalogue export rendered **228 tests, 378 parameters and 29 packages**.
- AEC appears under Haematology with its parameter, unit and reference interval.
- Existing catalogue entries and packages are unchanged.

## [0.24.1] - 2026-11-11

### Fixed

- Single-test invoices no longer offer **Combined**. A one-test bill shows a single **Print report**
  action.
- **Combined** and **Each test** appear only when the invoice has two or more printable pathology tests.
- The Reports ready-to-print helper text now explains the one-test and multi-test behaviour separately.

### Database

- No schema change. Schema remains **25**.

### Verified

- A one-test invoice shows **Print report** only.
- A two-test invoice shows **Combined** and **Each test**.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.24.0] - 2026-11-10

### Added

- **Bench multi-select** with a batch toolbar:
  - **Accept selected** for samples awaiting acceptance
  - **Release normal drafts** for reports whose selected results are complete and normal
  - **Print selected** for completed samples, with a print queue for multiple reports
  - **Select visible** and **Clear**
- **Release normal drafts** previews the batch first. Abnormal, critical, incomplete, rejected and
  already-released reports are skipped and remain on the Bench. Every released report gets a normal
  revision and audit event.
- **Import analyser results** on the Bench:
  - Paste rows or load a CSV/TSV file.
  - Formats: `accession,parameter,value` or `accession,test,parameter,value`.
  - Creates the report parameter snapshots from the test template when the order has not been opened
    yet.
  - Saves results as drafts only; nothing is released automatically.
  - Reports applied rows, affected reports, and skipped lines with reasons (unknown accession, unknown
    parameter, ambiguous parameter, or no open test).

### Changed

- The Bench now supports a routine batch path for normal panels while keeping abnormal/critical and
  incomplete reports for individual review.
- Batch print opens one report at a time from a queue.
- Imported analyser results update the report summary and abnormal flag but leave the report pending
  until reviewed and released.

### Database

- No schema change. Schema remains **25**.

### Verified

- `npm run check`, terminal build, monitor build and Rust tests pass.
- Batch selection and **Accept selected** work on the Bench.
- **Import analyser results** created 20 CBC report parameters from the template and applied 3 imported
  values as drafts for a new order.
- **Release normal drafts** previewed one complete normal report, released it, and wrote revision 2 and
  a `report.verify` audit event.
- **Print selected** opened the completed report preview.
- Reports flat view and X-ray entry remain unchanged.

## [0.23.0] - 2026-11-10

### Added

- **Bench** page under **Diagnostics**. Pathology work is grouped by sample instead of one flat row per
  test.
- Inline Bench actions:
  - **Accept sample** for expected/collected/received specimens
  - **Reject** with a reason, moving the sample to the Exceptions queue
  - **Recollect sample** for a rejected specimen when no results have been entered or released
  - **Enter result** per test, using the existing parameter entry, pathologist, verification and
    amendment flow
  - **Release & print** from the same screen
  - **Print report**, **History** and **Amend** for completed work
- **Exceptions** tab for rejected samples, with the rejection reason and a recollect action.
- A **Bench / Reports** view toggle. `/bench` opens the Bench; `/reports` keeps the flat worklist used
  for X-ray and completed/report history work.

### Changed

- Routine pathology work no longer needs a Samples → Reports hop. The Bench accepts the sample, opens
  result entry and releases/prints in one screen.
- Samples remains available for the detailed pre-examination chain, disposal and legacy order
  registration.
- Recollect creates a replacement expected sample, preserves the rejected sample history, re-links the
  pending tests and refuses when results already exist or a report was released.
- X-ray report entry remains in Reports.

### Database

- No schema change. Schema remains **25**.

### Verified

- `npm run check`, terminal build, monitor build and Rust tests pass.
- Bench groups pathology tests by sample and shows awaiting/ready/printable counts.
- Accept sample, Fill normal, Release & print, print report, history and amend work from the Bench.
- Reject moves the sample to Exceptions with its reason.
- Recollect creates a new expected sample, re-links the pending tests and clears the exception.
- Recollect is blocked when results or a released report already exist.
- Reports flat view and X-ray entry remain unchanged.
- Operator/module route restrictions remain in place.

## [0.22.0] - 2026-11-10

### Added

- **Automatic pre-upgrade database backup.** Before the database is opened, the app compares the running
  version with `last-run-version.txt`. When they differ, it copies the database and its `-wal`/`-shm`
  sidecars to `Backups\pre-upgrade-<from>-to-<to>-<epoch>.db`.
- The first release that introduces the marker treats a missing marker on an existing database as
  `unknown` and still creates a backup, protecting the 0.21 → 0.22 upgrade.
- **CI now runs the Rust database tests** (`cargo test --lib --locked`) on every pull request and push
  to `main`, in addition to the TypeScript, migration and tenant-scope checks.
- Added `RELEASE_TESTING.md` documenting the automated and manual database-safety gate used before every
  release.

### Changed

- SQLite sidecar copy failures now abort the pre-upgrade backup and restore safety copy instead of being
  ignored. An incomplete backup is treated as an error.
- The pre-upgrade backup is separate from the existing pre-migration backup, so version-only upgrades
  and schema-changing upgrades are both protected.
- Pre-upgrade, pre-migration and pre-restore backups are not removed by daily snapshot retention.

### Database

- No schema change. Schema remains **25**.

### Verified

- `npm run check` passed.
- `npm run build` and `npm run build:monitor` passed.
- `cargo test --lib` passed: 18 tests passed, 1 hardware smoke test ignored.
- New Rust tests cover sidecar copying, same-version skip, first-run-with-existing-database backup and
  missing-database startup.
- Pre-upgrade backups are created before encryption conversion and schema migrations.
- Install-over and launch smoke tests passed for the signed build.

## [0.21.0] - 2026-11-10

### Added

- **Fill normal** in pathology report entry. It fills only empty, selected numeric results with the
  midpoint of each parameter's reference range. Text-only parameters stay blank and every value must
  still be reviewed before release.
- **Release & print** as the primary report action, with **Release only** as the alternative. After a
  successful release the report preview opens automatically; combined printing is used when every test
  on the invoice is done, otherwise the released test prints individually.
- **Accept sample now** inside report entry, so the bench user does not need to leave Reports for the
  Samples desk on a routine specimen.
- **Accept sample** one-click action on the Samples desk. It records collection, receipt and acceptance
  in one transaction; the individual stage actions remain available for labs that record them separately.
- The reporting pathologist is preselected from the active catalogue (catalogue order is the default),
  reducing one choice per pathology report.

### Changed

- Routine pathology flow is now: bill → open report → accept sample → fill normal → release & print.
- Existing sample-chain validation, report authority, amendment history and pathologist snapshots are
  unchanged.

### Database

- No schema change. Schema remains **25**.

### Verified

- `npm run check`, terminal build, monitor build and Rust tests pass.
- Billing creates the expected sample and accession automatically.
- Inline sample acceptance records collection/receipt/acceptance timestamps and user.
- Fill normal populates selected numeric CBC results and leaves text-only parameters blank.
- Release & print stores the report, closes the entry form and opens the report preview.
- Release only stores the report without opening print.
- The first active pathologist is preselected and snapshotted on release.
- Samples desk one-click acceptance works from expected, collected or received.
- X-ray reporting, operator restrictions and issued-report immutability remain intact.

## [0.20.0] - 2026-11-09

### Added

- **Multiple pathologists**. The administrator **Diagnostics → Pathologists** section now works like
  Radiologists: add one record per pathologist with name, qualification, scanned signature image,
  active state and ordering.
- Pathology report entry has an optional **Reporting pathologist** selector. The chosen id/name/
  qualification/signature is snapshotted onto `report_orders`, so later catalogue edits or deletions
  cannot rewrite an issued report.
- Printed pathology reports use the saved pathologist snapshot first, then the verifying user's name,
  then the legacy centre profile. The scanned signature prints in the report signature block.

### Changed

- The Pathologists section is now a full signature catalogue instead of a single shared profile.
- Migration 25 seeds one pathologist row from any existing `settings.pathologist_name` /
  `pathologist_qualification` values, then leaves the catalogue editable.
- Combined and individual pathology report printing both honour the selected pathologist snapshot.
- Reports-module gating and administrator-only routes are unchanged.

### Database

- Schema moves from **24** to **25**.
- Adds the tenant-scoped `pathologists` table and `report_orders.pathologist_id/name/qualification/
  signature` snapshot columns.
- Existing reports keep empty snapshots and continue to fall back to the verifying user or centre
  profile.

### Verified

- Add, edit, deactivate, reactivate and delete multiple pathologist records.
- Existing single pathologist profile seeds into the new catalogue.
- Pathology reports store and print the selected name, qualification and signature.
- X-ray reports are unaffected and continue to use the radiologist catalogue.
- Operator navigation and direct routes remain blocked.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.19.0] - 2026-11-09

### Added

- Added dedicated administrator sections under **Diagnostics**:
  - **Radiologists** — name, qualification, signature image, active state and ordering
  - **Pathologists** — reporting pathologist name and qualification used on pathology reports
- Both sections are available only to administrators and require the Reports module.

### Changed

- Moved radiologist catalogue management out of Settings.
- Moved the pathologist profile out of Settings -> Centre profile.
- Settings keeps centre identity, letterhead, pre-printed printing, X-ray disclaimer, numbering,
  modules, licensing, users and device/sync.
- Removed the old Radiologists tab and Pathologist signature fields from Settings to avoid duplicate
  editing.

### Database

- No schema change. Schema remains **24**.

### Verified

- Radiologists and Pathologists appear in the Diagnostics navigation for administrators.
- Both pages load and save their existing tenant-scoped data.
- Settings no longer contains the Radiologists tab or Pathologist signature fields.
- Operator navigation and direct routes remain blocked.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.18.1] - 2026-11-09

### Fixed

- Removed the large blank space before report printouts caused by the hidden Reports page
  continuing to occupy print layout before the print modal.
- Report and X-ray print modals now mark the body as printing and hide unrelated page content
  from the print layout.
- Added an always-visible print tip: choose A4, actual size, and turn off **Headers and footers**.
  The `tauri.localhost/...` line is added by the WebView2 print dialog, not by the report.

### Database

- No schema change. Schema remains **24**.

### Verified

- Report print CSS no longer leaves the hidden Reports page in the print flow.
- Combined, single-test, X-ray and invoice printing use the same print hint.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.18.0] - 2026-11-09

### Added

- Reports ready to print now offers two choices for multi-test invoices:
  - **Combined** — one report containing every test on the invoice
  - **Each test** — a chooser listing each completed pathology test with its own Print action
- The invoice-level list now scrolls and shows all ready bills instead of only the first eight.
- Added a direct Print action to completed pathology rows, so a test can be printed as soon as it is
  verified even when other tests on the same bill are pending.

### Changed

- The ready list copy explains both printing options.
- Single-test and combined printing use the same report preview; a single-test preview contains only
  that test.

### Database

- No schema change. Schema remains **24**.

### Verified

- INV-A-00007 (CBC + LFT) opened the Each test chooser and printed CBC alone.
- Combined reports remain available when every test on the invoice is verified.
- CBC + LFT single-test and combined flows both use section headings and multi-page print layout.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.17.0] - 2026-11-09

### Added

- Each completed pathology test now has a **Print** action in the Reports table, even when other tests
  on the same invoice are still pending.
- A single-test report contains only that test's results and sections. The combined invoice report is
  still available from **Reports ready to print** once every test on the bill is verified.

### Fixed

- Long reports now paginate across multiple A4 pages instead of being clipped after page one.
- Print layout now keeps printable content in normal document flow, neutralises the app shell, repeats
  table headers on continuation pages and avoids splitting table rows.

### Database

- No schema change. Schema remains **24**.

### Verified

- A CBC test on a bill that also contains LFT printed as a single CBC report without waiting for the LFT.
- Single report retained the CBC section headings and did not include the second test.
- A long print fixture produced 4 A4 pages instead of one clipped page.
- Preset and custom dashboard ranges remain unaffected.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.16.0] - 2026-11-09

### Added

- Added a **Custom range** option to the administrator Dashboard date selector.
- Custom range uses start and end date inputs with an explicit **Apply** action.
- The dashboard subtitle and CSV filename show the selected dates.
- Custom range works across Overview, Billing, Diagnostics, Expenses, Pharmacy and Hospital, and with
  dashboard print.
- Invalid ranges are rejected when the start date is after the end date; custom dates cannot be later
  than today.

### Changed

- Dashboard documentation and release checklist now cover the custom date range.

### Database

- No schema change. Schema remains **24**.

### Verified

- Custom range applied 01 Nov 2026–05 Nov 2026 and recalculated the dashboard metrics.
- The subtitle showed the selected range.
- Preset ranges continue to work.
- CSV filename, print and all tabs remain available with custom range.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.15.1] - 2026-11-09

### Fixed

- Replaced the misleading sidebar **“records waiting”** badge. It previously counted legacy `dirty = 1`
  rows across business tables, a cloud-sync flag that is no longer cleared and could report hundreds
  of records forever.
- The badge now counts actual pending rows in `local_export_queue` where `exported_at IS NULL`.
- When the CSV export queue is empty it shows **All changes saved locally**.
- When records are genuinely waiting it shows **N CSV records waiting** with an amber status colour.
- The badge refreshes on navigation, export-status events, returning to the window, and a 30-second
  interval.

### Database

- No schema change. Schema remains **24**.

### Verified

- Existing demo database now shows **All changes saved locally** instead of the stale 344-record warning.
- Settings -> Device & sync uses the same `local_export_queue` source of truth.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.15.0] - 2026-11-09

### Added

- Added printable **report parameter sections**.
- CBC reports are split into:
  - **Complete Blood Count**
  - **Differential Leucocyte Count**
- Other starter panels now use clinical sections, including:
  - LFT: Bilirubin, Liver Enzymes, Proteins
  - KFT: Renal Profile, Electrolytes, Minerals
  - Urine Routine: Physical Examination, Chemical Examination, Microscopy
  - Stool, semen and fluid panels: physical, microscopy and special-test sections where applicable
- The section heading is editable in **Tests & Packages -> Parameters**.

### Changed

- Report result entry and A4 report printing group parameters under their section headings.
- Existing report snapshots keep their stored parameter names and results while gaining section headings
  from the current template.
- Section assignment runs at boot and fills only blank section names; a locally edited section is
  preserved.
- Generated catalogue documentation now records section names.

### Database

- Schema **24** adds `section_name` to `test_parameters` and `report_parameters`.
- No result data is rewritten.

### Verified

- CBC entry and print show Complete Blood Count and Differential Leucocyte Count.
- A historical CBC+LFT report prints section headings without changing its stored results.
- Section names load correctly in Tests -> Parameters.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.14.0] - 2026-11-09

### Added

- Expanded the starter **Complete Blood Count (CBC)** template from 14 to **20 parameters**:
  - Haematocrit (HCT), replacing the old PCV template label
  - RDW-CV and RDW-SD
  - Mean Platelet Volume (MPV)
  - Platelet Distribution Width (PDW)
  - Plateletcrit (PCT)
  - Platelet Large Cell Ratio (P-LCR)
  - Platelet Large Cell Count (P-LCC)
- Added filled starter reference intervals and numeric limits for the new CBC parameters.

### Changed

- The generic CBC `RDW` parameter is now `RDW-CV`; history on already-issued reports is unchanged.
- SGPT (ALT) remains in LFT and as a separate SGPT test. It is **not** a CBC parameter and was not
  added to CBC.
- The active starter parameter catalogue is now **377** parameters.
- The generated test-catalogue references were regenerated.

### Database

- Schema **23** adds a CBC analyser-index migration for existing tenants and fresh databases.
- Existing report snapshots are not reshaped. New CBC reports use the expanded template.
- Repeated starts do not duplicate parameters or resurrect deleted ones.

### Verified

- CBC has 20 active parameters in a fresh database and after migration.
- No duplicate parameter names per test.
- X-ray tests still have no parameters.
- 227 tests, 377 parameters and 29 packages in the regenerated catalogue.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.13.0] - 2026-11-09

### Added

- Added a **Printed report signature** setting under **Settings -> Centre profile**:
  - **Show signature block** (default)
  - **Hide signature block**
- Hiding the block removes the authorizer/radiologist name, qualification, signature image and
  report-release line from A4 pathology and X-ray reports. The signature remains stored on the report.
- The setting is useful when the centre's pre-printed letterhead already carries the relevant signature.

### Changed

- Report number, version and report date now print on one horizontal line, for example
  `INV-A-0001 · Version 1 · 09 Nov 2026`.
- A4 invoice number and invoice date now print horizontally on one line.
- X-ray report number, exam and study date are arranged more compactly for pre-printed stationery.

### Database

- No schema change. Schema remains **22**.

### Verified

- Settings loads and saves show/hide signature choice.
- Pathology and X-ray print views honor the setting.
- Report/invoice metadata renders horizontally with no line-per-field layout.
- Built-in and pre-printed letterhead modes continue to work.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.12.0] - 2026-11-09

### Added

- Added **pre-printed letterhead mode** for A4 documents. Administrators choose between the built-in
  OmniMed header and the centre's own pre-printed stationery under **Settings -> Centre profile ->
  Pre-printed letterhead**.
- Reports and A4 invoices have independent header choices, so either can use pre-printed stationery
  without changing the other.
- Added configurable A4 page margins: top, bottom, left and right in millimetres. Defaults are 45 mm
  top, 18 mm bottom and 12 mm sides.
- In pre-printed mode, the built-in centre name, address, logo, phone, GSTIN and accreditation block
  are hidden on print. Document title/number/date, patient details, results/findings and signatures
  still print.
- Applied the mode to pathology reports, X-ray reports and A4 GST invoices.
- Added an on-screen pre-printed mode hint and print-dialog guidance.
- Added `LETTERHEAD_PRINTING.md` with measurement, alignment and print-dialog steps.

### Changed

- Thermal 80 mm receipts remain unchanged and continue to print the centre identity even when A4
  pre-printed mode is enabled.
- The saved margins are applied with a print-only `@page` rule; no schema change is required.

### Database

- No schema change. Schema remains **22**.

### Verified

- Settings loads and saves the print mode and margin fields with validation.
- Invoice print preview exposes the pre-printed style, margin rule and hidden built-in header.
- Report and X-ray print views use the same tenant print configuration.
- Thermal-print CSS explicitly restores the centre identity.
- `npm run check`, terminal build, monitor build and Rust tests pass.

## [0.11.0] - 2026-11-09

### Added

- Rebuilt the administrator Dashboard as the primary in-app reporting surface, using live local SQLite
  data with no cloud dependency.
- Added six views:
  - **Overview**: collected, billed, outstanding dues, expenses, cash profit, pending reports, new
    patients, active admissions, trend chart, module contribution and recent bills.
  - **Billing**: diagnostics billed/collected, dues ageing, payment-mode mix and top tests/packages by
    revenue.
  - **Diagnostics**: pending/completed reports, rejected samples, average reporting TAT, pathology/X-ray
    volume and sample status.
  - **Expenses**: period spend, category totals, module attribution and top vendors.
  - **Pharmacy**: paid sales, bill count, stock value, payment mix, low-stock count and batches expiring
    in 90 days.
  - **Hospital**: active admissions, period admissions/discharges, charges/payments, outstanding balance
    and active admissions by ward.
- Added **Today**, **Last 7 days**, **Last 30 days** and **Last 90 days** range filters.
- Added dependency-free inline SVG/CSS charts (`src/ui/charts.tsx`), avoiding a new chart package in the
  offline desktop bundle.
- Added daily dashboard CSV export and A4 print of the active tab.
- Added `DASHBOARD.md` with metric definitions, export/print behavior and current limitations.

### Changed

- Dashboard queries are tenant-scoped and read-only; operator and monitor permission rules are unchanged.
- Empty ranges show explicit no-activity states rather than empty charts.
- The Google/Sheets/Looker dashboard remains an optional external design for cross-centre, remote or
  archival reporting; it is no longer the only documented dashboard path.
- Updated product capabilities, architecture, readiness, pre-release checklist and feature decisions.

### Database

- No schema change. Schema remains **22**.

### Verified

- `npm run check` passes (TypeScript, migrations and 231 tenant-scoped database calls).
- All six dashboard tabs load with seeded demo data.
- Today, 7-day, 30-day and 90-day ranges load and refresh their metrics.
- CSV exports one row per day with the expected totals.
- Empty ranges and empty tabs show readable empty states.
- Monitor dashboard remains read-only and exposes no write controls.
- Terminal build, monitor build and Rust library tests pass.

## [0.10.0] - 2026-11-08

### Changed

- Removed the default administrator password hint from the sign-in screen. First-time access now says
  to contact an administrator; the username placeholder no longer exposes the default username.
- Expenses now support **module attribution**:
  - Pathology
  - X-ray
  - Pharmacy
  - Hospital
  - General / shared
- An expense can carry multiple modules when shared. Shared expenses are tagged, not split.
- Expense list, search, filters and CSV export now include modules.
- Added a module filter to the expenses screen.
- Filled reference intervals for **all 371 pathology parameters**.
- Sex/age variants are included in the reference text where applicable, e.g. haemoglobin, RBC, PCV,
  creatinine, uric acid, ALP, ferritin, iron, lipids, sex hormones and ESR.
- Explicit pediatric ranges are included for haemoglobin, RBC, PCV, creatinine, ALP, calcium,
  phosphorus and uric acid.
- Qualitative/text tests now carry appropriate references such as negative, non-reactive, no growth,
  not seen or descriptive report.

### Database

- Schema 22 adds `expenses.modules` (JSON array; default `[]`).
- Existing expenses show as **Unassigned** until edited.
- Reference seeding is versioned per tenant so it runs once per reference release and does not overwrite
  custom parameters or re-run on every boot.
- Starter reference values are still editable; laboratories must validate intervals for method,
  population and local practice.

### Verified

- Sign-in screen contains no `admin123` hint.
- Expense created with `["pathology","xray"]`; list/CSV/filter show both modules.
- Schema 22 migration applied to the existing encrypted database.
- 0 blank reference intervals across 371 parameters.
- CBC haemoglobin shows adult male/adult female/children variants.
- All previous tests, parameters, packages and reports remain intact.
- `npm run check`, terminal build, monitor build and Rust tests.

## [0.9.1] - 2026-11-08

### Added

- Added **Arterial Blood Gas (ABG)** to the pathology starter catalogue.
- ABG includes 13 parameters:
  - pH
  - pCO2
  - pO2
  - HCO3
  - Base Excess
  - O2 Saturation
  - Lactate
  - Sodium
  - Potassium
  - Ionised Calcium
  - Glucose
  - FiO2
  - Interpretation
- Test specimen is arterial blood, collected in a heparinized arterial syringe and run on a blood gas analyser.
- Starter catalogue is now **184 pathology + 43 X-ray = 227 tests**.
- Pathology parameter templates are now **371**.
- ABG is added additively without changing existing reports, packages or custom tests.

### Verified

- ABG test present with 13 parameters.
- 184/184 pathology tests have at least one parameter.
- No duplicate parameter names.
- Restart keeps counts stable.
- No schema change; schema remains 21.
- `npm run check`, terminal build, monitor build and Rust tests.

## [0.9.0] - 2026-11-07

### Added

- **27 combined starter health-check packages** built from the pathology and X-ray catalogue.
- Total package catalogue is now 29, including the two original starter packages.
- Packages include:
  - Basic Health Check, Master Health Check (Comprehensive), Full Body Checkup and Executive Health Check
  - Diabetic, Cardiac Risk, Thyroid, Anemia, Iron, Vitamin and Metabolic Syndrome profiles
  - Fever, Dengue, Arthritis, Respiratory, Gut Health, UTI and Tuberculosis panels
  - Women's Health, Men's Health, Senior Citizen, PCOS and Bone Health packages
  - Pre-employment, Pre-operative and Pregnancy packages
  - Chest X-Ray + CBC
- Packages combine parameterized pathology tests with X-ray report tests where clinically appropriate.
- Package tests retain their own parameters; a package is a price/name wrapper.
- Seeding is additive and idempotent per tenant:
  - packages are matched by stable seed id or name
  - custom/deleted packages are preserved
  - package items are matched by test id, including deleted items
  - restarting does not duplicate package items
- New packages default to price 0 and 0% GST; the package list shows **Set price** until configured.

### Verified

- 27 seeded packages, 29 total active packages.
- 222 package-to-test links.
- No duplicate package names.
- No duplicate package/test links.
- No empty packages.
- No pathology test inside a package lacks parameters.
- Restart kept the package and item counts stable.
- No schema change; database schema remains 21.
- `npm run check`, terminal build, monitor build and Rust tests.

## [0.8.2] - 2026-11-07

### Added

- Split optional subfields into dedicated parameters for complex pathology reports:
  - malaria parasite smear: species, stage, parasite density, RBC parasitised and interpretation
  - malaria antigen: Pf, Pan and interpretation
  - VDRL: result and titre
  - TPHA: result and titre
  - peripheral blood smear: RBC, WBC, platelet morphology and impression
  - histopathology: specimen, gross, microscopic, diagnosis and comment
  - bone marrow aspiration: specimen, cellularity, morphology and impression
  - FNAC, Pap smear, urine/sputum/fluid cytology: specimen/site, findings and diagnosis
  - IHC and special stain: marker/stain, result and interpretation
  - MRSA/VRE screens: result and organism
  - stool ova and cyst: separate ova and cyst fields
- Parameter catalogue increased from 319 to **358** templates while keeping every pathology test
  parameterized and every X-ray test parameter-free.
- Generic seed parameters for split tests are removed only when no report stores a value against them.
- Historical reports and custom parameters remain preserved.

### Verified

- 358 active parameter rows.
- 183/183 pathology tests still have at least one parameter.
- 0/43 X-ray tests have parameters.
- No missing pathology parameters and no duplicate parameter names.
- Restart kept the count stable.
- `npm run check`, terminal build, monitor build and Rust tests.

## [0.8.1] - 2026-11-07

### Added

- Seeded **319 pathology parameter templates** across the starter catalogue.
- Every pathology test now has at least one parameter.
- Multi-component panels now include their full component sets, including:
  - differential count (5)
  - PT/INR (2)
  - blood group and Rh (2)
  - dengue NS1/IgM/IgG (3)
  - Widal (8)
  - urine microscopy (6)
  - stool routine (6)
  - semen analysis (8)
  - CSF (8), pleural (8), ascitic (7) and synovial (6) fluid analysis
  - Hb electrophoresis (2)
  - ANA (2)
  - blood/urine/pus/sputum/throat/CSF/wound/stool/fungal cultures (3 each)
  - AFB smear (2), Gram stain (2), KOH mount (2), antibiotic sensitivity (2)
- Single-analyte pathology tests receive one parameter named after the test.
- X-ray tests remain parameter-free and use the radiology report form.

### Compatibility

- Parameter seeding is additive and idempotent; existing custom parameters and results are preserved.
- Tests with recorded results are not reshaped. Historical single-result tests are mapped into their new
  one-parameter template when reopened for amendment.
- No schema change; database schema remains 21.

### Verified

- Confirmed 183/183 pathology tests have at least one parameter.
- Confirmed 0 X-ray tests have parameters.
- Confirmed 319 active parameter rows.
- Duplicate parameter-name check returned zero rows.
- Existing core panels remain at CBC 14, LFT 11, KFT 9, Lipid 8 and Urine Routine 18 parameters.
- Restarted the app and confirmed the parameter count remained stable.
- `npm run check`, terminal build, monitor build and Rust tests.

## [0.8.0] - 2026-11-06

### Added

- Broad starter catalogue for pathology and radiography: **183 pathology tests and 43 X-ray tests**
  (226 total).
- Coverage includes haematology, routine biochemistry, lipids, renal/urine chemistry, endocrinology,
  serology/immunology, microbiology, molecular diagnostics, urine/stool routine, fluid analysis,
  cytology, histopathology and common X-ray examinations.
- Starter seeding runs automatically on app boot for every active tenant.
- Seeding is additive and idempotent: it matches by id, code and case-insensitive name, preserves custom
  tests, and does not resurrect renamed or deleted starter tests.
- New entries are created with 0% GST and price 0; the laboratory must set its own rates and validate
  reference intervals before billing/clinical use.

### Notes

- Core starter tests retain their existing example prices.
- No schema change; database schema remains 21.
- Historical invoices, reports and existing custom tests are untouched.

### Verified

- Live existing-database boot added the missing catalogue without duplicates.
- Counts confirmed: 183 pathology and 43 X-ray tests.
- Duplicate-name and duplicate-code queries returned zero rows.
- Restarting the app kept the same count and did not duplicate tests.
- `npm run check`, terminal build, monitor build and Rust tests.

## [0.7.2] - 2026-11-06

### Changed

- Reset the catalogue GST rate to **0%** for every test, including all X-ray tests.
- Reset package GST rates to **0%** for consistency with their component tests.
- New tests and packages now default to 0% GST in the catalogue forms.
- Fresh installs seed all tests and packages at 0% GST.

### Database

- Schema 21 updates existing `tests.gst_rate_bp` and `packages.gst_rate_bp` rows to zero.
- Historical invoice lines are deliberately not rewritten; already issued bills keep their original tax
  treatment. The reset applies to future bills from the updated catalogue.

### Verified

- Migration from schema 20 to 21 on the existing encrypted database.
- Fresh database migration check asserts zero GST for every seeded test and package.
- Catalogue forms default to 0%.
- Historical invoice line-item GST remains unchanged.

## [0.7.1] - 2026-11-05

### Documentation

- Added `GOOGLE_DASHBOARD.md`: an external design for an optional read-only Google dashboard over
  the existing Drive CSV exports.
- Covers Google Sheets/Apps Script pilot, BigQuery + Cloud Run production ingestion, Looker Studio
  pages, metric definitions, security, data freshness, deduplication, setup, costs and acceptance tests.
- Clarifies that the dashboard is not bundled with OmniMed Core and cannot write back, acknowledge
  uploads or replace terminal backups.
- Linked the design from the README, documentation index, local-export contract and architecture.

## [0.7.0] - 2026-11-05

### Added

- Multiple radiologist signature records managed by administrators under
  **Settings → Radiologists**.
- Signature image upload (PNG, JPG or WebP, up to 500 KB), name, qualification,
  active/inactive state and delete controls for each radiologist.
- Operator selection of the issuing radiologist when entering or amending an
  X-ray report.
- Signature image rendering above the radiologist name on the printed X-ray
  letterhead.
- Immutable report snapshot of radiologist id, name, qualification and signature
  so later catalogue edits or deletions do not change issued reports.
- Inactive or deleted radiologists already captured on a report remain available
  to that report as a read-only historical choice.

### Database

- Schema 20 adds the tenant-scoped `radiologists` table.
- Schema 20 adds `radiologist_id`, `radiologist_name`,
  `radiologist_qualification` and `radiologist_signature` to `report_orders`.
- Existing issued X-ray reports fall back to the previous configured radiologist
  text when no image snapshot exists.

### Verified

- `npm run check` and migration checks from schema 19 to 20.
- Admin upload of two signature images, edit/deactivate/delete controls.
- Operator selection, report release, snapshot persistence and print preview.
- Deactivated/deleted radiologists are not offered for new reports, while their
  saved report signature remains printable.
- Signature image visible in the X-ray print preview with name, qualification,
  findings, impression and disclaimer.

## [0.6.0] - 2026-11-05

### Added

- Rebranded the application, installers, documentation and vendor portal as **OmniMed Core**.
- X-ray/radiology report workflow in Reports: clinical history, findings, impression, radiologist
  signature and configurable disclaimer.
- Dedicated A4 X-ray letterhead with logo, clinic header, patient details, findings, impression,
  signature block and bottom disclaimer.
- Separate **Print X-ray** controls in the reports table and a ready-to-print X-ray queue.
- Admin-configurable radiologist name, qualification and X-ray disclaimer under Settings → Centre profile.

### Database

- Schema 19 adds `clinical_history`, `findings_text` and `impression_text` to `report_orders`.
- Existing pathology reporting, report revisions, audit history and licensing remain unchanged.
- Internal identifiers (`in.medicore.desktop`, `medicore.db`, storage keys) are retained for data and
  licence continuity; user-facing branding is OmniMed Core.

### Verified

- `npm run check`, terminal and monitor builds.
- Migration from schema 18 to 19 on the existing encrypted database.
- Admin/operator access rules remain enforced.
- X-ray print template renders logo/header, patient details, findings, impression, signature and disclaimer.

## [0.5.0] - 2026-11-05

### Added

- Full Google Drive data snapshots: one CSV per database table, including patients, billing,
  diagnostics, pharmacy, hospital, expenses, compliance and audit data.
- Manual **Export all modules now** control in Settings → Device & sync.
- Automatic full snapshot once per day while the desktop app is open.
- Snapshot folders under `<sync folder>\full-export\snapshot_YYYYMMDD_HHMMSS_XXXXXX`.
- `_manifest.json` with table row counts, exported columns, excluded columns and skipped tables.
- Tenant-scoped export of every business table plus the current tenant record and local metadata.
- Formula-injection guarding for text values in full snapshots.

### Security

- Full snapshots never export password hashes, TOTP secrets, recovery codes or TOTP replay state.
- The UI and documentation warn that snapshots contain confidential patient data and are not backups.

## [0.4.3] - 2026-11-04

### Fixed

- Settings is now administrator-only in both navigation and route guards; operators cannot open it by
  direct URL.
- Compliance is hidden from operator navigation. Clicking it no longer redirects an operator to Expenses;
  the existing admin-only route remains enforced.
- Operators whose Expenses module is unavailable now see a safe no-access page instead of entering a
  redirect loop through the former Settings fallback.

### Tooling

- Added the `diagbill-change-delivery` skill and contributor guidance for end-to-end implementation,
  documentation, GitHub PR/merge, signed release and release verification.

## [0.4.2] - 2026-11-04

### Security

- Added a Windows hardware fingerprint (`True_Device_ID`) derived from motherboard serial and CPU
  Processor ID, with primary-volume-serial fallback when WMI/CIM is restricted.
- Licences are now hardware-bound: a licence issued for another machine fails with a hardware mismatch
  instead of accepting a copied database UUID.
- Signed licences are stored through Windows DPAPI (`license.dpapi`) at current-user scope; legacy
  `localStorage` licences are migrated once and removed. A copied DPAPI blob fails to decrypt.
- Added `UpdateExecutionTimestamp()` with a DPAPI + SQLCipher high-water mark. Startup, invoice/report
  printing, report creation and a 60-second in-session check reject clock rollback with
  **System Clock Manipulation Detected**.
- Existing licences containing UUID `deviceIds` must be reissued with the new Hardware Device ID.

### Documentation

- Updated licensing, vendor-portal and pre-release guidance for hardware binding, DPAPI storage, clock
  rollback handling and the one-time licence reissue.

### Verified

- `npm run check`, terminal build and monitor build pass.
- Rust tests cover fingerprint normalization/hash stability, DPAPI round-trip and tamper rejection,
  volume-serial fallback and clock-rollback rejection.
- Windows release smoke test loaded a DPAPI-protected hardware-bound licence, showed the matching
  Device ID, wrote `last_known_execution_time` to both stores and removed the legacy localStorage entry.
- A simulated future high-water mark returned **System Clock Manipulation Detected**.
- The vendor portal rejects UUID device IDs for new/renewed hardware-bound licences.

## [0.4.1] - 2026-11-04

### Security

- Production builds now reject the special `"signature": "development"` licence path. A hand-written
  development-licence JSON can no longer be imported as a valid production entitlement.
- Added release verification for a hand-written development licence against the production build.

### Documentation

- Documented the licensing threat model: signatures prevent forgery, but local offline licensing is not
  tamper-proof. Installation cloning, clock rollback, runtime terminal-count enforcement, offline
  revocation and localStorage storage remain limitations.

## [0.4.0] - 2026-11-04

### Added

- Local Google Drive CSV export queue (schema 18) with triggers for Diagnostics invoices, Pharmacy
  sales, Hospital admissions and hospital charges.
- Unique `tx_YYYYMMDD_HHMMSS_XXXXXX.csv` files with five flat columns.
- SHA-256-masked patient IDs and rupee totals formatted from integer paise.
- `GOOGLE_DRIVE_SYNC_PATH` configuration and native folder picker.
- Rust `spawn_blocking` CSV writer using `create_new` to prevent append/overwrite.
- Pending/retry status, local error evidence and 30-second export scheduler.

### Changed

- Removed live API/cloud sync, endpoint/token configuration, ACK handling, the Next.js sync receiver and
  the cloud dashboard from the product.
- Legacy `sync_queue`/`sync_ack` tables remain historical; migration 18 drops their triggers.
- Client runbook and documentation now cover the local Google Drive outbox.

### Verified

- Existing encrypted database migrated to schema 18.
- Two existing invoices exported to a masked CSV and queue rows marked exported.
- A subsequent invoice update created a new queue row and a new unique CSV.
- A forced invalid-folder failure left the batch pending; restoring the folder retried successfully.
- Rust unit tests cover unique-file writing, no-overwrite behavior, path traversal rejection and
  SQLCipher/backup helpers.

## [0.3.0] - 2026-11-03

### Added

- SQLCipher 4.20 (AES-256) encryption for the Tauri desktop database.
- Automatic plaintext-to-SQLCipher migration with an encrypted `pre-encryption` copy.
- Database key generation and storage in Windows Credential Manager using the native keyring API.
- Encryption status, key backend and SQLCipher version in Settings → Device & sync.
- SQLCipher-aware backup validation and restore; legacy plaintext backups are re-encrypted before
  activation.
- Locally signed app, NSIS installer and MSI using a self-signed certificate and `signtool.exe`.
- Public local root certificate in `code-signing/`.

### Security

- The database key is never written to configuration files, localStorage, logs or source control.
- The desktop app fails closed if an encrypted database exists but its Credential Manager key is missing.
- Backups produced from the encrypted database are encrypted.
- Windows builds are timestamped and signed; client machines must install the local root certificate.
- Browser/development IndexedDB remains separate and is not covered by desktop SQLCipher.

### Remaining

- Key export/import and rotation for cross-machine disaster recovery.
- Clean-machine restore acceptance with the SQLCipher key.

## [0.2.2] - 2026-11-03

### Added

- Daily automatic SQLite snapshots while the desktop app is open.
- Retention of 7 daily, 4 weekly and 12 monthly snapshots per backup folder.
- Manual **Backup Now** in Settings → Device & sync.
- Optional second backup folder for USB drives or OneDrive, selected through the native folder picker.
- Restore from `.db` backup with SQLite integrity check, MediCore schema validation, required-table
  checks, automatic pre-restore safety copy and application reload.
- Rust unit tests for snapshot retention and safe database replacement.

### Changed

- Pre-migration backups, restore safety copies and scheduled snapshots share the app-data `Backups`
  folder without retention deleting migration/restore files.
- Restore is available to a signed-in operator for this release; tighten to an administrator permission
  before multi-role production rollout.

### Verified

- Scheduler created daily, weekly and monthly snapshots.
- Manual backup wrote local and selected secondary-folder copies.
- End-to-end restore through Settings created a pre-restore safety copy and reloaded into a valid
  schema 17 database with matching invoice counts.

## [0.2.1] - 2026-11-03

### Added

- Repository documentation set: root README, security policy, contribution guide, changelog, PR
  template, Node version pins and environment templates.
- Tauri v2 desktop shell with single-instance handling, NSIS configuration and generated Windows icons.
- Native SQLite persistence through `@tauri-apps/plugin-sql`, pre-migration backups, integrity checks
  and flush-before-close handling.
- Desktop database path, writability and backup-folder diagnostics in Settings → Device & sync.
- `DESKTOP_BUILD.md` for Rust/MSVC setup, WS2 verification, installer testing and manual updates.
- GitHub Actions release workflow for `v*` tags that builds NSIS/MSI Windows installers and publishes
  them to GitHub Releases.
- Native Windows build verified locally: unsigned NSIS and MSI installers, plugin-sql database creation,
  single-instance handling, close-flush and pre-migration backup.
- Append-only `sync_queue`/`sync_ack` tables and triggers for invoices, diagnostic reports and admissions.
- 30-second desktop sync loop with endpoint health check, batched POST push, ACK persistence and a
  Device & sync configuration panel.
- Standalone Next.js sync receiver and read-only `/dashboard` route backed by PostgreSQL, including
  ingest authentication, dashboard Basic auth and central schema.
- Sample disposal gate: accepted samples cannot be disposed until every linked test has complete
  entered results, with server-side action enforcement.
- Operator role restrictions: terminal operators can enter expenses but cannot see Dashboard or the
  Expenses collected/profit summary.
- Production deployment and productionization documentation for licensing, roles, clinical controls,
  commission policy and release gating.

### Changed

- Project moved from the OneDrive workspace to `C:\dev\medicore`.
- Productionization and architecture documentation updated to database schema `17`.

## [0.1.0] - 2026-11-02

### Added

- Multi-vertical MediCore branding across Diagnostics, Pharmacy and Hospital.
- Diagnostics billing, GST invoices, payments, dues, expenses and audit evidence.
- Pathology test/package catalogue, parameter templates, result entry, amendments and printing.
- Sample accession, collection, receipt, acceptance/rejection and disposal workflow.
- Hospital admissions, ward/bed assignment, discharge summary and generic IPD service billing with
  charges, payments, balance and A4 bill print.
- Pharmacy medicine/batch/expiry inventory, stock receipt, dispensing, GST receipt and cancellation.
- Signed offline licences with Diagnostics, Pharmacy, Hospital, Complete and Custom editions.
- ECDSA P-256 licence verification, tenant/device binding, 30-day grace and read-only operation after
  grace.
- Vendor licence portal for issuing, downloading, renewing and revoking signed licences.
- Licence and edition documentation and operating procedure.
- Clinic module visibility, branding and logo configuration.
- Read-only monitoring build and tenant-scoped schema through migration 17.
- Project-local implementation skills under `.opencode/skills/`.

### Changed

- Hospital module now includes generic IPD service billing.
- Operator terminal home is Expenses, without Dashboard or profitability visibility.
- Development demo data includes hospital services, charges and payments.

### Removed

- Referral commission tab/module, doctor commission rule fields and new commission accrual/payouts.
  Existing historical commission tables are retained for data integrity but are not displayed.
- Commission module from licence editions and the vendor portal.

### Security

- Production bundle checks exclude the DEV licence fallback, demo seed hook, portal token and private
  key material.
- Licence private key and issued licence records are gitignored.

### Known limitations

- No signed Tauri Windows installer
- Browser storage rather than durable production SQLite
- No automated backup/restore
- No OS-secure licence storage or backend entitlement enforcement
- No hosted/hardened vendor licence portal
- Cloud sync/dashboard code exists but is not deployed or hardened; per-device tokens, conflict repair
  and OS background sync remain future work
- No live ABDM exchange
- Not a NABL/ISO-certified product
- No full HIS, insurance/TPA, nursing chart, pharmacy procurement or controlled-drug workflow
