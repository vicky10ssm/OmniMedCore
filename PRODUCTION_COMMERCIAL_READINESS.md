# Production and commercial readiness status

Last updated: 7 November 2026
Product version: `0.9.0`
Database schema: `21`
Current stage: supervised pilot / pre-production

This is the single high-level status document for “what is done” and “what is still pending” from a
production and commercial perspective. It summarises, rather than replaces, the detailed plans:

- [Productionization plan](docs/productionization-plan.md)
- [Roadmap and known gaps](docs/roadmap-and-gaps.md)
- [Deployment and readiness](docs/deployment-and-readiness.md)
- [Pre-release checklist](PRE_RELEASE_CHECKLIST.md)
- [Client installation runbook](CLIENT_INSTALLATION_RUNBOOK.md)
- [Encryption](ENCRYPTION.md), [backup/restore](BACKUP_RESTORE.md) and
  [code signing](code-signing/README.md)

## 1. Current verdict

| Question | Answer |
| --- | --- |
| Can the offline desktop app be demonstrated? | **Yes** |
| Can it be sold as a supervised design-partner pilot? | **Conditionally**, after the pilot P0 gates and written limitations acknowledgement |
| Can it be sold as general-availability production software? | **No** |
| Is a hosted monitoring/SaaS tier part of the product? | **No** — online sync was removed in favour of local Google Drive CSV export |
| Is ABDM production exchange available? | **No** — offline FHIR draft only |
| Is this NABL/ISO certified software? | **No** — evidence foundations only |

The commercially safe offer today is a **paid, tightly scoped, supervised pilot**. Do not promise a
general production SLA, a hosted monitor, live ABDM, key recovery or public-CA SmartScreen reputation
until the relevant gates below are closed.

## 2. What is done

### 2.1 Application and clinical/billing scope

- Patient records and shared patient identity
- GST invoices, packages, discounts, payments, dues, cancellation and invoice-number blocks
- Integer-paise money handling and audit rows
- Diagnostics test/package catalogue, samples, parameter-based reports, amendments and printing
- Pharmacy medicine master, batch/expiry stock, receipt, dispensing, GST receipt and cancellation
- Hospital admissions, ward/bed, treating doctor, discharge diagnosis/summary and generic IPD service
  billing
- Expenses and operator/admin role restrictions
- Optional TOTP 2FA, recovery codes and report-release authority
- Tenant-scoped data and a static tenant-scope verification script
- Offline-first operation; no internet required for billing or reports

These workflows are implemented and manually exercised. They are not a full HIS, chain-pharmacy ERP,
NABL quality system or ABDM integration.

### 2.2 Desktop runtime and local data

- Tauri v2 Windows shell and installers
- Native SQLCipher 4.20 (AES-256) database
- Random 256-bit database key stored in **Windows Credential Manager**
- Automatic plaintext-to-SQLCipher migration with an encrypted pre-encryption copy
- WAL mode, foreign keys, close-flush and single-instance handling
- Schema migrations with pre-migration encrypted backups
- Installed app, NSIS installer and MSI locally signed with a self-signed root
- Signed app inside the MSI verified; local root certificate and client installation instructions

### 2.3 Backup, restore and recovery foundations

- Encrypted local daily/weekly/monthly snapshots with 7/4/12 retention
- Manual **Backup Now**
- Optional second folder for USB/OneDrive
- SQLCipher-aware backup validation and restore
- Pre-restore safety copy
- Legacy plaintext backup restore re-encrypted before activation

### 2.4 Release engineering and documentation

- Git repository with protected `main` and PR-based changes
- CI checks (`npm run check`, app build and monitor build)
- Tag-driven Windows release workflow producing NSIS/MSI
- Public root certificate and local signing script
- Client installation runbook
- Encryption, backup/restore, desktop build, deployment and onboarding documentation
- Rust tests for SQLCipher export, backup validation and backup retention (3/3 passing locally)
- Migration, tenant-scope and monitor build checks passing locally and in CI

### 2.5 Local CSV export foundation

