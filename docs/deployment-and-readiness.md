# Deployment, architecture and commercial readiness

Last updated: 3 November 2026  
Current schema: `17`

## Current architecture

```text
React/TypeScript single codebase
â”œâ”€â”€ Terminal build
â”‚   â”œâ”€â”€ browser: sql.js SQLite persisted to IndexedDB
â”‚   â”œâ”€â”€ desktop: sql.js SQLite persisted to app-data file
â”‚   â”œâ”€â”€ all billing/clinical data entry
â”‚   â””â”€â”€ local print layouts (A4 and 80 mm)
â””â”€â”€ Monitor build
    â”œâ”€â”€ same read-only-capable pages
    â”œâ”€â”€ DataSource rejects writes
    â””â”€â”€ currently reads local data only; no cloud backend
```

Target production architecture:

```text
Windows terminal (Tauri + SQLite file, encrypted)
        â”‚
        â”œâ”€â”€ offline billing/reporting/sample workflow
        â”‚
        â””â”€â”€ future sync/outbox â”€â”€â–¶ cloud accumulator â”€â”€â–¶ hosted read-only monitor
```

The target architecture is **not the same as the current deployment**. Be explicit in buyer meetings.

## What exists today

- Development is a Vite web application using `sql.js` and IndexedDB.
- A separate monitor bundle can be built with `npm run build:monitor`.
- Tenant scope is enforced in queries and by a static verification script.
- A read-only monitor source rejects `run()` and `tx()`.
- Local print CSS supports invoice A4/thermal, hospital service bills and report letterhead.
- Tenant/device-bound ECDSA P-256 licence verification, edition gating, 30-day grace and read-only mode
  are implemented in the application.
- A separate vendor licence portal (`npm run license:portal`) issues, renews and revokes signed files;
  it has not been publicly deployed or hardened for internet exposure.
- Generic hospital/IPD service charges, payments, balance and bill print are implemented inside the
  Hospital module; this is not a full HIS or insurance/TPA workflow.
- Terminal operators can add/view expenses but cannot see Dashboard or the Expenses profitability card.
- Referral commissions are intentionally removed from navigation, doctor forms and new invoice accrual.
- Pathology samples can be disposed only after every linked test has complete entered results; the
  action handler re-checks the gate.
- Tauri v2 desktop build, single-instance guard and native SQLite persistence via
  `@tauri-apps/plugin-sql` work locally; unsigned NSIS and MSI installers were produced.
- Installer signing, clean-machine installation/upgrade/uninstall acceptance and distribution are still
  outstanding. No auto-update, cloud sync, automated backup or remote support agent.

## What is not yet deployable

| Gap | Why it matters to a buyer |
| --- | --- |
| Installer unsigned/unaccepted | NSIS/MSI builds exist but are not code-signed or accepted on clean buyer hardware |
| Browser build uses IndexedDB | Development/browser data can be cleared; packaged desktop uses SQLite, but backup/restore is still absent |
| Backup/restore absent | A disk/browser loss can destroy financial and clinical records |
| Sync/dashboard not deployed | Next.js/PostgreSQL sync receiver and dashboard code exist locally; hosting, TLS, per-device tokens and operations are pending |
| No update mechanism | Security/bug fixes cannot be rolled out reliably |
| No installer signing | Windows SmartScreen friction and weaker provenance |
| Encryption not user-configurable | At-rest theft protection cannot be turned on through a finished workflow |
| Licence stored in browser storage | Not OS-protected; packaged Tauri must use secure config and enforce entitlements outside the UI |
| Licence portal not hosted/hardened | The portal runs locally but has no public deployment, TLS, per-user auth/MFA, backups or uptime support |
| No validation pack | Buyers needing formal computer-system validation must have one prepared |

## Release gates before a paid pilot

Recommended minimum before installing at a buyer site:

