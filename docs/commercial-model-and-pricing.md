# Commercial model and pricing guide

This document contains a **recommended launch price card** plus the method for adjusting a quote after
discovery. The product is pre-general-availability; the prices below are effective only after the
relevant P0 production gates are met. Until then, sell only the separately priced supervised pilot.

Final pricing still depends on terminals, migration, support expectations and whether hosting/ABDM/QMS
scope is included. Do not quote unimplemented features as if they are available.

## Recommended launch prices for India

### The short answer

For an early production-ready release with **one centre, up to two terminals, offline billing, GST,
dues, expenses, sample traceability and parameter-based pathology reports** (the diagnostics vertical):

| Best default offer | Recommended price (excluding GST) |
| --- | ---: |
| Paid design-partner pilot, 45–60 days, including setup/training | **₹20,000** |
| Annual software licence after pilot, up to 2 terminals | **₹24,000/year per centre** |
| One-time migration of masters + opening dues | **₹8,000** |
| Typical first-year total when pilot is credited | **₹32,000–₹40,000 + GST** |
| Continuing annual cost after year 1 | **₹24,000/year + GST** |

This is deliberately affordable for an independent centre while preserving enough revenue to support
implementation and updates. Do **not** use “free forever” as the launch strategy; free deployments still
consume support and do not prove willingness to pay.

### Recommended price card

All amounts are INR, excluding GST. Ranges are negotiation boundaries, not automatic discounts.

| Item | Recommended | Defensible range | Includes |
| --- | ---: | ---: | --- |
| Design-partner pilot | **₹20,000** | ₹15,000–₹30,000 | One centre, up to 2 terminals, configuration, installation support, 2 training sessions, 45–60 days pilot |
| Annual licence — 1 centre, up to 2 terminals | **₹24,000/year** | ₹18,000–₹30,000/year | Software use, updates, standard support for agreed scope |
| Annual licence — 3–5 terminals | **₹36,000/year** | ₹30,000–₹48,000/year | Same centre, more terminals |
| Additional terminal | **₹3,000/terminal/year** | ₹2,000–₹5,000 | Above the included terminal count |
| One-time setup/configuration | **₹15,000** | ₹10,000–₹25,000 | Lab identity, tests, doctors, users, numbering, report header, installation acceptance |
| Data migration — masters + opening dues | **₹8,000** | ₹5,000–₹20,000 | Clean template-based migration and reconciliation; excludes cleaning messy historical data |
| Additional training day | **₹4,000/day** | ₹3,000–₹6,000/day | Remote or onsite excluding travel |
| Custom report/template | **₹3,000/report** | ₹2,000–₹8,000 | One approved layout; excludes new data fields/integration |
| Onsite visit | **₹5,000/day + travel** | ₹4,000–₹8,000/day + actuals | Travel/accommodation at actuals |
| Priority support add-on | **₹6,000/year** | ₹5,000–₹12,000/year | Agreed faster response/hours, fair-use support |
| ABDM production onboarding — when released | **₹25,000 setup + ₹6,000/year** | ₹15,000–₹75,000 setup | HFR/HIP assistance, sandbox acceptance, consent/transport validation; exclude statutory/provider fees |
| Multi-centre licence | **₹20,000/year for each additional centre** | ₹15,000–₹24,000 | Up to 2 terminals per centre; 5–10% volume discount at 3+ centres |

### Vertical price cards

The annual licence should follow the modules the buyer actually needs:

| Buyer type | Modules enabled | Recommended annual price (excl. GST) |
| --- | --- | ---: |
| Diagnostic centre | Diagnostics + patients + billing/dues + reports | **₹24,000/year** for up to 2 terminals |
| Standalone pharmacy | Pharmacy + patients optional + one/two counters | **₹18,000/year** for 1 counter, **₹24,000** for 2 |
| Small hospital / nursing home | Hospital edition (admissions + generic IPD service billing + patients/expenses/compliance) plus optional diagnostics/pharmacy | **₹48,000/year** for up to 5 terminals |
| Existing diagnostics customer adding hospital | Hospital edition/add-on | **+₹6,000/year** |
| Existing customer adding pharmacy | Pharmacy add-on | **+₹9,000/year** |

Setup for pharmacy-only or hospital pilots should be quoted at **₹10,000–₹25,000**, depending on
medicine/rate-list data and ward configuration. Multi-vertical pricing is not a discount for every
module; it reflects higher training, data and support scope.

Do not present a pharmacy-only pilot as a full pharmacy ERP. It covers local batch inventory,
dispensing, GST receipts and stock deduction, not central procurement, insurance, narcotics registers
or chain-store transfers.

### Editions and licence enforcement

Quote the edition, not an ambiguous list of screens. The signed licence activates Diagnostics, Pharmacy,
Hospital, Complete or Custom modules on named tenant/device IDs. Clinic visibility settings can then hide
licensed modules the buyer does not use. The 30-day grace and post-grace read-only access should be
written into the licence terms and renewal reminders; existing records remain viewable/printable/exportable.
Do not sell a public self-service licence portal or guaranteed online revocation until the portal is
hosted, hardened and tested. See [licensing-and-editions.md](licensing-and-editions.md).

