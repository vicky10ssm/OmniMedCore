# Pre-release verification checklist

Last updated: 5 November 2026<br>
Use for: pilot, hotfix and production release candidates  
Related: [HOTFIX_ROLLBACK_PROCESS.md](HOTFIX_ROLLBACK_PROCESS.md), [RELEASE_TESTING.md](RELEASE_TESTING.md)

This checklist is evidence-based. Tick an item only after running the verification, not because the code
“should” work. Record the commit SHA, tag, version and schema version on every release.

## Release identity

- [ ] Version selected (`package.json`)
- [ ] Annotated tag created, e.g. `v0.1.0`
- [ ] Commit SHA recorded
- [ ] Database schema version recorded
- [ ] Build date and builder recorded
- [ ] Release notes prepared
- [ ] Customer-facing changelog prepared
- [ ] Known issues/limitations list updated
- [ ] Support briefed
- [ ] Rollback artifact and procedure ready

Record:

```text
Version:
Tag:
Commit:
Schema:
Build date:
Builder:
Release owner:
```

## Source and repository verification

- [ ] Working tree is clean before tagging
- [ ] Build is from a tagged commit, not a local dirty folder
- [ ] `main` protection is active
- [ ] CI required checks passed on the tagged commit
- [ ] No force-pushed or moved release tag
- [ ] Release tag and commit are identical in the artifact metadata

Commands:

```powershell
git status --porcelain
git describe --tags --exact-match
git rev-parse HEAD
git show --stat --oneline HEAD
```

## Clean-runner reproducibility

Run from a fresh clone on a clean machine/runner:

```powershell
git clone <repository-url> C:\build\medicore-release
cd C:\build\medicore-release
git checkout v0.1.0
npm ci
npm run check
npm run build
npm run build:monitor
```

Verification:

- [ ] `npm ci` completes from `package-lock.json`
- [ ] `npm run check` passes
- [ ] `npm run build` produces terminal `dist/`
- [ ] `npm run build:monitor` produces `dist-monitor/`
- [ ] No untracked source changes are required to build
- [ ] Node version matches `.node-version`
- [ ] No local `.env` or licence portal data is required

## TypeScript, migrations and tenant scope

- [ ] TypeScript check passes
- [ ] Migration suite passes fresh, upgrade, partial and repeat paths
- [ ] Schema version is correct
- [ ] Tenant-scope check passes
- [ ] Rust database tests pass on the merged release commit
- [ ] New tenant-owned tables appear in all required lists
- [ ] No unscoped business query introduced

Commands:

```powershell
npm run typecheck
npm run check:migrations
npm run check:scope
cargo test --lib --locked --manifest-path src-tauri/Cargo.toml
```

Evidence:

```text
Typecheck:
Migration scenarios:
Tenant-scope calls checked:
Unscoped:
Rust tests passed/ignored:
```

## Documentation verification

- [ ] `CHANGELOG.md` top release heading matches the version
- [ ] README and buyer-facing capability docs updated for behaviour changes
- [ ] Architecture, backup/restore and upgrade guidance updated where affected
- [ ] Relevant `.opencode/skills/*/SKILL.md` files updated
- [ ] Version and schema references synchronized (`npm run check:docs`)
- [ ] Release notes mention the version, schema/migration impact and backup instructions
- [ ] `npm run check:docs:release` passes after release notes and checksums exist
- [ ] `RELEASE_TESTING.md` reviewed and its evidence fields completed

Commands:

```powershell
npm run check:docs
npm run check:docs:release
```

Evidence:

```text
Documentation check:
Release notes:
Backup guidance included:
```

## Money and billing verification

- [ ] GST invoice with multiple lines
- [ ] Line discount and round-off reconcile
- [ ] Partial payment followed by balance collection
- [ ] Dues/ageing view correct
- [ ] Invoice amendment changes rate/qty/discount, doctor and notes without changing the invoice number/date
- [ ] Invoice amendment can add a test and creates its report order and expected sample
- [ ] Removing a work-free line soft-deletes its order/sample and updates totals
- [ ] Removing a collected/accepted sample line is blocked with a clear message
- [ ] Amendment is blocked when the new total is below collected payments
- [ ] Amendment writes an `invoice.amend` audit event
- [ ] Paid invoice cancellation preserves history
- [ ] No new referral commission entry or payout created
- [ ] A4 and 80 mm invoice print checked
- [ ] CSV export UTF-8/BOM and formula-injection guard checked
- [ ] No score/commission tab or doctor commission field visible

