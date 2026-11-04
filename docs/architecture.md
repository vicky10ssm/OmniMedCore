# MediCore architecture and local export design

Last updated: 4 November 2026  
Current product version: `0.4.0`  
Current schema: `18`

## 1. Status and scope

This document separates:

- **Implemented today** — the local-first terminal build, local SQLCipher storage, encrypted backups and
  the local Google Drive CSV outbox.
- **Historical design** — an earlier hosted/cloud sync protocol retained below for context only.

The app no longer calls a hosted sync API, uses a sync token or writes to a cloud dashboard. The
supported integration path is the local CSV export described in [LOCAL_CSV_EXPORT.md](../LOCAL_CSV_EXPORT.md).

## 2. Architectural principles

1. **Offline is the terminal's default state.** Billing, samples and reporting cannot depend on a
   network request.
2. **Only terminals write business data.** The hosted browser product is read-only; there is no browser
   billing endpoint.
3. **Google Drive is an outbox, not a second editable copy.** The app writes a unique CSV file and Google Drive uploads it independently.
4. **Tenant isolation is mandatory.** Every business row and server query is scoped to a tenant derived
   from authenticated context, never trusted from request payload.
5. **Money uses integer paise and append-only correction flows.** A mistake is cancelled/re-issued or
   reversed, not silently overwritten.
6. **Clinical history is not last-write-wins.** Issued reports are amended with reasons; conflicting
   clinical edits require controlled resolution.
7. **Patient data is sensitive.** Secrets and patient data must not appear in logs, sync conflict
   messages, analytics or demo fixtures.
8. **Claims follow implementation.** Architecture diagrams do not make an unimplemented service live.

## 3. Current implementation

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ One React/TypeScript codebase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                                                                        â”‚
â”‚  Terminal mode                         Monitor mode                    â”‚
â”‚  â”œâ”€â”€ Layout + all terminal routes       â”œâ”€â”€ MonitorLayout               â”‚
â”‚  â”œâ”€â”€ billing/reporting/samples         â”œâ”€â”€ read-only routes            â”‚
â”‚  â”œâ”€â”€ client-side calculations          â””â”€â”€ no write controls            â”‚
â”‚  â””â”€â”€ SQL reads/writes                                                  â”‚
â”‚                                                                        â”‚
â”‚  DataSource interface                                                  â”‚
â”‚  â”œâ”€â”€ SqlJsSource (DEV/terminal)  â”€â”€ sql.js WASM â†’ IndexedDB            â”‚
â”‚  â””â”€â”€ ReadOnlySource (monitor)    â”€â”€ rejects run()/tx()                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
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
| Licensing | ECDSA P-256 signed offline licence, canonical JSON, tenant + device binding, edition/module entitlements |
| Licence expiry | 30-day grace; after grace UI enters read-only mode, existing data/print/export remain available |
| Licence storage | Browser `localStorage` in development; OS-secure packaged storage and backend enforcement still required |
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
6. The licence verifier loads the stored signed file, checks signature/tenant/device/expiry and derives
   the licensed module set. A development build falls back to a complete development licence only when
   no real licence is stored.
7. Auth restores a session or shows login/unlock.
8. Effective modules and routes are `licensed modules âˆ© clinic-enabled modules`; read-only mode applies
   after grace expiry.

### Module composition

MediCore is a multi-vertical product; a tenant enables only the modules it operates.

- Billing and money: patients, billing, invoices, dues, doctors, expenses. Referral commissions are
  not exposed or accrued.
- Diagnostics: tests/packages, sample chain, result entry, amendments, report printing.
- Hospital: inpatient admission, ward/bed, treating doctor, discharge diagnosis/summary, generic
  hospital service catalogue, IPD service charges, payments/balance and bill print.
- Pharmacy: medicine master, batch/expiry inventory, stock receipt, dispensing, GST receipt and
  transactional stock deduction.
