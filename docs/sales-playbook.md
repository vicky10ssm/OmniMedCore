# Sales playbook

## Ideal customer profile

MediCore is sold as three verticals on one platform. Qualify which modules the buyer actually needs.

**Diagnostics:** owner-operated independent diagnostic centre in India with 1–3 billing terminals,
manual/basic reporting, pathology ± X-ray, GST billing, doctor referrals and frustration with Excel or
rigid software.

**Pharmacy:** single-store or small multi-counter pharmacy needing batch/expiry stock, local dispensing,
GST receipts and optional patient linkage. Not a chain ERP.

**Hospital:** small hospital/nursing home with OPD billing, a small inpatient ward and discharge
summaries, possibly with in-house diagnostics/pharmacy. Not a large HIS or insurance-claims suite.

**Secondary:** a diagnostic centre adding a pharmacy or a few inpatient beds, or a clinic consolidating
OPD, diagnostics and pharmacy on one patient identity.

**Not yet:** large hospitals, chain pharmacies requiring central procurement/controlled-drug registers,
public tenders, multi-site real-time operations, or buyers demanding live ABDM/accredited QMS on day one.

## Buyer roles

| Role | What they care about | Who usually decides |
| --- | --- | --- |
| Owner/partner | Revenue leak, dues, control, cost | Economic buyer |
| Centre manager | Daily workflow, staff adoption | Champion |
| Pathologist | Report quality, amendments, release control | Clinical approver |
| Lab technician | Sample workflow, result entry | User acceptance |
| Accountant/CA | GST, reconciliation, exports | Financial approver |
| IT/consultant | Installation, backup, security | Technical gatekeeper |
| Quality manager | NABL evidence, audit trail | Compliance gatekeeper |

## Discovery questions

### Business
1. How many centres and billing terminals are in scope?
2. What is the average daily bill volume and peak hour?
3. Which tests and packages generate most revenue?
4. Are X-ray and pathology billed together?
5. How are referral relationships and doctor contacts tracked today? (MediCore intentionally does not track referral commissions.)
6. How much outstanding credit is on the books, and how is it followed up?
7. What happens today when internet or the billing PC fails?

### Clinical operations
8. Who enters results, who verifies and who is allowed to amend?
9. How are samples identified and tracked after collection?
10. How are rejected samples documented?
11. Are critical values reported to doctors? How is read-back recorded?
12. Is the lab NABL-accredited, applying, or not pursuing accreditation?
13. Which QC/EQA activities are performed today?
14. Do you use analysers, PACS or outside referral labs?

### Hospital and pharmacy
15. How many inpatient beds and admissions per month?
16. How are ward/bed allocation and discharge summaries handled today?
17. Do you need full IPD/HIS package/advance billing, nursing notes, medication charts or insurance claims? (Generic hospital service billing exists; these deeper workflows are exclusions.)
18. How many pharmacy counters and medicine SKUs?
19. How do you track batches, expiry and stock today?
20. Do you need purchase orders, supplier returns, narcotics registers or chain-store transfers?
21. Must pharmacy sales link to a patient/doctor/prescription?

### Technology and migration
22. What software/Excel files are used today?
23. Which data must be migrated: patients, rate list, doctors, open dues, medicines, batches, history?
24. What Windows versions, printers and network are present?
25. Who manages backups and antivirus?
26. Do you need remote access/monitoring? From where?
27. What ABDM/HFR/HIP work has already been started?

### Commercial and decision
28. Which vertical modules are in scope now versus later?
29. What is the budget range and buying process?
30. Who signs, and what proof do they require?
31. What would make the pilot a success?
32. What is the preferred go-live date?
33. Are procurement/security/legal reviews required?

## Qualification scorecard

Score 0–2 each; proceed with caution below 12/20.

| Criterion | Weight |
| --- | ---: |
| Access to owner/decision maker | 2 |
| Clear painful workflow | 2 |
| Willing to pilot with real acceptance criteria | 2 |
| Can provide clean master data | 2 |
| Has someone accountable for migration/training | 2 |
| Accepts current product limitations | 2 |
| Reasonable terminal/centre count | 2 |
| Can run on supported Windows hardware | 2 |
| Pays for pilot/implementation | 2 |
| Realistic timeline | 2 |

