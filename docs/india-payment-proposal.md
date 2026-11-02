# India payment and commercial proposal template

Status: internal commercial template with buyer-facing sections  
Last updated: 26 October 2026

Use this document to prepare a payment proposal for an Indian diagnostic centre, laboratory or
implementation partner. Replace every `[placeholder]`, delete internal notes before sending, and have
the final document reviewed by your CA and legal counsel.

> This is a commercial template, not tax or legal advice. GST classification/rate, place of supply, TDS,
> e-invoicing, MSME obligations and contract terms depend on the vendor’s registration, contract
> characterisation and current law.

---

## 1. Vendor and buyer details

| Field | Vendor | Buyer |
| --- | --- | --- |
| Legal name | [Vendor legal name] | [Buyer legal name] |
| Trade name | MediCore | [Centre/hospital name] |
| Registered address | [Address] | [Address] |
| GSTIN | [GSTIN / registration status] | [Buyer GSTIN] |
| PAN | [PAN] | [PAN] |
| State / place of supply | [Vendor state] | [Buyer state] |
| Billing contact | [Name, email, phone] | [Name, email, phone] |
| Purchase order required? | [Yes/No] | [PO number/process] |
| MSME/Udyam status | [Registered/Not registered] | Not applicable |

## 2. Proposal purpose

This proposal covers the configuration, implementation and licensing of MediCore for **[number]** centre(s)
and **[number]** terminal(s), as detailed in the agreed scope.

### Included in this proposal

- [ ] Discovery and workflow configuration
- [ ] Lab identity, GST, invoice numbering and user setup
- [ ] Test/package, doctor and report-template configuration
- [ ] Installation and acceptance testing on agreed hardware
- [ ] User training for agreed roles
- [ ] Data migration of agreed masters/opening balances
- [ ] Pilot support during the agreed period
- [ ] Annual licence / maintenance after acceptance
- [ ] Other: [specify]

### Excluded unless separately quoted

- Windows installer/backup/cloud monitoring features not yet released
- Live ABDM/HIP/HFR integration
- NABL/ISO consultancy or accreditation fees
- Analyzer, PACS, DICOM, Tally or other integration
- Hardware, printers, networking, antivirus and Windows licences
- Custom development outside the written scope
- Onsite travel beyond agreed days
- Statutory taxes beyond those shown on the tax invoice

## 3. Recommended commercial structure

Select one and delete the others before sending.

### Option A — Paid design-partner pilot, then annual licence (recommended)

| Commercial item | Amount (INR, excluding GST) | When invoiced |
| --- | ---: | --- |
| Discovery/configuration | [₹____] | On signing |
| Implementation and training | [₹____] | On installation/training completion |
| Data migration (agreed scope) | [₹____] | On validated migration |
| Pilot licence — [duration] | [₹____] | On pilot start |
| Pilot acceptance support | [₹____] | On acceptance review |
| **Pilot subtotal** | **[₹____]** | |
| Annual licence after acceptance | [₹____] per centre/year | On conversion |
| Annual support/AMC | [₹____] per centre/year | On conversion/renewal |

### Option B — One-time licence + annual maintenance

| Commercial item | Amount (INR, excluding GST) | When invoiced |
| --- | ---: | --- |
| Implementation/configuration | [₹____] | On signing |
| Perpetual/local licence — [terminals] | [₹____] | On go-live acceptance |
| Data migration | [₹____] | On validated migration |
| Training | [₹____] | On delivery |
| AMC/support year 1 | [₹____] | On go-live |
| **Subtotal** | **[₹____]** | |
| AMC renewal from year 2 | [₹____]/year | 30 days before renewal |

### Option C — Annual subscription per centre

| Commercial item | Amount (INR, excluding GST) | When invoiced |
| --- | ---: | --- |
| Onboarding/implementation | [₹____] once | On signing |
| Annual subscription — [terminals] | [₹____]/year | Annually in advance |
| Additional terminal | [₹____]/terminal/year | Prorated from activation |
| Optional onboarding/onsite training | [₹____] | On delivery |
| **Year-1 total** | **[₹____]** | |

### Option D — Hosted read-only monitoring add-on (only when released)

Do not include this option until the cloud backend, authentication, tenant isolation, backup and
support model have passed release gates.