### Recommended pilot conversion rule

- Charge **₹20,000** for the pilot.
- Credit **₹10,000** of the pilot fee against the first annual licence if the buyer converts within 30
  days of pilot acceptance.
- The remaining ₹10,000 pays for the supervised setup/training and is not refundable.
- Migration is quoted separately after source-data inspection.
- Never credit against hardware, custom development or a future feature.

This preserves commitment from the buyer without making the pilot feel like a free consulting project.

### Example quote — one centre, two terminals

| Line | Amount |
| --- | ---: |
| Paid pilot (credited ₹10,000 on conversion) | ₹20,000 |
| Annual licence after conversion | ₹24,000 |
| Less pilot conversion credit | −₹10,000 |
| Master data/opening dues migration | ₹8,000 |
| **First-year total, excluding GST** | **₹42,000** |
| GST at the applicable rate (confirm with CA) | As invoiced |
| Year 2 onward | ₹24,000/year + GST |

If the buyer does not need migration, the first-year total is **₹34,000 + GST**.

### Example quote — three centres

| Line | Amount |
| --- | ---: |
| Setup/configuration — 3 centres | ₹36,000 |
| Annual licence — centre 1 (2 terminals) | ₹24,000 |
| Annual licence — centres 2–3 at ₹20,000 each | ₹40,000 |
| Migration — 3 centres | ₹18,000 |
| **First-year total, excluding GST** | **₹1,18,000** |
| Year 2 onward | ₹64,000/year + GST |

Give a volume discount only in exchange for committed multi-centre rollout, prompt payment or a
reference case study. Do not discount merely because the buyer asks.

### Why this price is defensible

For a centre doing 100 bills/day at an average ₹500 bill value, one avoided day of billing downtime is
₹50,000 of gross billing. The annual licence is less than one day of that exposure, before counting
faster dues collection, fewer duplicate invoice numbers or reduced report rework.

Use the buyer’s actual volumes and pain, not this illustrative number, in the ROI discussion. Never claim
a guaranteed saving.

The pricing also covers real work: installation, training, support, product updates, security fixes and
the buyer’s expectation of continuity. A ₹99/month price would not fund that obligation.

### Price floors and exceptions

- **Do not charge less than ₹15,000** for a paid pilot; below that, acquisition/support effort usually
  exceeds revenue.
- **Do not charge less than ₹18,000/year** for a supported single-centre licence. A lower price turns
  support into a loss.
- **Do not include unlimited custom development** in any annual fee.
- A discount above 25% requires a reciprocal commitment: prepayment, multi-centre rollout, public case
  study or design-partner obligations.
- Two-year prepayment may receive up to a **10% discount**.
- Do not sell perpetual licences below **₹60,000** plus AMC; support obligations continue forever.
- If the buyer insists on onsite training, travel and multiple stakeholders, price the implementation
  separately rather than cutting the licence.

### Perpetual-licence alternative

Some Indian buyers prefer to “own” software. Use this only when they reject annual subscription:

| Item | Recommended |
| --- | ---: |
| One-time licence — 1 centre, up to 2 terminals | **₹65,000** |
| Implementation/training | **₹15,000** |
| Annual maintenance/support from year 2 | **₹15,000/year** |
| Additional terminal licence | **₹6,000 one-time** |

A perpetual licence is not a one-time cost to the vendor. The AMC funds compatibility, support, security
updates and future operating-system changes; do not make it optional and then provide free support.

### What not to charge for

- Per-invoice or per-patient fees. They punish the buyer’s growth and make the product feel like a toll.
- Basic bug fixes within the supported scope.
- A fee for data export on termination. Export is part of trust and the contract.
- NABL/ABDM logos or “certification”. You cannot sell accreditation.
- Features that are still on the roadmap unless the buyer is funding a separately contracted build.

### Pricing release condition

These prices assume a productionized release with a signed installer, durable local database, tested
backup/restore and supported installation. Until those gates are complete:

- Sell only a **paid supervised pilot** at ₹15,000–₹30,000.
- State that the pilot is time-boxed and data handling requires the release-gate checklist.
- Do not collect annual-licence money for a product that cannot yet be safely deployed.
- Do not include hosted monitoring, ABDM transport, QMS or backups in the price until they are delivered.

See [productionization-plan.md](productionization-plan.md) for the gates that unlock the launch price
card.

## Commercial objectives

- Keep the buyer’s total cost materially below a full LIMS/HIS.
- Avoid per-invoice or per-patient charges that punish growth.
- Charge for implementation and support, not only for source code.
- Do not sell unimplemented modules to win a deal.

## Recommended offer structure

### 1. Paid design-partner pilot

A fixed-scope, fixed-duration engagement:

| Component | Scope |
| --- | --- |
| Discovery | Workflow, users, rate list, numbering, printers, migration needs |
| Configuration | Lab identity, GST, tests/packages, doctors, users, templates |
| Installation | Supervised installation on agreed pilot hardware after release gates |
| Training | Billing, patients, samples, results/amendments, dues, expenses, evidence |
| Migration | Agreed masters plus opening dues; historical invoices by separate quote |
| Parallel run | 30–60 days or agreed bill volume |
| Review | Weekly defect/priority review and written acceptance report |
| Exit | Continue, extend or roll back |