Record invoice/payment IDs and totals used for acceptance.

## Clinical and sample verification

- [ ] Pathology order creates expected sample
- [ ] Collection, receipt and acceptance transitions
- [ ] Rejection reason and linked pending-order behavior
- [ ] Report release blocked for unaccepted/missing sample
- [ ] Report draft save/reopen preserves selected parameters
- [ ] Verification requires all selected results
- [ ] Amendment requires reason and preserves previous revision
- [ ] Report print shows accession, authorizer and version
- [ ] Login screen contains no default admin password hint
- [ ] Expenses can be tagged with one or more modules; shared expense shows all selected modules in list/filter/CSV
- [ ] Every pathology parameter has a non-blank reference interval; sex/age variants are present where applicable
- [ ] Starter references were updated once per tenant and custom references remain editable
- [ ] Starter catalogue contains 185 pathology and 43 X-ray tests without duplicate names/codes
- [ ] Absolute Eosinophil Count (AEC) exists with one numeric parameter, cells/cmm and a filled reference interval
- [ ] Every pathology test has at least one parameter; X-ray tests have none
- [ ] Starter panel parameters exist for CBC, LFT, KFT, Lipid, Urine, DC, PT/INR, Widal, dengue, cultures, fluids, semen and stool
- [ ] CBC has 20 parameters including HCT, RDW-CV, RDW-SD, MPV, PDW, PCT, P-LCR and P-LCC
- [ ] SGPT remains in LFT and is not added to CBC
- [ ] CBC report prints **Complete Blood Count** and **Differential Leucocyte Count** sections
- [ ] LFT prints Bilirubin, Liver Enzymes and Proteins sections
- [ ] KFT prints Renal Profile, Electrolytes and Minerals sections
- [ ] Urine routine prints Physical Examination, Chemical Examination and Microscopy sections
- [ ] Section names can be edited in Tests -> Parameters
- [ ] Existing report snapshots retain their stored result values while gaining section headings
- [ ] Sidebar badge shows **All changes saved locally** when `local_export_queue` has no pending rows
- [ ] Sidebar badge shows **N CSV records waiting** only for actual pending export rows
- [ ] Optional subfields exist for malaria, VDRL/TPHA, peripheral smear, histopathology, cytology, IHC and special stains
- [ ] Parameter duplicate-name check is zero; historical single results survive amendment
- [ ] 27 combined starter packages present with no empty or duplicate package/test links
- [ ] Every pathology test included in a package has parameters; X-ray items use the radiology form
- [ ] Restarting the app does not duplicate starter tests/parameters or resurrect deleted ones
- [ ] Every test, X-ray and package shows 0% GST after migration
- [ ] A new test/X-ray bill has zero CGST/SGST
- [ ] Historical issued invoices retain their original GST lines
- [ ] X-ray report saves clinical history, findings and impression
- [ ] Admin can add/edit/deactivate/delete multiple radiologist signature records
- [ ] Operator can select an active radiologist when entering an X-ray report
- [ ] X-ray release is blocked when no radiologist/signature is selected or the selected record has no image
- [ ] X-ray print shows logo/header, patient details, signature image, name/qualification and configured disclaimer
- [ ] Issued report keeps its signature snapshot after the radiologist is renamed, deactivated or deleted
- [ ] X-ray releases require `can_authorize_reports`
- [ ] **Dispose disabled before any linked result is entered**
- [ ] **Dispose disabled for partial/multi-parameter results**
- [ ] **Dispose enabled after all linked tests have complete results or are verified**
- [ ] Disposal action-handler bypass attempt is rejected
- [ ] Disposal writes method/user/timestamp and audit evidence

Record accession/sample IDs for both blocked and allowed disposal cases.

## Roles and privacy verification

