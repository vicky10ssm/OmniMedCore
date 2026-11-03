# Product capabilities and status

Status meanings: **Ready**, **Pilot**, **Partial**, **Not available**, **External**.

## Front desk and patient records

| Capability | Status | Buyer-facing description |
| --- | --- | --- |
| Patient registration | Ready | Name, phone, age, gender, address, DOB and ID-proof fields |
| Phone/name search | Ready | Fast lookup across patient records |
| ABHA capture | Pilot | Optional ABHA number/address; local format check only, not remote verification |
| Patient consent | Pilot | Purpose-specific ABDM-sharing consent with grant/revoke evidence |
| Duplicate-patient merge | Not available | Do not promise automatic merge |
| Appointment calendar | Not available | A bill may carry a date; there is no full scheduling module |
| Patient portal / WhatsApp messages | Not available | No patient messaging or app |

## Billing and money

| Capability | Status | Description |
| --- | --- | --- |
| Test catalog and packages | Ready | Price, GST rate, SAC, department, specimen, container, method, LOINC fields |
| GST invoice | Ready | Per-line GST, CGST/SGST split, taxable value, round-off, GSTIN |
| Invoice discounts | Ready | Line-level discount reducing taxable value |
| Payments | Ready | Cash, UPI, card, bank, credit; partial payments create dues |
| Dues register | Ready | Outstanding bills, ageing/follow-up views and payment collection |
| Invoice cancellation | Ready | Reasoned cancellation, history retained |
| Invoice numbering | Ready | Tenant/terminal-aware block allocation and optional device code |
| A4 and 80 mm invoice print | Ready | Browser print layouts |
| PDF download | Ready/Pilot | Browser-generated document output; verify printer/browser on buyer hardware |
| Doctor/referral commissions | Not available | No Commissions tab/module, no commission rules in Doctors, and no new accrual/payouts; legacy rows are retained but not displayed |
| Expenses | Ready | Categories, payment mode, bill number, notes, monthly categories |
| Financial dashboard | Ready | Collection, dues, revenue, expenses and profit on local data |
| CSV export | Ready | Formula-injection guarded invoice export; confirm exact export list in demo |
| Accounting/Tally integration | Not available | No Tally import/export or ledger posting |
| Payroll | Not available | Salary can only be logged manually as an expense |

## Pathology and X-ray reporting

| Capability | Status | Description |
| --- | --- | --- |
| Test parameter templates | Ready | Multiple parameters, units, references, numeric limits, LOINC field |
| Starter parameter sets | Ready | CBC 14, LFT 11, KFT 9, Lipid 8, Urine 18 |
| Per-report parameter selection | Ready | Include/exclude each parameter; excluded rows retained for draft reopening |
| Per-report unit/reference editing | Ready | Snapshot values for that patient; printer shows them |
| Abnormal flags | Ready | Low/High from numeric limits |
| Draft/verify workflow | Ready | Draft and verified statuses; release requires authority |
| Report amendments | Ready | Issued results cannot return to draft; amendment reason and prior revision retained |
| Sample release gate | Ready | Pathology release requires an accepted linked sample |
| Report letterhead printing | Ready | Lab identity, patient/doctor, sample ID, authorizer, version |
| Critical-value notification | Not available | No critical-limit workflow/read-back log yet |
| Auto-verification/middleware | Not available | No automated release rules |
| Analyzer integration | Not available | No Mindray/Sysmex/driver interfaces |
| X-ray image storage/PACS/DICOM | Not available | X-ray is a text-result billing/report workflow only |
| QR/barcode report verification | Not available | No hosted verification URL |
| Calculated/formula parameters | Not available | Parameters are entered, not derived |

## Samples

| Capability | Status | Description |
| --- | --- | --- |
| Automatic sample on pathology bill | Ready | Accession like `INV-A-00001-S01`, linked to patient/order |
| Sample states | Ready | Expected → collected → received → accepted/rejected → disposed |
| Disposal result gate | Ready | Accepted samples can be disposed only after every linked test has complete entered results; empty/partial drafts are blocked |
| Rejection evidence | Ready | Reason, user and timestamp; linked pending order marked rejected |
| Audit trail | Ready | Sample transitions recorded in application audit log |
| Accession label/barcode print | Not available | Accession text is visible but no label/barcode workflow |
| Transport temperature logging | Not available | No cold-chain logger integration |
| Chain-of-custody/aliquots | Not available | No full specimen transfer tree |