1. **Tauri production build** using local SQLite file, not IndexedDB.
2. **Backup and restore**: scheduled/manual encrypted backup, documented restore test.
3. **Recovery-key flow**: enable/change DB passphrase, recovery code, relock behavior validated.
4. **Installer/upgrade path**: versioning, rollback, database migration test on real prior versions.
5. **Pilot acceptance pack**: test script, known-defect log, rollback procedure.
6. **Support boundary**: named contact, hours, response targets, remote-access method.
7. **Data migration procedure** and a sample of migrated masters/balances validated by the buyer.
8. **Printer/browser/hardware acceptance** at the buyer site.
9. **Encryption and tenant checks re-run** against the packaged artifact.
10. **Licence release path**: signed activation on a clean packaged install, OS-secure licence storage,
    tenant/device mismatch rejection, grace and read-only tests, and a vendor process for renewals,
    replacements and revocations.
11. **Role and clinical-control acceptance**: operator expense access without Dashboard/profit
    visibility, no referral-commission UI/accrual, and sample disposal blocked until all linked test
    results are entered.
12. **Written limitations list** acknowledged by the buyer.

## Release gates before marketing hosted monitoring

- Cloud database and authenticated sync/receiver API
- Per-device sync tokens with rotation and revocation
- Append-only queue delivery tests with retry/idempotency and duplicate ACKs
- Tenant isolation tests with at least two real tenants
- Hosted dashboard deployment, HTTPS, SSO/MFA and uptime/error monitoring
- Consent/access controls for financial and clinical visibility
- Central database backup, retention, deletion and replay procedures
- Data protection agreement covering processing/retention
- Incident and deletion procedures

## Release gates before ABDM production claims

- HFR facility and HIP registration completed by the provider
- ABDM sandbox credentials and certified client authentication
- Consent artefact exchange
- FHIR validation against the current NRCeS validator
- Transport, retry, failure and idempotency handling
- Error reconciliation and support runbook
- Written buyer approval and sandbox acceptance evidence

## Target IT requirements (for the planned desktop build)

| Item | Target |
| --- | --- |
| Operating system | Windows 10/11 64-bit |
| Runtime | WebView2 (normally present or installed by installer) |
| Memory | 4 GB recommended; 2 GB minimum for pilot |
| Disk | At least 2 GB free plus backup capacity |
| Display | 1366Ã—768 minimum |
| Printer | A4 laser/inkjet and optional 80 mm thermal |
| Network | Not required for terminal billing; needed only for future sync/ABDM |
| Antivirus | Buyer-managed; installer must be excluded only with written IT approval |
| Backup target | External drive/NAS or approved cloud location |
| Accounts | One Windows account per terminal; app users remain individually authenticated |

## Deployment models

### A. Supervised pilot (currently realistic)

- Controlled trial on one to three terminals after release gates
- Designated buyer champion and weekly review
- Parallel run with existing process
- Limited scope and a written rollback plan

### B. On-premises single-centre deployment (future)

- Packaged terminal(s), local server or per-terminal SQLite
- Buyer-managed backups and hardware
- Optional read-only cloud monitoring
- Annual support/licence

### C. Hosted multi-tenant SaaS (future)

Requires a cloud backend, tenant onboarding/offboarding, central monitoring, billing/subscription
control, support tooling, data-processing agreements and stronger operational controls. The current
schema is tenant-ready, but the service is not.

## Support infrastructure needed before sale

- Remote support tool and consent process
- Log collection that excludes patient data/secrets
- Crash reporting with redaction
- Release notes and rollback packages
- Spare/loan terminal option for critical downtime
- Documented RPO/RTO and backup ownership
- Named escalation path

## Demo URL caution

The development URL (`http://127.0.0.1:5173/`) is for local demonstration only. Never represent it as
hosted production access. Do not use real patient data in demos, screenshots or test backups.

The detailed engineering, cloud, backup, security and release plan is in
[productionization-plan.md](productionization-plan.md).

