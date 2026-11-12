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
| Test catalog and packages | Ready | Price, editable GST rate (default 0%), SAC, department, specimen, container, method, LOINC fields |
| Starter test library | Ready | 229 entries: 186 pathology and 43 X-ray/radiography tests, including Absolute Eosinophil Count (AEC) and Malaria Parasite by Quantitative Buffy Coat (QBC); additive, idempotent seeding preserves custom, renamed and deleted tests |
| Starter parameter templates | Ready | 383 pathology parameters; every pathology test has at least one; panels and complex reports include CBC 20, LFT 11, KFT 9, Lipid 8, Urine 18, malaria subfields, VDRL/TPHA titres, histopathology sections and cytology findings; X-rays remain text-only |
| Starter combined packages | Ready | 27 seeded health-check packages (29 total), linking parameterized pathology tests and X-ray report tests; packages are price/name wrappers, items retain their own parameters |
| GST invoice | Ready | Per-line GST, CGST/SGST split, taxable value, round-off, GSTIN |
| Invoice discounts | Ready | Line-level discount reducing taxable value |
| Payments | Ready | Cash, UPI, card, bank, credit; partial payments create dues |
| Dues register | Ready | Outstanding bills, ageing/follow-up views and payment collection |
| Invoice amendment | Ready | Edit quantities, rates, discounts, doctor and notes, or add tests without changing the invoice number/date. Removing a line is allowed only while its linked sample is still expected and no result exists; totals cannot fall below collected payments. Amend is audit-logged |
| Invoice cancellation | Ready | Reasoned cancellation, history retained; use when linked work exists or a refund/reissue is required |
| Invoice numbering | Ready | Tenant/terminal-aware block allocation and optional device code |
| A4 and 80 mm invoice print | Ready | Browser print layouts; A4 invoice header can be built-in or pre-printed centre letterhead with configurable top/bottom/side margins; report header metadata prints horizontally |
| PDF download | Ready/Pilot | Browser-generated document output; verify printer/browser on buyer hardware |
| Doctor/referral commissions | Not available | No Commissions tab/module, no commission rules in Doctors, and no new accrual/payouts; legacy rows are retained but not displayed |
| Expenses | Ready | Categories, payment mode, bill number, notes, monthly categories and multi-module attribution (Pathology, X-ray, Pharmacy, Hospital, General/shared); shared expenses are tagged, not split |
| Financial dashboard | Ready | Administrator dashboard with live local collection, billing, dues, expenses and cash-profit views |
| Operations dashboard | Ready | Six in-app tabs (Overview, Billing, Diagnostics, Expenses, Pharmacy, Hospital), preset 1/7/30/90-day ranges plus custom start/end dates, dependency-free charts, daily CSV export and print; no cloud dependency |
| CSV export | Ready | Formula-injection guarded invoice export; confirm exact export list in demo |
| Accounting/Tally integration | Not available | No Tally import/export or ledger posting |
| Payroll | Not available | Salary can only be logged manually as an expense |

## Pathology and X-ray reporting