- Migration 18 `local_export_queue` with triggers for invoices, pharmacy sales, admissions and
  hospital charges
- 30-second local export scheduler while the app is open
- Unique `tx_YYYYMMDD_HHMMSS_XXXXXX.csv` files in `GOOGLE_DRIVE_SYNC_PATH`
- Flat CSV rows with masked patient IDs and integer-derived amounts
- Rust `spawn_blocking` writer with `create_new` no-overwrite protection
- Pending/failed rows remain queued with local error evidence and retry
- Full all-module snapshot once per day and on demand under `full-export\snapshot_...`
- Full snapshot writes one CSV per table, including patients; authentication secrets are excluded
- No API call, endpoint, token, ACK table or cloud dashboard in either export path

The legacy `sync_queue`/`sync_ack` tables remain as historical data only; their triggers are dropped by
migration 18.

### 2.6 Commercial documents

- Pricing and packaging model
- Proposal/payment-milestone guidance
- Sales playbook and buyer due-diligence pack
- ROI framework and cost-to-serve model
- Licence editions, activation and renewal process
- Support, migration and onboarding model
- Known-limitations and claims guidance

## 3. What is pending

### P0 — before real patient data and a paid production pilot

| Item | Current state | Required before |
| --- | --- | --- |
| Clean-machine installer/upgrade/uninstall acceptance | Local builds and signature checks only | Any buyer site |
| Public-CA signing / SmartScreen reputation | Local self-signed root only | General distribution; pilot may use local root with written acceptance |
| Clean-machine encrypted backup restore | Restore verified on the development machine | Real patient data / paid pilot |
| SQLCipher key export/import and rotation | Not implemented | Device replacement, Windows-profile loss, cross-machine disaster recovery |
| Unattended and offsite backup | App-open daily schedule only | Commercial production |
| Documented RPO/RTO and restore evidence | Proposal only | Paid pilot / support contract |
| Backend entitlement enforcement | Windows DPAPI storage and hardware binding are implemented; entitlement remains UI-gated | Commercial production |
| Hosted/hardened licence portal | Local vendor portal code only | Online activation/renewal/revocation |
| Automated unit/component/E2E/load tests | Static checks, migration scripts and manual E2E | Release confidence |
| Migration from every supported released schema | Some migration checks only | Upgrade support |
| Security hardening: lockout/rate limits, session policy, export-folder security, SBOM, threat model, independent penetration test | Not complete | Commercial production |
| Support operations: helpdesk, remote consent, incident response, status/maintenance process, spare-terminal plan | Model documented; staffing/tooling pending | Paid pilot / production |
| Local Google Drive export acceptance | Transaction outbox and full all-module snapshots verified locally; buyer folder, privacy approval and downstream consumer not accepted | Paid pilot if export is in scope |
| Data-migration toolkit and validated CSV importers | Templates and manual/supervised migration only | First real data load |
| Legal/commercial pack: EULA, DPA, SLA, limitation of liability, data residency/subprocessors, insurance | Draft guidance only; counsel sign-off pending | Signed contract |
| GST/SAC/TDS/e-invoice/MSME review | Guidance exists; CA sign-off pending | Invoicing a buyer |
| Claims register and customer-facing limitations | Documents exist; must be refreshed every release | Every sale |

### P1 — clinical and quality evidence

- Critical-value limits, notification, read-back and escalation evidence
- IQC control lots, Levey–Jennings review, acceptance rules and out-of-control investigation
- EQA/PT plans, results, review and corrective action
- Equipment inventory, calibration, maintenance, qualification and temperature logs
- Reagent/consumable lots and verification
- Personnel qualifications, training, competency and authorization matrix
- Controlled SOP/document versions and acknowledgements
- Nonconforming work, CAPA, complaints, risk register and management review
- Internal audit and quality-indicator dashboards
- Method validation, measurement uncertainty and reference-interval studies
- Configurable retention, legal hold and disposal workflows
- Barcode/accession labels, chain of custody and collection manifests
- Tamper-evident audit export and periodic review
- Computer-system-validation pack for regulated buyers

