# Contributing to MediCore

## Prerequisites

- Windows 10/11 64-bit for target testing
- Node.js `24.22.0`
- npm
- PowerShell

Use the pinned Node version from `.node-version` or `.nvmrc`.

## Setup

```powershell
cd C:\dev\medicore
npm ci
npm run dev
```

Do not use `npm install` for a reproducible checkout unless you intentionally need to update
`package-lock.json`.

## Before changing code

1. Read the relevant project skill under `.opencode/skills/`.
2. Read `FEATURE_DECISIONS.md`, `docs/architecture.md` and `docs/product-capabilities.md`.
3. Identify whether the change affects tenant scope, money, clinical evidence, licensing or release
   claims.
4. Use synthetic data only.

## Branches and commits

- Keep `main` protected.
- Work on short-lived branches: `feature/...`, `fix/...`, `hotfix/...`, `docs/...`.
- Use focused commits with an imperative summary, e.g. `fix: block disposal before result entry`.
- Do not mix unrelated refactors with clinical/financial changes.

## Required checks

Run from the repository root:

```powershell
npm run check
npm run build
npm run build:monitor
```

For browser/clinical workflows, run the seeded demonstration and exercise the affected UI. Follow
`.opencode/skills/diagbill-demo-qa/SKILL.md`.

## Engineering rules

### Money

- Store money as integer paise; never floating-point rupees.
- GST rates are basis points and line calculations must reconcile.
- Invoice corrections are cancellation plus re-issue.
- Do not delete payment/commission legacy rows to “clean up” history.

### Tenant scope

- Scope every business query and insert by `tenant_id`.
- Joined queries need tenant predicates on every tenant-owned table.
- Update `TENANT_TABLES`, boot repair lists and migration checks when adding tenant-owned tables.
- Run `npm run check:scope`.

### Database changes

- Add a new migration; do not reorder old migrations.
- Test fresh, old-version, partially migrated and repeat-migration paths.
- Update `scripts/check-migrations.mjs` and relevant types/query code.
- Preserve existing rows and financial totals.

### Clinical controls

- Pathology report release requires an accepted linked sample.
- Sample disposal is blocked until every linked test has complete entered results. Keep the UI and
  action-handler gate aligned.
- Do not weaken report revision/amendment evidence.
- Do not put real patient data in tests, fixtures, logs or screenshots.

### Licensing

- The app contains only the public licence-verification key.
- Never commit the portal private key.
- Test signature, tenant/device mismatch, grace, read-only and edition gating for licensing changes.
- Keep the vendor portal and app edition/module lists synchronized.

### Roles and privacy

- Terminal operators can add/view expenses but must not see Dashboard or profit/revenue summaries.
- Monitor builds remain read-only; UI hiding is not sufficient without data-access enforcement.
- Referral commissions are intentionally removed. Do not reintroduce commission visibility, accrual,
  payouts or reporting without written legal/compliance review.

## Documentation and skills

Update the relevant files when behavior changes:

- `docs/product-capabilities.md`
- `docs/architecture.md`
- `docs/licensing-and-editions.md` or `docs/licensing-process.md`
- `docs/deployment-and-readiness.md` and `docs/productionization-plan.md`
- `COMPLIANCE.md` for clinical/compliance evidence
- `FEATURE_DECISIONS.md` for product decisions
- `.opencode/skills/...` for implementation workflow guidance

Do not claim a roadmap capability as shipped.

## Pull requests

Use `.github/pull_request_template.md`. Include:

- what changed and why
- affected modules/editions
- tests actually run
- migration impact
- tenant/data/security impact
- screenshots for visible UI changes using synthetic data
- known limitations or follow-up work

A pull request that changes money, clinical evidence, tenant isolation or licensing needs explicit review
from the relevant owner.