- [ ] Admin sees Dashboard, Settings, Radiologists, Pathologists, Compliance and Expenses profitability summary
- [ ] Radiologists and Pathologists are under Diagnostics and absent from Settings tabs/forms
- [ ] Operator cannot see or open Radiologists/Pathologists routes
- [ ] Admin can add, edit, deactivate and delete multiple pathologist records with signatures
- [ ] An existing single pathologist profile is seeded into the new catalogue after migration 25
- [ ] Billing creates the expected sample and accession without a separate register step
- [ ] **Bench** groups pathology tests by sample with awaiting/ready/printable counts
- [ ] Accept sample from the Bench reveals Enter result and records collection/receipt/acceptance evidence
- [ ] Release & print from the Bench stores the report and opens the preview
- [ ] Reject with a reason moves the sample to the Exceptions queue
- [ ] Recollect creates a replacement expected sample and re-links pending tests
- [ ] Recollect is blocked when results are entered or a report was released
- [ ] Bench selection and **Accept selected** work
- [ ] **Release normal drafts** previews eligible reports and skips abnormal, critical, incomplete and rejected reports
- [ ] Batch release writes a revision and `report.verify` audit event per report
- [ ] **Print selected** queues completed reports and opens the preview
- [ ] **Import analyser results** accepts pasted and CSV/TSV rows
- [ ] Analyser import creates report parameter snapshots for a new order
- [ ] Analyser import reports unknown accession, unknown parameter and ambiguous rows
- [ ] Imported results stay drafts and are not auto-released
- [ ] `/reports` flat worklist and X-ray entry remain unchanged
- [ ] Report entry can accept the linked sample in place and records collection/receipt/acceptance evidence
- [ ] Samples desk one-click Accept sample works from expected, collected and received
- [ ] Fill normal fills selected numeric results from reference midpoints and leaves text-only rows blank
- [ ] Release & print opens the preview; Release only does not
- [ ] Combined printing is used only when every test on the invoice is done
- [ ] A pathology report stores the selected pathologist snapshot and prints its name/qualification/signature
- [ ] Deactivating/deleting a pathologist does not change an already issued report
- [ ] X-ray reports still require and print the selected radiologist signature
- [ ] Operator can add/view Expenses
- [ ] Operator cannot see Dashboard, Settings or Compliance navigation
- [ ] Operator direct `#/` redirects to Expenses
- [ ] Operator direct `#/settings` and `#/compliance` cannot open those pages
- [ ] Operator cannot see "This month at a glance" collected/profit card
- [ ] Operator cannot edit/delete expenses
- [ ] Operator with Expenses unavailable sees the safe no-access page, not a redirect loop
- [ ] Operator direct restricted URL is blocked
- [ ] Monitor operator cannot see admin-only expense/commission screens
- [ ] Monitor build rejects writes at the data-source boundary

## Administrator dashboard verification

- [ ] Admin sees Overview, Billing, Diagnostics, Expenses, Pharmacy and Hospital tabs
- [ ] Today, Last 7 days, Last 30 days and Last 90 days all load without error
- [ ] Custom range accepts start/end dates and applies after Apply
- [ ] Custom range rejects start dates after end dates
- [ ] Custom range label, CSV filename and print reflect the selected dates
- [ ] Empty ranges show "No activity" / empty-state text instead of broken charts
- [ ] Overview collected, billed, dues, expenses and cash-profit values agree with source screens
- [ ] Billing payment mix, dues ageing and top-test revenue agree with invoices/payments
- [ ] Diagnostics pending/completed counts, sample status and average TAT agree with reports/samples
- [ ] Expenses by category/module/vendor agree with the expenses register; shared tags are not split
- [ ] Pharmacy sales, payment mix, stock value, low-stock and 90-day expiry alerts agree with inventory
- [ ] Hospital active admissions, period admissions/discharges, charges/payments and outstanding agree
- [ ] CSV downloads one daily row per date and is formula-injection guarded
- [ ] Print prints only the active tab with range/tab/export controls hidden
- [ ] Operator still cannot open the dashboard
- [ ] Monitor shows the dashboard read-only with no write controls
- [ ] `npm run check`, terminal build, monitor build and Rust tests pass

