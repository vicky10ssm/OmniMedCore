# OmniMed Core architecture and local export design

Last updated: 9 November 2026  
Current product version: `0.15.1`  
Current schema: `24`

## 1. Status and scope

This document separates:

- **Implemented today** � the local-first terminal build, local SQLCipher storage, encrypted backups and
  the local Google Drive CSV outbox.
- **Historical design** - an earlier hosted/cloud sync protocol moved to the archive for context only.

The app no longer calls a hosted sync API, uses a sync token or writes to a cloud dashboard. The
supported integration path is the local CSV export described in [LOCAL_CSV_EXPORT.md](../LOCAL_CSV_EXPORT.md).

## 2. Architectural principles

1. **Offline is the terminal's default state.** Billing, samples and reporting cannot depend on a
   network request.
2. **Only terminals write business data.** The local monitor is read-only, and the CSV outbox is not a
   write path.
3. **Google Drive is an outbox, not a second editable copy.** The app writes a unique CSV file and Google Drive uploads it independently.
4. **Tenant isolation is mandatory.** Every business row and export query is scoped to the active
   tenant; no CSV row may mix tenants.
5. **Money uses integer paise and append-only correction flows.** A mistake is cancelled/re-issued or
   reversed, not silently overwritten.
6. **Clinical history is not last-write-wins.** Issued reports are amended with reasons; conflicting
   clinical edits require controlled resolution.
7. **Patient data is sensitive.** Secrets and patient data must not appear in logs, sync conflict
   messages, analytics or demo fixtures.
8. **Claims follow implementation.** Architecture diagrams do not make an unimplemented service live.

## 3. Current implementation