| Commercial item | Amount (INR, excluding GST) | When invoiced |
| --- | ---: | --- |
| Monitoring setup | [₹____] | On activation |
| Monitoring subscription | [₹____]/month or year | In advance |
| Additional monitored centre | [₹____] | In advance |

## 4. Payment schedule

### Recommended pilot schedule

| Milestone | Share | Trigger |
| --- | ---: | --- |
| Booking/commencement | 30% | Signed proposal/PO |
| Configuration and installation | 30% | Installation accepted |
| Migration and training | 20% | Data reconciled and users trained |
| Pilot acceptance | 20% | Written acceptance or end of pilot review |

### Recommended perpetual schedule

| Milestone | Share | Trigger |
| --- | ---: | --- |
| Commencement | 50% | Signed proposal/PO |
| Installation/configuration | 30% | Ready for parallel run |
| Go-live acceptance | 20% | Acceptance criteria met |

### Annual subscription

- Year 1 subscription is payable in advance unless a written pilot conversion agreement says otherwise.
- Renewal is payable **30 days before the renewal date**.
- Non-payment may result in suspension of support/licence and, after written notice, hosted monitoring
  suspension. Local clinical data must never be held hostage; export/continuity terms must be explicit.

## 5. Invoice and GST details

Every tax invoice should show:

- Vendor legal name, address, GSTIN and invoice number
- Buyer legal name, address and GSTIN
- Invoice date and due date
- PO number/reference where required
- Description of service, SAC and quantity
- Taxable value, discount (if any), applicable GST rate and tax amount
- Place of supply and whether IGST or CGST/SGST applies
- Total amount in figures and words
- Bank details and payment reference instructions
- HSN/SAC as confirmed by the vendor’s CA
- Reverse-charge/export status only if applicable and reviewed

### SAC guidance

For software implementation/subscription services, the appropriate SAC depends on how the service is
characterised. Commonly considered entries include **998314** (IT design/development services) and
**998315** (hosting/IT infrastructure provisioning). Confirm the exact classification and applicable GST
rate with your CA before quoting.

### GST treatment

- Prices in this proposal are **[inclusive/exclusive] of GST**.
- GST is charged at **[rate]%** as applicable on the invoice date.
- The buyer must provide a valid GSTIN if input tax credit is expected.
- If the buyer’s state differs and the transaction is inter-state, IGST may apply under the place-of-supply
  rules; do not hard-code CGST/SGST without confirming the transaction.
- Taxes are payable in addition to the commercial fees unless explicitly stated otherwise.
- If GST law or the buyer’s registration changes, the invoice tax treatment may change prospectively.

### E-invoicing and e-way bill

If the vendor is required to issue e-invoices, provide the IRN/e-invoice QR/reference as required.
Software licensing has no goods movement, so an e-way bill is normally not applicable; confirm with the CA.

## 6. TDS and withholding

- TDS may apply to software development, professional, technical or contract services depending on the
  contract and current tax law.
- The buyer should deduct TDS only where legally required and issue the prescribed TDS certificate within
  the statutory timeframe.
- The invoice shows the gross taxable value and GST; TDS is remitted by the buyer and credited to the
  vendor’s PAN.
- Both parties must confirm the correct section, rate, threshold and new Income-tax Act provisions with
  their CA before signing. Do not rely on a template claim.
- If the buyer deducts TDS, payment of the net invoice amount does not discharge the buyer’s obligation to
  issue the certificate and file the return.

## 7. Payment methods in India

Accepted methods (delete as appropriate):

- **NEFT/RTGS** to the verified vendor bank account
- **UPI** for amounts within the agreed limit; collect against a verified merchant ID/QR
- **Cheque/DD** in favour of the legal entity
- **Payment gateway link** only if the vendor has a compliant merchant account

Avoid:

- Cash above statutory limits
- Payments to a personal account when the contract is with a company
- Bank-detail changes received only by email/WhatsApp

### Mandatory bank-detail verification

Any change to bank account details must be verified independently using a previously known phone number
and confirmed by a signed addendum or authorised letter. Never accept a changed account number from an
email alone. This is a common invoice-fraud vector.

## 8. Payment terms

| Item | Proposed term |
| --- | --- |
| Currency | INR |
| Standard invoice due date | [7/15] calendar days |
| Annual subscription | In advance |
| AMC renewal | 30 days before expiry |
| Late payment | [____]% per month on overdue undisputed amounts, or statutory rate if applicable |
| Disputed invoice | Pay undisputed portion; resolve disputed portion in good faith within [____] days |
| Bank charges | Borne by the payer |
| Receipts | Written acknowledgement or payment receipt within [____] business days |