## Pre-printed letterhead verification

- [ ] Settings -> Centre profile saves built-in vs pre-printed A4 mode
- [ ] Pre-printed mode accepts valid margins and rejects negative/out-of-range values
- [ ] A pathology report hides the built-in identity header on A4 print
- [ ] An X-ray report hides the built-in identity header on A4 print
- [ ] An A4 invoice hides the built-in identity header on A4 print
- [ ] Document title, invoice/report number, date, patient details and clinical lines still print
- [ ] The first content line clears the pre-printed header at the configured top margin
- [ ] Bottom margin keeps the footer/signature clear of pre-printed stationery
- [ ] Thermal 80 mm receipt still shows the centre identity
- [ ] Windows print dialog is set to A4, 100%, headers/footers off
- [ ] Built-in-header mode prints normally when pre-printed mode is off
- [ ] Printed report signature can be shown and hidden from Settings
- [ ] Hidden signature removes the pathologist/radiologist name, qualification, image and release line
- [ ] Report number, version and date print horizontally on one line
- [ ] A multi-test invoice offers Combined and Each test in Reports ready to print
- [ ] Each test opens a chooser and each Print action contains only that test
- [ ] A completed pathology test prints individually while another test on the same bill is pending
- [ ] Single-test print contains only the selected test, not the other tests on the invoice
- [ ] A long CBC/other panel report spans multiple A4 pages without trimming parameters
- [ ] Continuation pages repeat the table header
- [ ] Report printout has no large blank space or blank page before the report
- [ ] Print preview shows the Headers and footers guidance
- [ ] Browser headers/footers are off in the print dialog for clean output
- [ ] Invoice number and date print horizontally on one line

## Licensing verification

If the release changes licensing or starts a new edition:

- [ ] Issue a licence for the test tenant/hardware Device ID
- [ ] Import succeeds with correct signature
- [ ] Wrong-tenant licence rejected
- [ ] Different hardware fingerprint rejected with a hardware-mismatch error
- [ ] Tampered payload rejected
- [ ] Revoked/expired status handled
- [ ] Active licence exposes only licensed modules
- [ ] Clinic-disabled module remains hidden
- [ ] 30-day grace warning appears
- [ ] Beyond-grace read-only mode permits view/print/export and blocks new writes
- [ ] Renewal file updates expiry
- [ ] Old UUID-based licences fail closed and are reissued for hardware
- [ ] `license.dpapi` is a DPAPI blob, not plain JSON; copying it to another profile/machine fails
- [ ] Legacy `medicore.license.v1` localStorage entry is removed after migration
- [ ] Clock rollback fails at startup, after printing, after report creation and during the in-session check
- [ ] WMI/PowerShell restriction uses the volume-serial fallback; total hardware-access failure fails cleanly
- [ ] Production bundle contains no DEV licence fallback or private key
- [ ] Hand-written `"signature": "development"` licence is rejected by the production build

Record licence ID, edition, tenant ID, Hardware Device ID, fingerprint source (`wmi`/`volume-serial`) and
expiry.

## Security verification

- [ ] No `.env`, private keys, portal tokens or local databases tracked
- [ ] Portal private key excluded from source and installer
- [ ] Portal admin token supplied only through environment/secret manager
- [ ] Production bundles scanned for forbidden DEV/seed/token/private-key strings
- [ ] Authentication/TOTP/recovery tests pass if changed
- [ ] Tenant isolation checked
- [ ] Monitor read-only enforcement checked
- [ ] No real patient data in screenshots, logs, fixtures or release notes
- [ ] `npm audit` reviewed
- [ ] SBOM/checksums prepared where required

Bundle scan example:

```powershell
$patterns = @(
  'DEV-LICENSE',
  '__diagbillSeedDemo',
  'MEDICORE_PORTAL_ADMIN_TOKEN',
  'PRIVATE KEY'
)

foreach ($p in $patterns) {
  $matches = Select-String -Path dist\assets\*.js,dist-monitor\assets\*.js -SimpleMatch -Pattern $p
  if ($matches) { Write-Output "FOUND: $p" }
}
```

## Database and backup verification

