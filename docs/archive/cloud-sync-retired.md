# Retired cloud sync design

This document is retained only as historical context. The hosted API/cloud sync and
read-only cloud dashboard were removed in MediCore 0.4.0. The current integration path is the local
Google Drive CSV outbox described in [LOCAL_CSV_EXPORT.md](../LOCAL_CSV_EXPORT.md).

## 7. Historical cloud sync design (retired)

This section is retained only as historical design context. It is **not implemented or active**; the current product uses the local CSV outbox instead.

### 7.1 Device registration

1. Admin creates a one-time enrolment code in the cloud tenant console.
2. Terminal generates a cryptographic device keypair or strong device secret.
3. Terminal submits enrolment code + device public identity.
4. Server binds device to tenant, assigns a unique device code, returns a device credential.
5. Credential is stored in Windows Credential Manager/OS keystore, not in plain settings.
6. Server can revoke a lost/stolen device immediately.

Device code suggestions must be unique per tenant. Never rely on â€œA/B/Câ€ being manually typed correctly
for production numbering safety.

### 7.2 Terminal sync state

Target additions:

```text
sync_outbox
  operation_id (UUID, idempotency key)
  entity_table
  entity_id
  operation (upsert/delete/event)
  base_version
  payload_json
  created_at
  attempts
  next_attempt_at
  last_error

sync_state
  tenant_id
  device_id
  last_pull_cursor
  last_success_at
  schema_version
  status

sync_conflicts
  id
  entity_table / entity_id
  local_payload / remote_payload
  reason
  created_at
  resolved_at / resolved_by / resolution
```

`dirty` can remain as a UI/materialisation hint, but the durable outbox is the source of retries. A row
is marked clean only after the server acknowledges that operation.

### 7.3 Write path on the terminal

Every local mutation and its outbox entry happen in the **same SQLite transaction**:

```text
BEGIN
  write business row
  insert sync_outbox(operation_id, table, id, base_version, payload)
  set row dirty = 1
COMMIT
```

This guarantees a committed bill/report cannot exist without a pending sync intent.

The UI can attempt sync immediately but must never wait for it to complete billing.

### 7.4 Push protocol

Proposed endpoint:

```http
POST /v1/sync/push
Authorization: Device <token>
Idempotency-Key: <batch UUID>
{
  "schemaVersion": 17,
  "deviceId": "...",
  "operations": [
    {
      "operationId": "...",
      "table": "payments",
      "id": "...",
      "kind": "insert",
      "baseVersion": 0,
      "payload": { "...": "..." }
    }
  ]
}
```

Server processing:

1. Authenticate device, derive tenant, reject tenant mismatch in payload.
2. Validate schema/version and allowed table/operation.
3. Deduplicate by `operation_id`; return prior result for retries.
4. Validate references belong to same tenant.
5. Apply the table's conflict policy.
6. Assign a monotonically increasing `server_seq` to every accepted row/change.
7. Commit accepted operations atomically where practical.
8. Return `accepted`, `duplicates`, `conflicts` and retryable errors.

Terminal then:

- Deletes/marks acknowledged outbox operations.
- Marks rows clean only if no newer local edit occurred meanwhile (compare value/version).
- Records conflicts for human resolution.
- Retries transient failures with exponential backoff + jitter.

### 7.5 Pull protocol

```http
GET /v1/sync/pull?cursor=48120&limit=500
Authorization: Device <token>
```

Response:

```json
{
  "changes": [
    {
      "serverSeq": 48121,
      "table": "invoices",
      "id": "...",
      "rowVersion": 3,
      "deleted": false,
      "payload": { "...": "..." }
    }
  ],
  "nextCursor": 48620,
  "hasMore": true
}
```

Terminal:

1. Opens a local transaction.
2. Applies changes in `serverSeq` order.
3. Upserts only after conflict checks.
4. Stores `nextCursor` only after commit.
5. Repeats until `hasMore=false`.
6. Never marks pulled rows dirty just because they were downloaded.

Cursors are per device. Tombstones should remain available long enough for offline devices (for example
90 days) before archival; a device offline beyond that must perform a full resync rather than silently
miss deletions.

### 7.6 Data classes and conflict policy