If the vendor is registered as a micro or small enterprise under the MSMED Act and the Act applies,
payment terms and statutory interest must follow the current 45-day framework. Confirm applicability with
your CA. A contract cannot override mandatory statutory protection where it applies.

## 9. Price validity and revision

- This quotation is valid for **[30/45/60] days**.
- Implementation prices are fixed for the written scope and timeline.
- Annual licence/AMC prices may increase by up to **[____]%** at renewal with at least **60 days’** written
  notice.
- Additional terminals, centres, modules, custom reports, migration beyond scope or onsite visits are
  chargeable at the rates in Annexure A.
- Third-party costs (hosting, domain, code signing, payment gateway) may be passed through at actual cost
  with evidence.

## 10. Acceptance, retention and delay

- Configuration is accepted when the agreed test script is completed and open S1/S2 defects are closed
  or have approved workarounds.
- Migration is accepted when counts and agreed monetary totals reconcile and the buyer signs the
  reconciliation sheet.
- Training is accepted when named users attend and sign the attendance/competency sheet.
- If acceptance is delayed by buyer-side data, hardware, staff availability or approvals, the affected
  milestone remains payable when vendor work is complete.
- A retention/withholding amount, if any, must be stated explicitly. It must not be introduced after
  signing.

## 11. Cancellation, refunds and termination

- Before work starts: [____]% of the commencement fee is refundable after deducting documented work.
- After discovery/configuration starts: fees for completed work and non-cancellable commitments are
  non-refundable.
- Pilot fees are generally non-refundable once the pilot period starts.
- Annual subscription is prepaid. If the vendor terminates without cause, unused full months may be
  refunded pro-rata. No refund for buyer termination for convenience except as stated in the contract.
- On termination, the buyer receives its agreed data export; the vendor confirms deletion of hosted copies
  where applicable.
- Local data ownership and continued access to historical records must be addressed in the licence/EULA.

## 12. Deliverables and dependencies

Buyer dependencies:

- Named project owner and clinical approver
- Timely master data, opening balances and approvals
- Hardware, power, network, printers and Windows administration
- Staff availability for training and acceptance
- Backup media/ownership decision
- Written acceptance at each milestone

Vendor dependencies:

- Product release gates completed for the agreed scope
- Skilled implementation/training resource
- Defect log and weekly communication
- Data protection and confidentiality controls
- Support contacts and escalation path

## 13. Buyer approval

This proposal is subject to the signed master agreement, statement of work, data-processing agreement and
the limitations acknowledged in the buyer documentation pack.

| Approval | Name | Designation | Signature | Date |
| --- | --- | --- | --- | --- |
| Buyer authorised signatory | | | | |
| Vendor authorised signatory | | | | |

---

## Annexure A — Additional service rates

| Service | Unit | Rate (INR, excl. GST) |
| --- | --- | ---: |
| Additional implementation day | Day | [₹____] |
| Onsite visit | Day + travel | [₹____] + actuals |
| Custom report/template | Each | [₹____] |
| Data migration beyond scope | Per source | [₹____] |
| Additional training day | Day | [₹____] |
| Priority support | Year | [₹____] |
| Additional terminal licence | Terminal/year | [₹____] |
| Additional centre licence | Centre/year | [₹____] |
| Hosting setup (when released) | One-time | [₹____] |

## Annexure B — Internal notes (remove before sending)

1. Do not issue this proposal with cloud monitoring, ABDM transmission or NABL certification as included.
2. Insert only prices you can support for the actual implementation and support burden.
3. Confirm whether the sale is a licence, service, subscription or mixed supply with your CA.
4. Confirm GSTIN, place of supply, SAC, e-invoice applicability, TDS and MSME status before sending.
5. Get legal review of the EULA, DPA, liability cap, refund terms and data-export clause.
6. Require a PO where the buyer’s procurement process needs one; avoid starting work without written scope.
7. Keep all bank-detail changes out of ordinary email threads.
8. Never load buyer production data before release gates, DPA and backup/restore acceptance.
9. Reconcile every milestone to a written acceptance record.
10. Preserve the proposal, PO, invoices, TDS certificates, delivery evidence and acceptance sign-off.
