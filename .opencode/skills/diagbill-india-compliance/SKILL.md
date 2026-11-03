---
name: DiagBill India Compliance
description: Use when implementing or reviewing NABL, ISO 15189:2022, ABDM, diagnostic-report traceability, consent, audit evidence, FHIR interchange, or India-specific laboratory compliance requirements.
---

# DiagBill India compliance

Use this skill to keep compliance work evidence-based. Distinguish software capability from laboratory procedure and external accreditation. The software can support compliance; it cannot grant NABL accreditation or ISO certification.

## Verified standards baseline

Checked 25–26 October 2026:

- ISO 15189:2022, Edition 4, published 2022-12 — *Medical laboratories — Requirements for quality and competence*. Official abstract: <https://www.iso.org/standard/76677.html>
- NABL 112A, Issue 01, dated 18 December 2024 — *Specific Criteria for Accreditation of Medical Laboratories*, implementing ISO 15189:2022 for India. Download: <https://nabl-india.org/wp-content/uploads/2026/08/202412180304-NABL-112-A-doc.pdf>
- NABL 112B, Issue 01, Amendment 01 dated 4 November 2025 — guidance for medical laboratories. Download: <https://nabl-india.org/wp-content/uploads/2026/08/202511060637-NABL-112B-doc.pdf>
- NABL 223 assessment checklist based on ISO 15189:2022 and NABL 220D document-review checklist are the current assessment aids listed by NABL.
- NABL 133 governs NABL symbol/accreditation claims. Never add logos or accreditation claims merely because fields exist.
- ABDM FHIR Implementation Guide **v6.5.0** (release, generated 2025-05-08), based on FHIR R4: <https://nrces.in/ndhm/fhir/r4/index.html>
- ABDM current laboratory profiles include `Patient`, `Practitioner`, `Organization`, `Specimen`, `Observation`, `DiagnosticReportLab`, `DiagnosticReportRecord`, and `DocumentBundle`.
- ABDM laboratory document example: <https://nrces.in/ndhm/fhir/r4/Bundle-DiagnosticReport-Lab-example-03.html>
- ABDM LOINC guidance and national Common Lab Codes for India (CLCI) are published by NRCeS. Use CLCI/LOINC mappings rather than inventing codes.

Re-check current document revisions before an external assessment; these documents are revised periodically.

## Software-relevant NABL 112A evidence

### Pre-examination (§7.2; NABL 112A pp. 27–29)

- Positive patient/sample identification and request information.
- Collection instructions, informed consent where required, deviations documented.
- Collection time log, transport conditions, receipt, acceptance/rejection criteria.
- Rejected/compromised samples and any impact on reported results must be traceable.
- Sample must remain linked to patient and order from accession onward.

### Examination (§7.3)

- Method/analyser/reagent-lot traceability.
- IQC: control levels, LJ data, acceptance rules, out-of-control investigation and corrective action.
- EQA/PT participation and corrective actions; alternative performance checks where formal PT is unavailable.
- Comparability studies for multiple systems.
- Method verification, measurement uncertainty and reference intervals where applicable.

### Post-examination and reporting (§7.4; pp. 33–35)

- Reports must identify the person authorizing release.
- Critical limits must be defined and critical results communicated with documented evidence.
- Preliminary reports and auto-verification have explicit controls and traceability; auto-verified reports must say so.
- Amended reports must be controlled; do not silently overwrite issued results.
- Specimen disposal is a post-examination event: do not allow disposal before every linked test has
  entered results. Record disposal method, responsible user and timestamp, and retain the chain from
  accession through result entry to disposal.
- Retain specimen/post-examination records per discipline.

### Information management and records (§7.6, §8.4)

- Computerized workflow must carry an audit trail from accession to reporting.
- Role-based authenticated access; promptly deactivate users who lose authorization.
- Audit trail must link activity to a user and to patient data/software changes.
- Minimum retention includes reports/TRFs (1 month), QC/EQA raw data (1 year or next assessment, whichever later), plus longer discipline-specific periods. Retention requirements must be configurable/validated against the laboratory's actual scope.
- Verification of LIS workflows after installation and after major changes.

### Evaluations (§8.8)

- Quality indicators include sample collection/identification, transport/processing, analysis/reporting, TAT, complaints, downtime, uncertainty and EQA/PT performance.
- Internal audit at least every 12 months and covers pre-examination, examination and post-examination.

## ABDM implementation rules

- Never fake ABHA verification, HIP/HIU registration, HFR registration, consent grants, or live exchange.
- Store ABHA number/address only as a patient identifier candidate; verification status must be explicit.
- Consent needs purpose, grant/revoke evidence, actor, timestamp, expiry where applicable, and the consent artefact version.
- FHIR documents are `Bundle.type = document`; the first entry must be Composition.
- `DiagnosticReportLab.result` requires Observation references. `resultsInterpreter` is required and must resolve to a Practitioner/PractitionerRole/Organization.
- `DiagnosticReport.conclusion` is required; use the laboratory's actual result summary/interpretation, not an invented diagnosis.
- Patient identifier is required; a local medical-record identifier is valid when ABHA is absent, but must not masquerade as ABHA.
- Use official profile canonical URLs, SNOMED CT for report type where specified, LOINC/CLCI for report/observation codes, and UCUM only for units actually mapped.
- Offline generation may be allowed after local validation; live transmission requires sandbox credentials, consent validation, retry/outbox state and contract testing.
- Monitoring remains read-only. Clinical writes and ABDM outbox writes occur on trusted terminals.
- Treat FHIR bundles and consent data as restricted patient information. Do not place real patient data in logs, screenshots or fixtures.

## Referral commissions and inducements

Referral commissions, doctor payouts or similar inducements can create serious compliance, ethics,
anti-corruption, medical-council, tax and audit issues in Indian healthcare. **Merely making commission
rules, accruals or payouts visible in the product can itself create a compliance or discoverability
problem**, even if the feature is optional.

MediCore therefore does not expose a Commissions tab/module, does not collect commission rules in the
Doctors screen, and does not accrue referral commissions on new bills. Legacy commission tables/rows may
remain in historical databases and are not displayed by the current UI. Do not reintroduce commission
visibility, accrual, payout or reporting without a written legal/compliance review and an explicit
product decision. Never describe commission functionality as a compliance feature.

## Boundaries to state in documentation

Not equivalent to compliance:

- Having ABHA/consent columns
- Having sample/audit fields without enforced workflows
- Generating JSON that has not been validated against the current profile/examples
- A digital image of a signature
- A NABL logo or certificate number
- A self-declaration that the LIMS is "NABL compliant"

Always maintain a requirement-to-evidence matrix. Mark each item as implemented, laboratory-configurable, externally dependent (ABDM/NABL credentials), or not implemented.
