# Buyer due diligence pack

Use this as the controlled answer set for procurement, IT, legal and clinical reviewers. Re-date the
evidence when the product changes.

## A. Company and commercial documents

- [ ] Legal entity name, address, GSTIN and authorised signatory
- [ ] Product name/version/schema version
- [ ] Proposal with scope, exclusions and payment milestones
- [ ] Price validity and tax treatment
- [ ] Support/SLA offer
- [ ] Licence terms/EULA
- [ ] Data-processing agreement template
- [ ] Subprocessor list (including hosting/backup/support tools)
- [ ] Insurance details, if held
- [ ] References/pilot evidence, when available
- [ ] Conflict-of-interest/impartiality statement where relevant

Do not invent certifications, references or insurance.

## B. Product truth table

| Question | Answer |
| --- | --- |
| Is the Windows `.exe` available? | Not yet; Tauri packaging is a release gate |
| Where is data stored today? | Development build uses IndexedDB; production target is local SQLite |
| Can it bill without internet? | The terminal design is offline-first; packaged offline acceptance still required |
| Can I monitor remotely today? | No hosted sync backend; monitor build is local read-only |
| Can it send to ABDM? | Not yet; only offline FHIR R4 draft generation |
| Is it NABL/ISO certified? | No; it supports evidence requirements and documents gaps |
| Are backups automatic? | No; backup/restore must be delivered before real pilot data |
| Is data encrypted at rest today? | Encryption foundation exists, but the enable/recovery workflow is incomplete |
| Is there an analyzer/PACS integration? | No |
| Is it multi-tenant SaaS today? | Tenant-scoped schema exists; service/platform is not built |
| Are calculations audited? | Money is integer paise; diagnostic GST and pharmacy GST logic are exercised in checks |
| Can data be exported? | CSV export exists for selected records; full exit procedure to be agreed |
| Does it support hospital inpatients? | Yes, basic admission/ward/bed/discharge and generic IPD service charges/payments/bill print; not a full HIS, insurance/TPA, nursing or package/advance billing |
| Does it support pharmacy? | Yes, medicine/batch/expiry stock and local dispensing/receipts; not chain procurement or controlled-drug registers |
| Are modules configurable? | Yes: signed edition first, then per-tenant visibility in Settings → Modules & logo |
| How is the software licensed? | Diagnostics/Pharmacy/Hospital/Complete/Custom editions, signed offline ECDSA P-256 licence bound to tenant and device |
| What happens when the licence expires? | 30-day grace remains fully usable; after grace existing records remain readable/printable/exportable while new writes are blocked |
| Is the licence portal hosted? | No. A vendor admin portal is implemented and can run locally/self-hosted; public hosting, TLS, per-user auth/MFA and hardening remain release gates |
| Where is the licence stored now? | Browser `localStorage` in development; OS-secure storage and backend enforcement are required for the packaged release |

## C. Security questionnaire starter answers

**Authentication:** per-user credentials; PBKDF2-SHA256 hashes; optional TOTP 2FA; admin/operator roles
plus report-release permission.

**Encryption:** the packaged desktop database uses SQLCipher 4.20 with the key in Windows Credential
Manager. Key export/import, rotation and cross-machine recovery are incomplete. Browser IndexedDB is
not covered by desktop SQLCipher.

**Audit:** application-level actor/action/entity/timestamp for login, patient, consent, sample, report,
invoice, payment, settings and ABDM draft actions. No tamper-evident external log service yet.

**Backups:** encrypted local daily/weekly/monthly snapshots, optional USB/OneDrive copy, manual backup
and validated restore are implemented. Key recovery, unattended scheduling and clean-machine restore
acceptance remain mandatory before production use.

**Monitoring:** a read-only sync receiver/dashboard codebase exists, but it is not hosted or hardened;
per-device tokens, SSO/MFA and operational backups are pending.

**Data location:** local at the terminal today. Future cloud region/subprocessors must be documented
before hosting.

