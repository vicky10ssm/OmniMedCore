# Roadmap and known gaps

This roadmap is sequenced by commercial risk and buyer safety, not by what is easiest to demo. Dates
must be estimated after the pilot requirements are known.

## P0 — Must complete before real patient data

1. **Tauri Windows desktop build**
   - Local SQLite file, WebView2, installer, versioning
   - Installer signing decision
   - Upgrade/rollback tests on prior schema versions
2. **Backup and restore**
   - Encrypted scheduled/manual backup
   - Off-device target
   - Restore test and evidence
   - Retention policy
3. **Encryption setup/recovery workflow**
   - Enable encryption from Settings
   - Store/print recovery code safely
   - Change passphrase
   - Test relock/restart and wrong/recovery paths
4. **Production deployment runbook**
   - Supported hardware/printers
   - Remote support consent
   - Log redaction
   - Incident response
5. **Pilot acceptance pack**
   - Test scripts, known defects, rollback criteria
   - Buyer limitations acknowledgement
6. **Data migration toolkit**
   - Validated CSV importers/templates
   - Rejects/reconciliation report
   - Historical data scope decision
7. **Production licence operations**
   - OS-secure licence storage in the packaged app and backend entitlement enforcement
   - Hosted/hardened portal with TLS, per-user admin auth/MFA, backups, rate limits and audit
   - Renewal, replacement, revocation and clock-tamper runbooks
   - Buyer EULA/device-transfer/renewal terms

## Implemented vertical modules

The current build now includes:

- Configurable Diagnostics, Pharmacy and Hospital modules per tenant
- Signed Diagnostics, Pharmacy, Hospital, Complete and Custom editions with tenant/device binding,
  30-day grace and read-only after grace
- Hospital admission, ward/bed, treating doctor, discharge diagnosis and summary
- Generic hospital service catalogue, IPD service charges, payments/balance, audit and A4 bill print
- Pharmacy medicine master, batch/expiry inventory, stock receipt, dispensing, GST receipt and
  cancellation with stock return
- Shared patient identity across OPD billing, diagnostics, pharmacy and admissions
- Pharmacy/IPD cards on the dashboard
- MediCore branding with tenant name/logo

These modules are early-stage and must not be presented as a full HIS or chain-pharmacy ERP. The
licence portal is implemented as a vendor admin portal, not a hosted public subscription service.

## P1 — Clinical and quality evidence

1. Critical-value limits, notification, read-back and escalation evidence
2. IQC control lots/levels, Levey–Jennings data, acceptance rules and out-of-control investigation
3. EQA/PT plans, results, performance review and corrective action
4. Equipment inventory, IQ/OQ/PQ, calibration, maintenance, downtime and temperature logs
5. Reagent/consumable lots, expiry, storage and lot verification
6. Personnel qualifications, training, competency, CEPD and authorization matrix
7. Controlled documents/SOP versions and acknowledgements
8. Nonconforming work, CAPA, complaints, risk register and management review
9. Internal audit and quality-indicator dashboards
10. Method verification/validation, measurement uncertainty, comparability and reference-interval studies
11. Configurable retention, legal hold and disposal workflows
12. Barcode/accession labels, collection manifests, temperature and chain-of-custody records
13. Full report template and accreditation-scope controls
14. Tamper-evident audit export and periodic review evidence

## P2 — Hosted monitoring and sync

1. Cloud data model, migrations and tenant isolation
2. Terminal push outbox, idempotency, retries and conflict handling
3. Read-only monitor API with authenticated, minimum-necessary access
4. Hosted monitor deployment, monitoring, backups and deletion
5. Multi-terminal coordination and support tooling
6. Subscription/tenant administration if operating SaaS
7. Data-processing/subprocessor documentation and region strategy

## P3 — ABDM production

1. HFR facility and HIP onboarding
2. Sandbox credentials/client authentication
3. Consent artefact exchange and purpose validation
4. Current NRCeS validator integration
5. Transport, retry, reconciliation and error handling
6. Audit/redaction, monitoring and support runbook
7. Production approval and buyer acceptance

