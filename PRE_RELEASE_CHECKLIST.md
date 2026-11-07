# Pre-release verification checklist

Last updated: 5 November 2026<br>
Use for: pilot, hotfix and production release candidates  
Related: [HOTFIX_ROLLBACK_PROCESS.md](HOTFIX_ROLLBACK_PROCESS.md)

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
- [ ] New tenant-owned tables appear in all required lists
- [ ] No unscoped business query introduced

Commands:

```powershell
npm run typecheck
npm run check:migrations
npm run check:scope
```

Evidence:

```text
Typecheck:
Migration scenarios:
Tenant-scope calls checked:
Unscoped:
```

## Money and billing verification

- [ ] GST invoice with multiple lines
- [ ] Line discount and round-off reconcile
- [ ] Partial payment followed by balance collection
- [ ] Dues/ageing view correct
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
- [ ] Starter catalogue contains 183 pathology and 43 X-ray tests without duplicate names/codes
- [ ] Every pathology test has at least one parameter; X-ray tests have none
- [ ] Starter panel parameters exist for CBC, LFT, KFT, Lipid, Urine, DC, PT/INR, Widal, dengue, cultures, fluids, semen and stool
- [ ] Optional subfields exist for malaria, VDRL/TPHA, peripheral smear, histopathology, cytology, IHC and special stains
- [ ] Parameter duplicate-name check is zero; historical single results survive amendment
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

- [ ] Admin sees Dashboard, Settings, Compliance and Expenses profitability summary
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

- [ ] Pre-migration database backup created
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
