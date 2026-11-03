# MediCore buyer documentation

Last updated: 3 November 2026  
Product version: `0.1.0`  
Database schema: `17`

**MediCore** is the umbrella product name. The internal package/browser storage keys retain the
historical `diagbill` identifier; this does not affect buyer branding.

This folder is the commercial and technical briefing pack for discussing MediCore with diagnostic
centres, pharmacies, small hospitals, laboratories and implementation partners. It also records honest
release limits so that a buyer conversation does not become an unsupported promise.

## Read this first

**Current commercial position:** MediCore is a functional offline billing/pathology-reporting product
with strong foundations for NABL/ISO evidence and ABDM interoperability, but it is **not yet a
general-availability hosted SaaS or finished desktop installer**.

The safest current offer is a **paid, tightly scoped design-partner pilot** after the release gates in
[deployment-and-readiness.md](deployment-and-readiness.md) are completed. Do not sell it as a complete
LIS, a NABL-certified system, a live ABDM product or a cloud monitoring service yet.

## Documentation map

| Document | Use it for |
| --- | --- |
| [buyer-overview.md](buyer-overview.md) | One-page commercial story, ideal customer and differentiators |
| [product-capabilities.md](product-capabilities.md) | Feature-by-feature status: ready, partial or unavailable |
| [architecture.md](architecture.md) | Detailed current/target architecture and the proposed offline/online sync protocol |
| [licensing-and-editions.md](licensing-and-editions.md) | Editions, signed activation, tenant/device binding, grace/read-only rules, vendor portal and licence QA |
| [licensing-process.md](licensing-process.md) | End-to-end operating procedure from quote and order through issuance, activation, renewal, upgrades, replacement, revocation and records |
| [deployment-and-readiness.md](deployment-and-readiness.md) | What can be installed now, release gates and IT requirements |
| [productionization-plan.md](productionization-plan.md) | Full engineering, packaging, backup, cloud, security and operations plan to reach production |
| [../DESKTOP_BUILD.md](../DESKTOP_BUILD.md) | Windows/Tauri prerequisites, WS2 verification, installer and desktop failure tests |
| [../cloud-dashboard/README.md](../cloud-dashboard/README.md) | Optional Next.js sync receiver, PostgreSQL schema and read-only central dashboard |
| [security-privacy-compliance.md](security-privacy-compliance.md) | Security posture, NABL/ISO/ABDM evidence, data protection and claims policy |
| [commercial-model-and-pricing.md](commercial-model-and-pricing.md) | Pricing structures, cost drivers, ROI method and proposal terms |
| [india-payment-proposal.md](india-payment-proposal.md) | India-specific milestone billing, GST, TDS, INR payment methods, renewals and proposal template |
| [sales-playbook.md](sales-playbook.md) | Discovery questions, buyer personas, messaging, objections and deal stages |
| [demo-and-pilot.md](demo-and-pilot.md) | Demo script, pilot design, success metrics and demo boundaries |
| [buyer-due-diligence.md](buyer-due-diligence.md) | Procurement questions, documents to provide and red-flag answers |
| [onboarding-migration-support.md](onboarding-migration-support.md) | Installation, migration, training, backup, support and exit |
| [roadmap-and-gaps.md](roadmap-and-gaps.md) | Sequenced roadmap and known limitations with buyer impact |

Compliance source detail remains in [`../COMPLIANCE.md`](../COMPLIANCE.md).

## Status vocabulary used throughout

- **Ready** â€” implemented and exercised in the current application.
- **Pilot** â€” implemented but requires supervised deployment, configuration or acceptance testing.
- **Partial** â€” foundation exists; important workflow/evidence is still missing.
- **Not available** â€” do not demonstrate or promise as a current feature.
- **External** â€” depends on the buyer, NABL assessment, ABDM credentials, Windows signing or another third party.

## Quick facts for a buyer call

| Item | Current answer |
| --- | --- |
| Product type | Modular offline-first billing and care operations for diagnostics, pharmacy and hospital inpatients |
| Market | Independent diagnostic centres, standalone pharmacies, small hospitals and multi-service clinics in India |
| Verticals | Diagnostics Â· Pharmacy Â· Hospital; licensed edition plus per-tenant module visibility |
| Hospital | Admission/ward/bed/discharge plus generic IPD service charges, payments, balance and bill print |
| Pharmacy | Medicine master, batch/expiry inventory, stock receipt, dispensing, GST pharmacy receipt |
| Licensing | Signed offline licence bound to tenant + device; Diagnostics/Pharmacy/Hospital/Complete/Custom editions; 30-day grace and read-only after grace |
| Module branding | MediCore umbrella brand; licensed modules then toggled per tenant in Settings |
| Billing | GST invoices, packages, discounts, dues, payments, cancellations |
| Money controls | Integer paise, CGST/SGST, invoice-number blocks, append-only corrections |
| Clinical reporting | Parameter templates, selected parameters, units, references, abnormal flags, amendments |
| Sample workflow | Accession, collection, receipt, acceptance/rejection, disposal, audit |
| Roles | Admin/operator plus explicit clinical report-release authority |
| Security | Password hashing, optional TOTP 2FA, read-only monitor enforcement |
| At-rest encryption | Code foundation exists; **not currently exposed as a completed admin workflow** |
| ABDM | Offline FHIR R4 v6.5.0 draft generation; **no live API transmission** |
| NABL/ISO | Evidence foundations and gap matrix; **not certified/accredited software** |
| Desktop `.exe` | Tauri target defined; **installer not yet built** |
| Cloud monitoring | Monitor build exists; **cloud sync backend not implemented** |
| Backups | **Automated backup/restore is not yet implemented â€” release blocker** |
| Recommended launch price | â‚¹20,000 paid pilot; â‚¹24,000/year for 1 centre/2 terminals, excluding GST â€” see [commercial-model-and-pricing.md](commercial-model-and-pricing.md#recommended-launch-prices-for-india) |
| Default demo login | First-run bootstrap `admin / admin123`, forcing a password change |

## Golden rule for buyer conversations

Say **â€œcurrently availableâ€**, **â€œpilotâ€** or **â€œroadmapâ€** explicitly. Never convert a roadmap item
into a present-tense feature claim. The claims table in
[sales-playbook.md](sales-playbook.md#claims-you-may-and-may-not-make) is the reference.

