// Append-only evidence trail for clinical and administrative actions.
//
// Detail must describe the event, never contain secrets, TOTP values, consent
// artefacts or full FHIR payloads. The audit row is syncable/append-only and is
// intentionally absent from the monitoring write path.

import type { DataSource } from "./index";
import { getDeviceId, now, uuid } from "./helpers";
import { getCurrentTenantId, tenantAnd } from "./tenant";

export interface AuditInput {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
}

export async function writeAudit(
  db: DataSource,
  input: AuditInput
): Promise<void> {
  const ts = now();
  await db.run(
    `INSERT INTO audit_log
       (id, user_id, action, entity, entity_id, detail, created_at, updated_at,
        device_id, dirty, deleted, tenant_id)
     VALUES (?,?,?,?,?,?,?,?,?,1,0,?)`,
    [
      uuid(),
      input.userId,
      input.action,
      input.entity,
      input.entityId ?? "",
      input.detail ?? "",
      ts,
      ts,
      getDeviceId(),
      getCurrentTenantId(),
    ]
  );
}

export async function recentAudit(
  db: DataSource,
  entity: string,
  entityId: string,
  limit = 100
) {
  const [tenantClause, tenantParams] = tenantAnd();
  return db.all<{
    id: string;
    user_id: string;
    action: string;
    detail: string;
    created_at: number;
  }>(
    `SELECT id, user_id, action, detail, created_at
     FROM audit_log
     WHERE deleted = 0 AND entity = ? AND entity_id = ? ${tenantClause}
     ORDER BY created_at DESC LIMIT ?`,
    [entity, entityId, ...tenantParams, limit]
  );
}
