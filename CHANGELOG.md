# Changelog

All notable changes to OmniMed Core are recorded here. This project follows semantic versioning once
production releases begin.

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