## Positioning statements

### 30-second introduction

> MediCore is an offline-first billing and reporting system for small diagnostic centres. It keeps GST
> billing, dues, sample traceability and pathology report amendments working on the centre’s own
> terminal. It is being offered initially as a supervised pilot, with a local Google Drive CSV
> outbox, live ABDM exchange and advanced quality modules on a documented roadmap rather than claimed
> as finished.

### Value by buyer

- **Diagnostic centre owner:** fewer revenue leaks, visible dues, and auditable expense records.
- **Pharmacy owner:** batch/expiry visibility, local dispensing, stock deduction and GST receipts.
- **Small hospital owner:** OPD billing plus admissions, ward/bed and discharge summary on one patient record.
- **Manager:** one consistent patient and billing workflow across diagnostics, pharmacy and inpatients.
- **Pathologist:** selectable parameters, controlled amendments and release authority.
- **Pharmacist:** batch selection, stock control and sale cancellation with reason.
- **CA:** GST invoices/receipts and exportable records with clear correction history.
- **Quality lead:** accession, actor, timestamp and amendment evidence, with known QMS gaps listed.

## Claims you may and may not make

| Area | Say this | Do not say |
| --- | --- | --- |
| Offline billing | “The terminal build is designed to keep billing offline.” | “Guaranteed zero downtime.” |
| Data sharing | “A local Google Drive CSV outbox exports masked transaction summaries; it is not a live monitor or import path.” | “Monitor from anywhere today” or “real-time cloud sync.” |
| NABL/ISO | “Provides evidence foundations and a documented gap matrix.” | “NABL/ISO certified software.” |
| ABDM | “Generates offline ABDM FHIR R4 draft documents.” | “ABDM integrated/sends to ABHA.” |
| Encryption | “Desktop database and local backups are SQLCipher-encrypted with the key in Windows Credential Manager; key recovery is still a gate.” | “All data is encrypted” or “key recovery is complete.” |
| Backups | “Encrypted local backup and validated restore exist; unattended/offsite scheduling and key recovery are still gates.” | “Backups are fully unattended and disaster-proof.” |
| Desktop | “Signed Windows installers are available with a local root certificate; public-CA trust and clean-machine acceptance are pending.” | “Publicly trusted installer with SmartScreen reputation.” |
| Licensing | “Diagnostics, Pharmacy, Hospital, Complete and Custom editions are enforced by a signed tenant/hardware licence with DPAPI storage and clock-rollback checks, plus 30-day grace and read-only access after expiry.” | “Perpetual public cloud subscription is live” or “the licence portal is hosted and hardened for public use.” |
| Referral commissions | “MediCore keeps a doctor directory but does not track or pay referral commissions.” | “Tracks doctor commissions/payouts.” Commission visibility can create compliance and ethics issues. |
| Hospital IPD | “Generic hospital service/IPD charges, payments and bill print are included; full HIS, insurance/TPA, nursing and package/advance billing are not.” | “Full IPD/HIS or insurance claims.” |
| Analyzer/PACS | “Not available.” | “Integrates with any analyser.” |
| Support | “Pilot support scope is agreed in writing.” | “24×7 support” unless contracted. |
| Certification | “Software supports a laboratory’s processes.” | “Compliant/certified.” |

## Objection handling

### “Is this only laboratory software?”
> No. The same platform has a pharmacy module for batch/expiry inventory and dispensing, and a hospital
> admissions module for inpatients and discharge summaries. Modules are configurable per buyer, so a
> standalone pharmacy does not see diagnostic screens and a diagnostic centre does not need admissions.

### “Can I buy only diagnostics, only pharmacy or only the hospital module?”
> Yes in the commercial model. One installer supports Diagnostics, Pharmacy, Hospital, Complete and
> Custom editions. A signed licence activates the edition and terminal; the clinic can then hide any
> licensed module it does not use. The current portal is a vendor-run admin portal, not a public
> self-service store. Public-CA installer trust, clean-machine acceptance and backend entitlement
> enforcement remain release gates; Windows DPAPI storage and hardware binding are implemented.

