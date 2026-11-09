# Google dashboard design for OmniMed Core

Status: **design only - not implemented in the desktop product**  
Applies to: OmniMed Core `0.7.0+`, schema `20+`  
Related: [LOCAL_CSV_EXPORT.md](LOCAL_CSV_EXPORT.md), [docs/architecture.md](docs/architecture.md)

## 1. Purpose

This document describes how an optional **Google-based read-only dashboard** could be built on top of
the CSV files that OmniMed Core already writes to a local Google Drive sync folder.

The dashboard is an **external downstream consumer**. It is not:

- a new OmniMed Core cloud service
- live sync
- a write path back into the terminal
- a replacement for backups
- a remote patient-record viewer
- a PACS, DICOM or radiology-image viewer
- an ABDM transport

The desktop app remains the source of truth. Google Drive is an outbox. Google Sheets, BigQuery and
Looker Studio are optional reporting layers.

## 2. What "Google dashboard" means here

There are three practical levels:

| Level | Components | Best for |
| --- | --- | --- |
| Pilot | Google Drive + Google Sheets + Apps Script | One centre, small data volume, quick review |
| Production | Google Drive + Cloud Run/Cloud Functions + BigQuery + Looker Studio | Multiple centres, larger volumes, access control and reliable refresh |
| Lightweight | Google Drive + Looker Studio connected to a Google Sheet | A fast demo, not a long-term clinical data store |

**Recommended production design:** Google Drive outbox -> Cloud Run/Cloud Functions ingestion ->
BigQuery tables -> Looker Studio dashboards.

**Recommended pilot design:** Google Drive outbox -> Apps Script -> Google Sheets -> Looker Studio.
The Sheet is a staging and charting layer, not the source of truth.

Looker Studio cannot reliably read a changing local Google Drive folder directly. A small ingestion
job is required. This is the most important design constraint.

## 3. End-to-end architecture

```text
OmniMed Core desktop terminal
  |
  | writes unique CSVs locally
  v
Local Google Drive sync folder
  C:\Users\<user>\My Drive\OmniMed Core\outbox
  |
  | Google Drive desktop client uploads independently
  v
Google Drive / Shared Drive
  |
  | scheduled ingestion (Apps Script OR Cloud Run/Cloud Functions)
  v
Google Sheets (pilot)  OR  BigQuery dataset (production)
  |
  | read-only data source
  v
Looker Studio dashboard
  |
  | browser access
  v
Owner / administrator / accountant / operations manager
```

### Non-negotiable rules

1. The dashboard must never write to the OmniMed database.
2. Google Drive must never be treated as the terminal backup.
3. Dashboard success does **not** mean the desktop app knows the file was uploaded or processed.
4. No public Drive links, public Sheets or public Looker Studio reports.
5. Full snapshots contain patient and clinical data. Aggregation and access control are mandatory.
6. The dashboard must show its data freshness (latest file timestamp and latest snapshot).
7. Do not sum transaction files and full snapshots together; choose one source per metric.

## 4. Data available from OmniMed Core

OmniMed Core produces two different export types. They serve different purposes.

### 4.1 Transaction outbox

Path:

```text
<GOOGLE_DRIVE_SYNC_PATH>\tx_YYYYMMDD_HHMMSS_XXXXXX.csv
```

Contract:

```text
Sync_Timestamp, Transaction_ID, Module_Type, Masked_Patient_ID, Total_Amount
```

Characteristics:

- one new file per export batch
- append-only; files are never overwritten
- up to 100 pending queue rows per batch
- written by the app every 30 seconds while it is open
- `Module_Type` is `Diagnostics`, `Pharmacy` or `Hospital`
- patient ID is SHA-256 masked
- no names, results, notes or clinical free text
- success means the local file was written, not that Google Drive uploaded it

This is the best source for **small, privacy-preserving trend metrics**: daily collections by module
and transaction count. It is not enough for diagnosis mix, doctor performance, stock, dues or
patient-level analysis.

### 4.2 Full all-module snapshots

Path:

```text
<GOOGLE_DRIVE_SYNC_PATH>\full-export\snapshot_YYYYMMDD_HHMMSS_XXXXXX\<table>.csv
```