## P4 — Product depth

### Hospital
- Ward/bed board, transfers and occupancy
- Package/day-wise auto charges, advances/deposits, insurance/TPA and cashless workflows
- Nursing notes, medication charts, doctor rounds, orders and e-prescribing
- Admission-to-diagnostics/pharmacy ordering linkage
- Discharge summary templates and print/export

### Pharmacy
- Purchase orders, GRN, supplier invoices and payables
- Supplier returns, stock adjustments, wastage and physical stock audit
- Prescription/indent linkage, partial dispensing and refill tracking
- Controlled/narcotics registers and statutory schedules
- Barcode/QR batch selection and label printing
- Chain-store procurement and stock transfers
- Drug interaction/allergy checks only with validated clinical content

### Platform
- Analyzer interfaces (only with a viable partner and support model)
- PACS/DICOM/radiology workflow
- Patient messaging/WhatsApp (per-message cost)
- Online appointment/booking
- Multi-branch consolidation
- Accounting/Tally integration
- Patient merge/deduplication tool
- Calculated/formula parameters
- e-signature/DSC integration with legal review
- QR report verification with hosted URL
- Mobile-native entry/approval
- Partner/co-owner settlement
- Patient portal/consent self-service

## Known limitations table

| Limitation | Buyer impact | Mitigation before sale |
| --- | --- | --- |
| Local self-signed installer only | Client must install the local root; public CA trust pending | P0 public signing/acceptance |
| Browser-storage data today | Clearing cache risks data | P0 packaged SQLCipher release |
| Encrypted backup key recovery | Off-device restore depends on the Windows profile key | P0 key export/import + clean-machine test |
| No unattended backup schedule | Backups run only while the app is open | P0 Windows task/service |
| Monitor not cloud-connected | No remote viewing | P2 |
| No live ABDM | Cannot meet ABDM exchange requirement | P3 |
| No QMS/IQC/EQA | Not a complete NABL quality system | P1/partner |
| No analyser/PACS | Manual interfaces | P4/partner |
| No critical-value workflow | Clinical safety gap | P1 |
| No retention automation | Evidence lifecycle gap | P1 |
| No barcode labels | Manual accession handling | P1 |
| Two primary roles plus release permission | Limited role granularity | P1 |
| Static checks not a penetration test | Unknown security defects may exist | Independent review |
| No public-CA code signing | SmartScreen reputation still limited | P0/optional |
| No formal validation pack | Regulated buyers may reject | P0/P1 |
| Admission module is not a full HIS | Generic IPD service billing exists, but no nursing charts, orders, package/advance billing or insurance/TPA | P4/partner |
| Licence portal is not publicly hosted/hardened | No public self-service, online revocation or guaranteed activation uptime | P0 licence ops |
| Licence storage is browser-local today | Not OS-protected and UI gating is not a backend security boundary | P0 packaged enforcement |
| Pharmacy lacks procurement/controlled-drug/chain workflows | Not suitable for chain or regulated high-complexity pharmacy | P4/partner |
| Pharmacy stock is batch-level, not full inventory accounting | No purchase ledger or supplier payables | P4 |
| Admissions are free-text ward/bed | No bed board or occupancy control | P4 |

## What can be sold while roadmap items remain open

A **supervised pilot** can be sold only after P0 and with:

- Buyer acknowledgement of the exact limitations
- Synthetic data or a controlled real-data decision after DPDP review
- Weekly review and rollback plan
- Clear exclusions for monitoring/ABDM/QMS
- No uptime SLA that depends on unimplemented infrastructure

## Roadmap communication rule

Give sequence and dependencies, not optimistic dates. Example:

> The next release gate is the installed desktop application with tested backup/restore. Hosted
> monitoring follows only after terminal sync and tenant-isolated cloud storage are delivered. ABDM
> transport follows sandbox certification and HFR/HIP onboarding.

Never publish a date for a feature that has no owner, acceptance test and release gate.