| Capability | Status | Description |
| --- | --- | --- |
| Test parameter templates | Ready | Multiple parameters, units, references, numeric limits, LOINC field |
| Starter parameter sets | Ready | CBC 20 (including HCT, RDW-CV, RDW-SD, MPV, PDW, PCT, P-LCR and P-LCC), LFT 11, KFT 9, Lipid 8, Urine 18, AEC, QBC, plus 383 total pathology parameters with filled references |
| Reference intervals | Ready | Adult ranges filled; sex/age variants included in reference text where applicable; laboratory validation still required |
| Per-report parameter selection | Ready | Include/exclude each parameter; excluded rows retained for draft reopening |
| Per-report unit/reference editing | Ready | Snapshot values for that patient; printer shows them |
| Abnormal flags | Ready | Low/High from numeric limits |
| Draft/verify workflow | Ready | Draft and verified statuses; release requires authority |
| Fast bench workflow | Ready | Dedicated **Bench** groups pathology work by sample; accept the linked sample, fill empty numeric results with **Fill normal**, then **Release & print**; Release only is available when printing is deferred |
| Bench sample exceptions | Ready | Reject a specimen with a reason, see it in the Exceptions queue, and recollect when no results or released report exist; the rejected sample history is preserved |
| Bench batch operations | Ready | Select visible samples to accept, print completed reports, or release complete normal drafts; abnormal, critical, incomplete and rejected reports are skipped for individual review |
| Analyser result import | Ready | Paste or load CSV/TSV rows as `accession,parameter,value` or `accession,test,parameter,value`; creates report parameter snapshots as needed, saves drafts only and reports unmatched/ambiguous rows. This is a vendor-neutral import, not a live analyser driver |
| One-click sample acceptance | Ready | Samples desk accepts a routine specimen in one action while still recording collection, receipt and acceptance evidence; individual stage actions remain available |
| Report amendments | Ready | Issued results cannot return to draft; amendment reason and prior revision retained |
| Sample release gate | Ready | Pathology release requires an accepted linked sample |
| Report letterhead printing | Ready | Lab identity, patient/doctor, sample ID, authorizer, version; individual completed test reports can print before the rest of the bill is ready; optional pre-printed centre letterhead mode hides the built-in header and reserves configurable page margins; printed signature block can be hidden when stationery already carries it; long reports paginate across A4 pages |
| Single-test reporting | Ready | One-test invoices show a single **Print report** action; multi-test invoices offer **Combined** or **Each test**. The Each test chooser lists completed pathology tests with individual Print actions. A completed test can also print immediately from its row, even when other tests on the same invoice are pending |
| Report sections | Ready | Parameter templates carry printable section headings; CBC is split into Complete Blood Count and Differential Leucocyte Count, LFT into Bilirubin/Liver Enzymes/Proteins, KFT into Renal Profile/Electrolytes/Minerals, and urine into Physical/Chemical/Microscopy |
| X-ray report workflow | Ready | Clinical history, radiologist findings, impression and configurable disclaimer |
| Radiologist signature catalogue | Ready | Dedicated administrator Radiologists section; upload multiple names, qualifications and scanned signatures; operator selects one per report |
| Pathologist signature catalogue | Ready | Dedicated administrator Pathologists section; upload multiple names, qualifications and scanned signatures; operator selects one per pathology report |
| Pathologist snapshot on issued reports | Ready | Selected pathologist id/name/qualification/signature is stored on the report; later catalogue edits/deletions do not alter history; falls back to the verifying user then centre profile |
| X-ray letterhead printing | Ready | A4 report with logo/clinic header, patient details, findings, impression, signature image, name/qualification and bottom disclaimer |
| Signature snapshot on issued reports | Ready | Selected radiologist snapshot is stored on the report; catalogue edits/deletions do not alter history |
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
| Admin/operator roles | Ready | Admins see Dashboard, Settings, Compliance and profitability summaries; terminal operators can add/view expenses, land on Expenses, and cannot access Dashboard, Settings, Compliance or the Expenses "This month at a glance" profit card |
| Report-release authority | Ready | Separate `can_authorize_reports` user permission |
| Password hashing | Ready | PBKDF2-SHA256 |
| TOTP 2FA | Ready | RFC 6238 with replay protection and hashed recovery codes |
| Audit log | Pilot | Login, patient, consent, sample, report, invoice, payment, settings, ABDM drafts |
| Compliance evidence page | Ready | Admin-only recent evidence and control summary |
| Clinic module visibility | Ready | Enable Diagnostics, Pharmacy and/or Hospital sections per clinic; hidden routes redirect to Dashboard |
| Licensed editions | Ready | Diagnostics, Pharmacy, Hospital, Complete or Custom; effective modules are licensed ∩ clinic-enabled |
| Offline licence activation | Pilot | ECDSA P-256 signed file bound to tenant and Windows hardware fingerprint; validation is local and requires no network |
| Licence grace/read-only | Pilot | 30-day grace after expiry; after grace existing records, print and export remain available while new writes are blocked in the UI |
| Vendor licence portal | Pilot | Local/self-hosted admin portal issues, downloads, renews and revokes signed licence files; public hosting and customer self-service are not deployed |
| OS-secure licence storage | Pilot | Windows DPAPI current-user storage in the packaged Tauri app; copied blobs fail on another machine/account. Browser builds use a localStorage fallback because they have no DPAPI |
| Clinic logo | Ready | PNG/JPG/WebP up to 500 KB; shown in sidebar and printed invoice/report/pharmacy letterheads |
| Multi-vertical branding | Ready | OmniMed Core umbrella brand with tenant name/logo overrides |
| Shared patient identity | Ready | Same patient used for OPD, diagnostics, pharmacy and admissions |
| Read-only monitoring build | Pilot | Separate local read-only bundle; no cloud sync or remote dashboard |
| Encrypted database | Pilot | Desktop database uses SQLCipher 4.20 (AES-256); key is stored in Windows Credential Manager. Key export/import and cross-machine recovery are not yet exposed |
| Local backup/restore | Pilot | Daily in-app SQLCipher-encrypted snapshots with 7 daily/4 weekly/12 monthly retention, optional USB/OneDrive copy, manual backup, schema/integrity validation and safe restore. Only scheduled while the app is open |
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
| Multi-terminal data sharing | Partial | Data model ready for multiple terminals; local CSV export is one-way and does not merge terminals |
| Local CSV export | Pilot | Unique `tx_YYYYMMDD_HHMMSS_XXXXXX.csv` transaction files in a Google Drive sync folder; masked patient IDs; local retry queue; no API calls |
| Full Google Drive snapshot | Pilot | One CSV per database table including patients and all business modules; daily plus manual; authentication secrets excluded; contains confidential data |
| Local export scheduler | Pilot | Transaction outbox every 30 seconds and a full snapshot once per day while the Tauri app is open; not a Windows service when closed |
| Read-only "monitor from anywhere" | Not available | Cloud sync/dashboard removed; the local read-only monitor build remains |
| Tauri Windows installer | Partial | Native SQLCipher database, single-instance guard and locally self-signed NSIS/MSI installers build successfully; public-CA signing, clean-machine acceptance and distribution are still pending |
| Browser/PWA install | Pilot | Development/local browser storage only; not recommended as primary data store |
| Cloud backup | Not available | Local encrypted backup only |
| Cloud monitoring / dashboard | Not available | Online sync/dashboard removed; local CSV export is the supported outbox |
| External Google dashboard | Not available | Optional design only: read-only Google Sheets/BigQuery/Looker Studio consumer for exported CSVs; the primary local dashboard is built in; see [GOOGLE_DASHBOARD.md](../GOOGLE_DASHBOARD.md) |

## The one-table summary for a first call

**Ready today:** billing, GST, dues, payments, expenses, patient records, test catalog,
parameter-based reporting, sample chain, report amendments, hospital admissions/discharge, generic
hospital service/IPD billing, pharmacy batch inventory/dispensing/receipts, audit, 2FA, A4/thermal
printing, configurable verticals and signed edition gating.

**Pilot today:** local monitor build, ABHA/consent, ABDM JSON draft, compliance evidence dashboard,
hospital/pharmacy read-only monitoring, tenant/hardware-bound licence activation, DPAPI storage, clock
rollback checks, grace/read-only mode,
the vendor licence portal, the transaction CSV outbox and full all-module Google Drive snapshots.

**Not ready:** public-CA signed/distributed Windows installer, public hosted licence portal/customer
self-service, backend entitlement enforcement,
key export/import for cross-machine recovery, offsite/unattended backups, live ABDM, QMS/QC/equipment/personnel modules, analyzer/PACS integration, critical-value
workflow, full HIS features (insurance/TPA, nursing, medication charts, package/advance billing),
advanced pharmacy procurement/controlled-drug workflows.