Each snapshot also contains `_manifest.json` with row counts, exported columns, skipped tables and
excluded columns.

The snapshot includes all business tables, including:

- `patients`, `doctors`, `tests`, `packages`
- `invoices`, `invoice_items`, `payments`
- `expenses`, `expense_categories`
- `samples`, `report_orders`, `report_parameters`, `report_result_revisions`,
  `radiologists`, `pathologists`
- pharmacy stock and sales tables
- admissions, hospital charges and hospital payments
- audit/compliance data

Authentication secrets are excluded: password hashes, TOTP secrets, recovery codes and TOTP replay
state are never exported.

The snapshot includes soft-deleted rows (`deleted = 1`) and is tenant-scoped. It contains confidential
patient and clinical data. It is an export, not an encrypted backup.

**Use the latest complete snapshot for dimensional and financial analysis.** Use transaction files only
for masked transaction trends.

## 5. Recommended ingestion designs

### 5.1 Pilot: Google Sheets + Apps Script

```text
Google Drive folder
  -> time-driven Apps Script
  -> read new snapshot CSVs / transaction CSVs
  -> append or replace rows in a master Google Sheet
  -> Looker Studio connected to the Sheet
```

Suggested approach:

1. A dedicated Workspace user owns the folder and the Apps Script project.
2. The Apps Script runs every 15-60 minutes under that account.
3. It lists files newer than the last processed marker.
4. It validates the expected header and file naming pattern.
5. For transaction files, it appends rows and deduplicates on `Transaction_ID` plus `Module_Type`.
6. For full snapshots, it replaces the "current snapshot" tabs for the tables in scope.
7. It writes an ingestion log tab: file name, modified time, row count, status, error.
8. Looker Studio reads only the reporting tabs.

Limits of this approach:

- Google Sheets cell limits and slow reads at volume
- no transactional loading
- limited row-level security
- formula and manual-edit risk
- Apps Script runtime limits
- not suitable for multi-centre production scale

Use it for a controlled pilot, not as the long-term architecture.

### 5.2 Production: BigQuery + Cloud Run/Cloud Functions

```text
Google Drive / Shared Drive
  -> scheduled Cloud Run job or Cloud Function
  -> Drive API download
  -> Cloud Storage staging bucket
  -> BigQuery load jobs
  -> staging tables
  -> MERGE / deduplication
  -> reporting views
  -> Looker Studio
```

Recommended details:

- Use a dedicated Google Cloud project and a dedicated service account.
- Use Workload Identity or a service account key stored in Secret Manager; never commit keys.
- Store raw files in a private Cloud Storage bucket with lifecycle rules.
- Load into staging tables, then `MERGE` into typed reporting tables.
- Partition fact tables by reporting date.
- Use BigQuery labels for environment, centre and data classification.
- Keep raw files only for the approved retention window.
- Compute all money in paise as integers in staging; convert to rupees only in reporting views.
- Use `Asia/Kolkata` for dashboard dates.
- Use a `pipeline_runs` table with file name, file hash, source modified time, row count, status,
  error and processed timestamp.

### 5.3 Alternative: look at a Drive-hosted Sheet without Apps Script

A manually maintained Google Sheet can import a CSV once, but it does not provide reliable automatic
refresh, deduplication or file tracking. It is suitable for a one-off board pack, not an operational
dashboard.

## 6. Recommended BigQuery data model

### 6.1 Core tables

| Table | Source | Purpose |
| --- | --- | --- |
| `dim_tenants` | `tenants.csv` | Centre name and tenant ID |
| `dim_patients` | `patients.csv` | Patient counts, demographics (restricted) |
| `dim_doctors` | `doctors.csv` | Referral mix |
| `dim_tests` | `tests.csv` | Test/category mix |
| `fact_invoices` | `invoices.csv` | Billing, revenue, dues, cancellations |
| `fact_invoice_items` | `invoice_items.csv` | Test/package line mix |
| `fact_payments` | `payments.csv` | Collections and payment mode |
| `fact_expenses` | `expenses.csv` | Expenses and profit inputs |
| `fact_report_orders` | `report_orders.csv` | Report volume, status, TAT |
| `fact_samples` | `samples.csv` | Collection-to-receipt and acceptance TAT |
| `fact_pharmacy_sales` | `pharmacy_sales.csv` | Pharmacy revenue and payment mix |
| `fact_admissions` | `admissions.csv` | Admissions/discharges |
| `fact_hospital_charges` | `hospital_charges.csv` | IPD charges and balance |
| `pipeline_runs` | ingestion log | Freshness, duplicates and failures |

