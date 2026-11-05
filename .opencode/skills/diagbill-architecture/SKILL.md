---
name: DiagBill Architecture
description: Use when changing DiagBill's offline-first architecture, SQLite schema, migrations, tenant isolation, persistence, or sync-ready data model.
---

# DiagBill architecture

Use this skill for structural work on the diagnostic-centre application. Read the current source before making changes; this file records the implemented baseline, not permission to assume newer code is unchanged.

## Product shape

- One React/TypeScript application supplies the offline billing UI and a local read-only monitoring build.
- The packaged desktop app uses Tauri + native SQLCipher; the browser build remains sql.js/IndexedDB and is development-only.
- The same app supports Diagnostics, Pharmacy, Hospital, Complete and Custom editions. Effective modules are the signed licence's modules ∩ the clinic's enabled modules. Licence verification is offline ECDSA P-256 with tenant/device binding; see the `diagbill-licensing` skill.
- Monitoring is local and read-only. Billing belongs on trusted offline terminals, including when several terminals work without connectivity.
- The integration path is a decoupled local Google Drive CSV outbox: `local_export_queue` snapshots invoices, pharmacy sales, admissions and hospital charges, and a 30-second scheduler writes unique masked CSV files. There is no API, token, ACK table or hosted cloud dashboard. See `diagbill-sync` and `LOCAL_CSV_EXPORT.md`.
- Every independent centre/hospital is a tenant. Never mix tenant records, settings, invoice numbers or monitoring data.
- Records use UUIDs, `created_at`, `updated_at`, `device_id`, `dirty`, `deleted`, and `tenant_id` where applicable. `dirty` is legacy; the local export ledger is separate.

## Read first

- `../../../src/db/index.ts` — `DataSource`, boot, migrations, persistence, self-healing
- `../../../src/db/schema.ts` — migrations and seed data
- `../../../src/db/types.ts` — row contracts
- `../../../src/db/tenant.ts` — tenant context, predicates, `TENANT_TABLES`
- `../../../src/app/mode.ts` and `../../../src/app/MonitorContext.tsx` — product mode
- `../../../src/sync/syncEngine.ts`, `syncConfig.ts` and `../../../src-tauri/src/export.rs` — local CSV outbox
- `../../../scripts/check-migrations.mjs` and `../../../scripts/check-tenant-scope.mjs`
- `../../../LOCAL_CSV_EXPORT.md` — CSV contract and retry behavior
- `../../../FEATURE_DECISIONS.md` — product decisions and remaining roadmap

## Migration workflow

1. Inspect the real current schema version. The current tested baseline is version 18 (local CSV export queue); always inspect the source rather than blindly reusing that number after later changes.
2. Append a new migration in strictly increasing order. Do not reorder migrations or weaken version assertions to hide an ordering error.
3. Keep upgrades additive and preserve existing rows. Use tolerant, statement-by-statement execution only where partial data repairs must continue after individual failures.
4. Update fresh-schema creation and upgrade migrations deliberately so both paths produce equivalent structures.
5. For every new tenant-owned table, update `TENANT_TABLES`, boot repair lists, and migration-check table lists.
6. Test fresh, old-version, partially migrated, and repeat-migration databases. Add fixture assertions for new seed/template data.

## Tenant rules

- Reads and writes must be scoped using `tenantWhere()`, `tenantAnd()`, `tenantAndOn()`, or `tenantFilter()` as appropriate.
- Joined queries need tenant predicates on each tenant-owned table, not only the first table.
- Every `INSERT` into a tenant-owned table must explicitly write `tenant_id`.
- `UPDATE` and `DELETE` require a real `WHERE` plus the tenant predicate. `tenantAnd()` without a preceding `WHERE` is a full-table corruption bug.
- The scope script is a lint, not a proof. Manually inspect subqueries and dynamic SQL too.

## Change constraints

