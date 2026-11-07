# Onboarding, migration and support

## Onboarding phases

### Phase 0 — Qualification and disclaimer

- Confirm fit against [buyer-overview.md](buyer-overview.md).
- Provide capability/limitations and release gates.
- Agree that hosted monitoring/online sync is not in scope; the local Google Drive CSV outbox, ABDM
  transport, QMS and backups are separate scopes.
- Identify the buyer champion, clinical approver and IT contact.

### Phase 1 — Discovery

Collect:

- Centre legal/display name, address, phone, GSTIN, logo
- Number of terminals, Windows versions, printers
- Users and role/report-authority matrix
- Test/package list with prices, GST (new catalogues default to 0%), department, specimen, container, method, LOINC. A 226-entry pathology/X-ray starter library, 358 pathology parameter templates and 27 combined health-check packages are installed automatically; review package/test prices and reference intervals before go-live.
- Doctor directory and contact details (no commission policy is configured)
- Report templates and reference intervals
- Hospital scope: wards/beds, admission numbering, discharge-summary format (if hospital enabled)
- Pharmacy scope: medicine list, HSN/GST, MRP/sale price, batches, expiry, reorder levels and suppliers
  (if pharmacy enabled)
- Numbering format and device codes
- Dues ageing and opening balances
- NABL/ABDM status and documents
- Data sources and migration expectations
- Peak volumes and downtime risks

Deliverable: signed configuration/data workbook and scope.

### Phase 2 — Readiness

- Release gates met for installer, backup/restore, encryption at rest, local CSV export, migration and
  support. Key export/import and clean-machine recovery remain explicit gates.
- Hardware/printers checked.
- Follow the [client installation runbook](../CLIENT_INSTALLATION_RUNBOOK.md).
- Test install on a non-production device.
- Buyer signs data-migration plan and acceptance criteria.

### Phase 3 — Configuration

- Lab identity, GSTIN, numbering, accreditation text if authorised
- Tests/packages/parameters/LOINC
- Doctors directory and contact details
- Users, roles, 2FA and report release authority
- Sample accession format
- Report header/footer and pathologist identity
- Google Drive CSV export folder and access policy, if in scope

### Phase 4 — Migration

See migration section below.

### Phase 5 — Training

| Audience | Topics |
| --- | --- |
| Reception/operator | Patient search, billing, payments, dues, printer, corrections |
| Lab technician | Sample register/collect/receive/accept/reject, result entry |
| Pathologist/authorizer | Review, release, amendments, history, ABDM draft |
| Hospital admission staff | Admit/discharge, ward/bed, diagnosis and summary |
| Pharmacist | Medicine master, batch receipt, expiry, dispensing, cancellation |
| Admin/owner | Users, settings, modules/logo, expenses, audit, backups |
| CA/accountant | GST invoice/pharmacy receipt checks, CSV export, cancellation evidence |

Training output: attendance record, quick-reference guide, competency sign-off for pilot users.

### Phase 6 — Parallel run

- Run OmniMed Core and existing process in parallel for an agreed period.
- Reconcile daily totals and weekly dues.
- Log every discrepancy with owner and resolution.
- Do not switch off the old system until acceptance.

### Phase 7 — Acceptance

