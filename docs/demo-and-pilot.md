# Demo and pilot guide

## Demo objectives

By the end of a 25-minute demo, the buyer should understand:

1. How billing, GST, dues and expenses work.
2. How a pathology order becomes a traceable sample and a released report.
3. How amendments and audit evidence work.
4. What is not yet available (hosted monitoring, installer, backups, ABDM transport, QMS).
5. Whether a controlled pilot makes sense.

Do not attempt to show every screen. Depth on the core workflow is more credible than a feature parade.

## Before the demo

- Use synthetic patient/test data only.
- Confirm the schema version and clean browser/database state.
- Confirm the app URL and that the dev server is running.
- Prepare:
  - one patient with ABHA and recorded ABDM consent
  - one CBC bill
  - one expected sample
  - one correctly released report and one amended report
  - one rejected sample
  - at least one active inpatient and one discharged admission
  - hospital service catalogue, IPD charges, a part payment and a printable hospital bill
  - pharmacy medicine catalogue, batches and a completed sale
  - at least one expense entry
- Decide which edition to demonstrate. A real imported licence restricts navigation; remove the stored
  test licence in DEV only if a complete demo is intended.
- Have the capability/limitations sheet and release-gate checklist open.
- Never open developer tools, terminal logs or real database files in front of the buyer.

## 25-minute script

### 1. Context — 2 minutes

Ask two discovery questions before showing anything:

- “Walk me through what happens today from patient arrival to printed report.”
- “Where do you lose the most time or money?”

Then frame the demo around those answers.

### 2. Dashboard and patient — 4 minutes

- Show today’s collection, bills, dues, pending reports.
- Register a synthetic patient or open an existing one.
- Show phone-first search, demographics, ABHA field and consent status.
- State: ABHA is format-checked locally; it is not verified online.

### 3. Billing and payment — 5 minutes

- Create a bill with a test/package.
- Apply a line discount.
- Show GST split and rounded total.
- Record full or partial payment.
- Explain cancel/re-issue and auditable invoice numbering.
- Emphasise that money is stored in paise and status is derived from payments.

### 4. Samples — 3 minutes

- Show the automatically created sample and accession.
- Move it through collected/received/accepted.
- Show rejection requires a reason.
- Explain that release is blocked until acceptance.

### 5. Hospital admission and generic IPD billing — 3 minutes

- Open **Admissions**.
- Show active inpatient, ward/bed, doctor and reason.
- Rehearse an admission or show a discharged record/summary.
- Open **Bill**, add a room/nursing/procedure service, record a part payment and show total, paid,
  balance and print.
- State that this is admission administration plus generic IPD service billing, not a full HIS.
  Nursing charts, doctor orders, package/advance billing, insurance/TPA and claims remain excluded.

### 6. Pharmacy — 3 minutes

- Show inventory stock, batch and expiry.
- Dispense a medicine, show GST and total.
- Complete the sale and show stock deduction and the pharmacy receipt.
- State that procurement, supplier returns, controlled-drug registers and chain transfers are not included.

### 7. Result entry and report — 6 minutes

- Open a multi-parameter profile.
- Select/deselect parameters.
- Enter values, units and references.
- Save draft; reopen to prove persistence.
- Release the report.
- Amend with a reason.
- Show History with prior revision preserved.
- Print preview: sample ID, authorizer, version, reference intervals.

### 8. Compliance evidence — 2 minutes

- Open Compliance.
- Show sample/revision/consent counts and audit events.
- Explain that the page is evidence, not a certificate.
- Show the gap matrix in `COMPLIANCE.md`.

### 9. ABDM draft — 2 minutes

- Open the released report’s ABDM action.
- Show profile labels and that no network send occurs.
- Show local validation passed.
- State clearly that live ABDM/HIP/HFR transport is not implemented.

### 10. Close — 1 minute

Ask:

- “Which one of those workflows would make the biggest difference?”
- “Would you be open to a paid pilot with written acceptance criteria?”
- “Who else needs to see this before a decision?”

## Never demo as working

- Windows `.exe` installer
- Hosted cloud monitoring or login from a phone outside the local machine
- Live ABDM send/consent artefacts
- NABL certificate/logo
- IQC/EQA, equipment, reagent, personnel or QMS modules
- Analyzer/PACS integration or full HIS features
- Full hospital IPD/HIS billing, insurance/TPA, package/advance billing, nursing notes, medication charts, doctor orders
- Public hosted licence self-service or guaranteed online revocation
- Pharmacy procurement, supplier returns, narcotics registers or chain-store transfers
- Referral commission rules, accruals, payouts or a Commissions tab; these are intentionally removed
- Automated backup/restore
- Promised custom reports or integration without a change order

If asked, say the status and offer the roadmap, not a workaround that looks production-ready.

## Screenshot capture list

For the sales pack, capture synthetic data:

1. Dashboard
2. GST invoice preview
3. Sample desk
4. Parameter selection dialog
5. Printed report with sample and authorizer
6. Amendment history
7. Compliance evidence page
8. ABDM draft preview

Redact any environment-specific device ID if necessary. Never include a real patient or real staff name.

## Pilot design

### Duration
30–60 days, or long enough to cover peak billing, month-end/CA review and report amendments.

### Scope
- One centre
- Agreed terminals
- Agreed tests/packages/doctors
- Agreed user roles
- Agreed migration data
- Agreed report templates
- Defined support window

### Buyer responsibilities
- Name an operational owner and clinical approver
- Provide master data and opening balances
- Validate migrated data
- Train staff or release them for training
- Provide hardware, power, network and printers
- Define backup media/ownership
- Report defects through one channel
- Hold weekly review

### Vendor responsibilities
- Complete deployment release gates
- Configure and install within scope
- Deliver training and written quick-reference
- Maintain a defect/decision log
- Protect demo/test data
- Report progress and risks honestly
- Provide rollback and exit support

### Success metrics

| Metric | Suggested target |
| --- | --- |
| Bills created through MediCore | ≥95% of pilot volume |
| Correct GST totals vs parallel check | 100% sample audit |
| Critical billing defects | Zero unresolved at acceptance |
| Report release with linked accepted sample | 100% |
| Amendments with recorded reason/history | 100% |
| Users trained | 100% of in-scope roles |
| Backup restore test | Successful and documented |
| Duplicate invoice numbers | Zero |
| Support response within agreed window | ≥90% |

### Weekly pilot review agenda

1. Volumes and workflow exceptions
2. Defects by severity
3. Data/migration issues
4. Training gaps
5. Change requests and commercial impact
6. Risks to acceptance/date
7. Actions and owners

### Rollback/exit

- Keep the previous system available in parallel until acceptance.
- Export agreed data before exit.
- Document deletion of pilot copies.
- Return/decommission hardware if supplied.
- Provide a written acceptance or gap report.

## Demo follow-up email skeleton

> Thank you for your time. The attached pack records what we demonstrated and the current limitations.
> The next step, if useful, is a scoping call to define one centre, the terminals, migration scope,
> acceptance metrics and support boundary for a paid pilot. We will not start with patient data until
> backup/restore, installation and recovery procedures have passed their release gates.
