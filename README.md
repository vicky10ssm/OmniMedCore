# MediCore

**Diagnostics · Pharmacy · Hospital**

MediCore is a modular, offline-first billing and care-operations application for diagnostic
centres, standalone pharmacies and small hospitals. It is one codebase with licensed editions and
tenant-scoped configuration.

> **Status: pilot / pre-production.** A Tauri Windows installer, SQLCipher encryption at rest and
> encrypted backup/restore are implemented for the pilot release. OS-secure licence storage, hosted licence
> portal, deployed cloud sync and live ABDM exchange are not yet released. See the deployment and
> productionization documents before promising production availability.

## Editions

| Edition | Modules |
| --- | --- |
| Diagnostics | Patients, billing, invoices, dues, samples, reports, tests/packages, doctors, expenses, compliance |
| Pharmacy | Patients, pharmacy, expenses, compliance |
| Hospital | Patients, admissions with generic IPD service billing, expenses, compliance |
| Complete | All current modules |
| Custom | Vendor-approved module subset |

Effective modules are:

```text
licensed modules ∩ clinic-enabled modules
```

Dashboard and Settings remain available. Terminal operators can access Expenses but do not see the
Dashboard or the Expenses profitability card.

## Current capabilities

- Patient registration, search and shared patient identity
- GST billing, invoices, payments, dues, cancellation and A4/80 mm printing
- Test/package catalogue with GST and specimen metadata
- Parameter-based pathology reporting, verification, amendment history and printing
- Sample accession, collection, receipt, acceptance/rejection and disposal
- Disposal is blocked until every linked test has complete entered results
- Hospital admissions, ward/bed, discharge summary and generic IPD service charges/payments/printing
- Pharmacy medicine, batch/expiry stock, receipt, dispensing, GST receipt and cancellation
- Expenses, audit evidence and a read-only monitoring build
- SQLCipher-encrypted desktop database with the key held in Windows Credential Manager
- Daily encrypted snapshots with 7/4/12 retention, optional USB/OneDrive copy, manual backup and validated restore
- Signed Diagnostics/Pharmacy/Hospital/Complete/Custom licences with tenant/device binding,
  30-day grace and read-only mode after grace
- Vendor licence portal for issue, download, renewal and revocation
- Optional append-only sync queue for offline invoices, reports and admissions
- 30-second desktop background sync loop with ACK tracking and a read-only Next.js cloud dashboard
  (requires a deployed PostgreSQL/Next service)

Referral commissions are intentionally not offered. They are removed from navigation, doctor forms and
new invoice accrual because commission/inducement visibility can create compliance and ethics risk.

## Requirements

- Windows 10/11 64-bit for the target deployment
- Node.js **24.22.0** for development
- npm
- A modern browser for the development build
- WebView2 for the Tauri desktop build
- Rust stable MSVC and Visual Studio Build Tools for desktop compilation (see `DESKTOP_BUILD.md`)

Node versions are pinned in `.node-version` and `.nvmrc`.

## Setup

```powershell
cd C:\dev\medicore
npm ci
npm run dev
```

The development server prints the local URL. A production-style local preview:

```powershell
npm run build
npm run preview -- --port 4173 --host 127.0.0.1 --strictPort
```

First-run bootstrap credentials:

```text
admin / admin123
```

The app forces a password change on first sign-in. The synthetic demo seed is available only in DEV
through Settings → Modules & logo or `window.__diagbillSeedDemo()`.

## Checks and builds

```powershell
npm run check
npm run build
npm run build:monitor
```

`npm run check` covers TypeScript, migration scenarios and static tenant-scope checks.

### Windows desktop build

The Tauri v2 desktop shell uses a native SQLCipher connection whose key is stored in Windows
Credential Manager. Rust/MSVC are required to build the native app/installer. Follow [DESKTOP_BUILD.md](DESKTOP_BUILD.md)
for prerequisites, verification and installer steps.

```powershell
npm run desktop:dev
npm run tauri build
```

Pushing a tag such as `v0.3.0` triggers `.github/workflows/release.yml`, which builds the Windows
installers and publishes them to GitHub Releases.

