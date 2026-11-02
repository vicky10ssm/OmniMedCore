# MediCore — buyer overview

## The proposition

MediCore is a modular, offline-first billing and care-operations suite for Indian diagnostic centres,
pharmacies and small hospitals. It is designed so teams can keep registering patients, billing,
dispensing medicines, managing inpatients and releasing diagnostic reports when the internet is
unavailable.

It is sold as three configurable verticals on one tenant-aware platform:

- **Diagnostics:** pathology/X-ray billing, samples and parameter-based reports
- **Pharmacy:** medicine inventory, batches, expiry, dispensing and GST receipts
- **Hospital:** inpatient admission, ward/bed, treating doctor, discharge summary and generic IPD
  service billing (charges, payments, balance, bill print)

The product focuses on operational and financial control points that small providers usually manage with
a mixture of Excel, paper registers and disconnected software:

- One patient record shared across OPD, diagnostics, pharmacy and inpatient workflows
- A configurable test/package rate list with GST
- GST invoices, A4 and 80 mm thermal printing
- Dues, part-payments and collection follow-up
- Referring-doctor directory without commission/inducement tracking
- Expenses and a basic profit view
- Pathology reports with selectable parameters, units and reference intervals
- Sample traceability from accession to acceptance/rejection
- Hospital admission, ward/bed assignment, discharge summary and generic IPD service billing
- Pharmacy medicine master, batch/expiry stock, dispensing and receipts
- Signed Diagnostics/Pharmacy/Hospital editions with 30-day grace and read-only access after expiry
- Amendment history and user-linked audit evidence
- Local ABDM FHIR draft preparation

## Best-fit early buyers

### Diagnostic centre
- 1–3 Windows billing terminals at one location
- Pathology and/or X-ray billing
- Roughly 50–500 bills per day
- GST registration, referral directory and report amendments
- Manual result entry

### Pharmacy
- One or two dispensing counters
- Medicine master with batches, expiry and stock visibility
- GST receipts and optional patient linkage
- Needs a low-cost local-first system without a full chain-pharmacy ERP

### Small hospital / nursing home
- OPD billing plus a small inpatient ward
- Wants admissions, ward/bed and discharge summaries in the same system
- May also run diagnostics and/or an in-house pharmacy
- Can tolerate a supervised pilot and manual migration

Common requirements for all: willingness to participate in acceptance testing, a named data/training
owner, and realistic acceptance that cloud monitoring, ABDM transport and advanced QMS are not live yet.

## Poor-fit buyer today

Do not position the current build as suitable for:

- A large hospital requiring a full HIS/LIS, PACS, e-prescribing, OT, nursing or stock-procurement suite
- A chain pharmacy requiring central purchase orders, warehouse transfers, narcotics registers,
  insurance/TPA claims or multi-store inventory consolidation
- A multi-site group needing live consolidation across centres
- A buyer requiring NABL-certified software, validated QMS or a vendor security certification
- A buyer requiring immediate ABDM production exchange
- A buyer requiring browser-based billing or necessarily hosted multi-tenant operation
- A 24×7 operation requiring a contractual uptime SLA before the production platform exists
- A public tender requiring installed references, ISO 27001, SOC 2 or formal validation packs

## Differentiators that are true today

1. **Offline-first money workflow.** Billing and pharmacy dispensing do not depend on connectivity in
   the current terminal build.
2. **Accounting discipline.** Money is stored in paise, GST is calculated per line, and corrections use
   cancellation/re-issue. Referral commissions are not exposed or accrued.
3. **Clinical traceability.** Pathology samples have an accession chain, release is blocked until the
   sample is accepted, and issued results are amended without destroying the previous revision.
4. **Parameter-based reports.** CBC/LFT/KFT/lipid/urine starter templates are included and the
   pathologist can choose the parameters printed for a patient.
5. **One patient identity across services.** OPD, diagnostics, pharmacy sales and hospital admissions
   share the patient record.
6. **Configurable verticals.** A standalone pharmacy can hide diagnostic modules; a small hospital can
   enable admissions, diagnostics and pharmacy on the same platform.
7. **Local ownership and exportability.** Data is intended to remain exportable; the commercial model
   does not require per-invoice fees.
8. **Compliance-aware design.** NABL 112A, ISO 15189:2022 and ABDM FHIR v6.5.0 requirements have been
   mapped, with current gaps documented rather than hidden.
9. **Edition licensing without a cloud dependency.** One installer can sell Diagnostics, Pharmacy,
   Hospital, Complete or Custom, with signed tenant/device activation and 30-day grace. Hosted portal
   hardening and OS-secure licence storage remain production gates.
10. **Low target running cost.** The architecture targets local SQLite/Tauri and a cheap read-only
   hosting tier, with no mandatory per-message service.

## What the buyer is actually buying in a pilot

A paid pilot should include:

- A configured rate list, lab identity, users and numbering scheme
- Staff training on billing, samples, reports, dues, expenses and compliance evidence
- Migration of an agreed subset of masters and open balances
- Supervised parallel running against the current process
- Weekly review of defects, workflow gaps and acceptance criteria
- A written go/no-go assessment before wider rollout

It should **not** include unspecified custom development, live ABDM onboarding, cloud hosting,
hardware, Windows code signing or accreditation consultancy unless separately scoped.

## Commercial summary

Pricing is intentionally not fixed in this document. Candidate structures are:

- Paid pilot per centre/site
- Annual per-centre licence
- One-time licence + annual maintenance/support
- Optional implementation, migration, training and custom-integration fees
- Separate cloud-monitoring subscription once that service exists

See [commercial-model-and-pricing.md](commercial-model-and-pricing.md) for the costing and proposal
method.

## Buyer outcome to promise

You may promise a **controlled pilot that improves billing discipline and creates auditable sample and
report evidence**.

You must not promise accreditation, regulatory approval, uninterrupted cloud access, live ABDM
exchange or complete LIS functionality until those are implemented and validated.
