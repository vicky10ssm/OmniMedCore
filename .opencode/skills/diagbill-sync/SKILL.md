---
name: diagbill-sync
description: Use when changing MediCore's local Google Drive CSV outbox, local_export_queue, export scheduler, masking, retry behavior, or CSV contract.
---

# DiagBill local CSV export

Use this skill for the offline-safe local export path. The app no longer has a hosted sync API,
sync token or cloud dashboard.

## Read first

- `../../../src/db/schema.ts` — migration 18, `local_export_queue` and triggers
- `../../../src/sync/syncEngine.ts` — scheduler, masking, CSV rows, retry/marking
- `../../../src/sync/syncConfig.ts` — `GOOGLE_DRIVE_SYNC_PATH`
- `../../../src/pages/SyncSettings.tsx` — folder configuration and status
- `../../../src-tauri/src/export.rs` — unique file writer and CSV contract
- `../../../LOCAL_CSV_EXPORT.md` — operator/developer contract
- `../../../docs/architecture.md` — local export boundary

## Current behavior

- `local_export_queue` is the pending/exported ledger.
- Triggers snapshot invoices (Diagnostics), pharmacy sales (Pharmacy), admissions (Hospital) and
  hospital charges.
- A 30-second scheduler runs while the app is open.
- Up to 100 pending rows are written per batch.
- Each batch creates a new file named `tx_YYYYMMDD_HHMMSS_XXXXXX.csv`.
- The file is written by Rust `spawn_blocking` using `create_new(true)`.
- CSV columns are `Sync_Timestamp, Transaction_ID, Module_Type, Masked_Patient_ID, Total_Amount`.
- Patient IDs are SHA-256 masked; no names/results/notes are exported.
- Success marks `exported_at` and `export_file`; failure leaves rows pending with `last_error`.

## Change rules

1. Never append to or overwrite an existing CSV.
2. Keep filenames unique; preserve the exact timestamp/random pattern.
3. Keep CSV rows flat and exactly five columns unless the contract is deliberately versioned.
4. Never export raw patient IDs, names, phone numbers, report results or clinical notes.
5. File I/O must stay off the UI thread.
6. A failed write must leave the batch pending and retryable; do not mark it exported.
7. Success means local file write only, not Google Drive upload or downstream processing.
8. Do not promise import, merge, deletion propagation, remote monitoring or terminal-to-terminal sync.
9. Keep tenant scoping on queue reads and updates.
10. Do not delete legacy `sync_queue`/`sync_ack` history; migration 18 only drops their triggers.

## Verification

1. `npm run check` and both Vite builds.
2. `cargo test --manifest-path src-tauri/Cargo.toml --lib`.
3. Launch the packaged/Tauri app and confirm schema 18.
4. Create a synthetic invoice/pharmacy sale/hospital charge and confirm queue rows.
5. Confirm a new CSV is created with the exact name/header and masked patient ID.
6. Confirm the source rows are marked exported and pending returns to zero.
7. Make the sync folder unavailable/read-only; confirm pending remains and `last_error` is recorded.
8. Restore the folder; confirm the next interval retries and succeeds.
9. Confirm no `fetch`, endpoint, token, ACK or cloud-dashboard call exists in the export path.
