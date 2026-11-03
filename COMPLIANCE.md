# NABL / ISO 15189 / ABDM compliance matrix

Last reviewed: 26 October 2026

This document records **software evidence**, not a certification claim. The laboratory remains
responsible for its processes, validation, competence, quality-control performance and external
assessment. A field or report label alone does not establish compliance.

## Authoritative baseline

| Document | Current reference used |
| --- | --- |
| ISO 15189:2022 | Edition 4, published 2022-12 — *Medical laboratories — Requirements for quality and competence* |
| NABL 112A | Issue 01, 18 December 2024 — *Specific Criteria for Accreditation of Medical Laboratories* |
| NABL 112B | Issue 01, Amendment 01, 4 November 2025 — medical laboratory guidance |
| NABL 133 | Current policy for NABL symbol and accreditation claims |
| ABDM FHIR | NRCeS FHIR Implementation Guide for ABDM v6.5.0, FHIR R4 |

Official links:

- <https://www.iso.org/standard/76677.html>
- <https://nabl-india.org/nabl-documents/>
- <https://nrces.in/ndhm/fhir/r4/index.html>
- <https://nrces.in/ndhm/fhir/r4/StructureDefinition-DiagnosticReportRecord.html>
- <https://nrces.in/ndhm/fhir/r4/StructureDefinition-DiagnosticReportLab.html>
- <https://nrces.in/ndhm/fhir/r4/StructureDefinition-DocumentBundle.html>

## Implemented in the first compliance increment

### Sample identity and pre-examination traceability

- Pathology billing creates one sample record per test with a unique tenant-scoped accession number.
- Sample states: expected → collected → received → accepted or rejected → disposed.
- Collection/receipt/acceptance/rejection/disposal record the responsible user and timestamp.
- Rejection requires a reason and blocks release of linked pending tests.
- Existing/legacy orders without a sample are listed for registration.
- Reports cannot release a pathology result unless a linked sample is accepted.
- Disposal is blocked until every linked test has complete entered results, so an accepted sample cannot
  be removed from the release path before result entry. The gate is enforced in the action handler and UI.

**Status:** implemented for the supported pathology workflow.
**Still required:** barcode/label printing, collection-centre manifests, transport temperature logging,
aliquot/chain-of-custody transfers, configured retention/disposal schedules, X-ray-specific workflow.

### Report release, amendment and history

- A user must have explicit `can_authorize_reports` authority to verify or amend reports.
- Every result save creates an append-only revision snapshot (draft, verified or amended).
- Issued reports cannot be returned to draft; amendment requires a reason.
- Previous revision snapshots remain readable through the History dialog.
- Printed reports identify sample accession, version, actual release authorizer and amendment status.
- Analysis start/completion, approval identity and timestamps are recorded.

**Status:** implemented for test-level reports.
**Still required:** organisation-wide report versioning rules, critical-value notification/read-back,
controlled preliminary reporting, auto-verification controls, electronic/digital signature service,
and discipline-specific report content validation.

### Audit and access evidence

- Login and 2FA recovery events were already audited.
- Added audit events for patient create/update, consent grant/update/revoke, sample register/collect/
  receive/accept/reject/dispose, report verify/amend, ABDM draft creation, invoice create/cancel,
  payment create and settings updates.
- Administrators get a read-only **Compliance** page with recent audit evidence.
- Report-release authority is separate from front-desk data entry.
- Read-only monitoring still has database-level write rejection.

**Status:** implemented at application level.
**Still required:** tamper-evident audit storage/export, configurable retention, periodic audit review
evidence, broader role definitions (technician/pathologist/quality manager) and account inactivity/expiry.

### Patient identity and ABDM consent

- Optional ABHA number/address with **local format validation only**; no remote verification is claimed.
- Date of birth, ID-proof type/number and address are supported.
- Purpose-specific ABDM sharing consent records version, grant/revoke actor, timestamps and optional
  expiry; revocation is retained.
- ABDM exports require an active, unexpired consent.

**Status:** implemented locally.
**Still required:** official ABHA verification/API, consent artefact exchange, HFR/HIP registration and
ABDM Health Data Management Policy validation.

### ABDM FHIR R4 document generation

- Generates an offline FHIR R4 `Bundle.type=document` for one released pathology test.
- Composition `DiagnosticReportRecord` is the first entry.
- Includes `DiagnosticReportLab`, Observation, Patient, Practitioner, Organization and accepted Specimen.
- Uses official NRCeS v6.5.0 canonical profile URLs and SNOMED CT report type.
- LOINC/CLCI mapping can be stored per test parameter and used for Observation coding.
- Supports released/amended status, result, unit, reference range and L/H interpretation.
- Runs local structural checks (Composition first, references resolve, results/interpreter/conclusion present).
- Saves a local `abdm_outbox` draft and downloads FHIR JSON; **no network transmission occurs**.