```text
┌──────────────────── One React/TypeScript codebase ────────────────────┐
│                                                                        │
│  Terminal mode                         Monitor mode                    │
│  ├── Layout + all terminal routes       ├── MonitorLayout               │
│  ├── billing/reporting/samples         ├── read-only routes            │
│  ├── client-side calculations          └── no write controls            │
│  └── SQL reads/writes                                                  │
│                                                                        │
│  DataSource interface                                                  │
│  ├── SqlJsSource (DEV/terminal)  ── sql.js WASM → IndexedDB            │
│  └── ReadOnlySource (monitor)    ── rejects run()/tx()                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Current runtime characteristics

| Area | Current state |
| --- | --- |
| Language/UI | React 19, TypeScript, React Router, Tailwind |
| Local store | Browser: `sql.js` SQLite image in IndexedDB. Desktop: native SQLCipher with the key in Windows Credential Manager |
| Desktop packaging | Tauri v2 native build succeeds; NSIS/MSI installers locally signed with a self-signed root |
| Online data | No server database/API |
| Monitor | Separate bundle, same local source, write methods throw |
| Mode selection | Build-time mode plus DEV override; production build cannot be flipped by URL |
| Migrations | Additive schema migrations, migration test script, boot self-healing |
| Tenancy | `tenant_id` on business tables, `TENANT_TABLES` helpers, static scope check |
| Auth | Local users, PBKDF2 password hashes, optional TOTP 2FA, sessionStorage session |
| Report release | Separate `can_authorize_reports` authority |
| Licensing | ECDSA P-256 signed offline licence, canonical JSON, tenant + hardware fingerprint binding, edition/module entitlements |
| Licence expiry | 30-day grace; after grace UI enters read-only mode, existing data/print/export remain available |
| Licence storage | Windows DPAPI current-user file in Tauri, with legacy localStorage migration; backend enforcement outside the UI still required |
| Vendor portal | Separate Node admin portal signs issuances/renewals/revocations with the private key; not publicly deployed |
| Encryption | Desktop SQLCipher 4.20/AES-256, key in Windows Credential Manager; browser AES-GCM envelope remains separate |
| Backups | Encrypted local daily/monthly/weekly snapshots, optional USB/OneDrive copy, validated restore |

### Application boot

1. `getDb()` uses the Rust single-instance guard in Tauri, a browser single-writer lock in the web
   build, or opens read-only for the monitor.
2. The browser loads the `SqlJsSource` SQLite image from IndexedDB. The desktop opens a native
   SQLCipher connection from the app-config directory; an existing plaintext file is exported into
   SQLCipher before use.
3. Before an existing desktop database migrates, Tauri checkpoints WAL, creates a timestamped
   pre-migration backup and runs `PRAGMA quick_check`.
4. Migrations run in ascending version order with tenant/compliance repair.
5. Default tenant and initial admin are ensured.
6. The licence verifier loads the DPAPI-protected signed file, checks signature/tenant/hardware
   fingerprint/expiry and the execution-time high-water mark, then derives the licensed module set. A
   development build falls back to a complete development licence only when no real licence is stored.
7. Auth restores a session or shows login/unlock.
8. Effective modules and routes are `licensed modules ∩ clinic-enabled modules`; read-only mode applies
   after grace expiry.

### Module composition

OmniMed Core is a multi-vertical product; a tenant enables only the modules it operates.

- Billing and money: patients, billing, invoices, dues, doctors, expenses. Referral commissions are
  not exposed or accrued.
- Administrator dashboard: live tenant-scoped reads over billing, diagnostics, expenses, pharmacy and
  hospital tables. Six tabs (Overview, Billing, Diagnostics, Expenses, Pharmacy, Hospital), 1/7/30/90-day
  ranges, inline SVG/CSS charts, daily CSV export and A4 print. It adds no schema and no cloud dependency;
  see [DASHBOARD.md](../DASHBOARD.md).
- Diagnostics: tests/packages, sample chain, result entry, amendments, pathology report printing, and
  X-ray/radiology reports with clinical history, findings, impression and a configurable disclaimer.
- Radiologist catalogue: tenant-scoped names, qualifications and signature images selected at X-ray
  entry; the chosen snapshot is stored on `report_orders` so issued reports are immutable.
- Starter test catalogue: 184 pathology and 43 X-ray entries seeded additively per tenant at boot;
  custom/renamed/deleted tests are preserved, and new entries require local pricing/reference validation.
- Reference intervals: 377 pathology parameters are seeded with adult ranges and sex/age variants in the
  reference text where applicable. Reference seeding is versioned per tenant so custom intervals are not
  overwritten on every boot.
- Expenses: `expenses.modules` stores a JSON array of Pathology/X-ray/Pharmacy/Hospital/General attribution.
  Shared expenses are tagged with multiple modules; amounts are not split automatically.
- Hospital: inpatient admission, ward/bed, treating doctor, discharge diagnosis/summary, generic
  hospital service catalogue, IPD service charges, payments/balance and bill print.
- Pharmacy: medicine master, batch/expiry inventory, stock receipt, dispensing, GST receipt and
  transactional stock deduction.
- Compliance: sample/report/consent evidence, audit page, offline ABDM draft.
- Settings: administrator-only centre identity, branding/logo, vertical/module visibility, users,
  numbering and terminal configuration. A4 document printing can use the built-in centre header or a
  pre-printed letterhead with tenant-configured page margins; see
  [LETTERHEAD_PRINTING.md](../LETTERHEAD_PRINTING.md).
- Monitor: read-only dashboard, invoices, dues, reports, admissions, pharmacy and money views; the
  dashboard shares the terminal queries but exposes no write controls.

The umbrella brand is **OmniMed Core** (`src/app/brand.ts`). Internal package/storage names retain the
historical `diagbill` identifier.

### Licensing boundary

```text
Vendor portal (private key, vendor-controlled)
   └── signs licence JSON for tenantIds + deviceIds
                 │ file / renewal download
                 ▼
Terminal (public key only)
   ├── verifies ECDSA P-256 signature offline
   ├── checks tenant + device + status + expiry/grace
   ├── derives edition/module entitlements
   └── gates navigation/routes and write controls
```

The private key must never be embedded in the application or exposed to the browser. The portal's
current JSON store and shared bearer token are a development baseline, not a hosted production control
plane. Public hosting, TLS, per-user admin auth/MFA, rate limits, backups and audit are deployment gates.
See [licensing-and-editions.md](licensing-and-editions.md).

### Current local export boundary

The desktop app no longer calls an API, sends a sync token or writes to a cloud dashboard. It uses a
decoupled local Google Drive outbox:

```text
Terminal SQLite
  -> local_export_queue (pending transaction snapshots)
  -> 30-second scheduler while the Tauri app is open
  -> masked rows -> Rust spawn_blocking writer
  -> tx_YYYYMMDD_HHMMSS_XXXXXX.csv in GOOGLE_DRIVE_SYNC_PATH
  -> Google Drive desktop client uploads independently