- Compliance: sample/report/consent evidence, audit page, offline ABDM draft.
- Settings: centre identity, branding/logo, vertical/module visibility, users, numbering, terminal.
- Monitor: read-only dashboards, invoices, dues, reports, admissions, pharmacy and money views.

The umbrella brand is **MediCore** (`src/app/brand.ts`). Internal package/storage names retain the
historical `diagbill` identifier.

### Licensing boundary

```text
Vendor portal (private key, vendor-controlled)
   â””â”€â”€ signs licence JSON for tenantIds + deviceIds
                 â”‚ file / renewal download
                 â–¼
Terminal (public key only)
   â”œâ”€â”€ verifies ECDSA P-256 signature offline
   â”œâ”€â”€ checks tenant + device + status + expiry/grace
   â”œâ”€â”€ derives edition/module entitlements
   â””â”€â”€ gates navigation/routes and write controls
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
- The CSV is a summary outbox, not a backup and not a terminal-to-terminal sync service.

See [LOCAL_CSV_EXPORT.md](../LOCAL_CSV_EXPORT.md).

### Data ownership in current build

- The local database is the system of record.
- Browser storage is per origin/profile; `localhost` and `127.0.0.1` are separate stores.
- There is no cross-device sharing. “Monitor from anywhere” is **not delivered**; only the local
  read-only monitor build and the one-way Google Drive CSV outbox exist.

## 4. Current data model and sync-ready metadata

Most business tables carry:

| Column | Purpose |
| --- | --- |
| `id` | UUID generated on the terminal; no collisions across devices |
| `tenant_id` | Tenant isolation |
| `created_at` | Client creation time (epoch ms) |
| `updated_at` | Client edit time (epoch ms, sync hint, not trusted server time) |
| `device_id` | Originating terminal |
| `dirty` | Legacy local-change hint retained for schema compatibility; local export uses `local_export_queue` |
| `deleted` | Soft-delete tombstone for propagation |

Core relationships:

```text
tenant
â”œâ”€â”€ users / settings / audit
â”œâ”€â”€ patients
â”‚    â”œâ”€â”€ invoices â”€â”€ invoice_items
â”‚    â”‚    â”œâ”€â”€ payments
â”‚    â”‚    â”œâ”€â”€ samples
â”‚    â”‚    â””â”€â”€ report_orders
â”‚    â”‚         â”œâ”€â”€ report_parameters
â”‚    â”‚         â””â”€â”€ report_result_revisions
â”‚    â”œâ”€â”€ admissions â”€â”€ doctors
â”‚    â”‚    â”œâ”€â”€ hospital_charges
â”‚    â”‚    â””â”€â”€ hospital_bill_payments
â”‚    â”œâ”€â”€ pharmacy_sales â”€â”€ pharmacy_sale_items
â”‚    â””â”€â”€ abdm_consents â”€â”€ abdm_outbox
â”œâ”€â”€ hospital_services
â”œâ”€â”€ tests â”€â”€ test_parameters
â”œâ”€â”€ packages â”€â”€ package_items
â”œâ”€â”€ medicines â”€â”€ pharmacy_batches
â”œâ”€â”€ doctors
â””â”€â”€ expense_categories â”€â”€ expenses
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

1. The local licence file is verified offline and licenses are checked against the local tenant/device.
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

## 7. Historical cloud sync design (retired)

This section is retained only as historical design context. It is **not implemented or active**; the current product uses the local CSV outbox instead.

### 7.1 Device registration

1. Admin creates a one-time enrolment code in the cloud tenant console.
2. Terminal generates a cryptographic device keypair or strong device secret.
3. Terminal submits enrolment code + device public identity.
4. Server binds device to tenant, assigns a unique device code, returns a device credential.
5. Credential is stored in Windows Credential Manager/OS keystore, not in plain settings.
6. Server can revoke a lost/stolen device immediately.

Device code suggestions must be unique per tenant. Never rely on â€œA/B/Câ€ being manually typed correctly
for production numbering safety.

### 7.2 Terminal sync state

Target additions:

```text
sync_outbox
  operation_id (UUID, idempotency key)
  entity_table
  entity_id
  operation (upsert/delete/event)
  base_version
  payload_json
  created_at
  attempts
  next_attempt_at
  last_error

sync_state
  tenant_id
  device_id
  last_pull_cursor
  last_success_at
  schema_version
  status

sync_conflicts
  id
  entity_table / entity_id
  local_payload / remote_payload
  reason
  created_at
  resolved_at / resolved_by / resolution
```

`dirty` can remain as a UI/materialisation hint, but the durable outbox is the source of retries. A row
is marked clean only after the server acknowledges that operation.

### 7.3 Write path on the terminal

Every local mutation and its outbox entry happen in the **same SQLite transaction**:

```text
BEGIN
  write business row
  insert sync_outbox(operation_id, table, id, base_version, payload)
  set row dirty = 1
COMMIT
```

This guarantees a committed bill/report cannot exist without a pending sync intent.

The UI can attempt sync immediately but must never wait for it to complete billing.

### 7.4 Push protocol

Proposed endpoint:

```http
POST /v1/sync/push
Authorization: Device <token>
Idempotency-Key: <batch UUID>
{
  "schemaVersion": 17,
  "deviceId": "...",
  "operations": [
    {
      "operationId": "...",
      "table": "payments",
      "id": "...",
      "kind": "insert",
      "baseVersion": 0,
      "payload": { "...": "..." }
    }
  ]
}
```

Server processing:

1. Authenticate device, derive tenant, reject tenant mismatch in payload.
2. Validate schema/version and allowed table/operation.
3. Deduplicate by `operation_id`; return prior result for retries.
4. Validate references belong to same tenant.
5. Apply the table's conflict policy.
6. Assign a monotonically increasing `server_seq` to every accepted row/change.
7. Commit accepted operations atomically where practical.
8. Return `accepted`, `duplicates`, `conflicts` and retryable errors.

Terminal then:

- Deletes/marks acknowledged outbox operations.
- Marks rows clean only if no newer local edit occurred meanwhile (compare value/version).
- Records conflicts for human resolution.
- Retries transient failures with exponential backoff + jitter.

### 7.5 Pull protocol

```http
GET /v1/sync/pull?cursor=48120&limit=500
Authorization: Device <token>
```

Response:

```json
{
  "changes": [
    {
      "serverSeq": 48121,
      "table": "invoices",
      "id": "...",
      "rowVersion": 3,
      "deleted": false,
      "payload": { "...": "..." }
    }
  ],
  "nextCursor": 48620,
  "hasMore": true
}
```

Terminal:

1. Opens a local transaction.
2. Applies changes in `serverSeq` order.
3. Upserts only after conflict checks.
4. Stores `nextCursor` only after commit.
5. Repeats until `hasMore=false`.
6. Never marks pulled rows dirty just because they were downloaded.

Cursors are per device. Tombstones should remain available long enough for offline devices (for example
90 days) before archival; a device offline beyond that must perform a full resync rather than silently
miss deletions.

### 7.6 Data classes and conflict policy

| Data | Write class | Conflict rule |
| --- | --- | --- |
| Patients | Mutable master | Version-checked update; expose conflict when base version stale. Do not merge names/phones silently. |
| Tests, packages, doctors | Mutable catalog | Version-checked/LWW with audit and conflict notice; prices must not silently change historical invoice lines. |
| Settings, logo, module config | Mutable config | LWW by server receipt order with audit; large assets may move to object storage later. |
| Invoice header/items | Financial document | Insert once; do not edit historical amounts. Corrections are cancel + reissue. |
| Payments | Append-only | Always insert a new UUIDed payment; never update amount in place. |
| Expenses | Financial record | Prefer append-only correction; admin edits use version checks and audit. |
| Legacy commission entries | Append-only legacy data | No new rows are generated; do not reintroduce referral commission accrual/payout without legal/compliance review. |
| Samples | Clinical workflow | Version-checked transition. Two offline conflicting transitions are quarantined for review. |
| Report orders/parameters | Clinical result | Version-checked; **never last-write-wins**. Conflicting releases/amendments require pathologist resolution. |
| Report revisions/audit | Append-only | Accept every unique event; immutable. |
| Admissions | Clinical workflow | Version-checked status/admission/discharge. Conflicting discharge or ward changes are quarantined. |
| Medicines / batches | Pharmacy inventory | Version-checked batch receipt; batch quantity is a controlled stock movement, not blind LWW. |
| Pharmacy sales/items | Financial + stock | Sale and items insert-once; cancellation is a reasoned event that returns stock. Conflicting cancellation/payment states need review. |
| ABDM consents/outbox | Sensitive clinical/integration | Version-checked consent; outbox drafts append-only. Monitor never writes. |
| Invoice number blocks | Allocation | Server-exclusive block lease; no overlapping ranges. Applies to invoices, admissions and pharmacy receipts. |

