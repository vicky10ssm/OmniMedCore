# OmniMed Core Google dashboard kit

This folder contains the **optional, external, read-only** production pipeline for the Google
Sheets/BigQuery/Looker Studio dashboard described in [../GOOGLE_DASHBOARD.md](../GOOGLE_DASHBOARD.md).

The desktop product is not modified. OmniMed Core keeps writing its existing local Google Drive CSV
exports. This kit reads those files from a dedicated Shared Drive folder, validates them, and loads a
minimised reporting subset into BigQuery for Looker Studio.

## Safety boundary

- **No app changes:** no `src/` import, no Tauri command, no database migration, no new timer, no queue
  change, and no network call is added to OmniMed Core.
- **No write-back:** the pipeline cannot modify the terminal database, mark files as processed in the
  app, or acknowledge Google Drive uploads.
- **No operational coupling:** if the pipeline is stopped, late, misconfigured or fails, billing and
  reporting continue unchanged. The app still exports locally exactly as before.
- **Fail closed:** a new snapshot becomes visible only after every approved table has loaded and
  validated. A malformed file leaves the previous snapshot active.
- **Data minimisation:** only allowlisted reporting columns leave Google Cloud. Patient names, phone
  numbers, addresses, ABHA IDs, clinical notes, findings, impressions, signatures and authentication
  secrets are never loaded into BigQuery.
- **Single source:** the default pipeline uses the daily **full snapshot** only. It does not append
  transaction CSV rows, so revenue cannot be double-counted by mixing the two export contracts.

These rules are enforced by tests in `test/dashboard.test.mjs`, including a test that scans the desktop
sync code for dashboard, cloud or network imports.

## Architecture

```text
OmniMed Core terminal
  -> existing local CSV export folder
  -> Google Drive / Shared Drive (private)
  -> Cloud Run job: validate + minimise + load
  -> BigQuery: raw snapshot tables -> single active pointer -> reporting views
  -> Looker Studio (read-only)
```

The job runs on a schedule (for example every 60 minutes) and picks the newest complete
`snapshot_YYYYMMDD_HHMMSS_xxxxxx` folder. The previous snapshot stays in BigQuery for rollback and
retention.

## Prerequisites

- Node.js 24 for local validation and tests.
- A Google Cloud project with BigQuery, Cloud Run, Cloud Build and Cloud Scheduler enabled.
- A private Drive folder or Shared Drive that contains `full-export/snapshot_*` folders uploaded by the
  existing Google Drive desktop client.
- A dedicated service account. Share only the dashboard Drive folder with that account as **Viewer**.
- The clinic's approval for the reporting subset and retention period.

## Local validation (no cloud access)

Run this on a copy of the export folder before deploying. It parses the newest snapshot, checks the
manifest and row counts, applies the allowlist, and prints the planned tables. It does not write to
BigQuery.

```powershell
cd C:\dev\medicore
node google-dashboard/src/main.mjs --source local `
  --folder "%USERPROFILE%\My Drive\OmniMed Core\outbox\full-export" `
  --dry-run
```

Expected output ends with `"dryRun": true` and one entry per approved table. A missing required table,
row-count mismatch, unsafe file name or malformed CSV exits non-zero.

## Tests

```powershell
npm run check:dashboard
```

The tests cover CSV quoting, formula-guard removal, manifest/path validation, PII column removal,
newest-snapshot selection, idempotency, row-count mismatch handling, failed-load rollback, and the
no-app-coupling guard.

## Deploy

1. Build and push the container:

   ```powershell
   gcloud builds submit google-dashboard `
     --tag "asia-south1-docker.pkg.dev/PROJECT/omnimed/omnimed-dashboard:0.29.0"
   ```

2. Create the service account and grant only the required roles:

   ```powershell
   gcloud iam service-accounts create omnimed-dashboard `
     --display-name "OmniMed dashboard ingestion"
   gcloud projects add-iam-policy-binding PROJECT `
     --member "serviceAccount:omnimed-dashboard@PROJECT.iam.gserviceaccount.com" `
     --role "roles/bigquery.jobUser"
   gcloud projects add-iam-policy-binding PROJECT `
     --member "serviceAccount:omnimed-dashboard@PROJECT.iam.gserviceaccount.com" `
     --role "roles/bigquery.dataEditor"
   ```

   Share the Drive snapshot folder with the service account as **Viewer**. Do not grant project-wide
   Drive administration.