Load `radiologists` or `pathologists` only if a report-viewer use case is explicitly approved. Do not
expose signatures in a general business dashboard.

### 6.2 Key fields and conversions

- Money is stored in **paise**. `rupees = paise / 100`.
- GST rates are basis points. `percent = gst_rate_bp / 100`.
- Timestamps are epoch milliseconds. Convert with
  `TIMESTAMP_MILLIS(timestamp)` and `DATE(timestamp, 'Asia/Kolkata')`.
- `deleted = 1` means a soft-delete tombstone. Reporting views normally filter `deleted = 0`.
- `tenant_id` must be part of every cross-tenant dashboard filter or row-access rule.
- `device_id` identifies the terminal that created the row.
- Use `invoice_date` for billing date and `paid_at` for collection date. Do not use `created_at`
  as a financial date if the business date is available.

### 6.3 Deduplication

Transaction files are batch snapshots. The same `Transaction_ID` can appear in more than one batch.
Deduplicate with:

```sql
ROW_NUMBER() OVER (
  PARTITION BY Transaction_ID, Module_Type
  ORDER BY Sync_Timestamp DESC
) = 1
```

Full snapshots are full-state copies. Keep one latest complete snapshot per table, or use a snapshot
date column. Do not append full snapshots and then sum them: that multiplies revenue.

## 7. Dashboard pages

### 7.1 Executive summary

- Today / this month / this year collection
- Total billed, collected, outstanding dues
- Expenses and estimated margin
- Invoice count and average bill value
- Diagnostics, pharmacy and hospital split
- Data freshness: latest transaction timestamp, latest full snapshot, ingestion status

### 7.2 Billing and collections

- Daily collection trend
- Payment mode mix (cash, UPI, card, bank, credit)
- Outstanding dues by ageing bucket
- Cancellations and cancellation reasons
- Top tests/packages by volume and revenue
- Doctor referral mix, if the buyer uses referral tracking

### 7.3 Diagnostics operations

- Tests billed vs reports released
- Pending vs completed reports
- Report TAT from sample collection/receipt to release
- Pathology vs X-ray volume
- Sample rejection rate
- Radiologist/pathologist report volume, if approved

### 7.4 Pharmacy

- Daily sales and payment mix
- Stock value by medicine/batch
- Expiry within 30/60/90 days
- Low-stock and out-of-stock items
- Top-selling medicines
- Gross margin inputs, if purchase cost is available

### 7.5 Hospital

- Active admissions by ward/bed
- Admissions and discharges by day
- IPD charges vs payments vs balance
- Average length of stay
- Top services by charge value

### 7.6 Data quality and operations

- Last successful ingestion time
- Files processed / failed
- Duplicate transaction IDs
- Missing expected tables
- Snapshot manifest row-count changes
- Rows with unexpected tenant IDs
- File-size and row-count anomalies

## 8. Security and privacy

The full snapshot can contain patient names, phone numbers, ages, clinical history, findings,
impressions and report signatures. Treat the entire pipeline as confidential clinical data.

Required controls:

- Use a dedicated Google Workspace account or Shared Drive owned by the clinic.
- Enable 2-Step Verification for all human accounts.
- Use a dedicated service account for ingestion; grant access only to the required folder.
- Do not enable "anyone with the link" sharing.
- Do not make Looker Studio reports public.
- Restrict patient-level pages to named administrators; use aggregate-only views for general viewers.
- Keep BigQuery and Cloud Storage in an approved region.
- Review Google Workspace/Cloud data-processing terms and the buyer's consent/notice obligations.
- Record retention and deletion dates for raw CSVs, staging files and BigQuery tables.
- Do not export credentials, TOTP secrets or licence DPAPI material; OmniMed already excludes them.
- Do not put signature images on an executive dashboard.
- Keep backups independent from Google Drive and BigQuery.

Recommended access pattern:

```text
General viewer -> aggregate views only
Accountant     -> billing/payment/expense views
Operations     -> diagnostics/pharmacy/hospital operational views
Admin          -> patient-level detail, only if approved
```

Looker Studio alone is not a complete row-level security system. For strict row-level access, restrict
data-source credentials and use separate BigQuery authorized views or separate reports per audience.

## 9. Refresh, freshness and failure handling

- OmniMed writes transaction files every 30 seconds while the app is open.
- Full snapshots are written once per day while the app is open, and on demand.
- The Google Drive desktop client uploads independently; the app receives no upload ACK.
- Google Drive upload latency is outside OmniMed's control.
- The ingestion job should run every 15-60 minutes.
- The dashboard should display:
  - latest transaction file timestamp
  - latest full snapshot timestamp
  - last successful ingestion time
  - last ingestion error
- Alerts should fire when the latest snapshot is older than the agreed threshold, for example 36 hours.
- If a file is malformed, quarantine it and continue with the next file. Never partially load and mark
  it successful.
- If a duplicate batch arrives, ignore duplicate rows after logging the event.

Do not label the dashboard "live". Use "last updated" and show the source timestamp.

## 10. Setup runbook

### 10.1 Terminal and Drive

1. Install and sign in to the Google Drive desktop client on the terminal.
2. Create a dedicated folder, for example:
   `C:\Users\<user>\My Drive\OmniMed Core\outbox`
3. In OmniMed Core, open **Settings -> Device & sync -> Local CSV export**.
4. Set the export folder to that path.
5. Run **Export all modules now** once.
6. Confirm files appear locally and then in Google Drive.
7. Confirm the folder is private and shared only with the approved Google account/service account.

### 10.2 Pilot dashboard

1. Create a Google Sheet for dashboard staging.
2. Add an Apps Script project owned by the clinic.
3. Authorise Drive and Sheets access for the dedicated account.
4. Implement a time-driven trigger.
5. Map the required full-snapshot tables into reporting tabs.
6. Deduplicate transaction rows by `Transaction_ID` and `Module_Type`.
7. Create pivot tables or a Looker Studio report from the reporting tabs.
8. Share the report read-only with named users.
9. Record the data-retention and deletion policy.

### 10.3 Production dashboard

1. Create a Google Cloud project and BigQuery dataset.
2. Create a private Cloud Storage staging bucket.
3. Create the ingestion service account and grant Drive folder read access.
4. Deploy the Cloud Run job or Cloud Function.
5. Schedule it with Cloud Scheduler.
6. Load and validate one complete snapshot.
7. Create reporting views with paise-to-rupees and Asia/Kolkata date conversions.
8. Connect Looker Studio to the BigQuery views.
9. Build the dashboards and access groups.
10. Run the acceptance tests in section 12.

## 11. BigQuery example views

These are examples, not shipped migrations. Adapt column names to the exported snapshot.

```sql
CREATE OR REPLACE VIEW reporting.invoices AS
SELECT
  tenant_id,
  id AS invoice_id,
  invoice_no,
  DATE(TIMESTAMP_MILLIS(invoice_date), 'Asia/Kolkata') AS invoice_date,
  patient_id,
  doctor_id,
  status,
  total_paise / 100.0 AS total_inr,
  subtotal_paise / 100.0 AS subtotal_inr,
  cgst_paise / 100.0 AS cgst_inr,
  sgst_paise / 100.0 AS sgst_inr,
  discount_paise / 100.0 AS discount_inr
FROM staging.invoices
WHERE deleted = 0;
```

```sql
CREATE OR REPLACE VIEW reporting.daily_collections AS
SELECT
  tenant_id,
  DATE(TIMESTAMP_MILLIS(paid_at), 'Asia/Kolkata') AS collection_date,
  mode,
  SUM(amount_paise) / 100.0 AS collected_inr,
  COUNT(*) AS payment_count
FROM staging.payments
WHERE deleted = 0
GROUP BY tenant_id, collection_date, mode;
```