## Licence portal

```powershell
$env:MEDICORE_PORTAL_ADMIN_TOKEN = "use-a-long-random-secret"
npm run license:portal
```

Open `http://127.0.0.1:8787`. The portal is vendor-only and binds to localhost. It is not a public
customer portal and has not been hardened for internet exposure.

Environment template: `license-portal/.env.example`. The server reads process environment variables;
it does not automatically load `.env` files.

## Repository structure

```text
src/
  app/          runtime mode, branding, module configuration
  auth/         login, TOTP, password hashing
  db/           schema, migrations, persistence, billing, demo seed
  licensing/    signed licence verification and runtime entitlement
  pages/        terminal and shared application screens
  ui/           layout, navigation, route guards and UI kit
docs/           buyer, product, architecture, deployment and licensing documentation
src-tauri/      Tauri v2 shell, native SQLite commands and Windows bundle config
cloud-dashboard/ Next.js central sync receiver and read-only dashboard
license-portal/ vendor licence administration portal
scripts/        migration, tenant-scope and build support checks
.opencode/      project-local agent skills and workflows
COMPLIANCE.md   NABL/ISO/ABDM evidence and gap matrix
FEATURE_DECISIONS.md  product decisions and build log
```

## Security and secrets

Never commit:

- `license-portal/keys/private-key.pem`
- `license-portal/data/licenses.json`
- `.env` files
- local databases or real patient data
- signing certificates or portal admin tokens

The private signing key belongs only to the vendor portal. The application ships only the public
verification key.

See [SECURITY.md](SECURITY.md).

## Documentation

- [docs/README.md](docs/README.md) — documentation map
- [docs/product-capabilities.md](docs/product-capabilities.md) — ready/pilot/unavailable features
- [docs/architecture.md](docs/architecture.md) — architecture and sync design
- [docs/licensing-and-editions.md](docs/licensing-and-editions.md) — editions, activation and grace
- [docs/licensing-process.md](docs/licensing-process.md) — sales-to-renewal operating procedure
- [docs/deployment-and-readiness.md](docs/deployment-and-readiness.md) — deployment gates
- [docs/productionization-plan.md](docs/productionization-plan.md) — production workstreams
- [PRODUCTION_COMMERCIAL_READINESS.md](PRODUCTION_COMMERCIAL_READINESS.md) - current done/pending status and commercial release gates
- [CLIENT_INSTALLATION_RUNBOOK.md](CLIENT_INSTALLATION_RUNBOOK.md) - end-to-end offline and optional online client installation, acceptance and rollback
- [BACKUP_RESTORE.md](BACKUP_RESTORE.md) - local snapshots, retention, optional USB/OneDrive copy and restore
- [ENCRYPTION.md](ENCRYPTION.md) - SQLCipher, Windows Credential Manager key storage and migration
- [code-signing/README.md](code-signing/README.md) - local self-signed certificate and client trust setup
- [cloud-dashboard/README.md](cloud-dashboard/README.md) - sync receiver and read-only central dashboard
- [COMPLIANCE.md](COMPLIANCE.md) — compliance evidence and gaps

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing code or data rules.

## Current limitations

- Locally self-signed NSIS/MSI installers have been built and verified; publicly trusted code signing, clean-machine acceptance and distribution are still pending
- Browser storage is still the current persistence layer
- Desktop snapshots are SQLCipher-encrypted, but key export/import and cross-machine restore are not yet
  implemented; the daily schedule runs only while the desktop app is open
- Browser/development builds still use IndexedDB without desktop SQLCipher protection
- No cloud backup or unattended Windows scheduled backup task
- No OS-secure licence storage or backend entitlement enforcement
- No hosted/hardened vendor portal
- Optional sync receiver/dashboard code exists but is not deployed, hardened or covered by per-device
  token provisioning
- Background sync runs only while the desktop app is open; it is not an OS service
- No live ABDM/ABHA exchange
- No full HIS, insurance/TPA, nursing chart, pharmacy procurement or controlled-drug workflow
- No referral commissions
- Not a NABL-certified or ISO-certified product