### 7.7 Invoice numbering across terminals

Production sequence:

1. A terminal requests a block from the server:
   `POST /v1/invoice-blocks/claim { purpose: "invoice" }`.
2. Server transaction allocates a non-overlapping `[start,end]` range for that tenant/device.
3. Terminal consumes locally while offline.
4. Before exhausting, it claims another block when online.
5. Pre-provision at least one reserve block so a normal offline period cannot exhaust numbering.
6. If reserve is exhausted offline, the terminal uses a device-code fallback reserved uniquely for that
   device or blocks finalization until a block is claimed. It must never generate a range that could
   collide with another device.
7. Every block lease is auditable. Unused gaps from cancelled/abandoned ranges are acceptable.

The current local implementation starts at 1 and extends locally; this is a development safety net, not
the final multi-terminal allocation protocol.

### 7.8 Idempotency, retries and ordering

- Every operation has a UUID idempotency key.
- Server stores operation results for at least the maximum retry horizon.
- Terminal retry: exponential backoff (e.g. 2s, 4s, 8sâ€¦ capped at 5 minutes) with jitter.
- Sync is bounded and resumable.
- Parent masters should be sent before dependent rows in a batch.
- The server should accept valid subsets even if another operation conflicts; terminal handles the
  conflict queue.
- A device upgrade incompatibility returns a clear â€œupdate requiredâ€ response; terminal continues local
  billing and retries after upgrade.
- Network failure never rolls back a completed local bill.

### 7.9 Clocks and ordering

- Terminal `updated_at` is a hint, not authoritative; device clocks can be wrong.
- Cloud assigns authoritative `server_seq` and `received_at`.
- Version checks use server row versions/base versions, not only timestamps.
- Last-write-wins, where allowed, uses server receipt order and records both versions in audit.
- Clinical conflicts are never resolved by timestamp alone.

### 7.10 Deletions and retention

- Deletes are tombstones (`deleted=1`), never immediate hard deletes for business records.
- Cloud propagates tombstones with `server_seq`.
- Financial and clinical records should generally not be deleted; use cancellation/amendment.
- Tombstone retention must exceed the longest supported offline period.
- Monitor must not expose deleted rows.
- Export/deletion on tenant offboarding is a separate documented workflow with legal review.

### 7.11 Tenant and security enforcement

- Server derives `tenant_id` from the authenticated device/user, never from the payload.
- Every server query includes tenant scope.
- Every referenced row is validated within that tenant.
- Row-level security in PostgreSQL is recommended as defence in depth.
- Monitor tokens cannot call sync/push endpoints.
- Device tokens can be revoked individually.
- Do not sync plaintext TOTP secrets, recovery codes or password hashes to the monitor database.
  If user administration must sync, use a separately protected security channel and explicit design.
- TLS in transit; encrypted local DB and encrypted backups at rest.
- Logs exclude patient names, ABHA, consent artefacts and FHIR payloads.

### 7.12 Sync scheduling and UX