**Incident response:** policy and contact must be completed before pilot. Do not claim 24×7 response.

**Penetration testing:** not performed. Do not claim an independent security assessment.

**Vulnerability management:** dependency updates are a release activity; a formal SLA is not yet in
place.

## D. Clinical/compliance questionnaire

**Does it enforce sample acceptance before release?**
Yes for pathology orders with a linked sample; result release is blocked until accepted.

**Does it preserve amended reports?**
Yes. Draft/verified/amended snapshots are append-only and amendment requires a reason. The printed
report shows version and authorizer.

**Does it record critical-value notification?**
No. This remains a gap.

**Does it manage IQC/EQA?**
No. External QC records are not yet a module.

**Does it manage equipment/reagents/personnel competency/QMS?**
No. These are on the roadmap and must not be represented as included.

**Does it provide NABL evidence export?**
There is an audit evidence screen and compliance matrix, but no complete assessment pack/export.

**Who authorises reports?**
A user with `can_authorize_reports`; admin/operator role alone does not automatically grant authority
for newly created users.

**How are reference intervals handled?**
Starter templates are supplied and must be validated by the laboratory for its methods/population.
Units and intervals can be edited per report and retained as snapshots.

## E. Implementation and migration checklist

- [ ] Signed scope and change-control process
- [ ] Source data inventory and data owner named
- [ ] Migration templates and validation rules
- [ ] Dry-run migration and reconciliation
- [ ] Historical records scope decision
- [ ] Hardware/printer/network acceptance
- [ ] Backup media and retention ownership
- [ ] Restore test evidence
- [ ] User/role/report-authority matrix
- [ ] Training and competency sign-off
- [ ] Parallel-run plan and rollback
- [ ] Acceptance metrics

## F. Legal and procurement questions

Prepare counsel-reviewed answers for:

1. Who owns patient data and derived exports?
2. What is the vendor’s role under India’s DPDP Act 2023?
3. Where may data be stored/processed?
4. How is support access controlled and logged?
5. What happens on breach, and within what timeframe?
6. What are RPO/RTO and backup responsibilities?
7. How are deletions and legal holds handled?
8. What happens on non-payment/termination?
9. What is the liability cap and warranty?
10. Which open-source licences apply and what notices are required?
11. Is source-code escrow available/required?
12. How are changes and downtime communicated?

Do not answer these with generic SaaS language if the service is not hosted. Current deployment is
local and support access requires an agreed process.

## G. Procurement red flags to resolve before signing

- Buyer expects remote monitoring, backups or ABDM send on day one.
- Buyer treats “supports NABL” as “NABL certified”.
- Scope includes analyser/PACS/WhatsApp/portal without a separate plan.
- Multiple centres/live consolidation are assumed.
- No acceptance criteria or data owner.
- No backup/restore test.
- Unlimited customisation for a fixed fee.
- Buyer refuses a supervised pilot but demands production SLA.
- Security review requires certifications the vendor does not hold.
- Real patient data is loaded before release gates and DPDP review.

## H. Documents to send in a due-diligence bundle

1. Buyer overview
2. Capability/limitations matrix
3. Deployment readiness and release gates
4. Security/privacy/compliance summary
5. Pilot scope and acceptance template
6. Support/SLA offer
7. DPA and licence templates (counsel-reviewed)
8. Data-migration plan/templates
9. Known-gaps and roadmap
10. Synthetic demo evidence

## I. Evidence log

| Claim | Evidence | Date/version | Owner |
| --- | --- | --- | --- |
| Offline billing works in terminal build | Demo/test record (synthetic) | | |
| Sample gate blocks release | Automated/manual test evidence | | |
| Report amendment preserves history | Test evidence | | |
| Tenant queries scoped | `npm run check:scope` output | | |
| Typechecks/migrations pass | `npm run check` output | | |
| ABDM draft valid structurally | Local validation output | | |

Keep this log current. A buyer is entitled to see evidence behind contractual claims.
