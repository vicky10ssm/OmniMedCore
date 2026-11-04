---
name: DiagBill Demo and QA
description: Use when demonstrating DiagBill, running end-to-end smoke tests, diagnosing regressions, or adding repeatable validation for billing, pathology, offline, and monitor behavior.
---

# DiagBill demo and QA

Use this skill to validate real workflows without destroying user data or mistaking a successful build for a working application.

## Standard checks

Run from the project root:

```sh
npm run check
npm run build
npm run build:monitor
```

`npm run check` covers TypeScript, migration scenarios, and static tenant-scope checks. Review the whole output; do not accept a later pass line as proof that an earlier scenario did not fail.

## Mandatory demo dataset

Whenever the database is reset, the schema changes, a major screen changes, or a demo/sales walkthrough
is being prepared, **populate realistic data before testing or presenting the app**. Do not show an empty
shell as the product demo.

In a DEV browser session run:

```js
await window.__diagbillSeedDemo()
```

This calls the idempotent development-only seeder in `src/db/demoSeed.ts`. It is guarded by a
`meta.demo_seed_version` marker and will return `created: false` on a subsequent run rather than
duplicating the fixed demo masters or invoices.

The same action is available to a human in **Settings → Modules & logo → Load demo data** in a DEV build.
Use that button when the user cannot see seeded data: each browser origin/profile has its own IndexedDB.
Data seeded in an agent-controlled browser is not visible in the user's browser. `localhost:5173` and
`127.0.0.1:5173` are different origins with different databases.

After a seed, confirm the current origin and schema in the same browser. If the button says data already
exists, the current profile has a marker; if the dashboard still looks empty, check the selected tenant,
module visibility, filters and whether the app was opened under a different host/profile.

The baseline seed includes:

- 12 synthetic patients with varied demographics, ABHA, and active/revoked consent states
- 4 referring doctors without commission rules
- 17 invoices: paid, partial, unpaid/credit, and cancelled
- 22 samples spanning expected, collected, received, accepted and rejected
- 15 completed reports, 6 pending orders, 1 rejected order
- 1 draft report revision, 15 verified revisions and 1 amended revision
- 91 report parameter values across CBC/LFT/KFT/lipid/urine and single-result tests
- 8 expenses across seeded categories
- No new referral commissions or payouts; legacy commission rows are not displayed
- 2 active ABDM consents, 1 revoked consent and 1 local ABDM FHIR draft
- 3 hospital admissions: 2 active and 1 discharged with summary
- 5 hospital services, 6 IPD service charges and 1 part payment
- 8 pharmacy medicines and 9 stock batches
- 1 completed pharmacy sale with batch stock deduction
- A signed licence is not seeded; DEV without a stored licence uses the complete development licence

Any additional real/demo data entered later will add to these counts. Verify the invariants rather than
assuming exact totals in every environment.

The seed is **development-only**:
- Never run it against a buyer’s production database.
- Never include it in production code paths.
- Do not reset or delete an existing database merely to reseed without explicit user approval.
- The synthetic sample metadata repair only touches `demo-patient-%` rows.

After seeding, verify:

1. Invoice list shows paid/partial/unpaid/cancelled bills.
2. Dues shows the outstanding credit bills.
3. Samples shows accepted plus rejected/pending samples.
4. Reports shows completed/printable reports and pending result work.
5. No Commissions tab/module exists and Doctors has no commission fields.
6. Expenses and dashboard totals are non-zero.
7. Admissions shows active and discharged patients.
8. Open **Admissions → Bill**, add a service, record a part payment, verify totals/balance/audit and print.
9. Pharmacy shows stock, batches and a completed sale; make a test sale and confirm stock decreases.
10. Compliance shows recent sample/report/audit evidence.
11. An active-consent patient can generate an ABDM draft.
12. Re-running the seeder returns `created: false`.
13. Browser console has no errors.

## Browser testing

- The usual Vite development URL is `http://127.0.0.1:5173/`; verify the actual running port first.
- In DEV, `window.__diagbillDb()` exposes the database for inspection and `window.__diagbillSeedDemo()` creates the synthetic dataset. Neither hook is available in production builds.
- Prefer creating acceptance data through the UI. Use the DEV database hook primarily to inspect persisted rows and assert tenant/status/history invariants.
- React controlled inputs may need the native input value setter followed by an `input` event when driving the UI programmatically.
- Allow debounced searches and asynchronous modal loads to finish before asserting or clicking the next step. Do not diagnose automation that outruns rendering as an application bug without checking the actual state.
- Use synthetic demo patients only. Do not place real patient information in screenshots, logs, or test fixtures.
- Do not reset a database, delete records, or overwrite demo/user state without explicit approval.

