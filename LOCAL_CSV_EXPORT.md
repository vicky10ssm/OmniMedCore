# Local Google Drive CSV export

Last updated: 5 November 2026<br>
Applies to: OmniMed Core desktop `0.18.0+`, schema `24+`

## What it does

OmniMed Core no longer sends sync rows to an API, endpoint or cloud dashboard. It writes CSV files into a
local Google Drive sync folder. The Google Drive desktop client uploads those files independently.

The terminal remains completely offline-capable. There is no network request in either export path.

Two exports are implemented:

1. **Transaction outbox** — a minimal five-column summary for new invoices, pharmacy sales, admissions
   and hospital charges.
2. **Full data snapshot** — one CSV per database table, including patients and all business modules.

## Configuration

The default folder is:

```text
C:\Users\Public\MedicalApp_Sync
```

The frontend exposes the path as `GOOGLE_DRIVE_SYNC_PATH`. It can be changed in
**Settings → Device & sync → Local CSV export**, including through the native folder picker.

The Rust exporter creates the directory if it does not exist. If the path exists but is not a
directory, or cannot be written, the export fails safely and the batch remains pending.

## File contract

Every successful batch creates a brand-new file:

```text
tx_YYYYMMDD_HHMMSS_XXXXXX.csv
```

- `YYYYMMDD_HHMMSS` is local time at export.
- `XXXXXX` is six random hexadecimal characters.
- The file is opened with `create_new(true)`, so it can never be appended to or overwrite an older
  file.
- A filename collision is treated as an error; the batch is retried later with a new filename.

Header:

```csv
Sync_Timestamp,Transaction_ID,Module_Type,Masked_Patient_ID,Total_Amount
```

Rows are flat and contain no nested JSON:

```csv
2026-11-04T01:46:24.025Z,8d961e16-299c-414c-ac7d-9014ee80fa94,Diagnostics,MASK-3259FFC0A51F,112.00
```

`Total_Amount` is rupees with two decimal places, formatted from integer paise.

## Transactions and modules

Migration 18 creates `local_export_queue` and triggers for the three commercial modules:

| Module | Source | Transaction ID | Total amount |
| --- | --- | --- | --- |
| Diagnostics | `invoices` | invoice ID | invoice total |
| Pharmacy | `pharmacy_sales` | sale ID | sale total |
| Hospital | `admissions` + `hospital_charges` | admission ID | sum of non-deleted charges |

Updates and cancellations append a new queue snapshot. The CSV does not include a status/operation
column because the requested export schema is deliberately minimal. Do not use this CSV as a complete
financial or clinical record.

The existing `sync_queue`/`sync_ack` tables are historical. Migration 18 drops their triggers and the
new exporter never reads them.

## Full data snapshots (all modules)

The transaction outbox is deliberately minimal. The separate full-data export writes one CSV per
database table into:

```text
<configured Google Drive folder>\full-export\snapshot_YYYYMMDD_HHMMSS_XXXXXX\
```

It runs:

- automatically once per day while the desktop app is open, and
- on demand from **Settings → Device & sync → Export all modules now**.

The snapshot is tenant-scoped and includes all business tables, including:

- patients and doctors
- tests, parameters, packages and package items
- invoices, invoice items, payments, dues and invoice blocks
- samples, report orders, report parameters, report result revisions and radiologist signature records
- admissions, hospital services, hospital charges and hospital bill payments
- medicines, pharmacy batches, pharmacy sales and sale items
- expenses, expense categories, payouts and commission history
- settings, users, audit log, ABDM consents/drafts, export queues
- the current tenant record and local metadata

Each table is a separate file (`patients.csv`, `invoices.csv`, `pharmacy_sales.csv`, etc.). Deleted
rows are included because the database uses soft-delete tombstones. The snapshot also contains
`_manifest.json` describing row counts, exported columns, skipped tables and excluded columns.

### Sensitive columns that are never exported

Authentication secrets are excluded even from the full snapshot:

- `users.password_hash`
- `users.totp_secret`
- `users.recovery_codes`
- `users.totp_last_step`

Internal runtime secrets and licence DPAPI blobs are not database tables and are never part of the
Google Drive export. The full snapshot does contain patient-identifying and clinical data; protect the
Google Drive folder and sharing permissions accordingly. It is still **not a backup**: use the
SQLCipher backup in [BACKUP_RESTORE.md](BACKUP_RESTORE.md).

### Optional Google dashboard

An external read-only dashboard can be built from these files, but it is **not part of the desktop
product**. The design, ingestion options, recommended BigQuery model, Looker Studio pages, security
controls and acceptance tests are documented in [GOOGLE_DASHBOARD.md](GOOGLE_DASHBOARD.md).

The key boundary remains: Google Drive is an outbox, and the dashboard is a downstream consumer. No
dashboard can write back into OmniMed Core, acknowledge uploads or replace terminal backups.

## Queue, retry and failure handling

- The scheduler runs every 30 seconds while the app is open.
- It reads up to 100 pending `local_export_queue` rows for the current tenant.
- File writing happens in Rust on a blocking worker thread, not on the UI thread.
- On success, rows are marked with `exported_at` and `export_file`.
- On failure, rows stay pending, with `last_error` and `last_attempt_at` recorded. The error is also
  written to the local browser error log and shown in Settings.
- The next interval retries the same rows.
- If the app or PC stops after a file is written but before the queue is marked, the same transaction
  may be exported again in a later file. Consumers must treat transaction IDs as the idempotency key.

No queue rows are deleted, so export history remains auditable.

## Privacy and security

- Patient IDs are masked with a SHA-256 prefix before being sent to the Rust writer.
- The CSV contains transaction IDs, module, masked patient IDs and amounts. It does not contain names,
  phone numbers, report results or clinical notes.
- The CSV itself is plain text. Protect the Google Drive folder with the centre's Google account,
  device access controls and approved sharing policy.
- This export is not a backup. Use SQLCipher-encrypted backups in `BACKUP_RESTORE.md` for recovery.

## Google Drive setup

1. Install and sign in to the Google Drive desktop client on the terminal.
2. Choose a folder under the synced Google Drive location (for example
   `C:\Users\<user>\My Drive\OmniMed Core\outbox`) or keep the default public folder if the buyer accepts
   it.
3. Keep the Google Drive client running so completed CSV files upload.
4. Do not let two terminals write to the same folder unless the downstream consumer can handle multiple
   transaction IDs and duplicate snapshots.

## Limitations

- One-way exports only; no import, merge or terminal-to-terminal sync.
- No ACK from Google Drive; success means "file written locally", not "uploaded and processed".
- Plain CSV in the sync folder is not encrypted; use a controlled Google Drive account/folder.
- The transaction scheduler and daily full-snapshot scheduler run only while the desktop app is open.
- Full snapshots contain patient identifiers and clinical data and must be protected accordingly.
- Full snapshots are not a substitute for encrypted SQLCipher backups or restore testing.
- Historical `sync_queue`/`sync_ack` rows are retained and may appear in full snapshots, but are no
  longer used by the transaction exporter.
