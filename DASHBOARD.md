# Administrator dashboard

The OmniMed Core dashboard is the primary in-app reporting surface for administrators. It is built
from the terminal's live local SQLite database, so it works fully offline and never depends on Google
Drive, Sheets, BigQuery or Looker Studio.

The external Google dashboard described in [GOOGLE_DASHBOARD.md](GOOGLE_DASHBOARD.md) remains an
optional secondary path for cross-centre, remote or archival reporting.

## What it covers

| View | Main content |
| --- | --- |
| Overview | Period collected, billed, outstanding dues, expenses, cash profit, pending reports, new patients and active admissions; billed/collected/expense trend; module contribution; recent bills |
| Billing | Diagnostics billed and collected, outstanding dues, top test revenue, payment-mode mix, dues ageing |
| Diagnostics | Pending/completed/rejected reports, average reporting TAT, pathology/X-ray volume and sample status |
| Expenses | Period spend, categories, module attribution and top vendors |
| Pharmacy | Sales, bill count, purchase-price stock value, expiry alerts, payment mix and low-stock count |
| Hospital | Active admissions, period admissions/discharges, hospital charges/payments, outstanding balance and ward distribution |

The date selector supports **Today**, **Last 7 days**, **Last 30 days**, **Last 90 days** and a
**Custom range** with start and end dates, applied with the **Apply** button. Every view loads its data
for the selected range. The dashboard is administrator-only in the terminal build;
operators continue to land on Expenses and cannot open it. The read-only monitor bundle can display the
same live views without exposing write controls.

## Export and print

- **CSV** exports one row per day with billed, collected, expenses, diagnostics billed/collected,
  pharmacy sales, hospital charges and hospital payments. Values are formula-injection guarded and
  written as rupee amounts.
- **Print** prints the currently selected tab in the shared A4 layout. Range, CSV, print and tab controls
  are hidden from the printed page.

## Data definitions

- **Billed**: diagnostics invoice totals plus paid pharmacy sales plus hospital charges in the selected
  period.
- **Collected**: diagnostics receipts plus paid pharmacy sales plus hospital payments in the selected
  period.
- **Cash profit**: period collections minus period expenses. It is a cash view, not an accrual ledger.
- **Outstanding dues**: all unpaid diagnostics invoice balances plus all unpaid hospital charges,
  regardless of the selected period.
- **Dues ageing**: all outstanding diagnostics invoices grouped by age since invoice date.
- **Average TAT**: specimen received time to report-issued time; if no receipt time exists, order
  creation time is used.
- **Expenses by module**: shared expenses are tagged in every selected module, not split. The module
  chart can therefore add up to more than total expenses.
- **Pharmacy stock value**: batch quantity multiplied by purchase price. Low stock compares total batch
  quantity for a medicine against its reorder level. Expiry alerts count batches expiring in the next
  90 days.
- **Hospital outstanding**: all hospital charges minus all hospital payments, regardless of the selected
  period.

## Scope and limitations

- Data is read live from the active tenant's local database. Opening the dashboard or changing the range
  refreshes it; there is no background auto-refresh, scheduled report or email delivery.
- There is no ad-hoc report builder, drill-down from every chart or cross-tenant consolidation. The
  custom range start/end cannot be later than today.
- The dashboard does not create a historical performance snapshot. For remote or long-term comparisons,
  use the local CSV outbox and the optional Google/Looker design.
- Tenant isolation uses the same `tenant_id` guards as the rest of the application.
- The dashboard does not add schema changes. It reads the existing billing, diagnostics, expense,
  pharmacy and hospital tables.