| Data | Write class | Conflict rule |
| --- | --- | --- |
| Patients | Mutable master | Version-checked update; expose conflict when base version stale. Do not merge names/phones silently. |
| Tests, packages, doctors | Mutable catalog | Version-checked/LWW with audit and conflict notice; prices must not silently change historical invoice lines. |
| Settings, logo, module config | Mutable config | LWW by server receipt order with audit; large assets may move to object storage later. |
| Invoice header/items | Financial document | Insert once; do not edit historical amounts. Corrections are cancel + reissue. |
| Payments | Append-only | Always insert a new UUIDed payment; never update amount in place. |
| Expenses | Financial record | Prefer append-only correction; admin edits use version checks and audit. |
| Legacy commission entries | Append-only legacy data | No new rows are generated; do not reintroduce referral commission accrual/payout without legal/compliance review. |
| Samples | Clinical workflow | Version-checked transition. Two offline conflicting transitions are quarantined for review. |
| Report orders/parameters | Clinical result | Version-checked; **never last-write-wins**. Conflicting releases/amendments require pathologist resolution. |
| Report revisions/audit | Append-only | Accept every unique event; immutable. |
| Admissions | Clinical workflow | Version-checked status/admission/discharge. Conflicting discharge or ward changes are quarantined. |
| Medicines / batches | Pharmacy inventory | Version-checked batch receipt; batch quantity is a controlled stock movement, not blind LWW. |
| Pharmacy sales/items | Financial + stock | Sale and items insert-once; cancellation is a reasoned event that returns stock. Conflicting cancellation/payment states need review. |
| ABDM consents/outbox | Sensitive clinical/integration | Version-checked consent; outbox drafts append-only. Monitor never writes. |
| Invoice number blocks | Allocation | Server-exclusive block lease; no overlapping ranges. Applies to invoices, admissions and pharmacy receipts. |

### 7.7 Invoice numbering across terminals

Production sequence:

1. A terminal requests a block from the server:
   `POST /v1/invoice-blocks/claim { purpose: "invoice" }`.
2. Server transaction allocates a non-overlapping `[start,end]` range for that tenant/device.
3. Terminal consumes locally while offline.
4. Before exhausting, it claims another block when online.
5. Pre-provision at least one reserve block so a normal offline period cannot exhaust numbering.
6. If reserve is exhausted offline, the terminal uses a device-code fallback reserved uniquely for that
   device or blocks finalization until a block is claimed. It must never generate a range that could
   collide with another device.
7. Every block lease is auditable. Unused gaps from cancelled/abandoned ranges are acceptable.

The current local implementation starts at 1 and extends locally; this is a development safety net, not
the final multi-terminal allocation protocol.

### 7.8 Idempotency, retries and ordering

- Every operation has a UUID idempotency key.
- Server stores operation results for at least the maximum retry horizon.
- Terminal retry: exponential backoff (e.g. 2s, 4s, 8sâ€¦ capped at 5 minutes) with jitter.
- Sync is bounded and resumable.
- Parent masters should be sent before dependent rows in a batch.
- The server should accept valid subsets even if another operation conflicts; terminal handles the
  conflict queue.
- A device upgrade incompatibility returns a clear â€œupdate requiredâ€ response; terminal continues local
  billing and retries after upgrade.
- Network failure never rolls back a completed local bill.

### 7.9 Clocks and ordering

- Terminal `updated_at` is a hint, not authoritative; device clocks can be wrong.
- Cloud assigns authoritative `server_seq` and `received_at`.
- Version checks use server row versions/base versions, not only timestamps.
- Last-write-wins, where allowed, uses server receipt order and records both versions in audit.
- Clinical conflicts are never resolved by timestamp alone.

### 7.10 Deletions and retention

- Deletes are tombstones (`deleted=1`), never immediate hard deletes for business records.
- Cloud propagates tombstones with `server_seq`.
- Financial and clinical records should generally not be deleted; use cancellation/amendment.
- Tombstone retention must exceed the longest supported offline period.
- Monitor must not expose deleted rows.
- Export/deletion on tenant offboarding is a separate documented workflow with legal review.

### 7.11 Tenant and security enforcement

- Server derives `tenant_id` from the authenticated device/user, never from the payload.
- Every server query includes tenant scope.
- Every referenced row is validated within that tenant.
- Row-level security in PostgreSQL is recommended as defence in depth.
- Monitor tokens cannot call sync/push endpoints.
- Device tokens can be revoked individually.
- Do not sync plaintext TOTP secrets, recovery codes or password hashes to the monitor database.
  If user administration must sync, use a separately protected security channel and explicit design.
- TLS in transit; encrypted local DB and encrypted backups at rest.
- Logs exclude patient names, ABHA, consent artefacts and FHIR payloads.

### 7.12 Sync scheduling and UX

- Sync on app start, network reconnect, after important writes (debounced), and periodically.
- Manual **Sync now** action.
- UI status examples:
  - â€œAll changes synced Â· 2 min agoâ€
  - â€œOffline â€” 14 changes waitingâ€
  - â€œConflict: report amendment needs reviewâ€
  - â€œUpdate required before cloud syncâ€
- Never show a generic success when only local persistence succeeded.
- Conflict resolution must name the affected patient/report or invoice and require an authorised user.

### 7.13 Monitor read model

The monitor is not a second terminal:

