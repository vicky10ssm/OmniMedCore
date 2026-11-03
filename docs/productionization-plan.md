# Productionization plan

Last updated: 3 November 2026  
Current product version: `0.3.0`  
Current schema: `17`  
Current deployment: development web app with `sql.js` + IndexedDB

## 1. Purpose

This document defines how to move MediCore from a working development build to a supportable product
that can be installed in a real diagnostic centre without risking patient or financial data.

It covers:

- Windows desktop packaging
- Local production database
- Encryption, backup and recovery
- Cloud sync and read-only monitoring
- Security, testing, observability and support
- Tenant/device licence activation, secure licence storage and vendor portal operations
- Referral-commission policy, role restrictions and clinical sample-disposal controls
- Release processes, migration and rollback
- Pilot and general-availability gates
- Infrastructure choices and approximate effort

**This is a plan, not a statement that those controls already exist.**

## 2. Production definition

MediCore is production-ready for a paid pilot only when all of the following are true:

1. A signed Windows installer runs the application on supported buyer hardware.
2. Operational data lives in a durable local SQLite database, not browser storage.
3. Encryption can be enabled, unlocked, recovered and relocked through tested workflows.
4. An encrypted backup can be restored successfully on a clean machine.
5. Upgrades migrate real prior databases without losing rows or changing financial totals.
6. The buyerâ€™s users, printers, data and workflows pass written acceptance tests.
7. Tenant/device licence activation, renewal, grace/read-only mode, OS-secure licence storage and backend
   entitlement enforcement pass on the packaged build.
8. Role and clinical-control tests pass: operators can enter expenses but cannot see Dashboard/profit
   summaries, and accepted samples cannot be disposed before all linked test results are entered.
9. Support, incident and rollback procedures are agreed.
10. No contractual claim depends on an unreleased cloud, ABDM, hosted licence portal or QMS feature.

General availability additionally requires the hosted monitoring service, tenant operations, security
review and commercial support model to be fully operational.

## 3. Current baseline

| Area | Current state | Production gap |
| --- | --- | --- |
| UI/business logic | React/TypeScript, usable | Automated regression suite missing |
| Persistence | sql.js + IndexedDB in browser; native SQLCipher in Tauri with key in Windows Credential Manager | Browser encryption, key export/import and clean-machine restore remain future work |
| Desktop packaging | Tauri v2 native build succeeds; NSIS and MSI installers produced locally | Installer signing, clean-machine acceptance, updater and distribution |
| Encryption | SQLCipher 4.20 desktop database; random key in Windows Credential Manager; plaintext migration | Key export/import, rotation, recovery and clean-machine tests |
| Backup/restore | Encrypted local daily snapshots, 7/4/12 retention, optional USB/OneDrive copy, manual backup and validated restore | Key recovery, unattended scheduling, clean-machine restore test and retention monitoring |
| Cloud/monitor | Append-only queue, 30-second desktop push, Next.js receiver/dashboard and PostgreSQL schema code exist | Hosting, TLS, per-device auth, conflict/replay handling, backups and tenant operations |
| Authentication | Password + optional TOTP; admin/operator roles | Lockout/rate limits, session policy, device tokens |
| Roles | Operator: Expenses only, no Dashboard or profit tile; admin retains full view | Granular permissions and packaged backend enforcement |
| Licensing | Offline ECDSA P-256 tenant/device licences, editions, 30-day grace/read-only; vendor portal code | OS-secure storage, backend entitlement enforcement, hosted/hardened portal |
| Billing controls | Referral commissions removed; no commission tab, doctor rules or new accrual/payouts | Legal/compliance gate before any reintroduction |
| Clinical controls | Accepted-sample disposal blocked until all linked results are complete | QMS/validation evidence and periodic review |
| Audit | Application audit log | Tamper evidence/export, retention |
| Compliance | Evidence foundations | QMS/QC/equipment/personnel and validation pack |
| ABDM | Offline FHIR draft | Sandbox, HIP/HFR, consent artefacts, transport |
| Testing | TypeScript/migration/tenant scripts + manual E2E | Unit/component/integration/E2E/load/security |
| Release engineering | Local scripts | Git/CI, versioning, artifacts, changelog, rollback |
| Support | No production support system | Named support, logs, remote consent, SLA |