- [ ] Pre-upgrade database backup created after a version-changing launch
- [ ] Pre-upgrade backup includes WAL/SHM sidecars where present
- [ ] Same-version restart does not create a duplicate pre-upgrade backup
- [ ] Pre-migration database backup created for schema-changing releases
- [ ] Backup hash recorded
- [ ] Restore tested on a clean machine/profile
- [ ] Restored invoice/payment/report/sample counts match
- [ ] Restore does not expose real data in test logs
- [ ] Downgrade/schema compatibility decision documented
- [ ] Rollback artifact matches the previous release

## Desktop/installer verification

Blocked until Tauri packaging exists:

- [ ] Signed Windows x64 installer built
- [ ] Signature verified with `signtool`
- [ ] Clean Windows 10/11 install tested
- [ ] WebView2/runtime behavior tested
- [ ] Upgrade from previous release tested
- [ ] Uninstall preserves user data as documented
- [ ] Local SQLite durability tested
- [ ] DPAPI licence storage and hardware fingerprint tested
- [ ] Clock high-water mark / rollback behavior tested
- [ ] Backend entitlement enforcement tested outside React
- [ ] Printer/hardware acceptance tested

Do not mark the release production-ready while these are unresolved.

## Portal verification

If the vendor licence portal changes:

- [ ] Issue, list, download, renew and revoke tested
- [ ] Private key path and permissions checked
- [ ] Admin token required for all API routes
- [ ] Portal bound to localhost/private network
- [ ] Hosting posture documented; no unsupported “public portal” claim
- [ ] Backups of portal data configured
- [ ] Audit/rotation process documented

## Release artifacts and checksums

- [ ] Terminal bundle retained
- [ ] Monitor bundle retained
- [ ] Windows installer retained when available
- [ ] SHA-256 checksums generated
- [ ] Release notes/changelog published
- [ ] Signing evidence retained
- [ ] Known limitations delivered to buyer
- [ ] Artifact storage access controlled

```powershell
Get-FileHash .\release\OmniMed Core-Setup.exe -Algorithm SHA256
Get-FileHash .\dist\assets\*.js -Algorithm SHA256
```

## Deployment and smoke test

- [ ] Maintenance window communicated
- [ ] Current backup confirmed
- [ ] Installer/bundle deployed
- [ ] Migrations completed
- [ ] Login and permissions checked
- [ ] Billing/payment smoke test
- [ ] Sample/result/disposal smoke test
- [ ] Licence/edition/read-only smoke test
- [ ] Print/export smoke test
- [ ] Local Google Drive CSV export creates a unique masked file
- [ ] CSV failure/retry leaves the batch pending and recovers
- [ ] Full snapshot writes one CSV per table, including patients, with `_manifest.json`
- [ ] Full snapshot is tenant-scoped and excludes authentication secrets
- [ ] Full snapshot contains confidential-data warning and is not treated as a backup
- [ ] Monitor read-only smoke test
- [ ] New deployment evidence recorded

## WS1 exit-gate verification

WS1 is complete only when a clean machine/runner can reproduce a **signed build** from a tagged commit.

- [ ] Repository is under source control
- [ ] `main` is protected
- [ ] CI runs on every push/PR
- [ ] Release workflow runs from an annotated tag
- [ ] Clean runner can build from the tag
- [ ] Artifact metadata identifies tag/commit/version/schema
- [ ] Installer is signed when Tauri packaging exists
- [ ] Signature is verified
- [ ] Checksums published
- [ ] Release notes and known limitations published
- [ ] Rollback artifact and process tested

**Current status:** the Windows app/installers are locally self-signed and the desktop SQLCipher runtime,
DPAPI licence storage, hardware fingerprinting and clock high-water checks are implemented. Public-CA
signing, clean-machine acceptance, backend entitlement enforcement and the hosted cloud service remain
release blockers.

## Final approval

- [ ] Engineering lead
- [ ] Clinical/compliance owner where relevant
- [ ] Security owner where relevant
- [ ] Support owner
- [ ] Commercial/buyer approval where required

A single unresolved “No” against data protection, tenant isolation, recovery, licence enforcement or
security is a no-go for real patient data.