- Keep the offline path independent of hosted services.
- Do not introduce floating-point money, random per-terminal invoice numbers, or cloud-only billing behavior.
- Do not claim hosted monitoring, ABDM exchange, or live cloud sync exists. Tauri packaging/signing exists but must be verified for each release; the supported export is the local Google Drive CSV outbox.
- Avoid broad rewrites when an additive migration and a small `DataSource`-compatible change suffice.

## Multi-vertical product scope

OmniMed Core is branded across Diagnostics, Pharmacy and Hospital. The same tenant can enable:

- Diagnostics: tests, samples, parameter reports and amendments.
- Pharmacy: medicine/batch/expiry stock, dispensing, GST receipts and stock deduction.
- Hospital: admissions, ward/bed, treating doctor, discharge summary, generic hospital service
  catalogue, IPD charges/payments/balance and bill print.

New modules use the same tenant columns, module-visibility model and local-export triggers where they
produce a financial transaction. They are not a full HIS or chain-pharmacy ERP. See the skill
`diagbill-hospital-pharmacy` for domain rules and boundaries.

## Clinic configuration and branding

- Module visibility and clinic logo are tenant-scoped settings, not permissions.
- `src/app/modules.ts` is the single source of truth for module IDs/labels.
- Disabled modules must be filtered from both terminal and monitor navigation and blocked by
  `ModuleGate` on direct routes. Dashboard, Settings and Compliance are administrator-only; operators
  work from Expenses.
- Do not fail closed when configuration cannot be read; hiding care workflows due to a settings read
  failure is worse than showing an extra section.
- Logo is a validated data URL in tenant settings and appears in the sidebar plus printed invoice/report
  letterheads. It is not a compliance or accreditation mark.
- Use the skill `diagbill-clinic-configuration` for the full workflow and verification checklist.

## Licence and edition composition

- A signed licence activates an edition/module set for named tenant/device IDs. Clinic settings can only
  hide modules within that licensed set.
- `src/licensing` owns verification and entitlement state; `ModuleGate` and both layouts must combine
  licence modules with clinic-enabled modules.
- After the 30-day grace, the app enters read-only mode: existing records/print/export stay available,
  while new clinical/financial writes are blocked. UI enforcement is not a backend security boundary.
- The vendor signing private key belongs only in `license-portal/keys` (ignored) and must never ship or
  be committed. The app contains only the public verification key.
- Development builds may use a complete development licence when no real licence exists. Production must
  require activation. See `diagbill-licensing` and `docs/licensing-and-editions.md`.

## Compliance data model additions

For NABL/ABDM/ISO-aligned work, keep clinical provenance additive and tenant-scoped:

- Samples are first-class records linked to invoice/patient/report orders; preserve collection, receipt, acceptance/rejection, analysis and disposal evidence.
- Report revisions are append-only snapshots with action, reason, acting user and timestamp. Never implement amendment by overwriting the only issued result record.
- Consent records are purpose-specific and revocable; ABHA is not verified merely because it is stored.
- Generic `audit_log` supports login/security evidence, but clinical actions need enough entity/action/detail context to reconstruct what changed.
- ABDM outbox/draft records are write-only terminal data and must remain separate from the read-only monitoring build.
- The authoritative compliance reference is the skill `diagbill-india-compliance`; always re-check current NABL/ABDM revisions.

## Development/demo data

- `src/db/demoSeed.ts` is the canonical synthetic dataset for demos and regression checks.
- It is exposed only as `window.__diagbillSeedDemo()` in DEV and must never be called by production code.
- The seeder is idempotent through a `meta.demo_seed_version` marker and fixed demo IDs.
- Run it whenever a database is reset or before a buyer demo; verify the full workflow mix using the
  `diagbill-demo-qa` skill. Never seed a buyer's live database.

## Required verification

Run from the project root:

```sh
npm run check
npm run build
npm run build:monitor
```

Also exercise the affected boot/upgrade path with actual application data. A successful fresh migration alone is insufficient.

For local export changes, also run `cargo test --manifest-path src-tauri/Cargo.toml --lib`, verify
schema 20, and test a forced folder failure/retry. Never mark a cloud monitor or online sync as passed;
those paths no longer exist.