- Sync on app start, network reconnect, after important writes (debounced), and periodically.
- Manual **Sync now** action.
- UI status examples:
  - â€œAll changes synced Â· 2 min agoâ€
  - â€œOffline â€” 14 changes waitingâ€
  - â€œConflict: report amendment needs reviewâ€
  - â€œUpdate required before cloud syncâ€
- Never show a generic success when only local persistence succeeded.
- Conflict resolution must name the affected patient/report or invoice and require an authorised user.

### 7.13 Monitor read model

The monitor is not a second terminal:

- Read-only endpoints such as `GET /v1/monitor/summary`, `/invoices`, `/reports`.
- No `/sync/push`, `/billing`, `/patients/update`, `/reports/release` for monitor tokens.
- Tenant and role scope derived server-side.
- Admin-only money views.
- Data minimisation: no TOTP secrets, encryption keys, raw audit payloads or unnecessary identifiers.
- Optional freshness timestamp from the last accepted terminal sequence.
- If cloud is stale/offline, show â€œLast updatedâ€¦â€ rather than pretending live.

## 8. Sync sequence diagrams

### Offline bill and later push

```text
Terminal UI       Local SQLite          Sync worker          Cloud
    â”‚                  â”‚                    â”‚                 â”‚
    â”‚ create bill      â”‚                    â”‚                 â”‚
    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚                    â”‚                 â”‚
    â”‚                  â”‚ write rows+outbox  â”‚                 â”‚
    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ commit             â”‚                 â”‚
    â”‚ print invoice    â”‚                    â”‚                 â”‚
    â”‚                  â”‚                    â”‚ network returns â”‚
    â”‚                  â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤                 â”‚
    â”‚                  â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚ push operations â”‚
    â”‚                  â”‚                    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚
    â”‚                  â”‚                    â”‚                 â”‚ validate/seq
    â”‚                  â”‚                    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
    â”‚                  â”‚ ack/clear outbox   â”‚                 â”‚
    â”‚                  â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤                 â”‚
```

### Second terminal pulls changes

```text
Terminal B       Local SQLite         Cloud
    â”‚                 â”‚                  â”‚
    â”‚ sync now        â”‚                  â”‚
    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚ GET pull(cursor) â”‚
    â”‚                 â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚
    â”‚                 â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ changes + seq
    â”‚                 â”‚ apply transactionâ”‚
    â”‚                 â”‚ save new cursor  â”‚
    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤                  â”‚
```

### Monitor

```text
Phone browser     Monitor API        Cloud DB
    â”‚                 â”‚                  â”‚
    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚ read-only query  â”‚
    â”‚                 â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚
    â”‚                 â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ tenant/role data â”‚
```

## 9. Conflict examples

### Same patient edited on two terminals

- Both edit offline.
- First accepted by cloud gets row version 4.
- Second has base version 3.
- For demographic fields, policy can show a conflict or apply approved LWW with audit.
- Do not merge names/identifiers silently.

### Two terminals collect the same balance

Offline, both may accept a payment. Payments themselves are append-only and sync safely, but the invoice
may become overpaid. The cloud/read model must flag overpayment, and operations must resolve via refund
or credit note. Prevention requires connectivity-aware balance checks or stricter terminal ownership.

### Two result releases/amendments

- Never choose by `updated_at`.
- Server rejects/references the stale base version.
- Terminal creates a clinical conflict.
- Authorised pathologist reviews both snapshots, chooses the valid current revision and records an
  amendment reason. Both original events remain in history.

### Sample rejected on one terminal, accepted on another

- Version-checked transition conflict.
- Quarantine; do not report automatically.
- Operator resolves using physical sample status and documented reason.

### Invoice number collision

- Should be impossible with server-exclusive blocks and unique device codes.
- If observed, stop sync for affected block, preserve evidence, issue replacement numbers through the
  controlled exception process, notify support.

## 10. Failure scenarios

