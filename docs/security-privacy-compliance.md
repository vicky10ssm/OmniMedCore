# Security, privacy and compliance

## Security posture today

| Area | Current status | Buyer wording |
| --- | --- | --- |
| Authentication | Per-user username/password | Available |
| Password storage | PBKDF2-SHA256 with per-password salt | Available |
| Two-factor auth | TOTP RFC 6238, replay protection, hashed one-time recovery codes | Available |
| Roles | Admin/operator plus explicit report-release authority | Available |
| Monitor write prevention | Separate read-only source rejects writes | Available, local monitor only |
| Audit evidence | User/action/entity/timestamp for major clinical/financial changes | Available at application level |
| Database encryption | AES-GCM envelope/key and recovery code foundation | Partial; no finished Settings enable/recovery workflow |
| Key handling | Unwrapped device key held in memory for the unlocked session | Implemented foundation |
| Secrets in logs | Audit detail excludes secrets/FHIR payloads | Policy implemented in new paths |
| Automated backup | None | **Not available** |
| Retention/legal hold | None | **Not available** |
| Remote access/support | None built | Must be arranged per pilot |
| Code signing | None | Future cost/friction |
| Penetration test | Not performed | Do not claim |
| ISO 27001/SOC 2 | Not held | Do not claim |

### Threat model to explain honestly

- The billing PC is assumed trusted while unlocked.
- Encryption at rest is intended to reduce loss from theft/copying, not to stop an administrator who
  already controls the running computer.
- Browser development storage is not equivalent to a managed local database file.
- A stolen unlocked terminal or compromised Windows account is outside the protective boundary.
- Patient data must not be used in demos, screenshots, support logs or public forks.

## Data location and retention today

- Development data resides in browser IndexedDB as a SQLite image.
- Production target is a Tauri-managed SQLite file.
- There is currently no automated off-device copy, retention scheduler or deletion certificate.
- CSV exports and printed PDFs create uncontrolled copies outside the app; buyers must have a policy
  for those copies.
- Encryption is not yet a complete user-facing feature; do not say “all data is encrypted” in sales.

## Hospital and pharmacy extensions

The admissions module adds inpatient administrative data: ward/bed, treating doctor, admission reason,
diagnosis and discharge summary. It is not a complete medical record and does not replace nursing or
medical documentation. Access to inpatient data must follow the same tenant/role and audit rules.

The pharmacy module stores medicine master data, batches, expiry and stock movements, and pharmacy
sales. Batch selection and stock deduction are transactional. It does **not** provide controlled-drug
registers, prescription validation, drug-interaction checks, purchase accounting or chain-store
inventory control. Buyers with those obligations must retain their existing controlled processes.

Both modules must be included in the buyer’s DPDP review, retention policy, data migration validation,
backup/restore testing and staff training before production use.

## Indian privacy and contractual considerations

This is commercial guidance, not legal advice. Before handling real patient data, obtain Indian counsel
on:

- Digital Personal Data Protection Act, 2023 obligations for the centre and software provider
- Notice, purpose limitation, consent and data-principal rights
- Vendor role as data processor/service provider and required contract terms
- Breach notification and incident cooperation
- Cross-border storage/processing if any cloud service is used
- Retention, deletion and legal-hold requirements
- Access by support staff and audit of that access

The buyer (diagnostic centre) remains the data fiduciary/controller for its patients. The vendor should
not assume ownership of patient data.

## NABL / ISO 15189 status

Verified references:

- ISO 15189:2022, Edition 4
- NABL 112A Issue 01 (18 Dec 2024)
- NABL 112B Issue 01 Amendment 01 (4 Nov 2025)
- Current NABL 133 symbol/claim policy

### Implemented evidence foundations

- Patient identity/demographics and optional ABHA/ID fields
- Sample accession, collection, receipt, acceptance, rejection and disposal chain with actor/time
- Pathology release blocked until sample acceptance
- Explicit report-release authority
- Draft/verified/amended revision snapshots with required amendment reason
- Report identifies sample, authorizer, release time and version
- Test method/specimen/container/department/LOINC fields
- Parameter-level units, reference ranges and abnormal flags
- Audit evidence dashboard and actor-linked events
- Start/complete/approval timestamps for examination

### Not implemented (must be stated)

- IQC/EQA/Levey–Jennings and acceptance-rule workflows
- Equipment/calibration/maintenance/temperature monitoring
- Reagent lots/expiry/verification
- Personnel qualification, training and competency assessment
- Controlled SOP/document management
- Nonconformity, CAPA, complaints, risk register, internal audit and management review
- Critical-value notification/read-back
- Full method validation, measurement uncertainty, comparability and reference-interval validation
- Configurable retention/disposal automation
- Barcode/label/chain-of-custody capabilities
- Full NABL/ISO evidence export pack

**Permitted claim:** “The software provides sample, report, amendment and audit evidence intended to
support a laboratory’s NABL/ISO 15189 processes.”

**Prohibited claims:** “NABL compliant”, “NABL certified”, “ISO 15189 certified software”, “guarantees
accreditation”.

## ABDM status

- FHIR R4 draft based on NRCeS IG v6.5.0
- `Bundle.type=document`, Composition first
- DiagnosticReportRecord, DiagnosticReportLab, Observation, Patient, Practitioner, Organization,
  Specimen profiles used
- Active purpose-specific consent required at generation
- Local structural validation and local outbox draft
- No ABHA remote verification, HFR/HIP registration, API call, consent artefact exchange or send

**Permitted claim:** “Prepared for ABDM FHIR R4 interoperability; generates offline draft documents
based on the current public profile.”

**Prohibited claims:** “ABDM integrated”, “ABDM certified”, “sends reports to ABHA/Health Locker”,
“ABHA verified”.

## Claims policy for all materials

1. Use “supports”, “prepares”, “records evidence”, not “guarantees compliance”.
2. State environment and date for standards references.
3. Show known limitations in every proposal.
4. Never show a NABL/ABDM logo or certificate number without written authority.
5. Do not label a signature image as a digital signature.
6. Do not show real patient information in marketing.
7. Verify any performance or uptime statement with measured evidence first.
8. Avoid comparing to a named competitor with unverified claims.

## Pre-sale security documents to prepare

- One-page security architecture
- Data-flow diagram including backups and support access
- Subprocessor list
- Incident response contact/procedure
- Data-processing agreement template
- Deletion/export process
- Access-control matrix
- Vulnerability/patch policy
- Business continuity and restore-test record
- Security questionnaire answers with evidence dates

See [buyer-due-diligence.md](buyer-due-diligence.md).