**Status:** offline draft only.
**Still required:** validation against NRCeS validator/sandbox, ABDM gateway APIs, consent artefact
exchange, HFR/HIP authentication, retry/dead-letter transport, encryption/key handling for exchange,
sandbox contract tests and production approval.

### Report content

- Patient name, age/gender, DOB where available, ABHA as recorded, referring doctor.
- Sample accession/specimen and collection time where available.
- Test parameters with selected results, units and report-specific reference intervals.
- Low/high flags, sample/testing caveat, actual authorizing user, release time and report version.
- Accreditation body/number/validity can be configured and is printed only when entered.
- No NABL logo is added automatically.

**Status:** partially implemented.
**Still required:** validated reference intervals by age/sex/method, methods on the report, critical
limits/reference to follow-up, accredited-scope marking per test, full report pagination and amended
report comparison layout.

### Hospital admissions and pharmacy extensions

**Status:** implemented as basic modules; not a full HIS or chain-pharmacy ERP.

- Hospital admissions record patient, admission number, ward/bed, treating doctor, reason, admission and
  discharge timestamps, diagnosis and discharge summary. Admission cancellation is admin-only and audited.
- Generic hospital/IPD billing records tenant-defined service catalogue items, admission charges with
  quantity/GST, payments and computed balance, with audit events and A4 bill print.
- Pharmacy records medicine master data, batch/expiry stock, stock receipts, dispensing sales, GST split,
  transactional stock deduction and cancellation with stock return.
- Pharmacy receipts show the tenant letterhead, patient/walk-in identity, batch details and GST totals.
- Both modules are tenant-scoped and use the same patient identity as diagnostics/OPD.
- Module visibility is configured per tenant.

**Not implemented for hospitals:** package/day-wise auto charges, advances/deposit ledger, insurance/TPA
and cashless claims, bed board/transfers, nursing notes, medication charts, doctor orders/e-prescribing,
operation theatre or full medical records.

**Not implemented for pharmacy:** purchase orders/GRN/payables, supplier returns, stock adjustments,
controlled/narcotics registers, prescription validation, drug-interaction/allergy checking,
barcode dispensing, chain-store transfers or insurance claims.

These boundaries must be part of buyer scoping and staff training. Pharmacy batch/stock evidence supports
operational traceability but does not by itself satisfy any statutory pharmacy record obligation.

### Referral commissions

**Status: intentionally not offered.** The Commissions tab/module and doctor commission-rule fields are
removed, and new invoices do not accrue referral commissions. Legacy commission tables may remain in
historical databases for integrity but are not displayed. Referral commissions/inducements can create
compliance, ethics, anti-corruption, medical-council and tax exposure; visibility alone can create
discoverability risk. Do not reintroduce commission tracking or reporting without written legal and
compliance review.

## Not yet implemented

These are explicitly **not** complete despite existing columns:

1. IQC control lots/levels, Levey–Jennings data, Westgard/acceptance rules, out-of-control investigation.
2. EQA/PT plans, results, performance review and corrective actions.
3. Equipment inventory, IQ/OQ/PQ, calibration, maintenance, temperature monitoring and downtime.
4. Reagent/consumable lots, expiry, in-house preparation and lot verification.
5. Personnel qualification, training, competency assessment, CEPD and discipline authorization matrix.
6. Controlled SOP/document versions and acknowledgement.
7. Nonconforming-work, CAPA, complaints, risk register and management review.
8. Internal audits and quality-indicator monitoring/dashboards.
9. Measurement uncertainty, method verification/validation and comparability studies.
10. Critical-value notification/read-back records.
11. Full sample chain-of-custody, storage and retention automation.
12. Live ABDM APIs, HFR/HIP registration, consent artefact exchange and production transport.
13. Disaster recovery/restore-test evidence and configurable retention enforcement.

## External actions required by the laboratory

- Approve and sign SOPs, job descriptions and authorization matrices.
- Validate methods, reference intervals, measurement uncertainty and report formats.
- Define critical limits and notification procedures.
- Run IQC/EQA and document corrective actions.
- Train and assess staff; retain competence evidence.
- Complete risk assessment, internal audit and management review.
- Obtain HFR/HIP credentials, test in the ABDM sandbox, and approve production use.
- Undergo NABL assessment; certification is not conferred by this software.

## Verification commands

```sh
npm run check
npm run build
npm run build:monitor
```

The acceptance procedure is maintained in the skill
`.opencode/skills/diagbill-demo-qa/SKILL.md`.
