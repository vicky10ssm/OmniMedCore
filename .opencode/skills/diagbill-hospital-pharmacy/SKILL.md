---
name: DiagBill Hospital and Pharmacy
description: Use when changing hospital admissions, inpatient ward/bed/discharge, pharmacy medicine inventory, batches/expiry, stock receipt, dispensing, pharmacy receipts, or the multi-vertical OmniMed Core modules.
---

# OmniMed Core hospital and pharmacy modules

OmniMed Core (internal package `diagbill`) is a configurable multi-vertical product. Diagnostics, Pharmacy
and Hospital modules share one tenant and one patient identity. Keep the current scope honest: this is
not a full HIS or chain-pharmacy ERP.

## Read first

- `../../../src/pages/Admissions.tsx`
- `../../../src/pages/HospitalBill.tsx`
- `../../../src/pages/Pharmacy.tsx`
- `../../../src/db/types.ts`
- `../../../src/db/schema.ts` (current schema 25)
- `../../../src/app/modules.ts`
- `../../../src/app/brand.ts`
- `../../../src/db/demoSeed.ts`
- `../../../src/db/invoiceNo.ts`
- `../../../src/pages/Dashboard.tsx`
- `../../../docs/architecture.md`, `product-capabilities.md`, `roadmap-and-gaps.md`

## Hospital admissions — implemented scope

- Admission linked to an existing patient.
- Admission number via block allocation (`ADM-<device>-#####`).
- Ward, bed/room, treating doctor, reason, admitted timestamp.
- Status: admitted → discharged or cancelled.
- Discharge requires diagnosis and records discharge summary/time/status.
- Admin-only cancellation.
- Audit events for create/discharge/cancel.
- Active admission count and admitted patient names visible to authorised users.
- Read-only monitor hides write controls.
- Generic IPD service billing: tenant-defined room/nursing/procedure/consultation/consumable catalogue,
  admission charges with quantity/GST, part payments, computed balance, audit and A4 bill print.

Do not imply package/day-wise auto charges, advances/deposit ledger, insurance/TPA/cashless claims,
bed board/transfers, nursing notes, medication charts, doctor orders, OT or full medical records. Those
are not implemented.

## Hospital billing invariants

- Store money as integer paise and GST as basis points. Use `amount_paise`/`taxable_paise` consistently.
- A charge is linked to an admission and patient; payments are separate append-only rows.
- Balance is derived from charges + GST − non-deleted payments; never edit a prior payment to hide history.
- Reject payments above the outstanding balance; keep charge/payment writes transactional with audit.
- Read-only mode must still allow viewing, printing and export. Print cannot be inside a write-only block.
- The bill is the admission's service sheet, not a full tax invoice/claim. Do not promise insurance or
  package billing without the missing modules.

## Pharmacy — implemented scope

- Medicine master: code, name, form, strength, manufacturer, HSN, GST, MRP, sale price, reorder level.
- Batch receipt: medicine, batch number, expiry, quantity, purchase price, supplier.
- Inventory view: computed stock, batches, nearest expiry, low-stock/expiry-soon alerts.
- Dispensing: batch selection, quantity, editable rate, GST split, cash/UPI/card/bank.
- Sale is a transaction: sale header + line items + stock decrement.
- Bill numbers via block allocation (`PH-<device>-#####`).
- Pharmacy receipt supports A4/thermal print and tenant logo.
- Admin cancellation returns stock and records the reason/audit.
- Expired batches are excluded from sale selection.

Do not imply purchase orders/GRN/payables, supplier returns, stock adjustments/wastage, controlled or
narcotic registers, prescription validation, interaction checks, barcode dispensing, chain-store
transfers or insurance claims.

## Data integrity rules

1. Always scope queries/inserts by `tenant_id`.
2. A pharmacy sale, its items and batch deductions must be in one transaction.
3. Never allow qty above the selected batch quantity. Validate locally; the CSV outbox is read-only and
   must not be used to accept remote stock writes.
4. Stock is derived from `pharmacy_batches.quantity`; do not create a second untracked stock field.
5. Cancelling a sale must return each item quantity to its batch exactly once.
6. A cancelled sale remains visible with status cancelled and an audit reason.
7. Admission/status changes are version-sensitive if terminal-to-terminal sync is introduced. The
   current local CSV export has no merge path; do not silently last-write-wins a discharge or ward change.
8. Invoice/admission/pharmacy block purposes must remain separate so number ranges don’t overlap.

## Branding and module configuration

- Umbrella brand constants: `src/app/brand.ts` (`OmniMed Core`, `Diagnostics · Pharmacy · Hospital`).
- Tenant name/logo override the visible app identity inside authenticated screens.
- Edition licensing comes first; module IDs `admissions` and `pharmacy` are then configured in
  **Settings → Modules & logo**.
- A Hospital licence includes admissions + generic IPD billing; a standalone pharmacy needs the Pharmacy
  edition. A complete licence may still hide modules per clinic.
- Do not hardcode new vertical labels in multiple files; extend `MODULE_DEFINITIONS`, edition maps and
  nav together. See the `diagbill-licensing` skill.

## Demo data

`window.__diagbillSeedDemo()` **Settings → Modules & logo → Load demo data** adds:

- 3 admissions: 2 active, 1 discharged with summary
- 5 hospital services plus 6 service charges and 1 part payment across admissions
- 8 medicines and 9 batches
- 1 completed pharmacy sale with stock deduction

The seeder runs an idempotent repair for fixed demo medicine pricing and demo specimen metadata. Keep it
DEV-only. Demo the hospital bill from **Admissions → Bill**; it opens the charge sheet/payment/print view.

## Verification

1. Admissions page shows active/discharged counts and rows.
2. Admit a patient; verify `ADM-A-...` number, ward/bed, audit row.
3. Discharge requires diagnosis; verify summary and status.
4. Open **Bill**, add a service charge with quantity; verify GST/total and audit row.
5. Record a part payment, verify total/paid/balance and that overpayment is rejected; print the bill.
6. In read-only/after-grace mode, verify Bill remains viewable/printable but add-charge/payment controls are absent.
7. Pharmacy inventory shows stock/batch/expiry and low-stock indicators.
8. Receive stock and verify batch list.
9. Dispense a sale with mixed-GST items; verify CGST/SGST, total and stock decrement.
10. Print/verify pharmacy receipt and patient/walk-in name.
11. Cancel a sale as admin; stock returns and audit reason is recorded.
12. Open the monitor build: admissions/pharmacy/hospital-bill write controls must be absent.
13. Disable admissions/pharmacy in Modules & logo; nav links and direct routes must be blocked.
14. Import a Hospital/Pharmacy/Diagnostics licence and verify nav/locks; see `diagbill-licensing`.
15. Run `npm run check`, `npm run build`, `npm run build:monitor`.

## Source paths

- Branding: `../../../src/app/brand.ts`
- Brand in shell/login: `../../../src/ui/Layout.tsx`, `MonitorLayout.tsx`, `../../../src/pages/Login.tsx`
- Module IDs: `../../../src/app/modules.ts`
- Schema/types/tenant lists/migration checks must all be updated together for new tables.