| Failure | Expected behavior |
| --- | --- |
| No internet during billing | Local bill completes; outbox grows; sync status shows pending |
| API unavailable | Retry/backoff; terminal remains usable |
| API timeout after server commit | Idempotency key prevents duplicate records |
| Device clock wrong | Server sequence/version wins; timestamp issue recorded |
| Local disk full | Block further writes with clear error; do not silently lose outbox |
| Local DB corrupt | Restore backup; do not sync uncertain state |
| Schema mismatch | Terminal stays local; prompts upgrade; no partial sync |
| Sync conflict | Quarantine locally, block affected merge, alert authorised user |
| Revoked device | API rejects; local read/export policy defined; no further upload |
| Cloud data lost | Restore cloud from backup; terminal local data remains primary for recovery |
| Tenant deletion/offboarding | Export, verify, revoke devices, delete by policy, issue evidence |

## 11. Sync test plan

At minimum automate:

1. One terminal external cycle: create 100 offline invoices, reconnect, push, verify cloud count.
2. Two terminals creating invoices offline with distinct blocks; no number collision.
3. Pull cursor and tombstone propagation to a terminal that reconnects.
4. Retry with same idempotency key after simulated timeout; no duplicate.
5. Patient edit conflict.
6. Concurrent report amendment conflict; no silent overwrite.
7. Sample accept vs reject conflict.
8. Overpayment after concurrent offline payments; exception flagged.
9. Device revocation.
10. Tenant A token cannot read/write Tenant B.
11. Schema version mismatch.
12. 30-day offline device catches up or triggers full resync.
13. Monitor cannot call write endpoints.
14. Cloud restore plus terminal re-push without duplicates.
15. Load test at expected invoice/report volume.

## 12. Deployment topologies

### Single-centre terminal, no cloud

- One Tauri terminal + local SQLite + encrypted backups.
- Simplest pilot; no remote monitor.
- Still productionizable for billing if backup/recovery gates pass.

### One centre, many terminals

- 2–5 independent Tauri terminals
- Each terminal keeps its own SQLCipher database and invoice-number block
- Each terminal writes its own local CSV outbox folder
- No terminal-to-terminal merge; downstream consumers must treat transaction IDs as idempotency keys

### Multiple independent centres

- Tenant per centre/hospital
- Shared cloud service, isolated schemas/rows
- Tenant-specific users, settings, branding and modules
- Support console with audited impersonation/support access, if introduced
- No cross-tenant analytics without explicit consent/aggregation

### Hospital integration

Not currently supported. Future work may require HIS/ADT, analyzer middleware, PACS/DICOM, HL7/FHIR
interfaces and a separate integration validation programme.

## 13. Architecture decisions and open questions

### Decisions already reflected

- One codebase, terminal and monitor builds.
- Offline terminal writes only; browser monitor is read-only.
- UUID business keys.
- Tenant-scoped schema and static scope checks.
- Money in paise; financial corrections append-only.
- Clinical report revisions append-only with amendment reasons.
- Sync-ready metadata exists.
- ABDM FHIR drafts generated offline only.

### Decisions still required

1. Cloud provider and India data-residency approach.
2. SQLCipher key export/import and rotation workflow.
3. Server framework/language and queue/change-log implementation.
4. Device keypair vs device secret + token rotation.
5. Whether audit rows sync in full or only hashes/metadata.
6. How user credentials/2FA metadata are distributed across terminals.
7. Clinical conflict resolution UX and approval authority.
8. Tombstone retention vs long-offline devices.
9. Logo/large asset storage in settings vs object storage.
10. Support impersonation policy and whether it is ever allowed to write.
11. RPO/RTO and backup ownership for each deployment model.
12. Data-processing/DPDP review and subprocessor agreements.

## 14. References

- [Productionization plan](productionization-plan.md)
- [Deployment and readiness](deployment-and-readiness.md)
- [Security, privacy and compliance](security-privacy-compliance.md)
- [Compliance matrix](../COMPLIANCE.md)
- [Product capabilities](product-capabilities.md)
- Source: `src/db/index.ts`, `src/db/schema.ts`, `src/db/tenant.ts`, `src/db/invoiceNo.ts`,
  `src/app/modules.ts`, `src/app/mode.ts`

