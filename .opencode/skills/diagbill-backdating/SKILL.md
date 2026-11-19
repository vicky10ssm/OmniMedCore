---
name: DiagBill Backdating
description: Use when changing back-dated invoices, clinical/report dates, admin-only date controls, or report-date printing. Defines the single approved model for back-dating in OmniMed Core.
---

# OmniMed Core back-dating rules

Back-dating is an **administrator-only correction**. The original transactional and clinical timestamps
remain intact; a separate clinical date is displayed where required.

## Rules

1. **Invoice date**
   - Only an administrator sees the **Bill date** field on New bill.
   - A past date is allowed; a future date is rejected.
   - The date is captured at creation only. Invoice numbers and dates are immutable after saving.
   - `saveInvoice` rejects a past `invoiceDate` when the acting user is not an admin.

2. **Report date**
   - A back-dated invoice seeds every new pathology and X-ray `report_orders` row with the same
     `report_date` as the invoice date.
   - `report_orders.report_date` is nullable. `NULL` means "use the actual release timestamp".
   - Non-admin users cannot see or change the report date.
   - An administrator may set or clear the report date while entering/amending a report. The value is
     applied to every test on that invoice, so a combined pathology/X-ray report has one clinical date.
   - Report-date changes are audit-logged as `report.report_date`.

3. **Actual timestamps stay real**
   - `report_orders.reported_at` is always the real release time and must not be replaced by the
     clinical date.
   - `created_at`, `updated_at`, sample collection/receipt/acceptance and audit times remain actual.
   - Printed reports show the clinical `report_date` when present, and the actual release timestamp in
     the release footer.
   - TAT calculations continue to use actual timestamp fields, not `report_date`.

4. **Packages**
   - Package components are ordinary report orders. They inherit the same back-dated clinical date as
     direct tests on the invoice.

5. **Existing data**
   - Migration 26 adds `report_orders.report_date` as nullable.
   - Existing reports keep `NULL` and print their actual release date.
   - Do not bulk-rewrite historical report dates without an approved migration and audit record.

## Data model

- `invoices.invoice_date` — immutable bill/business date.
- `report_orders.report_date` — optional admin-controlled clinical date shown on the report.
- `report_orders.reported_at` — immutable actual release timestamp.
- `report_result_revisions` — amendment snapshot and audit trail; report-date changes are separately
  audited.

## Where the controls live

- `src/pages/Billing.tsx` — admin-only Bill date, future-date validation.
- `src/db/invoicing.ts` — admin enforcement and `report_date` seeding for new orders.
- `src/pages/Reports.tsx` — admin-only report-date field, invoice-wide update, print fallback.
- `src/db/schema.ts` — migration 26.
- `src/db/types.ts` — `ReportOrderRow.report_date`.

## Verification

1. Log in as an operator: the Bill date control must be absent; a forced past date must be rejected.
2. Log in as an admin: create a bill with a past date and confirm the invoice date.
3. Confirm new pathology **and** X-ray report orders have the same `report_date`.
4. Save/release both report types and confirm the printed report uses the clinical date.
5. Confirm the footer still shows the actual release timestamp and `reported_at` is unchanged.
6. As an admin, change the report date on one test and confirm every order on that invoice updates.
7. As an operator, confirm no report-date control is visible and the stored date is unchanged.
8. Confirm `report.report_date` appears in the audit log.
9. Run `npm run check`, both production builds and `cargo test --lib --locked`.