## 4. Target production architecture

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Windows terminal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Tauri application                                                â”‚
â”‚  â”œâ”€â”€ React UI (terminal bundle)                                  â”‚
â”‚  â”œâ”€â”€ Local SQLite file (encrypted; WAL)                          â”‚
â”‚  â”œâ”€â”€ Migration + backup before upgrade                           â”‚
â”‚  â”œâ”€â”€ Device identity + sync outbox                               â”‚
â”‚  â””â”€â”€ Local print / CSV / PDF                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚ HTTPS, device token, idempotent push/pull
                â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Cloud accumulator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ API: ingest, tenant isolation, cursor pull, health                â”‚
â”‚ PostgreSQL: accumulated tenant data + audit/ops metadata          â”‚
â”‚ Object storage: encrypted backups/support artifacts (optional)    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚ authenticated read-only API
                â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Hosted monitor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Static read-only bundle + strict read API                        â”‚
â”‚ No write endpoints, no billing, no recovery-code use             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Key architectural decisions to confirm

- **Desktop runtime:** Tauri v2 on Windows 10/11 with WebView2.
- **Local DB:** real SQLCipher through Rust, not IndexedDB or plugin-sql.
- **Encryption:** SQLCipher 4.20 page-level encryption with a random key stored in Windows Credential
  Manager. Key export/import and rotation remain to be added for cross-machine recovery.
- **Cloud provider:** choose after data-residency and budget review. Viable patterns are a small VPS +
  managed PostgreSQL, or a serverless PostgreSQL/API platform. Do not rely on free tier for an SLA.
- **Static monitor hosting:** Cloudflare Pages/Vercel/Netlify or the same VPS with a CDN.
- **Source control:** Git is mandatory; no production release from an uncommitted workspace.

