---
name: DiagBill Sync
description: Use when changing MediCore's append-only sync queue, background push loop, cloud sync receiver, PostgreSQL central store or read-only Next.js dashboard.
---

# MediCore sync and central dashboard

Use this skill for the optional hosted/cloud tier. It is a **pilot sync module**, not a production
multi-master sync service.

## Read first

- `../../../src/db/schema.ts` — migration 17, `sync_queue`, `sync_ack`, entity triggers
- `../../../src/sync/syncEngine.ts` — 30-second loop, health check, batch POST and ACK persistence
- `../../../src/sync/syncConfig.ts` — device-local endpoint/token
- `../../../src/pages/SyncSettings.tsx` — Settings → Device & sync configuration/status
- `../../../cloud-dashboard/` — Next.js receiver, PostgreSQL schema and `/dashboard`
- `../../../docs/architecture.md` — current sync boundary and target architecture
- `../../../cloud-dashboard/README.md` — API contract and deployment limits

## Current behavior

- SQLite triggers append invoice/report/admission snapshots to `sync_queue`.
- `sync_queue` is insert-only. `sync_ack` appends ACK rows and queue rows are never deleted.
- The Tauri app checks the endpoint every 30 seconds while the app is open.
- `GET {endpoint}/health` checks reachability.
- `POST {endpoint}/sync/push` sends up to 100 events.
- Successful ACKs are inserted in `sync_ack`; the next poll skips those queue rows.
- The Next.js `/api/sync/push` is idempotent on `queue_id` and returns `{ acks }`.
- The central PostgreSQL store is append-only (`sync_events`).
- `/dashboard?tenant=...` is a read-only HTML page protected by Basic auth.

## Change rules

1. Never include real patient data in queue fixtures, local tests, screenshots or logs.
2. Keep sync append-only. Do not delete queue rows to mark success; append to `sync_ack`.
3. The terminal remains the source of truth. Cloud views are read-only.
4. Do not make the dashboard a write API or allow terminal writes from the web.
5. Preserve tenant isolation. Every queue read/ack and central query must be tenant-scoped.
6. Do not claim conflict resolution, full multi-master sync, deletion propagation, per-device token
   rotation, SSO or OS background sync until implemented and tested.
7. The current 30-second loop runs only while the desktop app is open; do not call it a Windows service.
8. Sync token storage is currently device-local/browser storage. Move it to OS-secure storage before GA.
9. Any sync schema change requires updating local and central schemas, the API contract and tests.
10. Keep the CORS/token model documented. Per-device tokens are a release gate, not delivered.

## Verification

1. `npm run check` and both Vite builds.
2. `cd cloud-dashboard && npm run build`.
3. `npm run tauri build` and launch the packaged app.
4. Confirm schema migration to 17, trigger creation, queue backfill and DB integrity.
5. Create/update a synthetic invoice, report and admission; confirm queue rows and no ACKs.
6. With a local Next/Postgres receiver, configure Device & sync, run Sync now, confirm ACK rows.
7. Confirm duplicate queue IDs return idempotent ACKs and the dashboard reflects latest events.
8. Test invalid token, wrong tenant, CORS preflight and an offline endpoint.
9. Confirm the dashboard cannot be accessed without Basic auth and cannot mutate data.