```sql
CREATE OR REPLACE VIEW reporting.outstanding_dues AS
SELECT
  i.tenant_id,
  i.invoice_no,
  DATE(TIMESTAMP_MILLIS(i.invoice_date), 'Asia/Kolkata') AS invoice_date,
  i.patient_id,
  i.total_paise / 100.0 AS billed_inr,
  COALESCE(SUM(p.amount_paise), 0) / 100.0 AS paid_inr,
  (i.total_paise - COALESCE(SUM(p.amount_paise), 0)) / 100.0 AS due_inr
FROM staging.invoices i
LEFT JOIN staging.payments p
  ON p.invoice_id = i.id
 AND p.tenant_id = i.tenant_id
 AND p.deleted = 0
WHERE i.deleted = 0
  AND i.status <> 'cancelled'
GROUP BY i.tenant_id, i.id, i.invoice_no, i.invoice_date, i.patient_id, i.total_paise
HAVING (i.total_paise - COALESCE(SUM(p.amount_paise), 0)) > 0;
```

Use separate views for transaction-outbox trends to avoid mixing the two export contracts.

## 12. Acceptance tests

- [ ] A new transaction CSV is detected and loaded exactly once.
- [ ] Duplicate transaction IDs are deduplicated, not double-counted.
- [ ] The latest full snapshot replaces the prior snapshot for the same table.
- [ ] A malformed CSV is quarantined and does not partially update the dashboard.
- [ ] The dashboard shows the correct latest snapshot and transaction timestamps.
- [ ] A missing daily snapshot triggers an alert.
- [ ] Currency displays as INR and paise is converted exactly once.
- [ ] Dates use Asia/Kolkata and align with the terminal's business date.
- [ ] `deleted = 1` rows are excluded from normal reporting.
- [ ] Tenant filters prevent cross-centre totals.
- [ ] Patient-level pages are not visible to general viewers.
- [ ] Public link sharing is disabled.
- [ ] Signature images and authentication secrets are absent from dashboard data.
- [ ] The dashboard is labelled read-only and not "live".
- [ ] Google Drive/Cloud outage does not affect terminal billing.

## 13. Responsibilities and costs

| Item | Owner |
| --- | --- |
| OmniMed Core local export configuration | Clinic administrator / implementation engineer |
| Google account, Shared Drive and sharing policy | Clinic IT / buyer |
| Google Cloud project, billing and quotas | Clinic IT / implementation partner |
| Ingestion job, schema and dashboard | Implementation partner or clinic data team |
| Clinical data approval and retention policy | Clinic owner / compliance officer |
| Backup and restore | Clinic IT; independent of Google Drive |

Typical cost drivers:

- Google Workspace accounts and storage
- BigQuery storage and query processing
- Cloud Run/Cloud Functions execution
- Cloud Scheduler
- Looker Studio (free tier exists, but review current limits and terms)
- Implementation and support effort

Do not quote these as zero-cost without checking the buyer's account, region, usage and current
Google pricing.

## 14. Limitations and non-goals

- No dashboard code, API, endpoint, token or hosted service is included in OmniMed Core.
- No real-time monitoring; freshness depends on the app, Drive client and ingestion schedule.
- No import, write-back, correction propagation or conflict resolution.
- No Google Drive upload acknowledgement.
- The export scheduler runs only while the desktop app is open.
- Transaction CSVs are masked summaries and cannot support clinical or patient-level analysis.
- Full snapshots contain confidential data and are not encrypted backups.
- Soft-deleted rows require deliberate filtering.
- Google Sheets is not suitable as a long-term clinical data warehouse.
- Looker Studio is not a complete access-control or row-level-security boundary.
- No ABDM exchange, PACS/DICOM, WhatsApp messaging or patient portal is implied.
- A scanned radiologist signature is not a legally valid digital signature or DSC.

## 15. Recommendation

Start with the smallest useful pilot:

1. Use the full snapshot for daily billing, collections, dues and expense totals.
2. Use transaction CSVs only for masked daily transaction trends.
3. Build one executive page and one data-quality page.
4. Use Google Sheets + Apps Script only if the data volume and user count are small.
5. Move to BigQuery + Cloud Run + Looker Studio before adding multiple centres or patient-level
   analysis.

The dashboard must remain a **read-only downstream consumer**. OmniMed Core stays offline-first, and
the clinic remains responsible for the Google account, sharing policy, retention and data-processing
terms.
