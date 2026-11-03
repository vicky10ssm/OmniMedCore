# Changelog

All notable changes to MediCore are recorded here. This project follows semantic versioning once
production releases begin.

## [Unreleased]

No changes yet.

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