3. Deploy the Cloud Run job with `max-retries=0` and one task:

   ```powershell
   gcloud run jobs deploy omnimed-dashboard-ingest `
     --image "asia-south1-docker.pkg.dev/PROJECT/omnimed/omnimed-dashboard:0.29.0" `
     --region asia-south1 `
     --service-account "omnimed-dashboard@PROJECT.iam.gserviceaccount.com" `
     --set-env-vars "GOOGLE_CLOUD_PROJECT=PROJECT,DRIVE_FOLDER_ID=DRIVE_FOLDER_ID,BQ_LOCATION=asia-south1,BQ_DATASET=omnimed_reporting,BQ_RAW_DATASET=omnimed_reporting_raw,MAX_SNAPSHOT_AGE_HOURS=48,REQUIRE_FRESH_SNAPSHOT=false" `
     --max-retries 0 `
     --task-timeout 1800
   ```

   Run it once manually. Confirm the job log reports a snapshot id and table counts before scheduling.

4. Schedule it with Cloud Scheduler:

   ```powershell
   gcloud scheduler jobs create http omnimed-dashboard-hourly `
     --location asia-south1 `
     --schedule "15 * * * *" `
     --uri "https://asia-south1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT/jobs/omnimed-dashboard-ingest:run" `
     --http-method POST `
     --oauth-service-account-email "omnimed-dashboard@PROJECT.iam.gserviceaccount.com"
   ```

5. Open Looker Studio and connect the reporting views in the `omnimed_reporting` dataset. Keep the
   report private to named users. Do not use public link sharing.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `DRIVE_FOLDER_ID` | required for Drive | Folder/Shared Drive containing `snapshot_*` directories |
| `GOOGLE_CLOUD_PROJECT` | required | BigQuery project |
| `BQ_LOCATION` | `asia-south1` | Dataset and job location |
| `BQ_DATASET` | `omnimed_reporting` | Looker Studio views |
| `BQ_RAW_DATASET` | `omnimed_reporting_raw` | Raw string tables and active pointer |
| `MAX_SNAPSHOT_AGE_HOURS` | `48` | Freshness warning threshold |
| `MAX_FILE_BYTES` | `104857600` | Per-table CSV size limit |
| `MAX_ROWS_PER_TABLE` | `500000` | Per-table row limit |
| `ALLOW_MISSING_TABLES` | `false` | Keep `false`; missing required tables fail closed |
| `REQUIRE_FRESH_SNAPSHOT` | `false` | Set `true` only if a stale snapshot must fail the run |
| `RAW_RETENTION_DAYS` | `90` | BigQuery raw snapshot partition retention |

## Data loaded

Only the tables and columns in `src/dashboardSchema.mjs` are loaded. The raw BigQuery tables are all
`STRING`, which avoids load failures when the desktop schema gains a column. Typed and rupee-converted
views are in `sql/views.sql`.

Core views include `v_invoices`, `v_invoice_items`, `v_payments`, `v_expenses`, `v_report_orders`,
`v_samples`, `v_pharmacy_sales`, `v_admissions`, `v_hospital_charges`,
`v_hospital_bill_payments`, `v_patients`, `v_tests`, `v_doctors`, `v_daily_collections` and
`v_data_freshness`.

`v_data_freshness` is the dashboard's source timestamp. Label the report **last updated**, never
**live**.

## Failure and rollback

- The job loads into `raw_<table>` with `_snapshot_id` and `_run_id`.
- `_current_snapshot` is a single row. The dashboard views read only the snapshot id in that row.
- A failed load never changes `_current_snapshot`; the previous snapshot stays visible.
- Re-running a partially loaded snapshot deletes only that snapshot's rows before reloading.
- An already active snapshot is skipped, so scheduler retries are harmless.
- To roll back, point `_current_snapshot.snapshot_id` at a previous retained snapshot. No terminal data
  is involved.

## Retention and privacy

- Raw snapshot tables are partitioned by `_ingested_at` and expire after `RAW_RETENTION_DAYS`.
- `pipeline_runs` retains operational status for 400 days.
- Patient identifiers remain internal database IDs, not names. Do not add patient-level pages for
  general viewers.
- BigQuery, Cloud Storage (if used), Cloud Run and Looker Studio must stay in the clinic's approved
  region.
- The local CSV folder is still plain text and is not a backup. Keep using the SQLCipher backup process
  in [../BACKUP_RESTORE.md](../BACKUP_RESTORE.md).

## Non-goals

- No live sync, write-back, correction propagation or remote monitoring.
- No Drive upload acknowledgement.
- No ingestion while the desktop app is closed; the app still writes the daily snapshot only while it
  is open.
- No replacement for backups, the in-app dashboard or the read-only monitor build.
