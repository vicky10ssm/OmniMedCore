# Hotfix and rollback process

Last updated: 2 November 2026  
Applies to: terminal, monitor, vendor licence portal and future Windows/Tauri releases

## 1. Purpose

This runbook defines how to fix a released defect and how to roll back safely without losing or silently
corrupting patient, financial or licence data.

A hotfix is an exceptional release. It is not permission to bypass testing, branch protection or
evidence.

## 2. Severity and approval

| Severity | Example | Action |
| --- | --- | --- |
| S1 | Data loss, cross-tenant exposure, licence bypass, wrong patient/report release, failed payment posting | Immediate incident lead; hotfix or rollback decision |
| S2 | Major workflow blocked, wrong totals limited to one path, repeated crash | Hotfix within agreed support window |
| S3 | Cosmetic or low-impact defect | Normal release train |

For S1/S2:

- Assign an incident lead.
- Record the affected version, tag, commit, schema version, tenant/device and time detected.
- Preserve logs and evidence without copying real patient data into tickets.
- Decide explicitly: **forward fix**, **code rollback**, or **data restore**.
- Obtain approval from the product/technical lead and, where clinical/financial data is affected, the
  clinical/commercial owner.

Never make an undocumented database edit to “fix” production data.

## 3. Branch and version rules

- Production releases are immutable annotated tags, e.g. `v0.1.0`.
- Hotfix tags increment the patch version, e.g. `v0.1.1`.
- Hotfix branches: `hotfix/v0.1.1-short-description`.
- If `main` contains no unreleased changes, branch from `main`.
- If `main` has diverged, branch from the production tag, apply the minimal fix, release it, then merge
  the fix back into `main`.
- Never tag a dirty working tree.
- Never move or force-push a release tag.
- Never hotfix by rebuilding from an untagged local folder.

## 4. Hotfix workflow

### 4.1 Reproduce and bound the defect

1. Reproduce on a clean database/profile with synthetic data where possible.
2. Record the smallest reliable reproduction.
3. Identify affected editions/modules, tenant/device conditions and schema versions.
4. Check whether the defect has already written incorrect financial or clinical data.
5. Decide whether new writes must be paused.

### 4.2 Create the hotfix branch

```powershell
cd C:\dev\medicore
git fetch --tags origin
git status
git switch -c hotfix/v0.1.1-short-description v0.1.0
```

If branching from `main` is explicitly correct:

```powershell
git switch -c hotfix/v0.1.1-short-description main
```

### 4.3 Make the smallest safe change

- Fix the root cause, not just the visible symptom.
- Do not mix refactors, unrelated features or broad formatting changes.
- Preserve tenant scope, money invariants, report revisions, licence binding and read-only behavior.
- If a database change is required:
  - add a new migration; never edit an old migration
  - test fresh, upgrade and repeated migration
  - include a pre-migration backup requirement
  - document whether downgrade is impossible

### 4.4 Verify

Run:

```powershell
npm ci
npm run check
npm run build
npm run build:monitor
```

Then exercise the affected workflow with synthetic data. Use
[PRE_RELEASE_CHECKLIST.md](PRE_RELEASE_CHECKLIST.md). At minimum:

- tenant-scope check
- money/GST/payment path
- licence activation/edition/grace path if affected
- operator role path if affected
- sample/report release and disposal gate if affected
- monitor write refusal
- browser console errors
- production bundle scan for forbidden DEV/secrets

### 4.5 Review and merge

```powershell
git add <changed-files>
git commit -m "fix: describe the hotfix"
git push -u origin hotfix/v0.1.1-short-description
gh pr create --base main --head hotfix/v0.1.1-short-description `
  --title "fix: describe the hotfix" `
  --body "Incident reference, root cause, tests and rollback impact."
```

Required CI checks and branch protection must apply. Do not bypass them unless an incident commander
records the reason and compensating checks.

### 4.6 Tag and publish

After the fix is on `main`:

```powershell
git switch main
git pull --ff-only
git tag -a v0.1.1 -m "MediCore v0.1.1 hotfix"
git push origin v0.1.1
```

Build from the tag, not from a local branch:

```powershell
git clone <repository-url> C:\build\medicore-v0.1.1
cd C:\build\medicore-v0.1.1
git checkout v0.1.1
npm ci
npm run check
npm run build
npm run build:monitor
```

Publish:

- signed installer when available
- terminal bundle
- monitor bundle
- SHA-256 checksums
- release notes
- known limitations
- rollback artifact reference

### 4.7 Deploy and verify

1. Announce the maintenance window.
2. Confirm a current database backup and restore evidence.
3. Install the hotfix.
4. Run schema migrations.
5. Execute smoke tests for the affected workflow.
6. Confirm licence/edition and read-only state.
7. Verify invoice/payment/report/sample counts.
8. Record deployment evidence and support sign-off.

## 5. Rollback decision

Rollback is not always safer than a forward fix. Choose deliberately.

| Situation | Preferred action |
| --- | --- |
| New binary broke a workflow but DB schema is unchanged | Roll back the binary |
| New migration is backward-compatible | Binary rollback may be possible with written approval |
| Migration is destructive or backward-incompatible | Forward fix; do not run an old binary against the new schema |
| Incorrect data already written | Stop writes, preserve evidence, correct with an audited data procedure |
| Licence build is wrong | Restore previous signed installer and issue/reimport the correct licence |
| Security exposure | Isolate, rotate credentials/keys, then forward fix |

### 5.1 Stop and preserve

1. Stop new financial/clinical writes if data integrity is uncertain.
2. Preserve the current database and logs:
   - copy the DB using the supported backup procedure
   - record the file hash
   - do not overwrite the pre-upgrade backup
3. Record the current app version, schema version, tag, commit and device.
4. Record the last known-good transaction/report/sample.

### 5.2 Roll back the application

Only when the schema is compatible:

1. Restore the previous signed installer/artifact.
2. Restore the matching pre-upgrade database only if required and approved.
3. Verify tenant isolation, login, invoices, payments, reports, samples, licence and printer output.
4. Confirm no new data is silently discarded.
5. Record rollback timestamps, actor and evidence.

### 5.3 Database restore warning

A database restore can erase legitimate records created after the backup. It must be a conscious,
approved incident action, not a routine rollback step. Never run a pre-migration database under a newer
schema without a documented compatibility decision.

### 5.4 Roll forward

If rollback would lose data or violate schema compatibility:

- disable the affected workflow if possible
- fix forward under incident control
- communicate the temporary workaround
- preserve audit evidence
- obtain buyer acceptance for any manual reconciliation

## 6. Customer communication

For S1/S2:

- Acknowledge impact without speculation.
- State what data/workflows are affected.
- Give a safe workaround if one exists.
- Give the next update time, not an unsupported fix time.
- Confirm when normal operation is restored.
- Do not include patient data or secrets in messages.

Template:

> We are investigating an issue affecting [workflow] on MediCore [version]. Please pause [specific action]
> and continue [safe alternative]. Existing records remain [available/not available] as described below.
> We will update you by [time]. No action is required beyond [specific step].

## 7. Post-incident

Within the agreed support window:

- Record timeline, impact, root cause and corrective actions.
- Identify whether tenants, licences, reports or money were affected.
- Add regression tests and a pre-release verification task.
- Review whether the release gate missed the defect.
- Update known issues, runbooks and support guidance.
- Rotate secrets/keys if exposure is possible.
- Close the incident only after verification evidence is attached.

## 8. Rollback readiness checklist

- [ ] Current and previous signed artifacts retained
- [ ] Matching checksums retained
- [ ] Pre-upgrade database backup exists and hash recorded
- [ ] Restore test evidence exists
- [ ] Schema compatibility/downgrade decision recorded
- [ ] Incident owner and approval recorded
- [ ] Stop-writes procedure understood
- [ ] Smoke-test checklist available
- [ ] Customer communication approved
- [ ] Post-incident review scheduled

## 9. Related documents

- [PRE_RELEASE_CHECKLIST.md](PRE_RELEASE_CHECKLIST.md)
- [SECURITY.md](SECURITY.md)
- [docs/deployment-and-readiness.md](docs/deployment-and-readiness.md)
- [docs/productionization-plan.md](docs/productionization-plan.md)