## Hospital inpatient admissions

| Capability | Status | Description |
| --- | --- | --- |
| Admit a registered patient | Ready | Admission number, admitted date/time, ward, bed, treating doctor and reason |
| Admission list | Ready | Active/discharged filters, patient identifiers and ward/bed |
| Discharge | Ready | Required diagnosis, discharge summary, discharge time and status |
| Cancel admission | Ready | Admin-only cancellation with audit event |
| Admission clinical record | Pilot | Basic admission/discharge fields, not a full hospital EHR |
| Generic IPD service billing | Pilot | Admission service sheet with room/nursing/procedure/consultation items, quantity, GST, payments, balance and A4 print |
| Hospital service catalogue | Ready | Tenant-defined service name/category/price/GST/SAC; usable only in Hospital/licensed editions |
| Bed/ward management | Not available | Ward/bed are free-text fields; no bed board, occupancy planning or transfers |
| Nursing notes, medication chart, orders | Not available | Not a hospital information system |
| Package/day-wise auto charges, advances | Not available | Charges are added manually; no package engine, deposit/advance ledger or automatic daily posting |
| Insurance/TPA/cashless workflow | Not available | No claims or authorisation module |

## Pharmacy

| Capability | Status | Description |
| --- | --- | --- |
| Medicine master | Ready | Name, code, form, strength, manufacturer, HSN, GST, MRP, sale price, reorder level |
| Batch and expiry inventory | Ready | Multiple batches per medicine, quantity, purchase price and supplier |
| Receive stock | Ready | Add a new batch with expiry and quantity |
| Inventory dashboard | Ready | Stock totals, nearest expiry, low-stock and expiry-soon indicators |
| Dispensing sale | Ready | Patient optional, batch selection, quantity/rate, GST split, cash/UPI/card/bank |
| Stock deduction | Ready | Sale is transactional and reduces the selected batch |
| Pharmacy receipt | Ready | A4/80 mm receipt with batch details and GST |
| Sale cancellation | Ready | Admin-only; returns stock and records audit reason |
| Prescription linkage | Partial | A patient can be linked; there is no e-prescription workflow |
| Purchase orders/supplier bills | Not available | Stock is received directly; no PO, GRN or payables |
| Supplier returns/stock adjustments | Not available | No returns, wastage or stock-audit workflow |
| Chain-pharmacy transfers | Not available | No warehouse or inter-store transfer |
| Narcotics/scheduled-drug register | Not available | Must use the buyer’s controlled-drug process |
| Drug interaction/allergy checks | Not available | No clinical decision support |
| Barcode/QR dispensing | Not available | Batch is selected manually |
| Expiry auto-quarantine | Not available | Expired batches are excluded from sale options but not formally quarantined |

## Users, evidence and controls

| Capability | Status | Description |
| --- | --- | --- |
| Admin/operator roles | Ready | Admins see Dashboard and profitability summaries; terminal operators can add/view expenses, land on Expenses, and cannot access Dashboard or the Expenses “This month at a glance” profit card |
| Report-release authority | Ready | Separate `can_authorize_reports` user permission |
| Password hashing | Ready | PBKDF2-SHA256 |
| TOTP 2FA | Ready | RFC 6238 with replay protection and hashed recovery codes |
| Audit log | Pilot | Login, patient, consent, sample, report, invoice, payment, settings, ABDM drafts |
| Compliance evidence page | Ready | Admin-only recent evidence and control summary |
| Clinic module visibility | Ready | Enable Diagnostics, Pharmacy and/or Hospital sections per clinic; hidden routes redirect to Dashboard |
| Licensed editions | Ready | Diagnostics, Pharmacy, Hospital, Complete or Custom; effective modules are licensed ∩ clinic-enabled |
| Offline licence activation | Pilot | ECDSA P-256 signed file bound to tenant and device; validation is local and requires no network |
| Licence grace/read-only | Pilot | 30-day grace after expiry; after grace existing records, print and export remain available while new writes are blocked in the UI |
| Vendor licence portal | Pilot | Local/self-hosted admin portal issues, downloads, renews and revokes signed licence files; public hosting and customer self-service are not deployed |
| OS-secure licence storage | Not available | Current development build uses `localStorage`; packaged Tauri must use protected storage and backend enforcement |
| Clinic logo | Ready | PNG/JPG/WebP up to 500 KB; shown in sidebar and printed invoice/report/pharmacy letterheads |
| Multi-vertical branding | Ready | MediCore umbrella brand with tenant name/logo overrides |
| Shared patient identity | Ready | Same patient used for OPD, diagnostics, pharmacy and admissions |
| Read-only monitoring build | Pilot | Separate bundle and read-only `DataSource`; central dashboard code exists but is not deployed |
| Encrypted database | Partial | AES-GCM envelope code exists; end-user enable/change/recovery setup is not exposed |
| Automated backup/restore | Not available | **Release blocker** |
| Retention/legal hold | Not available | No configurable retention enforcement |
| Digital signature | Not available | Do not call a signature image a digital signature |

