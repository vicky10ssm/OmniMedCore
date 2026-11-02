// Multi-tenant context for the application.
//
// Provides tenant resolution, default tenant bootstrap, and tenant-scoped helpers.
// For single-tenant desktop use, a default tenant is auto-created and used.
// For multi-tenant SaaS, tenants are managed separately.

import { getDb } from "./index";
import { now, uuid } from "./helpers";
import type { TenantRow } from "./types";

/**
 * The slice of a data source these helpers need.
 *
 * Declared here rather than importing `DataSource` so this module has no
 * type-level dependency back on ./index. The runtime import of `getDb` already
 * creates a cycle, and a type-only cycle on top of it is a trap.
 */
export interface TenantStore {
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

const DEFAULT_TENANT_ID = "tenant-default";
const DEFAULT_TENANT_SLUG = "default";

let currentTenantId: string | null = null;

export function getCurrentTenantId(): string {
  if (currentTenantId) return currentTenantId;
  return DEFAULT_TENANT_ID;
}

export function setCurrentTenantId(tenantId: string): void {
  currentTenantId = tenantId;
}

/**
 * Creates the default tenant if it is missing.
 *
 * IMPORTANT: `store` must be passed when this runs during database creation.
 * Calling `getDb()` from inside the boot sequence deadlocks: `getDb()` returns
 * the very promise that is waiting for this function to finish, so the boot
 * hangs on "Opening database" forever.
 */
export async function ensureDefaultTenant(
  store?: TenantStore
): Promise<TenantRow | undefined> {
  const db = store ?? (await getDb());
  let tenant = await db.get<TenantRow>(
    "SELECT * FROM tenants WHERE id = ? AND deleted = 0",
    [DEFAULT_TENANT_ID]
  );

  if (!tenant) {
    const ts = now();
    await db.run(
      `INSERT INTO tenants (id, name, slug, type, status, settings_json, subscription_plan,
         subscription_expires_at, created_at, updated_at, device_id, dirty, deleted)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [DEFAULT_TENANT_ID, "Default Diagnostic Centre", DEFAULT_TENANT_SLUG,
       "diagnostic", "active", "{}", "free", null, ts, ts, "", 1, 0]
    );
    tenant = await db.get<TenantRow>(
      "SELECT * FROM tenants WHERE id = ? AND deleted = 0",
      [DEFAULT_TENANT_ID]
    );
  }

  if (tenant) {
    setCurrentTenantId(tenant.id);
  }

  return tenant;
}

export async function getAllTenants(store?: TenantStore): Promise<TenantRow[]> {
  const db = store ?? (await getDb());
  return db.all<TenantRow>(
    "SELECT * FROM tenants WHERE deleted = 0 ORDER BY created_at ASC"
  );
}

export async function createTenant(
  name: string,
  slug: string,
  type: "diagnostic" | "hospital" | "clinic" = "diagnostic",
  store?: TenantStore
): Promise<TenantRow> {
  const db = store ?? (await getDb());
  const id = uuid();
  const ts = now();

  await db.run(
    `INSERT INTO tenants (id, name, slug, type, status, settings_json, subscription_plan,
       subscription_expires_at, created_at, updated_at, device_id, dirty, deleted)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)`,
    [id, name, slug, type, "active", "{}", "free", null, ts, ts, "", 1]
  );

  const tenant = await db.get<TenantRow>("SELECT * FROM tenants WHERE id = ?", [id]);
  return tenant!;
}

/**
 * The tenant predicate plus its bound value.
 *
 * Always use this rather than building SQL by hand: a tenant id that reaches
 * the query as text is a cross-tenant data leak waiting to happen.
 *
 *   const [clause, params] = tenantFilter();
 *   db.all(`SELECT * FROM invoices WHERE ${clause}`, params);
 */
export function tenantFilter(tenantId?: string): [string, string[]] {
  const tid = tenantId || getCurrentTenantId();
  return ["tenant_id = ?", [tid]];
}

/**
 * `WHERE tenant_id = ?` — for a query that has no WHERE clause yet.
 */
export function tenantWhere(tenantId?: string): [string, string[]] {
  return [`WHERE tenant_id = ?`, [tenantId || getCurrentTenantId()]];
}

/**
 * `AND tenant_id = ?` — for a query that already has a WHERE clause.
 */
export function tenantAnd(tenantId?: string): [string, string[]] {
  return [`AND tenant_id = ?`, [tenantId || getCurrentTenantId()]];
}

/**
 * `AND <alias>.tenant_id = ?` — for a joined query where `tenant_id` would
 * be ambiguous because more than one table is in scope.
 */
export function tenantAndOn(
  alias: string,
  tenantId?: string
): [string, string[]] {
  return [`AND ${alias}.tenant_id = ?`, [tenantId || getCurrentTenantId()]];
}

/**
 * The business tables that carry a tenant_id and must never be read or
 * written unscoped.
 *
 * This is the single source of truth: the static scope check
 * (scripts/check-tenant-scope.mjs) parses this array out of the source, so
 * the lint and the application can never disagree about what a "tenant table"
 * means. Keep it in sync with the schema.
 */
export const TENANT_TABLES = [
  "settings",
  "users",
  "audit_log",
  "patients",
  "tests",
  "packages",
  "package_items",
  "doctors",
  "invoice_blocks",
  "invoices",
  "invoice_items",
  "payments",
  "expense_categories",
  "expenses",
  "payouts",
  "commission_entries",
  "report_orders",
  "test_parameters",
  "report_parameters",
  "samples",
  "report_result_revisions",
  "abdm_consents",
  "abdm_outbox",
  "admissions",
  "hospital_services",
  "hospital_charges",
  "hospital_bill_payments",
  "medicines",
  "pharmacy_batches",
  "pharmacy_sales",
  "pharmacy_sale_items",
] as const;