- Review metrics from [demo-and-pilot.md](demo-and-pilot.md#success-metrics).
- Sign acceptance with open defects and limitations.
- Agree production rollout/commercial conversion.
- Archive pilot records and evidence.

## Data migration

### Migration principles

- Buyer owns and approves source data.
- Never use production data for development/demo.
- Take a backup/snapshot of source and target before migration.
- Migrate masters first, then open balances, then selected history.
- Reconcile counts and money totals both ways.
- Record rejected rows and reasons.
- Preserve old system read-only after cutover.

### Recommended order

1. Organisation/lab identity
2. Users/roles
3. Doctors
4. Test categories/tests/packages/parameters
5. Patients (minimum required fields)
6. Open dues/invoices/payments
7. Selected historical invoices only if required
8. Opening expense records if mutually agreed
9. Pharmacy medicines and non-expired batches, with stock quantities and sale prices
10. Active inpatient admissions or a defined cut-over plan for existing inpatients
11. Report templates/reference intervals validation by buyer

### Required templates (to be created before migration)

**Patients**

```text
name,phone,age,gender,dob,address,id_proof_type,id_proof_no,abha_id,notes
```

**Doctors**

```text
name,qualification,specialization,reg_no,phone,email,active
```

**Tests**

```text
code,name,category,price,gst_percent,sac,department,specimen_type,container_type,method,loinc
```

**Packages**

```text
package_name,price,gst_percent,test_codes
```

**Opening dues**

```text
invoice_no,invoice_date,patient_phone,patient_name,total,paid,balance,notes
```

**Pharmacy medicines**

```text
code,name,form,strength,manufacturer,hsn,gst_percent,mrp,sale_price,reorder_level
```

**Pharmacy opening stock**

```text
medicine_code,batch_no,expiry_date,quantity,purchase_price,supplier
```

**Active admissions**

```text
admission_no,patient_phone,patient_name,ward,bed,doctor_name,admitted_at,reason
```

CSV must be UTF-8 and validated for spreadsheet formulas before import. Import tooling is not yet
implemented; early migration is supervised/manual and must be quoted as effort. The full Google Drive
snapshot is an export-only view of live data, not an import template.

### Reconciliation evidence

- Source vs target patient count
- Test/package count and price comparison
- Doctor directory review; no commission configuration is exposed
- Opening dues total and count
- Sample migration: no historical samples required by default
- Report history: explicitly in/out of scope
- Proof of backup and dry-run restore

### Historical clinical records

Importing years of old reports is high-risk. Prefer retaining the old system read-only and importing
only what is needed to operate. Any historical import requires a separate validation plan and sign-off.

## Backup and restore

The current desktop build implements encrypted local snapshots and validated restore:

- Daily, weekly and monthly SQLCipher-encrypted snapshots (7/4/12 retention) while the app is open
- Optional second folder on USB/OneDrive
- Manual **Backup Now**
- Schema/integrity validation and a pre-restore safety copy
- Restore through **Settings → Device & sync → Backup & restore**

See [BACKUP_RESTORE.md](../BACKUP_RESTORE.md) and [ENCRYPTION.md](../ENCRYPTION.md).

Still required before a production pilot:

- Key export/import and rotation for cross-machine recovery
- Unattended Windows scheduled backups
- Clean-machine restore acceptance with real evidence
- Documented RPO/RTO agreed with the buyer
- Monthly restore test in the first pilot quarter
- Buyer/vendor ownership of backup media and evidence

The SQLCipher key is bound to the Windows Credential Manager profile. Encrypted backups cannot be
opened on another Windows user/machine without the matching key, and this release does not yet expose
key export/import. Protect the Windows profile and do not reset it as a troubleshooting step.

A backup that has never been restored is not evidence of recoverability.

## Support model

### Pilot support

- Named support contact and buyer champion
- Agreed hours (for example business hours only)
- Remote session with user consent
- Severity definitions and response targets
- Weekly defect review
- Emergency rollback guidance

### Suggested severity model

| Severity | Definition | Suggested response target |
| --- | --- | --- |
| S1 | Data loss, security incident, all billing stopped | Immediate acknowledgement; work continuously within agreed hours |
| S2 | Major workflow blocked; workaround difficult | Same business day |
| S3 | Limited functional defect with workaround | 2 business days |
| S4 | Question/configuration/request | 5 business days |

Targets are commitments only when written in the contract.

### Support boundaries

Included:

- Installation/configuration within scope
- Defect triage and fixes for supported functionality
- Guidance on documented workflows
- Backup/restore assistance
- Minor configuration changes within fair-use hours

Excluded unless contracted:

- Windows/hardware/printer/network repair
- Third-party antivirus/domain administration
- Custom reports/integrations
- Data entry
- NABL/ABDM consultancy
- Training beyond agreed days
- Support for browsers/hardware outside the supported matrix

### Remote support safety

- Obtain user consent for each session
- Avoid viewing unrelated patient data
- Redact screenshots/logs
- Use named support accounts
- Record who accessed what and when
- Never request a user password, TOTP secret, recovery code or encryption passphrase

## Exit and data return

On termination:

- Export agreed patient/billing/report data in a documented format.
- Provide record counts and checksum/evidence.
- Define a deletion date for any hosted copies (none by default) and the Google Drive outbox, and confirm deletion.
- Return buyer-owned hardware/data.
- License termination effects on locally installed software must be stated.
- Buyer retains ownership of its patient data.

## Onboarding checklist

- [ ] Discovery workbook completed
- [ ] Limitations acknowledged
- [ ] Release gates passed
- [ ] Client installation runbook completed
- [ ] Local root certificate installed and signed build verified
- [ ] SQLCipher encryption and Windows Credential Manager key verified
- [ ] Hardware/printers approved
- [ ] Users/roles/report authority approved
- [ ] Masters signed off
- [ ] Opening balances reconciled
- [ ] Training delivered and competency recorded
- [ ] Backup and restore tested; restore evidence recorded
- [ ] Local Google Drive CSV export configured and tested, if in scope
- [ ] Windows-profile/key recovery responsibility recorded
- [ ] Parallel run accepted
- [ ] Support contacts and hours confirmed
- [ ] Go-live/rollback decision recorded