## ABDM and interoperability

| Capability | Status | Description |
| --- | --- | --- |
| ABHA field and format validation | Pilot | No verification with ABDM |
| Consent record | Pilot | Purpose, version, actor, expiry, revocation |
| FHIR R4 bundle draft | Pilot | NRCeS ABDM IG v6.5.0 profile URLs, DiagnosticReportRecord/Lab, Observation, Specimen |
| Local structural validation | Pilot | Composition first, reference resolution, required report fields |
| Local ABDM outbox | Pilot | Draft JSON persisted and downloadable |
| Live ABDM APIs/HIP/HFR | Not available | No gateway, consent artefact exchange, authentication or transport |
| FHIR external validator | Not available | No official validator run inside product |
| InvoiceRecord FHIR | Not available | Only diagnostic-report draft is built |

## Multi-centre and deployment

| Capability | Status | Description |
| --- | --- | --- |
| Tenant-scoped schema | Ready | Tenant ID and static scope checks across business tables |
| Tenant management UI | Not available | No onboarding/switching/support console |
| Multi-terminal offline billing | Partial | Data model ready; a simple append-only sync queue and push loop exist, but multi-terminal conflict coordination is not implemented |
| Append-only sync queue | Pilot | Local `sync_queue` captures invoice/report/admission snapshots; `sync_ack` records central ACKs |
| Desktop background sync | Pilot | Polls endpoint every 30 seconds while the Tauri app is open; not a Windows service when closed |
| Read-only "monitor from anywhere" | Pilot | Next.js/PostgreSQL dashboard and sync receiver code exist; hosting, per-device tokens, SSO and operational hardening are pending |
| Tauri Windows installer | Partial | Native SQLite, single-instance guard and NSIS/MSI installers build successfully; installer signing, clean-machine acceptance and distribution are still pending |
| Browser/PWA install | Pilot | Development/local browser storage only; not recommended as primary data store |
| Cloud backup | Not available | Not implemented |

## The one-table summary for a first call

**Ready today:** billing, GST, dues, payments, expenses, patient records, test catalog,
parameter-based reporting, sample chain, report amendments, hospital admissions/discharge, generic
hospital service/IPD billing, pharmacy batch inventory/dispensing/receipts, audit, 2FA, A4/thermal
printing, configurable verticals and signed edition gating.

**Pilot today:** local monitor build, ABHA/consent, ABDM JSON draft, compliance evidence dashboard,
hospital/pharmacy read-only monitoring, tenant/device-bound licence activation, grace/read-only mode,
the vendor licence portal, the local append-only sync queue and the Next.js central dashboard code.

**Not ready:** signed/distributed Windows installer, deployed and hardened cloud sync/hosted monitoring,
per-device sync tokens, public hosted licence portal/customer self-service, OS-secure licence storage,
backups, live ABDM, QMS/QC/equipment/personnel modules, analyzer/PACS integration, critical-value
workflow, full HIS features (insurance/TPA, nursing, medication charts, package/advance billing),
advanced pharmacy procurement/controlled-drug workflows.