The detailed protocol, conflict rules and sequence diagrams are in
[architecture.md](architecture.md#7-offlineonline-synchronization-design).

## 5. Workstreams

### WS1 â€” Source control and release engineering

Tasks:

- Initialise Git and protect the main branch.
- Add a tested `README`, environment templates and secret-handling policy.
- CI on every push:
  - `npm ci`
  - dependency install reproducibility
  - `npm run check`
  - `npm run build`
  - `npm run build:monitor`
  - automated tests
  - migration tests from every supported prior version
- Tag releases with semantic versions and build metadata.
- Generate changelog and customer release notes.
- Store build artifacts, checksums and signing evidence.
- Define hotfix and rollback process.

Exit gate: a clean machine/runner can reproduce a signed build from a tagged commit.

### WS2 â€” Desktop application and local data

Use [DESKTOP_BUILD.md](../DESKTOP_BUILD.md) for the Windows prerequisites, data-path checks, failure tests
and installer verification.

Tasks:

- Create Tauri v2 shell and replace IndexedDB persistence with a local SQLite file.
- Define app data directory, file permissions and Windows user scope.
- Add single-instance enforcement and safe multiple-terminal behavior.
- Add startup diagnostics for missing WebView2, read-only disk, corrupt DB and locked file.
- Implement database migration with pre-migration backup and version check.
- Add installer, uninstall behavior and user-data preservation rules.
- Move licence storage out of browser `localStorage` into an OS-protected config/secure store and enforce
  tenant/device entitlements in the Tauri backend, not only React.
- Test activation, renewal, tenant/device mismatch, 30-day grace and read-only behavior on a clean install.
- Add signed auto-update channel or an explicit manual update process for the pilot.
- Validate A4 and 80 mm printing on supported printers.
- Test OS sleep, power loss, disk-full and abrupt termination.

Exit gate: install â†’ create bill/report â†’ close â†’ reopen â†’ upgrade â†’ data intact, all offline.

### WS3 â€” Encryption, recovery and backups

Implemented pilot foundation:

- SQLCipher 4.20 database encryption with the key in Windows Credential Manager.
- Automatic plaintext-to-SQLCipher migration with an encrypted pre-encryption copy.
- Encrypted daily snapshots with 7 daily / 4 weekly / 12 monthly retention.
- Manual **Backup Now** and optional USB/OneDrive second folder.
- Schema/integrity validation, pre-restore safety copy and restore/reload UI.
- Legacy plaintext backup restore is re-encrypted before activation.
- Pre-migration snapshots retained separately.

Remaining tasks:

- Add encrypted key export/import and key rotation for cross-machine recovery.
- Prove encrypted backup restore on a clean Windows profile/machine.
- Add unattended Windows scheduled backup outside the app.
- Test backup/restore with the buyerâ€™s real volume before go-live.
- Define RPO/RTO. Proposed pilot targets: RPO â‰¤ 1 hour, RTO â‰¤ 4 hours; confirm with buyer.
- Record restore evidence: date, operator, backup ID, record counts, checksum.

Exit gate: encrypted backup restored on a clean machine with exact invoice/payment counts.

### WS4 â€” Cloud sync and monitoring

A simple pilot module is implemented: append-only `sync_queue`/`sync_ack`, a 30-second in-app push
loop, a Next.js sync receiver and a read-only dashboard. It is not a production sync service.

Production tasks:

- Define the hosted central schema, migrations and tenant isolation.
- Implement device registration and revocation with one-time enrolment.
- Add device-bound credentials stored in Windows Credential Manager/OS keystore.
- Implement push/pull APIs with:
  - idempotency keys
  - cursor-based limits
  - retry/backoff
  - tombstones
  - tenant/device authorisation
- Keep money records append-only; last-write-wins only for approved editable tables.
- Build tenant provisioning, suspension, deletion and support views.
- Build hosted monitor with read-only API credentials and minimum-necessary data.
- Add sync status, last success, pending count and actionable errors in the terminal.
- Load test with realistic multi-terminal volumes.
- Define conflict metrics and dead-letter handling.

Exit gate: two terminals create offline records, reconnect, sync, and the hosted monitor shows the
same totals without duplicate invoices or cross-tenant leakage.

### WS5 â€” Security and privacy hardening

Tasks:

- Enforce password policy, lockout/rate limiting, session timeout and account deactivation.
- Add device/session revocation and recovery-code monitoring.
- Review all SQL for tenant predicates and enforce server-side tenant isolation.
- Encrypt secrets at rest and in transit; never log passwords, TOTP secrets, passphrases or full FHIR.
- Add CSRF/CORS/security headers and API rate limits.
- Add dependency vulnerability scanning, SBOM and patch cadence.
- Harden the vendor licence portal: TLS, per-user auth/MFA, rate limits, backups, audit and private-key
  custody; define renewal/revocation/device-transfer operations.
- Verify operator role restrictions and the sample disposal gate are enforced outside the UI.
- Commission an independent penetration test before GA.
- Complete DPDP-oriented DPA, retention, breach and support-access procedures.
- Define backup encryption and key custody.
- Complete threat model and secure-development checklist.

Exit gate: no unresolved critical/high findings; security evidence pack approved.

### WS6 â€” Testing and validation

Tasks:

- Add Vitest unit tests for money/GST/date/reference-range logic.
- Add component/integration tests for billing, samples, reports and amendments.
- Add tests for licence editions/grace/read-only, operator role restrictions, commission absence and the
  sample disposal result gate.
- Add Playwright E2E on a packaged Tauri build or its production web equivalent.
- Add migration fixtures from versions 1â†’current and supported installed releases.
- Add tests for:
  - invoice number blocks
  - partial payments and dues
  - cancellation/reversal
  - report gates and amendments
  - consent revocation and ABDM blocking
  - backup/restore
  - tenant isolation
  - offline/reconnect sync
- Add load/performance targets: startup, search, billing, report print, sync.
- Create a computer-system-validation pack:
  - intended use
  - risk assessment
  - requirements traceability
  - test evidence
  - change control
  - training records
  - backup/restore evidence

Exit gate: release candidate passes scripted acceptance on buyer-like data and hardware.

### WS7 â€” Operations, observability and support

Tasks:

- Error tracking with PII scrubbing.
- Uptime checks for API/monitor; local terminal health summary.
- Structured logs with correlation/device ID but no patient identifiers.
- Backup job monitoring and alerting.
- Support portal/email and severity matrix.
- Remote support with explicit user consent and session logging.
- Status page and maintenance communication.
- Incident response, post-incident review and customer notification.
- Runbooks:
  - installation
  - upgrade
  - rollback
  - restore
  - device replacement
  - tenant offboarding
  - suspected data breach
  - lost/stolen terminal
  - cloud outage
- Release notes and known-issue register.

Exit gate: support can diagnose and restore a simulated terminal failure using written runbooks.

### WS8 â€” Legal and commercial operations

Tasks:

- EULA/software licence, DPA, SLA, support terms and limitation of liability reviewed by counsel.
- Written legal/compliance decision on referral commissions/inducements; the current product intentionally
  does not expose or accrue them. Do not reintroduce without counsel approval.
- Licence term, renewal, grace/read-only, device-transfer, revocation and portal-support terms reviewed.
- GST/SAC/TDS/e-invoice/MSME review by CA.
- Data ownership, export and deletion terms.
- Subprocessor list and data-residency statement.
- Insurance decision.
- Buyer due-diligence folder current.
- Claims register: implemented vs pilot vs roadmap.
- Pricing and payment terms aligned to scope.
- Agreement that no accreditation or ABDM certification is implied.

Exit gate: contract and commercial pack can be sent without unsupported claims.

## 6. Environment strategy

| Environment | Purpose | Data |
| --- | --- | --- |
| Development | Local coding | Synthetic only |
| CI/test | Automated tests, migrations | Synthetic fixtures |
| Staging | Signed release candidate, sync/monitor validation | Synthetic tenant |
| Buyer pilot | Controlled real operation | Real data only after P0/DPA gates |
| Production | GA terminals and cloud | Real, tenant-isolated |

Never copy production patient data into development or screenshots. Use de-identified or synthetic
fixtures.

## 7. Sequenced plan and exit gates

| Phase | Main work | Exit gate |
| --- | --- | --- |
| A. Engineering foundation | Git, CI, tests baseline, release versioning | Reproducible checks/builds from tagged commit |
| B. Desktop production | Tauri, local SQLite, installer, updater, printing | Offline install/upgrade/rollback acceptable |
| C. Data protection | Encryption workflow, backup/restore, recovery | Clean-machine restore and recovery proven |
| D. Cloud monitoring | Tenant/device auth, sync, monitor, ops | Two-tenant, two-terminal acceptance and isolation test |
| E. Hardening | Security, performance, validation pack, observability | Pen-test and acceptance gates pass |
| F. Pilot | Migration, training, parallel run, weekly review | Written pilot acceptance or rollback |
| G. GA | Support/SLA, tenant operations, commercial conversion | GA readiness review |

### Approximate effort

These are planning ranges for one experienced full-stack engineer plus part-time QA/design/security. They
must be re-estimated after the Tauri/SQLCipher spikes.

| Phase | Indicative effort |
| --- | --- |
| A | 1â€“2 weeks |
| B | 2â€“4 weeks |
| C | 2â€“3 weeks |
| D | 4â€“8 weeks |
| E | 3â€“6 weeks |
| F | 4â€“6 weeks elapsed (pilot, not full-time build) |
| G | 1â€“2 weeks |

ABDM production, full QMS, analyzer/PACS and multi-branch are separate programmes and are not included.

## 8. Desktop release checklist

- [ ] Tagged commit and clean CI
- [ ] `npm run check` passes
- [ ] Unit/integration/E2E suites pass
- [ ] Migration tested on current production snapshot
- [ ] Installer built for x64 Windows
- [ ] Installer signed / signature verified
- [ ] Version number and release notes updated
- [ ] Database backup created and restore spot-checked
- [ ] Encryption unlock/recovery tested
- [ ] Licence activation/renewal/grace/read-only tested; licence stored outside browser storage
- [ ] Operator role and expense/Dashboard restrictions tested
- [ ] Sample disposal result gate tested, including attempted bypass
- [ ] Commission UI/accrual absence verified
- [ ] A4 and thermal print tested
- [ ] CSV export spot-checked
- [ ] Upgrade from previous release tested
- [ ] Rollback artifact and procedure available
- [ ] Checksums and SBOM published
- [ ] Support briefed; known issues documented
- [ ] Buyer change approval recorded

## 9. Cloud release checklist

- [ ] Infrastructure as code or documented reproducible setup
- [ ] Tenant isolation tests with two tenants
- [ ] Device enrolment/revocation tested
- [ ] API authz and rate limits tested
- [ ] Backup/PITR configured and restored in test
- [ ] TLS/security headers reviewed
- [ ] Monitor read-only enforcement tested
- [ ] No billing/write route exposed to monitor credentials
- [ ] Error tracking and uptime alerts working
- [ ] Load test at agreed pilot volume
- [ ] Status page/incident contacts ready
- [ ] DPA/subprocessor list updated
- [ ] Rollback and maintenance plan tested

## 10. Upgrade and rollback runbook

1. Announce maintenance window and version.
2. Confirm verified backup and record backup ID.
3. Verify disk space and WebView/runtime prerequisites.
4. Install new signed version.
5. Run schema migrations; capture logs without patient data.
6. Execute smoke tests: login, patient search, bill totals, sample gate, report print, CSV.
7. Compare record and money counts with pre-upgrade snapshot.
8. If critical failure: stop writes, restore previous backup, reinstall prior version.
9. Record outcome, defects and evidence.
10. Communicate completion or rollback to users/support.

Never overwrite the only backup during an upgrade.

## 11. Incident and business continuity

Define and test:

| Scenario | Required response |
| --- | --- |
| Terminal disk/PC failure | Replace hardware, restore latest encrypted backup |
| Corrupt database | Preserve copy, attempt recovery, restore verified backup |
| Lost/stolen terminal | Revoke device, rotate credentials, assess encryption exposure |
| Cloud/API outage | Terminal continues offline; queue sync; monitor unavailable |
| Failed upgrade | Rollback application and restore database |
| Data-entry error | Correct via cancellation/amendment, never direct DB edits |
| Suspected breach | Contain, preserve evidence, notify per policy/contract/law |
| Printer failure | Alternate printer/PDF workflow; no data loss |

Every scenario requires an owner, contact path and evidence record.

## 12. Observability and service objectives

Proposed pilot service objectives:

- Terminal billing available offline by design; no internet dependency.
- Cloud monitor availability target: 99.5% monthly during supported pilot.
- API sync success within 15 minutes of connectivity restoration for normal volumes.
- Backup success â‰¥99% with alert on failure.
- S1 acknowledgement within agreed support hours.
- No unresolved critical security findings at release.

Do not publish an SLA until monitoring and staffing can measure it.

## 13. Infrastructure options and cost

### Lean pilot architecture

- Desktop: local Tauri/SQLite, no hosting cost
- Static monitor: free/low-cost static hosting
- API: small VPS or serverless functions
- PostgreSQL: managed small instance or serverless Postgres
- Encrypted backups: buyer drive + optional object storage
- Error tracking/uptime: entry-level hosted plans

Indicative infrastructure: **â‚¹500â€“2,000/month** excluding domain, support labour and incident costs. Free
tiers may be used for development but not as an SLA-bearing production dependency.

### Larger deployment

Costs rise with tenant count, storage, logs, backups, monitoring, support and data-residency requirements.
Price hosting separately from licence/support.

## 14. Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| Product owner | Scope, claims, pricing, go/no-go |
| Technical lead | Architecture, migrations, releases |
| QA/validation lead | Test plan, evidence, release sign-off |
| Security reviewer | Threat model, pen-test remediation |
| DevOps/support engineer | CI/CD, cloud, backups, incidents |
| Clinical advisor | Report workflows, release authority, reference-interval review |
| Legal/CA | Contracts, GST/TDS, DPDP, liability |
| Buyer champion | Data, users, UAT and acceptance |
| Buyer IT | Hardware, network, Windows, printer and backup media |

No single person should be able to release code, alter production data and approve their own security
review without oversight once the team grows.

## 15. General-availability gate

Do not call MediCore generally available until:

- All P0 productization gates are closed
- At least one supervised pilot has passed acceptance
- Backup/restore and upgrade/rollback have real evidence
- Cloud tenant isolation and monitor security have been independently reviewed
- Security findings are closed or formally accepted
- Support staffing and SLA are funded
- Legal/DPDP/CA review is complete, including licence terms and the no-referral-commission decision
- Licence portal operations, key custody, renewal and revocation are supportable and tested
- Role restrictions and clinical disposal controls are enforced in the packaged backend
- The claims register and buyer documentation reflect the shipped product
- Pricing covers support and infrastructure cost
- An exit/export/deletion process has been tested

## 16. Go/no-go template

| Question | Yes/No | Evidence/Owner |
| --- | --- | --- |
| Signed installer available? | | |
| Local DB durable and encrypted? | | |
| Recovery code tested? | | |
| Backup restored on clean hardware? | | |
| Upgrades tested from supported versions? | | |
| Tenant isolation proven? | | |
| Monitor strictly read-only? | | |
| Licence activation/grace/read-only tested and stored securely? | | |
| Operator Dashboard/profit restrictions tested? | | |
| Sample disposal result gate tested? | | |
| Referral commissions absent and legal position recorded? | | |
| Security criticals closed? | | |
| Printer/hardware accepted? | | |
| Buyer data migration reconciled? | | |
| Users trained and authorised? | | |
| Support and rollback ready? | | |
| Claims and limitations acknowledged? | | |

A single â€œNoâ€ against data protection, recovery, tenant isolation or security is a no-go for real patient
data.

## 17. Operating cadence after launch

- Daily: backup success, sync health, error alerts
- Weekly: defect/incident review, pending support issues
- Monthly: restore spot-check, patch review, tenant/access review, licence expiry/renewal queue
- Quarterly: dependency/security review, DR exercise, roadmap review, portal key-custody/backup check
- Annually: penetration test, contract/DPA review, pricing review, claims audit
- On every release: migration test, rollback artifact, release notes, support briefing