## Core end-to-end scenario

1. Sign in and complete first-run credential setup where required.
2. Create a patient and a bill with tests, discount, GST, and payment.
3. Verify invoice number, paise totals, payment status, and report orders.
4. Print/preview A4 and thermal invoice output where relevant.
5. Create a partial-payment bill, confirm the due, collect the balance, and inspect payment history.
6. Verify no commission fields/tab are exposed and no new commission rows are created on payment/cancellation.
7. Add expenses and check dashboard/profit calculations.
8. Exercise CSV exports and financial reports.

## Pathology acceptance scenario

1. Under Tests & Packages, inspect or add parameter templates with units, reference text, and numeric limits.
2. Bill a multi-parameter test such as LFT or CBC.
3. Confirm the result modal lists the complete template with all parameters selected initially.
4. Deselect at least one parameter and enter results plus report-specific unit/reference edits.
5. Save a draft, reopen it, and confirm values and exclusions persist.
6. Verify the order and confirm only selected parameters print, with correct abnormal flags and snapshots.
7. Repeat a no-template test to ensure single-result reporting still works.
8. In Samples, accept a sample with no result. Confirm Dispose is disabled and the row shows `0/1 linked
   test result entered`; attempt to bypass the UI and confirm the action handler still rejects it.
9. Enter a complete draft or verify the linked test. Confirm Dispose becomes enabled and records the
   disposal event without changing the report result.

## Role and expense acceptance scenario

1. As admin, create an operator user and sign in as that operator.
2. Confirm Dashboard is absent from navigation and visiting `#/` redirects to Expenses.
3. Confirm Expenses allows adding/viewing an expense but does not show the admin-only "This month at a
   glance" collected/profit card.
4. Sign back in as admin; confirm Dashboard and the at-a-glance card return.
5. Disable/unlicense Expenses and confirm the operator lands on Settings rather than entering a redirect
   loop.

## Licensing acceptance scenario

1. Open **Settings → Licence**, copy the Tenant ID and Device ID.
2. Start `npm run license:portal` with `MEDICORE_PORTAL_ADMIN_TOKEN` and issue a Hospital licence.
3. Import the signed file; confirm Diagnostics/Pharmacy disappear and Patients/Admissions/Expenses/
   Compliance remain. If the app is signed out, sign in and reopen Settings.
4. Verify unlicensed modules are locked in Modules & logo and direct routes redirect.
5. Add a hospital charge/payment and print; then test a beyond-grace licence and confirm read-only/print.
6. Try a wrong-device and wrong-tenant licence; both must fail without replacing the stored licence.
7. Re-import a Complete/perpetual licence or, in DEV only, remove the stored test licence to restore the
   development complete licence.
8. Search the terminal/monitor production bundles for `DEV-LICENSE`, `__diagbillSeedDemo`, portal token
   and private-key material; none should be present.

## Compliance acceptance scenarios

When testing NABL/ABDM/ISO work:

1. Register a patient with optional ABHA without claiming remote verification.
2. Grant purpose-specific ABDM consent, export a FHIR draft, revoke consent and confirm export is blocked; verify consent and audit history.
3. Bill a pathology test, confirm a sample is created, then collect, receive, accept and reject another sample with reason. Confirm result release is blocked until a linked sample is accepted.
4. Enter a draft, verify it, amend it with a reason, and confirm the previous revision remains readable and the new report is marked amended.
5. Confirm audit rows identify actor, entity, timestamp and action for sample, report and consent changes.
6. Validate generated FHIR JSON structure and canonical profile URLs against the current ABDM NRCeS IG; do not claim sandbox/live exchange unless the API flow was actually exercised.
7. Open the monitor build and confirm all new clinical/consent/outbox write controls and routes are unavailable.

## Regression evidence

Record the schema version, relevant invoice/order IDs, selected and tombstoned parameter rows, and browser console errors. Check both UI and persisted rows. For migrations, include an existing upgraded database, not only a fresh profile.

Monitor builds additionally need a read-only check. Offline claims need testing with connectivity unavailable; encryption claims need a reload/relock test. Test local CSV export for unique filenames, masked patient IDs, and retry after a forced folder failure. Do not mark a hosted monitor, online sync, ABDM exchange, Tauri packaging, or accreditation alignment as passed without exercising those actual capabilities.
