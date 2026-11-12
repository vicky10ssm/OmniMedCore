---
name: DiagBill Billing
description: Use when modifying DiagBill GST invoices, billing, dues, payments, expenses, financial dashboards, CSV exports, or invoice printing.
---

# DiagBill billing and money workflows

Use this skill for financial behavior. Preserve the existing accounting invariants and test complete flows rather than only totals on a screen.

## Read first

- `../../../src/pages/Billing.tsx`, `Invoices.tsx`, `InvoiceView.tsx`, and `Dues.tsx`
- `../../../src/pages/HospitalBill.tsx` and `Admissions.tsx` — generic IPD service billing
- `../../../src/pages/Expenses.tsx` and `Dashboard.tsx`
- `../../../src/db/invoicing.ts` — totals, invoice saving, payments and cancellation
- `../../../src/db/invoiceNo.ts` — offline number allocation
- `../../../src/db/helpers.ts` — paise/rupee and formatting helpers
- `../../../src/db/csv.ts` and `../../../src/db/print.ts`
- `../../../src/db/schema.ts` — invoice and payment rows plus legacy commission tables (not exposed)

## Money invariants

- Store money as integer paise; never store monetary values as floating-point rupees.
- Store GST rates in basis points. Prices are pre-tax and CGST/SGST split GST 50/50.
- A line discount reduces that line's taxable value.
- Round the grand total to the nearest rupee and retain `round_off_paise` so reports reconcile.
- Invoice numbers and dates are immutable. Payments, cancellations and issued-report revisions remain
  append-only.
- A bill may be **amended** only while its linked lab work is work-free: pending orders with no entered
  results and expected samples that have not been collected. Editing quantities, rates, discounts,
  doctor, notes or adding tests is allowed; removing a line is not. The amendment cannot reduce the
  total below payments already collected. Audit it as `invoice.amend`.
- When linked work exists or a refund/reissue is required, use cancellation plus re-issue.
- Partial payments create dues; later collections are additional payment records, not edits that erase history.
- Invoice numbers come from tenant-aware blocks so offline terminals cannot collide. The existing block size is 1000 and the optional device code is part of the configured format.
- Generic hospital/IPD billing is a separate admission service sheet, not an OPD diagnostic invoice:
  charges and payments are append-only, balance = charges+GST − payments, and overpayment is rejected.
  It has no package/advance/insurance engine yet.
- After licence grace the app is read-only for new money/clinical writes, but existing invoices and
  hospital bills must remain viewable and printable.
- Terminal operators can add/view expenses, but Dashboard and the Expenses collected/profit card are
  admin-only. Operators also cannot edit/delete expenses.
- Expenses carry a multi-select module attribution (`pathology`, `xray`, `pharmacy`, `hospital`,
  `general`) stored as JSON in `expenses.modules`. Shared expenses are tagged, not split. Preserve this
  field in entry, edit, list, filter, search and CSV export.

## Referral commissions are removed

- Do not expose a Commissions tab or commission rules on the Doctors screen.
- Do not accrue referral commissions when an invoice is paid or reverse them on cancellation.
- Legacy `commission_entries`, `payouts` and doctor commission columns may remain for historical data,
  but they are not displayed and must not be used for new billing.
- Referral commissions/inducements can create compliance and ethics issues; see the
  `diagbill-india-compliance` skill. Do not reintroduce without a written legal/compliance decision.

## Implementation workflow

1. Identify whether the change affects totals, payment state, invoice numbering, cancellation, or exports. Test every affected downstream rule.
2. Keep clinical report generation separate from payment status. A bill can queue laboratory work without weakening financial records.
3. Scope every query and insert by tenant. Invoice-number blocks and settings are tenant-specific.
4. Preserve CSV UTF-8/BOM behavior and formula-injection protection.
5. Preserve both A4 and 80 mm thermal invoice output where applicable.

## Minimum acceptance flows

- Fully paid bill with multiple lines, GST, and discount
- Partial payment followed by balance collection
- Two offline-style terminals allocating different invoice-number blocks
- Paid invoice cancellation without creating or reversing any commission entry
- Amend a work-free invoice (rate, discount, doctor, notes, add a test) and confirm totals, report
  orders/samples and audit event
- Attempt to remove a line with a collected sample or entered result and confirm it is blocked
- Attempt to reduce an amended total below collected payments and confirm it is blocked
- Expense entry reflected correctly in dashboard/profit without changing sales revenue
- CSV export checked for encoding and spreadsheet-formula safety
- A4 and thermal print preview checked for correct totals

Run `npm run check` and both production builds after financial changes. Inspect the resulting rows for paid/due/cancelled cases and confirm no new commission rows are created, not just the UI.