```

- Triggers append snapshots for invoices (Diagnostics), pharmacy sales (Pharmacy) and admissions/
  hospital charges (Hospital).
- The scheduler reads up to 100 pending rows for the current tenant.
- Rows are marked `exported_at` only after the unique CSV is written successfully.
- A failed write leaves rows pending with `last_error`; the next interval retries.
- There is no health endpoint, endpoint URL, bearer token, ACK table or cloud receiver in the export
  path.
- The legacy `sync_queue`/`sync_ack` tables are historical; migration 18 drops their triggers and the
  app no longer reads them.
- The transaction CSV is a summary outbox, not a backup and not a terminal-to-terminal sync service.

A second, explicitly separate full-data path writes all business tables:

```text
Terminal SQLite
  -> full snapshot: once per day or "Export all modules now"
  -> one CSV per table + _manifest.json
  -> GOOGLE_DRIVE_SYNC_PATH\full-export\snapshot_...
  -> Google Drive desktop client uploads independently
```

The full snapshot is tenant-scoped and includes soft-deleted rows and clinical data. It omits only
authentication secrets (`users.password_hash`, `users.totp_secret`, `users.recovery_codes`,
`users.totp_last_step`) and non-table runtime state. It is not a backup and does not provide import,
merge or online revocation.

See [LOCAL_CSV_EXPORT.md](../LOCAL_CSV_EXPORT.md). An optional downstream Google
Sheets/BigQuery/Looker Studio dashboard is described in [GOOGLE_DASHBOARD.md](../GOOGLE_DASHBOARD.md);
it remains an optional external consumer of exported CSVs. The desktop product's primary reporting
surface is the built-in local dashboard in [DASHBOARD.md](../DASHBOARD.md).

### Data ownership in current build

- The local database is the system of record.
- Browser storage is per origin/profile; `localhost` and `127.0.0.1` are separate stores.
- There is no cross-device sharing. �Monitor from anywhere� is **not delivered**; only the local
  read-only monitor build and the one-way Google Drive CSV outbox exist.

## 4. Current data model and export-ready metadata

Most business tables carry:

| Column | Purpose |
| --- | --- |
| `id` | UUID generated on the terminal; no collisions across devices |
| `tenant_id` | Tenant isolation |
| `created_at` | Client creation time (epoch ms) |
| `updated_at` | Client edit time (epoch ms, local change/audit hint) |
| `device_id` | Originating terminal |
| `dirty` | Legacy local-change hint retained for schema compatibility; local export uses `local_export_queue` |
| `deleted` | Soft-delete tombstone for propagation |

Core relationships:

```text
tenant
├── users / settings / audit
├── patients
│    ├── invoices ── invoice_items
│    │    ├── payments
│    │    ├── samples
│    │    └── report_orders
│    │         ├── report_parameters
│    │         └── report_result_revisions
│    ├── admissions ── doctors
│    │    ├── hospital_charges
│    │    └── hospital_bill_payments
│    ├── pharmacy_sales ── pharmacy_sale_items
│    └── abdm_consents ── abdm_outbox
├── hospital_services
├── tests ── test_parameters
├── packages ── package_items
├── medicines ── pharmacy_batches
├── doctors
└── expense_categories ── expenses
```

Legacy `commission_entries`, `payouts` and doctor commission columns may remain in historical databases
for data integrity, but the current product does not expose or accrue referral commissions.

The local export ledger is separate from business tables. `local_export_queue` stores pending and
exported transaction snapshots, while `sync_queue`/`sync_ack` are retained as legacy history only.
Triggers on invoices, pharmacy sales, admissions and hospital charges append new snapshots.

### Important limitation of the local export foundation

The CSV outbox is deliberately one-way and minimal. It is enough to hand transaction summaries to a
Google Drive consumer, but it is **not** a production multi-master sync service: there is no import,
conflict repair, deletion propagation, upload ACK, remote monitor or terminal-to-terminal merge. The
CSV itself is a plain-text summary and is not a backup.

## 5. Current offline workflow

A terminal can operate without internet:

1. The local DPAPI-protected licence is verified offline and checked against the local tenant hardware
   fingerprint and clock high-water mark.
2. User signs in against the local user database.
3. Patient, bill, payment, hospital charge, sample and report operations run in local SQLite.
4. Invoice numbers come from a locally held block of 1000. The current implementation extends locally
   when exhausted; there is no server-assigned block in the local export model.
5. Report release checks local sample status and user authority.
6. A4/thermal invoices, hospital service bills and A4 reports print from local data.
7. A draft ABDM FHIR document can be generated locally, but it is not transmitted.

Current risk: browser storage is not a production-grade durable database and remains plaintext.
Desktop SQLCipher and encrypted backup/restore exist, but key export/import and clean-machine restore
are still P0 release gates.

## 6. Target production architecture

```text
Windows terminal
  -> Tauri application
  -> SQLCipher local database (system of record)
  -> encrypted local backups
  -> local_export_queue
  -> Rust background writer
  -> tx_YYYYMMDD_HHMMSS_XXXXXX.csv
  -> Google Drive desktop client (external upload)
