# MediCore cloud dashboard and sync receiver

A small Next.js App Router service for the optional hosted sync tier:

- `POST /api/sync/push` receives append-only terminal queue events and returns ACKs
- `GET /api/health` lets the terminal check endpoint reachability
- `GET /dashboard` is a read-only sales/report/admission dashboard protected by HTTP Basic auth

The terminal remains the source of truth. This service is an optional central view, not a full SaaS
control plane or an online write path.

## Requirements

- Node.js 24+
- PostgreSQL database
- HTTPS in front of the service for any non-local deployment

## Setup

```powershell
cd C:\dev\medicore\cloud-dashboard
npm ci
Copy-Item .env.example .env.local
```

Fill `.env.local` with real values. Never commit it.

Apply the central schema:

```powershell
psql $env:DATABASE_URL -f sql/central-schema.sql
```

Run locally:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000/dashboard?tenant=tenant-default
```

The browser prompts for `DASHBOARD_USER` / `DASHBOARD_PASSWORD`.

Build:

```powershell
npm run build
npm start
```

## Terminal configuration

In the Tauri app, open **Settings → Device & sync → Cloud sync**.

Set:

```text
Endpoint: https://your-dashboard.example.com/api
Token:    the value of SYNC_INGEST_TOKEN
```

The terminal pushes `POST {endpoint}/sync/push` and checks `GET {endpoint}/health`.

The queue groups changes into batches of 100 every 30 seconds while the desktop app is open. ACKs are
stored locally in `sync_ack`; queue rows are never deleted.

## API contract

### POST /api/sync/push

```http
Authorization: Bearer <SYNC_INGEST_TOKEN>
Content-Type: application/json

{
  "events": [
    {
      "queueId": "local-queue-id",
      "tenantId": "tenant-default",
      "deviceId": "terminal-device-id",
      "entityType": "invoice",
      "entityId": "invoice-id",
      "operation": "upsert",
      "payload": { "...": "snapshot fields" },
      "occurredAt": 1790000000000
    }
  ]
}
```

Response:

```json
{
  "acks": [
    { "queueId": "local-queue-id", "ackId": "central-ack-uuid" }
  ]
}
```

The ingest endpoint is idempotent on `queue_id`. Invalid payloads and batches over 100 events are rejected.

## Dashboard data

The dashboard uses the latest synced snapshot per `(tenant_id, entity_type, entity_id)`. It shows:

- latest invoice totals and statuses
- diagnostic report status and result summary
- admission status, ward/bed and diagnosis/reason

`sync_events` is append-only. Do not mutate or delete historical events in the central store.

## Security and deployment boundaries

- Dashboard is behind HTTP Basic auth. Use a strong password and HTTPS; replace with the owner’s
  identity provider/SSO before broad customer use.
- `SYNC_INGEST_TOKEN` is a device fleet secret in this first version. A production service should issue
  per-device tokens and support rotation/revocation.
- The dashboard queries are parameterized and read-only.
- Do not expose PostgreSQL publicly. Use private networking and a least-privilege read/write role for the
  ingest service.
- The central service is not a backup of the terminal. Terminal backups remain mandatory.
- This implementation is not a general hosted SaaS, subscription manager, ABDM service or real-time
  clinical system.
- CORS defaults to `*` for the bearer-token sync API. Set `SYNC_ALLOWED_ORIGIN` to the exact app origin
  in production if possible.

## Not implemented

- Per-device token provisioning/revocation
- Owner SSO/MFA
- Payment/subscription enforcement
- Server-side validation against the terminal schema
- Historical replay, conflict repair or deletion propagation
- Deployment manifests, TLS automation, uptime monitoring or backups
- Real-time updates or websockets