Price formula:

```text
Pilot fee = discovery/configuration
          + implementation/training days × day rate
          + migration effort
          + pilot licence fee
          + travel/onsite costs (if any)
```

Do not bundle hosted monitoring, live ABDM or custom modules into the pilot fee without a separate
success gate.

### 2. Annual per-centre licence

Best for ongoing product funding.

```text
Annual licence = base centre fee
               + terminal band
               + support tier
               + optional modules
```

Terminal bands could be 1–2, 3–5, 6–10. Charge per independent centre, not per branch if the buyer
wants later consolidation priced separately as a feature.

### 3. One-time licence + AMC

Suitable for buyers who refuse recurring software subscription:

```text
Initial licence = implementation + perpetual/local licence
AMC             = annual support, updates, minor configuration
```

AMC should not include unlimited custom development. Define included support hours and exclusions.

### 4. Optional services

- Data migration from Excel/other software
- Additional report template design
- Printer/network setup
- Onsite training beyond included days
- Custom CSV/accounting export
- Optional local Google Drive export setup, including full all-module snapshots
- ABDM onboarding and sandbox certification (only after integration exists)
- Compliance/QMS configuration consultancy (partner with a qualified consultant)
- Priority/24×7 support
- Dedicated hosting/VPS
- Windows code signing and managed update channel

## Cost-to-serve inputs

| Cost | Current/future treatment |
| --- | --- |
| Tauri/SQLite/local app runtime | No licence fee; development and support labour still matter |
| Google Drive storage | Buyer-managed Google account/quota |
| VPS optional | Buyer-specific; reuse target ₹400–600/month from early design assumptions |
| Domain/TLS | Domain annual cost; TLS normally free |
| Windows code-signing certificate | Optional recurring cost; estimate varies |
| Remote support tool | Free/low-cost tier may be adequate for pilot |
| Backup storage | Buyer-managed drive at ₹0 or cloud storage at usage cost |
| ABDM | Do not assume zero implementation effort even if API access itself is free |
| GST | Quote taxes separately according to applicable law |
| Travel/onsite | Pass through or fixed by scope |
| Payment gateway | Not part of current product |

The original design target of **₹0–₹500/month running cost** is an infrastructure goal, not a promise
that support, compliance or development are free.

## ROI framework for the buyer

Measure before/after over a comparable period:

```text
Monthly time saved
  = bills/day × minutes saved/bill × working days ÷ 60

Monthly labour value
  = hours saved × loaded hourly staff cost

Cash-flow benefit
  = reduction in overdue dues × cost of working capital

Error/rework benefit
  = reissued invoices × minutes to correct × staff cost

  + avoided duplicate payments / missed dues
```

Do not promise a percentage saving without measured pilot data.

## Proposal structure

1. Buyer context and current pain
2. Agreed pilot scope
3. Explicit exclusions
4. Acceptance criteria and success metrics
5. Timeline and responsibilities (buyer vs vendor)
6. Data migration scope
7. Security/privacy responsibilities
8. Fees, taxes and payment schedule
9. Support during pilot
10. Go/no-go and conversion terms
11. Limitations acknowledgement
12. Signatures

## Payment milestones (example)

| Milestone | Suggested share |
| --- | ---: |
| Signed pilot agreement | 30% |
| Configuration/install complete | 30% |
| Migration and training accepted | 20% |
| Pilot acceptance review | 20% |

Annual licence can be invoiced in advance; implementation is milestone-based. Do not make the pilot
contingent on a future feature that has no written delivery date.

## Contract clauses to discuss with counsel

- Scope and change-control process
- Licence grant and permitted users/terminals
- Data ownership: buyer owns patient data
- Confidentiality and DPDP/data-processing obligations
- Backup responsibility and RPO/RTO
- Support hours and response targets
- Security incident notification
- Warranty and limitation of liability
- Service credits/termination for hosted tier
- Export and deletion on termination
- Open-source components and third-party notices
- Escrow/source continuity option
- Acceptance criteria and dispute resolution
- Taxes and payment terms

## Pricing anti-patterns

Avoid:

- “Unlimited support” without a fair-use definition
- Fixed per-invoice charges that discourage billing volume
- Free custom development to close a deal
- Discounting below implementation/support cost
- Promising hosted monitoring or live sync that the product does not provide
- Using competitor prices as the only basis; price the value and support burden
- Charging for compliance certification you cannot provide (accreditation is external)

## Quote worksheet

| Line | Your value |
| --- | --- |
| Discovery/configuration | ₹________ |
| Implementation days × day rate | ₹________ |
| Migration | ₹________ |
| Training | ₹________ |
| Pilot licence (period) | ₹________ |
| Annual licence after pilot | ₹________ |
| Support tier/year | ₹________ |
| Hardware/printers (pass-through) | ₹________ |
| Hosting/domain (when applicable) | ₹________ |
| Travel/onsite | ₹________ |
| Taxes | As applicable |
| Total | ₹________ |