```

There is no hosted write API or cloud sync service in the target design. The terminal remains the
source of truth. Google Drive is an outbox transport only; it does not provide data recovery, conflict
resolution, remote monitoring or a backup guarantee.

### Trust boundaries

- Terminal database and authenticated session: trusted device boundary.
- Google Drive sync folder and downstream consumer: outside the trusted terminal boundary; the CSV is
  plain text and must be access-controlled.
- Local read-only monitor: same-machine read-only view; no remote access.
- Backups: encrypted at rest; separate key custody.

## 7. Retired cloud sync design

The earlier host/API/cloud-dashboard design has been removed from the product and moved to
[archive/cloud-sync-retired.md](archive/cloud-sync-retired.md) for historical context only.

## 7. Deployment topologies

### Single-centre terminal

- One Tauri terminal + local SQLCipher + encrypted backups.
- Optional local Google Drive CSV outbox.
- Simplest pilot; no remote monitor or hosted service.

### One centre, many terminals

- 2�5 independent Tauri terminals
- Each terminal keeps its own SQLCipher database and invoice-number block
- Each terminal writes its own local CSV outbox folder
- No terminal-to-terminal merge; downstream consumers must treat transaction IDs as idempotency keys

### Multiple independent centres

- Independent local deployments, tenant per centre/hospital
- No shared cloud service or cross-terminal merge
- Tenant-specific users, settings, branding and modules
- No cross-tenant analytics or hosted consolidation

### Hospital integration

Not currently supported. Future work may require HIS/ADT, analyzer middleware, PACS/DICOM, HL7/FHIR
interfaces and a separate integration validation programme.

## 8. Architecture decisions and open questions

### Decisions already reflected

- One codebase, terminal and local monitor builds.
- Offline terminal writes only; local monitor is read-only.
- UUID business keys.
- Tenant-scoped schema and static scope checks.
- Money in paise; financial corrections append-only.
- Clinical report revisions append-only with amendment reasons.
- Legacy sync-ready metadata remains for compatibility; local export uses `local_export_queue`.
- ABDM FHIR drafts generated offline only.

### Decisions still required

1. SQLCipher key export/import and rotation workflow.
2. Google Drive folder ownership, sharing and downstream consumer validation.
3. Local export failure/retry acceptance and duplicate handling.
4. How user credentials/2FA metadata are distributed across terminals, if ever.
5. Logo/large asset storage in settings vs object storage.
6. Support policy for any future remote access; no hosted write/monitor path exists.
7. RPO/RTO and backup ownership for each deployment model.
8. Data-processing/DPDP review and subprocessor agreements.

## 9. References

- [Local CSV export](../LOCAL_CSV_EXPORT.md)
- [Productionization plan](productionization-plan.md)
- [Deployment and readiness](deployment-and-readiness.md)
- [Security, privacy and compliance](security-privacy-compliance.md)
- [Compliance matrix](../COMPLIANCE.md)
- [Product capabilities](product-capabilities.md)
- Source: `src/db/index.ts`, `src/db/schema.ts`, `src/db/tenant.ts`, `src/db/invoiceNo.ts`,
  `src/app/modules.ts`, `src/app/mode.ts`

