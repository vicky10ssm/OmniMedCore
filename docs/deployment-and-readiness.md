# Deployment, architecture and commercial readiness

Last updated: 3 November 2026  
Current schema: `19`

## Current architecture

```text
React/TypeScript single codebase
├── Terminal build
│   ├── browser: sql.js SQLite persisted to IndexedDB
│   ├── desktop: native SQLCipher file; key in Windows Credential Manager
│   ├── all billing/clinical data entry
│   └── local print layouts (A4 and 80 mm)
└── Monitor build
    ├── same read-only-capable pages
    ├── DataSource rejects writes
    └── currently reads local data only; no cloud backend
```

Target production architecture:

```text
Windows terminal (Tauri + SQLite file, encrypted)
        │
        ├── offline billing/reporting/sample workflow
        │
        └── local_export_queue ? Google Drive CSV outbox (no hosted monitor)
```

The target architecture is **not the same as the current deployment**. Be explicit in buyer meetings.

## What exists today

- Development is a Vite web application using `sql.js` and IndexedDB.
- A separate monitor bundle can be built with `npm run build:monitor`.
- Tenant scope is enforced in queries and by a static verification script.
- A read-only monitor source rejects `run()` and `tx()`.
- Local print CSS supports invoice A4/thermal, hospital service bills and report letterhead.
- Tenant/hardware-bound ECDSA P-256 licence verification, DPAPI storage, clock high-water checks,
  edition gating, 30-day grace and read-only mode are implemented in the application.
- A separate vendor licence portal (`npm run license:portal`) issues, renews and revokes signed files;
  it has not been publicly deployed or hardened for internet exposure.
- Generic hospital/IPD service charges, payments, balance and bill print are implemented inside the
  Hospital module; this is not a full HIS or insurance/TPA workflow.
- Terminal operators can add/view expenses but cannot see Dashboard or the Expenses profitability card.
- Referral commissions are intentionally removed from navigation, doctor forms and new invoice accrual.
- Pathology samples can be disposed only after every linked test has complete entered results; the
  action handler re-checks the gate.
- Tauri v2 desktop build, single-instance guard and native SQLCipher persistence with the database key
  in Windows Credential Manager work locally; NSIS and MSI installers were signed and timestamped with
  a local self-signed certificate.
- Publicly trusted code signing, clean-machine installation/upgrade/uninstall acceptance and distribution
  are still outstanding.
- Local daily encrypted snapshots, optional USB/OneDrive copy and validated restore are implemented.
  The daily schedule runs only while the desktop app is open, and key export/import for cross-machine
  recovery is still pending. Local Google Drive transaction exports and full all-module snapshots replace online API sync. No auto-update or
  remote support agent.

## What is not yet deployable

| Gap | Why it matters to a buyer |
| --- | --- |
| Installer trust/unaccepted | Signed with a local self-signed root; buyers must install that root, and clean-hardware acceptance is pending |
| Browser build uses IndexedDB | Development/browser data can be cleared; packaged desktop uses SQLCipher |
| Encrypted backups / key recovery | Local SQLCipher snapshots reduce disk-loss risk, but key export/import, unattended scheduling, offsite verification and a clean-machine restore remain release gates |
| Local CSV consumer not validated | The Google Drive outbox is generated locally, but buyer-specific downstream processing is not accepted yet |
| No update mechanism | Security/bug fixes cannot be rolled out reliably |
| Local signing only | Public-CA trust and SmartScreen reputation still pending |
| Encryption key recovery not exposed | SQLCipher protects the file, but a lost Windows profile/key currently makes encrypted backups unreadable |
| Licence stored in browser storage | Not OS-protected; packaged Tauri must use secure config and enforce entitlements outside the UI |
| Licence portal not hosted/hardened | The portal runs locally but has no public deployment, TLS, per-user auth/MFA, backups or uptime support |
| No validation pack | Buyers needing formal computer-system validation must have one prepared |

## Release gates before a paid pilot

The end-to-end site procedure is in [CLIENT_INSTALLATION_RUNBOOK.md](../CLIENT_INSTALLATION_RUNBOOK.md).
Recommended minimum before installing at a buyer site:

1. **Tauri production build** using local SQLCipher, not IndexedDB.
2. **Backup and restore**: local encrypted daily snapshots and validated restore exist; add key
   export/import, unattended Windows scheduling, offsite verification and a clean-machine restore test.
3. **Recovery-key flow**: export/import the SQLCipher key, rotate it, and prove restore on a new Windows
   profile or machine.
4. **Installer/upgrade path**: versioning, rollback, database migration test on real prior versions.
5. **Pilot acceptance pack**: test script, known-defect log, rollback procedure.
6. **Support boundary**: named contact, hours, response targets, remote-access method.
7. **Data migration procedure** and a sample of migrated masters/balances validated by the buyer.
8. **Printer/browser/hardware acceptance** at the buyer site.
9. **Encryption and tenant checks re-run** against the packaged artifact.
10. **Licence release path**: signed activation on a clean packaged install, DPAPI storage, hardware
    fingerprint and clock-rollback tests, tenant/device mismatch rejection, grace and read-only tests,
    and a vendor process for renewals, replacements and revocations.
11. **Role and clinical-control acceptance**: operator expense access without Dashboard/profit
    visibility, no referral-commission UI/accrual, and sample disposal blocked until all linked test
    results are entered.
12. **Written limitations list** acknowledged by the buyer.

## Release gates before marketing local CSV export

- Google Drive desktop client installed and signed in per terminal
- Dedicated controlled sync folder with appropriate sharing/access policy
- CSV write failure/retry evidence
- Unique-file/no-overwrite verification
- Masked patient-ID review and data-protection sign-off for the transaction outbox
- Full-snapshot review and written approval for exporting patient/clinical data to Google Drive
- Authentication-secret exclusion verified in `users.csv`
- Downstream consumer validation for duplicate transaction snapshots
- Clear statement that neither export is a backup or live remote-monitor service

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
| Display | 1366×768 minimum |
| Printer | A4 laser/inkjet and optional 80 mm thermal |
| Network | Not required for terminal billing; Google Drive client network is optional for CSV export; ABDM is future |
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
- Optional local Google Drive transaction export and full all-module snapshots
- Annual support/licence

### C. Hosted multi-tenant SaaS

Not part of the current product scope. Online sync/dashboard was removed in favour of local Google Drive CSV export.

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

The detailed engineering, backup, security and release plan is in
[productionization-plan.md](productionization-plan.md).

