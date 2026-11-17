---
name: DiagBill Google Dashboard
description: Use when deploying, changing or troubleshooting the optional external Google Drive -> BigQuery -> Looker Studio dashboard for OmniMed Core. Keeps the desktop app untouched and the pipeline read-only, fail-closed and privacy-minimised.
---

# OmniMed Core Google dashboard operations

This skill covers the **external** dashboard kit in `google-dashboard/`. It is not part of the desktop
app and must never become a dependency of OmniMed Core operations.

## Read first

- `../../../google-dashboard/README.md` — deployment, safety boundary, environment
- `../../../GOOGLE_DASHBOARD.md` — full architecture and acceptance tests
- `../../../LOCAL_CSV_EXPORT.md` — CSV contract and export limitations
- `../../../google-dashboard/src/dashboardSchema.mjs` — table/column allowlist
- `../../../google-dashboard/src/pipeline.mjs` — fail-closed activation logic
- `../../../google-dashboard/sql/views.sql` — Looker Studio views
- `../../../src/sync/syncEngine.ts` and `fullExport.ts` — existing app export path (read-only)

## Non-negotiable invariants

1. The desktop app writes the existing CSVs. The dashboard kit never modifies `src/`, `src-tauri/`,
   the queue, the scheduler or the database.
2. The kit is read-only. No write-back, upload ACK, correction propagation or remote monitoring.
3. Only the newest **complete** full snapshot is loaded. Transaction CSVs are not mixed into financial
   snapshot totals.
4. Validate the manifest, safe file names, headers, row counts, tenant id and size limits before any
   BigQuery write.
5. Load only the approved `DASHBOARD_TABLES` columns. Never add patient names, phone numbers, addresses,
   ABHA IDs, clinical free text, signatures or authentication secrets.
6. Load all tables into snapshot-tagged raw tables, then switch `_current_snapshot` once. A failed load
   leaves the previous snapshot active.
7. An already active snapshot is skipped. Scheduler retries must be idempotent.
8. `ALLOW_MISSING_TABLES` stays `false` for production. Missing required tables fail the run.
9. Show **last updated**, never **live**. The app exports daily, not in real time.
10. Keep BigQuery/Looker private. No public report links, no general-viewer patient pages.

## Local validation

```powershell
npm run check:dashboard
node google-dashboard/src/main.mjs --source local `
  --folder "%USERPROFILE%\My Drive\OmniMed Core\outbox\full-export" `
  --dry-run
```

A dry run performs no BigQuery writes. It must list every required table and exit zero.

## Deployment order

1. Confirm the app export folder contains a complete `snapshot_*` directory with `_manifest.json`.
2. Share only that Drive folder with the ingestion service account as Viewer.
3. Deploy the Cloud Run job from `google-dashboard/`.
4. Run the job manually and confirm the log reports a snapshot id plus table counts.
5. Confirm `v_data_freshness` shows the expected snapshot.
6. Add the Cloud Scheduler trigger.
7. Connect Looker Studio to the `omnimed_reporting` views and restrict access.

## Failure handling

- A failed or stale pipeline must be treated as a dashboard issue, not an OmniMed Core incident.
- Read `pipeline_runs.error` and the Cloud Run log first.
- A malformed snapshot is not activated; fix the export and let the next run pick it up.
- To roll back, point `_current_snapshot.snapshot_id` at a retained previous snapshot.
- Do not ask clinic staff to stop billing, re-export the database or change the desktop app to recover
  the dashboard.

## Change checklist

- [ ] `npm run check`, `npm run check:dashboard`, terminal build, monitor build and Rust tests pass
- [ ] `dashboardSchema.mjs` allowlist reviewed for new PII
- [ ] `sql/views.sql` updated for new reporting fields
- [ ] README, GOOGLE_DASHBOARD.md and release notes updated
- [ ] Local dry run passes on a real snapshot copy
- [ ] No desktop-app import, network call or queue change added
- [ ] Deployment and rollback tested in a non-production Cloud project