- Read-only endpoints such as `GET /v1/monitor/summary`, `/invoices`, `/reports`.
- No `/sync/push`, `/billing`, `/patients/update`, `/reports/release` for monitor tokens.
- Tenant and role scope derived server-side.
- Admin-only money views.
- Data minimisation: no TOTP secrets, encryption keys, raw audit payloads or unnecessary identifiers.
- Optional freshness timestamp from the last accepted terminal sequence.
- If cloud is stale/offline, show â€œLast updatedâ€¦â€ rather than pretending live.

## 8. Sync sequence diagrams

### Offline bill and later push

```text
Terminal UI       Local SQLite          Sync worker          Cloud
    â”‚                  â”‚                    â”‚                 â”‚
    â”‚ create bill      â”‚                    â”‚                 â”‚
    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚                    â”‚                 â”‚
    â”‚                  â”‚ write rows+outbox  â”‚                 â”‚
    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ commit             â”‚                 â”‚
    â”‚ print invoice    â”‚                    â”‚                 â”‚
    â”‚                  â”‚                    â”‚ network returns â”‚
    â”‚                  â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤                 â”‚
    â”‚                  â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚ push operations â”‚
    â”‚                  â”‚                    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚
    â”‚                  â”‚                    â”‚                 â”‚ validate/seq
    â”‚                  â”‚                    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
    â”‚                  â”‚ ack/clear outbox   â”‚                 â”‚
    â”‚                  â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤                 â”‚
```

### Second terminal pulls changes

```text
Terminal B       Local SQLite         Cloud
    â”‚                 â”‚                  â”‚
    â”‚ sync now        â”‚                  â”‚
    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚ GET pull(cursor) â”‚
    â”‚                 â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚
    â”‚                 â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ changes + seq
    â”‚                 â”‚ apply transactionâ”‚
    â”‚                 â”‚ save new cursor  â”‚
    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤                  â”‚
```

### Monitor

```text
Phone browser     Monitor API        Cloud DB
    â”‚                 â”‚                  â”‚
    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚ read-only query  â”‚
    â”‚                 â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚
    â”‚                 â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤ tenant/role data â”‚
```

## 9. Conflict examples

### Same patient edited on two terminals

- Both edit offline.
- First accepted by cloud gets row version 4.
- Second has base version 3.
- For demographic fields, policy can show a conflict or apply approved LWW with audit.
- Do not merge names/identifiers silently.

### Two terminals collect the same balance

Offline, both may accept a payment. Payments themselves are append-only and sync safely, but the invoice
may become overpaid. The cloud/read model must flag overpayment, and operations must resolve via refund
or credit note. Prevention requires connectivity-aware balance checks or stricter terminal ownership.

### Two result releases/amendments

- Never choose by `updated_at`.
- Server rejects/references the stale base version.
- Terminal creates a clinical conflict.
- Authorised pathologist reviews both snapshots, chooses the valid current revision and records an
  amendment reason. Both original events remain in history.

### Sample rejected on one terminal, accepted on another

- Version-checked transition conflict.
- Quarantine; do not report automatically.
- Operator resolves using physical sample status and documented reason.

### Invoice number collision

- Should be impossible with server-exclusive blocks and unique device codes.
- If observed, stop sync for affected block, preserve evidence, issue replacement numbers through the
  controlled exception process, notify support.

## 10. Failure scenarios

| Failure | Expected behavior |
| --- | --- |
| No internet during billing | Local bill completes; outbox grows; sync status shows pending |
| API unavailable | Retry/backoff; terminal remains usable |
| API timeout after server commit | Idempotency key prevents duplicate records |
| Device clock wrong | Server sequence/version wins; timestamp issue recorded |
| Local disk full | Block further writes with clear error; do not silently lose outbox |
| Local DB corrupt | Restore backup; do not sync uncertain state |
| Schema mismatch | Terminal stays local; prompts upgrade; no partial sync |
| Sync conflict | Quarantine locally, block affected merge, alert authorised user |
| Revoked device | API rejects; local read/export policy defined; no further upload |
| Cloud data lost | Restore cloud from backup; terminal local data remains primary for recovery |
| Tenant deletion/offboarding | Export, verify, revoke devices, delete by policy, issue evidence |

## 11. Sync test plan

At minimum automate:

1. One terminal external cycle: create 100 offline invoices, reconnect, push, verify cloud count.
2. Two terminals creating invoices offline with distinct blocks; no number collision.
3. Pull cursor and tombstone propagation to a terminal that reconnects.
4. Retry with same idempotency key after simulated timeout; no duplicate.
5. Patient edit conflict.
6. Concurrent report amendment conflict; no silent overwrite.
7. Sample accept vs reject conflict.
8. Overpayment after concurrent offline payments; exception flagged.
9. Device revocation.
10. Tenant A token cannot read/write Tenant B.
11. Schema version mismatch.
12. 30-day offline device catches up or triggers full resync.
13. Monitor cannot call write endpoints.
14. Cloud restore plus terminal re-push without duplicates.
15. Load test at expected invoice/report volume.