### P2 — Future integrations (not in current scope)

Hosted monitoring and online sync were removed. Future work may add a controlled downstream CSV
consumer, but it must not become a write path or a substitute for terminal backups. Current scope does
not include a hosted dashboard, per-device sync tokens, cloud tenant administration or SaaS billing.

### P3 — ABDM production

- HFR facility and HIP onboarding
- Sandbox credentials and client authentication
- Consent artefact exchange and purpose validation
- Current NRCeS validator integration
- Transport, retry, reconciliation and error handling
- Audit/redaction, monitoring and support runbook
- Production approval and buyer acceptance

### P4 — product depth

Hospital and pharmacy depth (bed board, insurance/TPA, nursing/medication, procurement/GRN,
controlled-drug registers, chain transfers), analyser/PACS, accounting integration, patient portal,
appointments, advanced report templates and other roadmap items remain future work.

## 4. Commercial readiness

| Area | Status | What is still needed |
| --- | --- | --- |
| Pricing and offer structure | Drafted | Confirm after P0 scoping and support costs |
| Pilot conversion and payment milestones | Drafted | Counsel/CA review and signed terms |
| Proposal and sales collateral | Available | Refresh against every release |
| Buyer due-diligence pack | Available | Keep evidence and limitations current |
| EULA/DPA/SLA/limitation of liability | Not signed | Legal review and customer negotiation |
| Data ownership, export and deletion terms | Draft guidance | Include in contract/DPA |
| GST/SAC/TDS/e-invoice/MSME | Guidance | CA review and registration confirmation |
| Licence operations and device transfer | Portal code exists; DPAPI storage and hardware binding implemented | Hosted/hardened portal, backend enforcement, clean-machine acceptance |
| Support and incident model | Documented | Staffing, tooling, response evidence and SLA approval |
| Insurance | Not decided | Commercial decision |
| Hosted monitoring commercial tier | Not in current product | Local Google Drive CSV export only |

Do not present the current price card as a production GA price. It is effective only after the relevant
P0 gates are closed and the buyer accepts the written limitations.

## 5. Release decision

| Release type | Decision |
| --- | --- |
| Internal demo | Allowed |
| Supervised design-partner pilot | Conditional on P0, written limitations, synthetic/approved data and rollback plan |
| Paid production deployment | Not allowed yet |
| Hosted multi-tenant SaaS | Not allowed yet |
| ABDM production claims | Not allowed yet |
| NABL/ISO certification claims | Not allowed |

## 6. Minimum exit criteria for commercial production

1. Clean-machine install, upgrade and uninstall accepted.
2. Clean-machine encrypted restore accepted with recorded counts.
3. Key export/import and rotation available; Windows-profile loss is survivable.
4. Unattended offsite backups with alerting and documented RPO/RTO.
5. Public-CA code signing or an explicitly accepted local-root enterprise deployment.
6. Backend entitlement enforcement outside the UI; DPAPI storage, hardware binding and clock checks are
   implemented and clean-machine tested.
7. Automated regression/E2E/load tests and migration coverage from supported releases.
8. Security hardening and an independent penetration test with no unresolved critical/high findings.
9. Support/incident/rollback operations staffed and tested.
10. EULA/DPA/SLA, GST/CA review, data-residency and claims register signed off.

## 7. Recommended sequence

1. Close clean-machine install/upgrade/restore acceptance and key recovery.
2. Add unattended/offsite backup evidence and RPO/RTO.
3. Harden security/testing and complete the support/incident runbooks.
4. Move licence storage/entitlement enforcement out of browser storage and harden the portal.
5. Validate the local Google Drive transaction outbox and full all-module snapshot with the buyer's
   folder, access policy and downstream consumer.
6. Complete legal/commercial pack and pilot-to-production acceptance.

Do not publish dates until each item has an owner, acceptance test and evidence.

## 8. Update rule

Update this document on every release or material change with:

- version, tag, schema and date;
- newly completed items;
- changed priority or ownership;
- new limitations or commercial claims;
- evidence links (build, signature, restore, security, acceptance).
