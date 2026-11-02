// Key/value lab settings (lab name, GSTIN, invoice prefix, device code…).
//
// Settings are PER TENANT. Each diagnostic centre has its own lab name,
// GSTIN, address and invoice numbering, so a setting row is keyed by
// (tenant_id, key) rather than by key alone.

import type { DataSource } from "./index";
import { getDeviceId, now } from "./helpers";
import { getCurrentTenantId, tenantWhere } from "./tenant";

export async function getSetting(
  db: DataSource,
  key: string,
  fallback = "",
  tenantId: string = getCurrentTenantId()
): Promise<string> {
  const [tenantClause, tenantParams] = tenantWhere(tenantId);
  const row = await db.get<{ value: string }>(
    `SELECT value FROM settings ${tenantClause} AND key = ?`,
    [...tenantParams, key]
  );
  return row?.value ?? fallback;
}

export async function setSetting(
  db: DataSource,
  key: string,
  value: string,
  tenantId: string = getCurrentTenantId()
): Promise<void> {
  const [tenantClause, tenantParams] = tenantWhere(tenantId);
  const existing = await db.get<{ key: string }>(
    `SELECT key FROM settings ${tenantClause} AND key = ?`,
    [...tenantParams, key]
  );
  if (existing) {
    // The WHERE clause is written out in full rather than reusing `tenantAnd()`
    // ("AND tenant_id = ?"). Without the keyword "WHERE", SQLite parses
    // "updated_at = ? AND tenant_id = ? AND key = ?" as an expression inside the
    // SET list, so the statement updates EVERY row in the table: saving one
    // setting would overwrite every other setting, in every tenant, with the
    // same value.
    await db.run(
      `UPDATE settings SET value = ?, updated_at = ? ${tenantClause} AND key = ?`,
      [value, now(), ...tenantParams, key]
    );
  } else {
    await db.run(
      `INSERT INTO settings (tenant_id, key, value, updated_at, device_id)
       VALUES (?,?,?,?,?)`,
      [tenantId, key, value, now(), getDeviceId()]
    );
  }
}

export async function getSettings(
  db: DataSource,
  keys: string[],
  tenantId: string = getCurrentTenantId()
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const key of keys) out[key] = await getSetting(db, key, "", tenantId);
  return out;
}