### “Can it run a full hospital or pharmacy chain?”
> Not as a full HIS or chain ERP. It covers small-hospital admission/discharge and generic inpatient
> service billing (room, nursing, procedure, consultation, consumables), plus single-store pharmacy
> inventory and dispensing. Nursing charts, doctor orders, insurance/TPA, packages/advances, procurement,
> narcotics registers and multi-store transfers are separate roadmap/partner scopes.

### “Is it NABL certified?”
> NABL accredits laboratories, not billing software. MediCore provides sample, report, amendment and
> audit evidence that can support your NABL processes. The full QMS/QC/EQA scope and your laboratory
> procedures remain the laboratory’s responsibility; we provide a written gap matrix.

### “Can I access it from anywhere?”
> The product is offline-first. A local read-only monitor build exists on the same machine, and an
> optional local Google Drive CSV outbox can hand masked transaction summaries to an external process.
> There is no hosted remote monitor or live sync in the current product; do not sell one.

### “Does it integrate with ABDM?”
> It prepares an offline ABDM FHIR R4 draft using the current public implementation guide. It does not
> yet transmit to ABDM. Sandbox integration and HFR/HIP onboarding are a separate release gate.

### “Why not use Excel?”
> Excel can calculate a bill, but it does not protect invoice numbers across terminals, enforce sample
> release gates, retain amendment history or produce a reliable audit trail.

### “Can it run my analyser/PACS?”
> Not at present. That is a specialist integration and would be scoped separately or integrated through
> a partner.

### “What if the computer fails?”
> Encrypted local backup and validated restore are implemented. Before live patient data we still require
> a clean-machine restore test, key-recovery plan, unattended/offsite backup decision and named backup
> ownership.

### “Will it work with my printer?”
> A4 and 80 mm print layouts exist, but the exact printer and Windows/browser combination must be
> accepted at the site during implementation.

### “Can you customise everything?”
> Configuration is included within scope. Custom development is separately estimated and must not
> destabilise the core workflow.

### “Why is it inexpensive?”
> The architecture uses local open-source components and avoids per-message services. You pay for the
> workflow, implementation and support—not an inflated cloud stack.

### “Can I get my data out?”
> CSV exports exist for agreed records; a full export/exit procedure must be part of the contract.
> Patient data belongs to the centre.

## Deal stages and exit criteria

| Stage | Exit criterion |
| --- | --- |
| 1. Qualified | Discovery completed; fit and limitations acknowledged |
| 2. Demo | Buyer validates priority workflows and agrees gaps |
| 3. Scoping | Written pilot scope, migration and acceptance criteria |
| 4. Commercial | Signed proposal, payment terms and responsibilities |
| 5. Readiness | Release gates for deployment completed |
| 6. Pilot | Installed, trained, parallel run, weekly review |
| 7. Acceptance | Success metrics met; defects triaged; limitations accepted |
| 8. Conversion | Annual licence/support signed or clean rollback |

## Outreach skeleton

Subject: **Offline GST billing + pathology reports for [Centre]**

> Hello [Name], I work on MediCore, an offline-first billing/reporting system for independent diagnostic
> centres. It is aimed at centres that want GST billing, dues and parameter-based
> pathology reports on their own terminal without relying on continuous internet.
>
> I am speaking with a small number of design-partner centres for a supervised pilot. It would help to
> understand your current billing/report workflow, number of terminals and whether sample traceability
> and report amendments are priorities. I will be explicit about what is ready today and what is still
> on the roadmap.
>
> Would a 20-minute discovery call be useful?

## Follow-up assets to send

1. `buyer-overview.pdf`
2. Capability/limitations one-pager
3. Security and compliance summary
4. Pilot scope and acceptance template
5. Two synthetic screenshots (billing + report) and one sample audit screen
6. Written exclusions and release gates acknowledgement
