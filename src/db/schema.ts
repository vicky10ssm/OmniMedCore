// Database schema — SQLite dialect (identical in the desktop app's local SQLite
// and in sql.js during development). Cloud (Postgres) mirrors this logically;
// the sync engine maps rows later.
//
// Multi-tenant ready from day 1 (Option 3):
//  - tenant_id on every business table (tenant isolation)
//  - tenants table for organizations/centers
//  - All queries must be scoped by tenant_id
//  - For single-tenant desktop use, a default tenant is auto-created
//
// Sync rules baked in from day 1 (see FEATURE_DECISIONS.md):
//  - UUID primary keys (id TEXT) — records created on different devices never collide
//  - created_at / updated_at (epoch ms) — last-write-wins merge key
//  - device_id — which terminal created the row
//  - dirty — row needs to be pushed to the cloud (outbox flag)
//  - deleted — soft-delete tombstone (so deletions propagate instead of resurrecting)
//  - tenant_id — tenant isolation (REQUIRED for all business data)
//  - Money is stored in PAISE (integers) — never floats.

export interface Migration {
  version: number;
  name: string;
  sql: string;
  /**
   * Run statement by statement, tolerating a failure in any one of them.
   *
   * `db.exec` runs a script as one unit: the first error aborts everything
   * after it. That is fine for schema changes, where the self-heal can pick up
   * the pieces, but not for data repairs — a repair that stops halfway leaves
   * rows half-migrated, which is worse than not migrating at all. A tolerant
   * migration runs each statement on its own and reports the ones that failed.
   */
  tolerant?: boolean;
}

/**
 * Splits a SQL script into individual statements.
 *
 * Comments are stripped first, because they may contain semicolons ("-- paid;
 * negative entries are reversals"), and quoted values are respected, so a
 * semicolon inside a string does not cut a statement in half.
 */
export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let current = "";
  let i = 0;
  let triggerBody = false;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment
    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      continue;
    }
    // Block comment
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    // Quoted literal
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      current += ch;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "\\" && quote !== "'") {
          current += sql[i] + (sql[i + 1] ?? "");
          i += 2;
          continue;
        }
        current += sql[i];
        if (sql[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (ch === ";") {
      if (!triggerBody && /^\s*create\s+(?:temp\s+)?trigger\b/i.test(current)) {
        triggerBody = true;
      }
      if (triggerBody) {
        // Trigger bodies contain semicolons; only the END before the closing
        // semicolon terminates the CREATE TRIGGER statement.
        const trimmed = current.trimEnd();
        if (!/(?:^|\s)END$/i.test(trimmed)) {
          current += ";";
          i += 1;
          continue;
        }
        triggerBody = false;
      }
      if (current.trim()) out.push(current.trim());
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const SYNC_COLUMNS = `
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  dirty INTEGER NOT NULL DEFAULT 1,
  deleted INTEGER NOT NULL DEFAULT 0
`;

const TENANT_COLUMN = `
  tenant_id TEXT NOT NULL DEFAULT ''
`;

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial schema",
    sql: `
      CREATE TABLE meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL DEFAULT 'diagnostic' CHECK (type IN ('diagnostic','hospital','clinic')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','inactive')),
        settings_json TEXT NOT NULL DEFAULT '{}',
        subscription_plan TEXT NOT NULL DEFAULT 'free',
        subscription_expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        dirty INTEGER NOT NULL DEFAULT 1,
        deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        tenant_id TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL CHECK (role IN ('admin','operator')),
        password_hash TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE UNIQUE INDEX idx_users_tenant_username ON users(tenant_id, username);

      CREATE TABLE audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        entity TEXT NOT NULL DEFAULT '',
        entity_id TEXT NOT NULL DEFAULT '',
        detail TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);

      CREATE TABLE patients (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT CHECK (gender IN ('male','female','other')),
        address TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL DEFAULT '',
        -- NABL/ISO 15189: Patient identification & consent
        dob TEXT NOT NULL DEFAULT '',
        id_proof_type TEXT NOT NULL DEFAULT '',
        id_proof_no TEXT NOT NULL DEFAULT '',
        abha_id TEXT NOT NULL DEFAULT '',
        consent_given INTEGER NOT NULL DEFAULT 0,
        consent_at INTEGER,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_patients_tenant ON patients(tenant_id);
      CREATE INDEX idx_patients_phone ON patients(phone);
      CREATE INDEX idx_patients_name ON patients(name);

      CREATE TABLE tests (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Pathology',
        price_paise INTEGER NOT NULL DEFAULT 0,
        gst_rate_bp INTEGER NOT NULL DEFAULT 1200,
        sac_code TEXT NOT NULL DEFAULT '999316',
        unit TEXT NOT NULL DEFAULT '',
        ref_range TEXT NOT NULL DEFAULT '',
        ref_min REAL,
        ref_max REAL,
        report_type TEXT NOT NULL DEFAULT 'text' CHECK (report_type IN ('text','numeric')),
        is_active INTEGER NOT NULL DEFAULT 1,
        -- NABL/ISO 15189: Test method, equipment, LOINC-like mapping
        method TEXT NOT NULL DEFAULT '',
        specimen_type TEXT NOT NULL DEFAULT '',
        container_type TEXT NOT NULL DEFAULT '',
        equipment_id TEXT NOT NULL DEFAULT '',
        loinc_code TEXT NOT NULL DEFAULT '',
        turnaround_time_hours INTEGER DEFAULT NULL,
        department TEXT NOT NULL DEFAULT '',
        accreditation_status TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_tests_tenant ON tests(tenant_id);
      CREATE INDEX idx_tests_name ON tests(name);

      CREATE TABLE packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_paise INTEGER NOT NULL DEFAULT 0,
        gst_rate_bp INTEGER NOT NULL DEFAULT 1200,
        is_active INTEGER NOT NULL DEFAULT 1,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_packages_tenant ON packages(tenant_id);

      CREATE TABLE package_items (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        test_id TEXT NOT NULL,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_package_items_pkg ON package_items(package_id);
      CREATE INDEX idx_package_items_tenant ON package_items(tenant_id);

      CREATE TABLE doctors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        qualification TEXT NOT NULL DEFAULT '',
        specialization TEXT NOT NULL DEFAULT '',
        reg_no TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        commission_type TEXT NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent','flat')),
        commission_value INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT NOT NULL DEFAULT '',
        -- NABL: Pathologist/Consultant details
        council_name TEXT NOT NULL DEFAULT '',
        digital_signature_path TEXT NOT NULL DEFAULT '',
        is_reporting_pathologist INTEGER NOT NULL DEFAULT 0,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_doctors_tenant ON doctors(tenant_id);
      CREATE INDEX idx_doctors_name ON doctors(name);

      -- Invoice number blocks: each terminal draws a block of numbers so two
      -- terminals billing offline can never print the same invoice number.
      CREATE TABLE invoice_blocks (
        id TEXT PRIMARY KEY,
        purpose TEXT NOT NULL DEFAULT 'invoice',
        prefix TEXT NOT NULL DEFAULT 'INV-',
        next_no INTEGER NOT NULL,
        end_no INTEGER NOT NULL,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_invoice_blocks_tenant ON invoice_blocks(tenant_id);

      CREATE TABLE invoices (
        id TEXT PRIMARY KEY,
        invoice_no TEXT NOT NULL,
        invoice_date INTEGER NOT NULL,
        patient_id TEXT NOT NULL,
        doctor_id TEXT NOT NULL DEFAULT '',
        patient_name TEXT NOT NULL DEFAULT '',
        subtotal_paise INTEGER NOT NULL DEFAULT 0,
        discount_paise INTEGER NOT NULL DEFAULT 0,
        taxable_paise INTEGER NOT NULL DEFAULT 0,
        cgst_paise INTEGER NOT NULL DEFAULT 0,
        sgst_paise INTEGER NOT NULL DEFAULT 0,
        round_off_paise INTEGER NOT NULL DEFAULT 0,
        total_paise INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
        cancel_reason TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL DEFAULT '',
        -- NABL compliance
        sample_ids TEXT NOT NULL DEFAULT '[]',
        reporting_pathologist_id TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE UNIQUE INDEX idx_invoices_tenant_no ON invoices(tenant_id, invoice_no);
      CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
      CREATE INDEX idx_invoices_date ON invoices(invoice_date);
      CREATE INDEX idx_invoices_patient ON invoices(patient_id);

      CREATE TABLE invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        line_no INTEGER NOT NULL DEFAULT 1,
        item_type TEXT NOT NULL CHECK (item_type IN ('test','package')),
        test_id TEXT NOT NULL DEFAULT '',
        package_id TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        unit_price_paise INTEGER NOT NULL DEFAULT 0,
        gst_rate_bp INTEGER NOT NULL DEFAULT 0,
        amount_paise INTEGER NOT NULL DEFAULT 0,
        taxable_paise INTEGER NOT NULL DEFAULT 0,
        cgst_paise INTEGER NOT NULL DEFAULT 0,
        sgst_paise INTEGER NOT NULL DEFAULT 0,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
      CREATE INDEX idx_invoice_items_tenant ON invoice_items(tenant_id);

      -- Payments are append-only (corrections = new reversing entry later)
      CREATE TABLE payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('cash','upi','card','bank','credit')),
        paid_at INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_payments_invoice ON payments(invoice_id);
      CREATE INDEX idx_payments_tenant ON payments(tenant_id);

      CREATE TABLE expense_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_expense_categories_tenant ON expense_categories(tenant_id);

      CREATE TABLE expenses (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        paid_at INTEGER NOT NULL,
        payee TEXT NOT NULL DEFAULT '',
        amount_paise INTEGER NOT NULL DEFAULT 0,
        mode TEXT NOT NULL DEFAULT 'cash' CHECK (mode IN ('cash','upi','card','bank')),
        bill_no TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_expenses_tenant ON expenses(tenant_id);
      CREATE INDEX idx_expenses_date ON expenses(paid_at);

      CREATE TABLE payouts (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        amount_paise INTEGER NOT NULL DEFAULT 0,
        paid_at INTEGER NOT NULL,
        mode TEXT NOT NULL DEFAULT 'cash',
        note TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_payouts_tenant ON payouts(tenant_id);

      -- Legacy commission ledger. The current product does not create or display
      -- referral commissions. Retain historical rows for data integrity only.
      CREATE TABLE commission_entries (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        doctor_id TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        reason TEXT NOT NULL DEFAULT 'accrual' CHECK (reason IN ('accrual','reversal')),
        accrued_at INTEGER NOT NULL,
        payout_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued','paid')),
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_commission_tenant ON commission_entries(tenant_id);
      CREATE INDEX idx_commission_doctor ON commission_entries(doctor_id);
      CREATE INDEX idx_commission_invoice ON commission_entries(invoice_id);

      CREATE TABLE report_orders (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        test_id TEXT NOT NULL DEFAULT '',
        test_name TEXT NOT NULL,
        package_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','verified','done','rejected')),
        result_value REAL,
        result_text TEXT NOT NULL DEFAULT '',
        unit TEXT NOT NULL DEFAULT '',
        ref_range TEXT NOT NULL DEFAULT '',
        ref_min REAL,
        ref_max REAL,
        abnormal INTEGER NOT NULL DEFAULT 0,
        critical_flag INTEGER NOT NULL DEFAULT 0,
        entered_by TEXT NOT NULL DEFAULT '',
        verified_by TEXT NOT NULL DEFAULT '',
        reported_at INTEGER,
        printed_at INTEGER,
        -- NABL/ISO 15189: Traceability
        sample_id TEXT NOT NULL DEFAULT '',
        specimen_collected_at INTEGER,
        specimen_received_at INTEGER,
        analysis_started_at INTEGER,
        analysis_completed_at INTEGER,
        equipment_id TEXT NOT NULL DEFAULT '',
        reagent_lot TEXT NOT NULL DEFAULT '',
        comments TEXT NOT NULL DEFAULT '',
        technologist_notes TEXT NOT NULL DEFAULT '',
        approval_status TEXT NOT NULL DEFAULT 'pending',
        approved_by TEXT NOT NULL DEFAULT '',
        approved_at INTEGER,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );

      CREATE TABLE test_parameters (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT '',
        ref_range TEXT NOT NULL DEFAULT '',
        ref_min REAL,
        ref_max REAL,
        report_type TEXT NOT NULL DEFAULT 'text' CHECK (report_type IN ('text','numeric','select')),
        options TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );

      CREATE TABLE report_parameters (
        id TEXT PRIMARY KEY,
        report_order_id TEXT NOT NULL,
        parameter_id TEXT NOT NULL,
        parameter_name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT '',
        ref_range TEXT NOT NULL DEFAULT '',
        ref_min REAL,
        ref_max REAL,
        result_value REAL,
        result_text TEXT NOT NULL DEFAULT '',
        abnormal INTEGER NOT NULL DEFAULT 0,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX idx_report_orders_tenant ON report_orders(tenant_id);
      CREATE INDEX idx_report_orders_invoice ON report_orders(invoice_id);
      CREATE INDEX idx_report_orders_status ON report_orders(status);
      CREATE INDEX idx_test_parameters_test ON test_parameters(test_id);
      CREATE INDEX idx_report_parameters_order ON report_parameters(report_order_id);
    `,
  },
  {
    version: 2,
    name: "two-factor auth on users",
    sql: `
      ALTER TABLE users ADD COLUMN totp_secret TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN totp_last_step INTEGER NOT NULL DEFAULT -1;
      ALTER TABLE users ADD COLUMN recovery_codes TEXT NOT NULL DEFAULT '';
    `,
  },
  {
    version: 3,
    name: "multi-tenant support",
    sql: `
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL DEFAULT 'diagnostic' CHECK (type IN ('diagnostic','hospital','clinic')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','inactive')),
        settings_json TEXT NOT NULL DEFAULT '{}',
        subscription_plan TEXT NOT NULL DEFAULT 'free',
        subscription_expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        dirty INTEGER NOT NULL DEFAULT 1,
        deleted INTEGER NOT NULL DEFAULT 0
      );
    `,
  },
  {
    version: 4,
    name: "tenant columns",
    sql: `
      ALTER TABLE settings ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE audit_log ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE patients ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE tests ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE packages ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE package_items ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE doctors ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE invoice_blocks ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE invoices ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE invoice_items ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE payments ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE expense_categories ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE expenses ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE payouts ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE commission_entries ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE report_orders ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
    `,
  },
  {
    version: 5,
    name: "tenant indexes",
    sql: `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username ON users(tenant_id, username);
      DROP INDEX IF EXISTS idx_invoices_no;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_tenant_no ON invoices(tenant_id, invoice_no);
      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
      CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tests_tenant ON tests(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_packages_tenant ON packages(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_package_items_tenant ON package_items(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON doctors(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_blocks_tenant ON invoice_blocks(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON invoice_items(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON expense_categories(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_payouts_tenant ON payouts(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_commission_tenant ON commission_entries(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_report_orders_tenant ON report_orders(tenant_id);
    `,
  },
  {
    version: 6,
    name: "per-tenant settings",
    sql: `
      UPDATE settings SET tenant_id = 'tenant-default' WHERE tenant_id IS NULL OR tenant_id = '';
      DROP TABLE IF EXISTS settings_v6;
      CREATE TABLE settings_v6 (
        tenant_id TEXT NOT NULL DEFAULT '',
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (tenant_id, key)
      );
      INSERT OR REPLACE INTO settings_v6 (tenant_id, key, value, updated_at, device_id)
        SELECT tenant_id, key, value, updated_at, device_id FROM settings;
      DROP TABLE settings;
      ALTER TABLE settings_v6 RENAME TO settings;
    `,
  },
  {
    version: 7,
    name: "adopt legacy rows into the default tenant",
    // Every table has carried tenant_id since v1, but rows written before the
    // application started setting it were stored with the column default ''.
    // Now that every query is tenant-scoped, those rows are invisible — the
    // centre's patients, bills and dues would look like they had vanished.
    // They belong to the centre that created them, so they move to the default
    // tenant.
    //
    // The literal 'tenant-default' below must match DEFAULT_TENANT_ID in
    // src/db/tenant.ts; scripts/check-migrations.mjs asserts that it does.
    //
    // Users need care: the unique index is (tenant_id, username), and the
    // bootstrap creates an admin for the default tenant. A legacy account is
    // the REAL account — it holds the password the user chose and their
    // two-factor enrolment — so it wins, and the bootstrap duplicate is
    // removed first so the unique index stays satisfiable.
    tolerant: true,
    sql: `
      DELETE FROM users
        WHERE deleted = 0 AND tenant_id = 'tenant-default'
          AND username IN (
            SELECT username FROM users WHERE deleted = 0 AND tenant_id = ''
          );

      UPDATE users SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE audit_log SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE patients SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE tests SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE packages SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE package_items SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE doctors SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE invoice_blocks SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE invoices SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE invoice_items SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE payments SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE expense_categories SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE expenses SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE payouts SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE commission_entries SET tenant_id = 'tenant-default' WHERE tenant_id = '';
      UPDATE report_orders SET tenant_id = 'tenant-default' WHERE tenant_id = '';
    `,
  },
  {
    version: 8,
    name: "NABL/ABDM/ISO 15189 compliance fields",
    sql: `
      -- Patients
      ALTER TABLE patients ADD COLUMN dob TEXT NOT NULL DEFAULT '';
      ALTER TABLE patients ADD COLUMN id_proof_type TEXT NOT NULL DEFAULT '';
      ALTER TABLE patients ADD COLUMN id_proof_no TEXT NOT NULL DEFAULT '';
      ALTER TABLE patients ADD COLUMN abha_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE patients ADD COLUMN consent_given INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE patients ADD COLUMN consent_at INTEGER;

      -- Tests
      ALTER TABLE tests ADD COLUMN method TEXT NOT NULL DEFAULT '';
      ALTER TABLE tests ADD COLUMN specimen_type TEXT NOT NULL DEFAULT '';
      ALTER TABLE tests ADD COLUMN container_type TEXT NOT NULL DEFAULT '';
      ALTER TABLE tests ADD COLUMN equipment_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE tests ADD COLUMN loinc_code TEXT NOT NULL DEFAULT '';
      ALTER TABLE tests ADD COLUMN turnaround_time_hours INTEGER DEFAULT NULL;
      ALTER TABLE tests ADD COLUMN department TEXT NOT NULL DEFAULT '';
      ALTER TABLE tests ADD COLUMN accreditation_status TEXT NOT NULL DEFAULT '';

      -- Doctors
      ALTER TABLE doctors ADD COLUMN council_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE doctors ADD COLUMN digital_signature_path TEXT NOT NULL DEFAULT '';
      ALTER TABLE doctors ADD COLUMN is_reporting_pathologist INTEGER NOT NULL DEFAULT 0;

      -- Invoices
      ALTER TABLE invoices ADD COLUMN sample_ids TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE invoices ADD COLUMN reporting_pathologist_id TEXT NOT NULL DEFAULT '';

      -- Report orders
      ALTER TABLE report_orders ADD COLUMN sample_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE report_orders ADD COLUMN specimen_collected_at INTEGER;
      ALTER TABLE report_orders ADD COLUMN specimen_received_at INTEGER;
      ALTER TABLE report_orders ADD COLUMN analysis_started_at INTEGER;
      ALTER TABLE report_orders ADD COLUMN analysis_completed_at INTEGER;
      ALTER TABLE report_orders ADD COLUMN equipment_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE report_orders ADD COLUMN reagent_lot TEXT NOT NULL DEFAULT '';
      ALTER TABLE report_orders ADD COLUMN comments TEXT NOT NULL DEFAULT '';
      ALTER TABLE report_orders ADD COLUMN technologist_notes TEXT NOT NULL DEFAULT '';
      ALTER TABLE report_orders ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';
      ALTER TABLE report_orders ADD COLUMN approved_by TEXT NOT NULL DEFAULT '';
      ALTER TABLE report_orders ADD COLUMN approved_at INTEGER;
    `,
  },
  {
    version: 9,
    name: "test parameters for pathology reports",
    sql: `
      CREATE TABLE IF NOT EXISTS test_parameters (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT '',
        ref_range TEXT NOT NULL DEFAULT '',
        ref_min REAL,
        ref_max REAL,
        report_type TEXT NOT NULL DEFAULT 'text' CHECK (report_type IN ('text','numeric','select')),
        options TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        dirty INTEGER NOT NULL DEFAULT 1,
        deleted INTEGER NOT NULL DEFAULT 0,
        tenant_id TEXT NOT NULL DEFAULT 'tenant-default'
      );
      CREATE TABLE IF NOT EXISTS report_parameters (
        id TEXT PRIMARY KEY,
        report_order_id TEXT NOT NULL,
        parameter_id TEXT NOT NULL,
        parameter_name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT '',
        ref_range TEXT NOT NULL DEFAULT '',
        ref_min REAL,
        ref_max REAL,
        result_value REAL,
        result_text TEXT NOT NULL DEFAULT '',
        abnormal INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        dirty INTEGER NOT NULL DEFAULT 1,
        deleted INTEGER NOT NULL DEFAULT 0,
        tenant_id TEXT NOT NULL DEFAULT 'tenant-default'
      );
      CREATE INDEX IF NOT EXISTS idx_test_parameters_test ON test_parameters(test_id);
      CREATE INDEX IF NOT EXISTS idx_report_parameters_order ON report_parameters(report_order_id);
    `,
  },
  {
    version: 10,
    name: "starter pathology parameter templates",
    // Reference intervals are editable starter values, not a substitute for the
    // laboratory validating intervals for its methods and patient population.
    // Existing parameters with the same test/name are left untouched.
    sql: `
      INSERT OR IGNORE INTO test_parameters
        (id, test_id, name, sort_order, unit, ref_range, ref_min, ref_max,
         report_type, options, is_active, created_at, updated_at, device_id,
         dirty, deleted, tenant_id)
      SELECT src.id, src.test_id, src.name, src.sort_order, src.unit, src.ref_range,
             src.ref_min, src.ref_max, src.report_type, '[]', 1, 0, 0, '', 1, 0, 'tenant-default'
      FROM (
        SELECT 'tp-cbc-01' AS id, 'test-cbc' AS test_id, 'Haemoglobin' AS name, 0 AS sort_order, 'g/dL' AS unit, '12.0 - 16.0 (adult)' AS ref_range, 12.0 AS ref_min, 16.0 AS ref_max, 'numeric' AS report_type
        UNION ALL SELECT 'tp-cbc-02','test-cbc','Total Leukocyte Count',1,'cells/cmm','4,000 - 11,000',4000,11000,'numeric'
        UNION ALL SELECT 'tp-cbc-03','test-cbc','Platelet Count',2,'cells/cmm','1,50,000 - 4,50,000',150000,450000,'numeric'
        UNION ALL SELECT 'tp-cbc-04','test-cbc','RBC Count',3,'million/cmm','4.2 - 5.9 (adult)',4.2,5.9,'numeric'
        UNION ALL SELECT 'tp-cbc-05','test-cbc','Packed Cell Volume (PCV)',4,'%','36 - 46 (adult)',36,46,'numeric'
        UNION ALL SELECT 'tp-cbc-06','test-cbc','Mean Corpuscular Volume (MCV)',5,'fL','80 - 100',80,100,'numeric'
        UNION ALL SELECT 'tp-cbc-07','test-cbc','Mean Corpuscular Haemoglobin (MCH)',6,'pg','27 - 32',27,32,'numeric'
        UNION ALL SELECT 'tp-cbc-08','test-cbc','Mean Corpuscular Hb Concentration (MCHC)',7,'g/dL','32 - 36',32,36,'numeric'
        UNION ALL SELECT 'tp-cbc-09','test-cbc','Red Cell Distribution Width (RDW)',8,'%','11.5 - 14.5',11.5,14.5,'numeric'
        UNION ALL SELECT 'tp-cbc-10','test-cbc','Neutrophils',9,'%','40 - 70',40,70,'numeric'
        UNION ALL SELECT 'tp-cbc-11','test-cbc','Lymphocytes',10,'%','20 - 40',20,40,'numeric'
        UNION ALL SELECT 'tp-cbc-12','test-cbc','Eosinophils',11,'%','1 - 6',1,6,'numeric'
        UNION ALL SELECT 'tp-cbc-13','test-cbc','Monocytes',12,'%','2 - 10',2,10,'numeric'
        UNION ALL SELECT 'tp-cbc-14','test-cbc','Basophils',13,'%','0 - 2',0,2,'numeric'
      ) AS src
      WHERE NOT EXISTS (
        SELECT 1 FROM test_parameters tp
        WHERE tp.test_id = src.test_id AND lower(tp.name) = lower(src.name)
          AND tp.deleted = 0 AND tp.tenant_id = 'tenant-default'
      );

      INSERT OR IGNORE INTO test_parameters
        (id, test_id, name, sort_order, unit, ref_range, ref_min, ref_max,
         report_type, options, is_active, created_at, updated_at, device_id,
         dirty, deleted, tenant_id)
      SELECT src.id, src.test_id, src.name, src.sort_order, src.unit, src.ref_range,
             src.ref_min, src.ref_max, src.report_type, '[]', 1, 0, 0, '', 1, 0, 'tenant-default'
      FROM (
        SELECT 'tp-lft-01' AS id, 'test-lft' AS test_id, 'Bilirubin Total' AS name, 0 AS sort_order, 'mg/dL' AS unit, '0.2 - 1.2' AS ref_range, 0.2 AS ref_min, 1.2 AS ref_max, 'numeric' AS report_type
        UNION ALL SELECT 'tp-lft-02','test-lft','Bilirubin Direct',1,'mg/dL','0.0 - 0.3',0,0.3,'numeric'
        UNION ALL SELECT 'tp-lft-03','test-lft','Bilirubin Indirect',2,'mg/dL','0.1 - 1.0',0.1,1.0,'numeric'
        UNION ALL SELECT 'tp-lft-04','test-lft','SGOT (AST)',3,'U/L','5 - 40',5,40,'numeric'
        UNION ALL SELECT 'tp-lft-05','test-lft','SGPT (ALT)',4,'U/L','5 - 41',5,41,'numeric'
        UNION ALL SELECT 'tp-lft-06','test-lft','Alkaline Phosphatase',5,'U/L','40 - 130',40,130,'numeric'
        UNION ALL SELECT 'tp-lft-07','test-lft','Gamma GT (GGT)',6,'U/L','0 - 50',0,50,'numeric'
        UNION ALL SELECT 'tp-lft-08','test-lft','Total Protein',7,'g/dL','6.0 - 8.3',6.0,8.3,'numeric'
        UNION ALL SELECT 'tp-lft-09','test-lft','Albumin',8,'g/dL','3.5 - 5.2',3.5,5.2,'numeric'
        UNION ALL SELECT 'tp-lft-10','test-lft','Globulin',9,'g/dL','2.0 - 3.5',2.0,3.5,'numeric'
        UNION ALL SELECT 'tp-lft-11','test-lft','Albumin / Globulin Ratio',10,'ratio','1.0 - 2.2',1.0,2.2,'numeric'
      ) AS src
      WHERE NOT EXISTS (
        SELECT 1 FROM test_parameters tp
        WHERE tp.test_id = src.test_id AND lower(tp.name) = lower(src.name)
          AND tp.deleted = 0 AND tp.tenant_id = 'tenant-default'
      );

      INSERT OR IGNORE INTO test_parameters
        (id, test_id, name, sort_order, unit, ref_range, ref_min, ref_max,
         report_type, options, is_active, created_at, updated_at, device_id,
         dirty, deleted, tenant_id)
      SELECT src.id, src.test_id, src.name, src.sort_order, src.unit, src.ref_range,
             src.ref_min, src.ref_max, src.report_type, '[]', 1, 0, 0, '', 1, 0, 'tenant-default'
      FROM (
        SELECT 'tp-kft-01' AS id, 'test-kft' AS test_id, 'Blood Urea' AS name, 0 AS sort_order, 'mg/dL' AS unit, '17 - 43' AS ref_range, 17 AS ref_min, 43 AS ref_max, 'numeric' AS report_type
        UNION ALL SELECT 'tp-kft-02','test-kft','Blood Urea Nitrogen (BUN)',1,'mg/dL','8 - 20',8,20,'numeric'
        UNION ALL SELECT 'tp-kft-03','test-kft','Serum Creatinine',2,'mg/dL','0.6 - 1.3',0.6,1.3,'numeric'
        UNION ALL SELECT 'tp-kft-04','test-kft','Uric Acid',3,'mg/dL','3.5 - 7.2',3.5,7.2,'numeric'
        UNION ALL SELECT 'tp-kft-05','test-kft','Sodium',4,'mmol/L','135 - 145',135,145,'numeric'
        UNION ALL SELECT 'tp-kft-06','test-kft','Potassium',5,'mmol/L','3.5 - 5.1',3.5,5.1,'numeric'
        UNION ALL SELECT 'tp-kft-07','test-kft','Chloride',6,'mmol/L','98 - 107',98,107,'numeric'
        UNION ALL SELECT 'tp-kft-08','test-kft','Calcium',7,'mg/dL','8.5 - 10.5',8.5,10.5,'numeric'
        UNION ALL SELECT 'tp-kft-09','test-kft','Phosphorus',8,'mg/dL','2.5 - 4.5',2.5,4.5,'numeric'
      ) AS src
      WHERE NOT EXISTS (
        SELECT 1 FROM test_parameters tp
        WHERE tp.test_id = src.test_id AND lower(tp.name) = lower(src.name)
          AND tp.deleted = 0 AND tp.tenant_id = 'tenant-default'
      );

      INSERT OR IGNORE INTO test_parameters
        (id, test_id, name, sort_order, unit, ref_range, ref_min, ref_max,
         report_type, options, is_active, created_at, updated_at, device_id,
         dirty, deleted, tenant_id)
      SELECT src.id, src.test_id, src.name, src.sort_order, src.unit, src.ref_range,
             src.ref_min, src.ref_max, src.report_type, '[]', 1, 0, 0, '', 1, 0, 'tenant-default'
      FROM (
        SELECT 'tp-lipid-01' AS id, 'test-lipid' AS test_id, 'Total Cholesterol' AS name, 0 AS sort_order, 'mg/dL' AS unit, '< 200' AS ref_range, NULL AS ref_min, 200 AS ref_max, 'numeric' AS report_type
        UNION ALL SELECT 'tp-lipid-02','test-lipid','Triglycerides',1,'mg/dL','< 150',NULL,150,'numeric'
        UNION ALL SELECT 'tp-lipid-03','test-lipid','HDL Cholesterol',2,'mg/dL','> 40',40,NULL,'numeric'
        UNION ALL SELECT 'tp-lipid-04','test-lipid','LDL Cholesterol',3,'mg/dL','< 100',NULL,100,'numeric'
        UNION ALL SELECT 'tp-lipid-05','test-lipid','VLDL Cholesterol',4,'mg/dL','10 - 40',10,40,'numeric'
        UNION ALL SELECT 'tp-lipid-06','test-lipid','Non-HDL Cholesterol',5,'mg/dL','< 130',NULL,130,'numeric'
        UNION ALL SELECT 'tp-lipid-07','test-lipid','Total Cholesterol / HDL Ratio',6,'ratio','< 4.5',NULL,4.5,'numeric'
        UNION ALL SELECT 'tp-lipid-08','test-lipid','LDL / HDL Ratio',7,'ratio','< 3.0',NULL,3.0,'numeric'
      ) AS src
      WHERE NOT EXISTS (
        SELECT 1 FROM test_parameters tp
        WHERE tp.test_id = src.test_id AND lower(tp.name) = lower(src.name)
          AND tp.deleted = 0 AND tp.tenant_id = 'tenant-default'
      );

      INSERT OR IGNORE INTO test_parameters
        (id, test_id, name, sort_order, unit, ref_range, ref_min, ref_max,
         report_type, options, is_active, created_at, updated_at, device_id,
         dirty, deleted, tenant_id)
      SELECT src.id, src.test_id, src.name, src.sort_order, src.unit, src.ref_range,
             src.ref_min, src.ref_max, src.report_type, '[]', 1, 0, 0, '', 1, 0, 'tenant-default'
      FROM (
        SELECT 'tp-urine-01' AS id, 'test-urine' AS test_id, 'Colour' AS name, 0 AS sort_order, '' AS unit, 'Pale yellow' AS ref_range, NULL AS ref_min, NULL AS ref_max, 'text' AS report_type
        UNION ALL SELECT 'tp-urine-02','test-urine','Appearance',1,'','Clear',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-03','test-urine','pH',2,'','4.6 - 8.0',4.6,8.0,'numeric'
        UNION ALL SELECT 'tp-urine-04','test-urine','Specific Gravity',3,'','1.005 - 1.030',1.005,1.030,'numeric'
        UNION ALL SELECT 'tp-urine-05','test-urine','Protein',4,'','Negative',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-06','test-urine','Glucose',5,'','Negative',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-07','test-urine','Ketones',6,'','Negative',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-08','test-urine','Blood',7,'','Negative',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-09','test-urine','Bilirubin',8,'','Negative',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-10','test-urine','Urobilinogen',9,'','Normal',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-11','test-urine','Nitrite',10,'','Negative',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-12','test-urine','Leucocyte Esterase',11,'','Negative',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-13','test-urine','Pus Cells',12,'/hpf','0 - 5',0,5,'numeric'
        UNION ALL SELECT 'tp-urine-14','test-urine','Red Blood Cells',13,'/hpf','0 - 2',0,2,'numeric'
        UNION ALL SELECT 'tp-urine-15','test-urine','Epithelial Cells',14,'/hpf','Occasional',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-16','test-urine','Casts',15,'/lpf','Absent',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-17','test-urine','Crystals',16,'/hpf','Absent',NULL,NULL,'text'
        UNION ALL SELECT 'tp-urine-18','test-urine','Bacteria',17,'/hpf','Absent',NULL,NULL,'text'
      ) AS src
      WHERE NOT EXISTS (
        SELECT 1 FROM test_parameters tp
        WHERE tp.test_id = src.test_id AND lower(tp.name) = lower(src.name)
          AND tp.deleted = 0 AND tp.tenant_id = 'tenant-default'
      );
    `,
  },
  {
    version: 11,
    name: "samples consent audit revisions and ABDM outbox",
    sql: `
      CREATE TABLE IF NOT EXISTS samples (
        id TEXT PRIMARY KEY,
        accession_no TEXT NOT NULL,
        invoice_id TEXT NOT NULL DEFAULT '',
        patient_id TEXT NOT NULL,
        specimen_type TEXT NOT NULL DEFAULT '',
        container_type TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'expected'
          CHECK (status IN ('expected','collected','received','accepted','rejected','disposed')),
        collection_site TEXT NOT NULL DEFAULT '',
        collected_at INTEGER,
        collected_by TEXT NOT NULL DEFAULT '',
        received_at INTEGER,
        received_by TEXT NOT NULL DEFAULT '',
        accepted_at INTEGER,
        accepted_by TEXT NOT NULL DEFAULT '',
        rejected_at INTEGER,
        rejected_by TEXT NOT NULL DEFAULT '',
        rejection_reason TEXT NOT NULL DEFAULT '',
        storage_location TEXT NOT NULL DEFAULT '',
        transport_note TEXT NOT NULL DEFAULT '',
        disposed_at INTEGER,
        disposed_by TEXT NOT NULL DEFAULT '',
        disposal_method TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_samples_tenant_accession
        ON samples(tenant_id, accession_no);
      CREATE INDEX IF NOT EXISTS idx_samples_invoice ON samples(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_samples_patient ON samples(patient_id);

      CREATE TABLE IF NOT EXISTS report_result_revisions (
        id TEXT PRIMARY KEY,
        report_order_id TEXT NOT NULL,
        invoice_id TEXT NOT NULL DEFAULT '',
        revision_no INTEGER NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('draft','verified','amended')),
        reason TEXT NOT NULL DEFAULT '',
        snapshot_json TEXT NOT NULL,
        acted_by TEXT NOT NULL DEFAULT '',
        acted_at INTEGER NOT NULL,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_report_revision_no
        ON report_result_revisions(tenant_id, report_order_id, revision_no);
      CREATE INDEX IF NOT EXISTS idx_report_revision_order
        ON report_result_revisions(report_order_id);

      CREATE TABLE IF NOT EXISTS abdm_consents (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        purpose TEXT NOT NULL DEFAULT 'care-delivery',
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
        consent_version TEXT NOT NULL DEFAULT '1',
        granted_at INTEGER NOT NULL,
        granted_by TEXT NOT NULL DEFAULT '',
        expires_at INTEGER,
        revoked_at INTEGER,
        revoked_by TEXT NOT NULL DEFAULT '',
        artefact_json TEXT NOT NULL DEFAULT '{}',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX IF NOT EXISTS idx_abdm_consent_patient
        ON abdm_consents(patient_id, status);

      CREATE TABLE IF NOT EXISTS abdm_outbox (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        consent_id TEXT NOT NULL DEFAULT '',
        bundle_id TEXT NOT NULL,
        fhir_version TEXT NOT NULL DEFAULT 'R4',
        profile_version TEXT NOT NULL DEFAULT '6.5.0',
        environment TEXT NOT NULL DEFAULT 'draft',
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft','queued','sent','failed')),
        bundle_json TEXT NOT NULL,
        generated_at INTEGER NOT NULL,
        generated_by TEXT NOT NULL DEFAULT '',
        sent_at INTEGER,
        last_error TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX IF NOT EXISTS idx_abdm_outbox_order ON abdm_outbox(order_id);
      CREATE INDEX IF NOT EXISTS idx_abdm_outbox_status ON abdm_outbox(status);
    `,
  },
  {
    version: 12,
    name: "report authorization and LOINC parameter mapping",
    // A re-run can encounter the new columns already present; run each statement
    // separately so the admin-authority data repair still executes.
    tolerant: true,
    sql: `
      ALTER TABLE users ADD COLUMN can_authorize_reports INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE test_parameters ADD COLUMN loinc_code TEXT NOT NULL DEFAULT '';
      ALTER TABLE report_parameters ADD COLUMN loinc_code TEXT NOT NULL DEFAULT '';
      UPDATE users SET can_authorize_reports = 1 WHERE role = 'admin' AND can_authorize_reports = 0;
    `,
  },
  {
    version: 13,
    name: "starter specimen and department metadata",
    sql: `
      UPDATE tests SET specimen_type = 'Whole Blood', container_type = 'EDTA (lavender top)',
        department = 'Haematology', method = 'Automated analyser'
      WHERE id IN ('test-cbc','test-hb') AND tenant_id = 'tenant-default'
        AND specimen_type = '';

      UPDATE tests SET specimen_type = 'Serum', container_type = 'Clot activator / gel (gold top)',
        department = 'Clinical Biochemistry'
      WHERE id IN ('test-fbs','test-rbs','test-lft','test-kft','test-lipid','test-tsh','test-hba1c')
        AND tenant_id = 'tenant-default' AND specimen_type = '';

      UPDATE tests SET specimen_type = 'Urine', container_type = 'Sterile urine container',
        department = 'Clinical Pathology', method = 'Dipstick and microscopy'
      WHERE id = 'test-urine' AND tenant_id = 'tenant-default' AND specimen_type = '';

      UPDATE tests SET department = 'Radiology', method = 'Radiography'
      WHERE id IN ('xr-chestpa','xr-chestlat','xr-abdomen','xr-knee')
        AND tenant_id = 'tenant-default' AND department = '';

      UPDATE samples
      SET specimen_type = COALESCE((
            SELECT NULLIF(t.specimen_type, '')
            FROM report_orders ro
            JOIN tests t ON t.id = ro.test_id AND t.tenant_id = ro.tenant_id
            WHERE ro.sample_id = samples.id AND ro.tenant_id = samples.tenant_id
            LIMIT 1
          ), specimen_type),
          container_type = COALESCE((
            SELECT NULLIF(t.container_type, '')
            FROM report_orders ro
            JOIN tests t ON t.id = ro.test_id AND t.tenant_id = ro.tenant_id
            WHERE ro.sample_id = samples.id AND ro.tenant_id = samples.tenant_id
            LIMIT 1
          ), container_type),
          updated_at = updated_at, dirty = 1
      WHERE specimen_type = 'Unspecified' AND deleted = 0
        AND status IN ('expected','collected','received')
        AND tenant_id = 'tenant-default';
    `,
  },
  {
    version: 14,
    name: "repair starter specimen metadata after seed-order change",
    // Starter tests are inserted by SEED_SQL after migrations. Ensure databases
    // that were seeded after v13 still receive their specimen/department data.
    sql: `
      UPDATE tests SET specimen_type = 'Whole Blood', container_type = 'EDTA (lavender top)',
        department = 'Haematology', method = 'Automated analyser'
      WHERE id IN ('test-cbc','test-hb') AND tenant_id = 'tenant-default'
        AND specimen_type = '';

      UPDATE tests SET specimen_type = 'Serum', container_type = 'Clot activator / gel (gold top)',
        department = 'Clinical Biochemistry'
      WHERE id IN ('test-fbs','test-rbs','test-lft','test-kft','test-lipid','test-tsh','test-hba1c')
        AND tenant_id = 'tenant-default' AND specimen_type = '';

      UPDATE tests SET specimen_type = 'Urine', container_type = 'Sterile urine container',
        department = 'Clinical Pathology', method = 'Dipstick and microscopy'
      WHERE id = 'test-urine' AND tenant_id = 'tenant-default' AND specimen_type = '';

      UPDATE tests SET department = 'Radiology', method = 'Radiography'
      WHERE id IN ('xr-chestpa','xr-chestlat','xr-abdomen','xr-knee')
        AND tenant_id = 'tenant-default' AND department = '';
    `,
  },
  {
    version: 15,
    name: "hospital admissions and pharmacy",
    sql: `
      CREATE TABLE IF NOT EXISTS admissions (
        id TEXT PRIMARY KEY,
        admission_no TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        doctor_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'admitted'
          CHECK (status IN ('admitted','discharged','cancelled')),
        ward TEXT NOT NULL DEFAULT '',
        bed TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT '',
        diagnosis TEXT NOT NULL DEFAULT '',
        admitted_at INTEGER NOT NULL,
        discharged_at INTEGER,
        discharge_summary TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_tenant_no
        ON admissions(tenant_id, admission_no);
      CREATE INDEX IF NOT EXISTS idx_admissions_patient
        ON admissions(patient_id, status);
      CREATE INDEX IF NOT EXISTS idx_admissions_status
        ON admissions(tenant_id, status);

      CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        form TEXT NOT NULL DEFAULT '',
        strength TEXT NOT NULL DEFAULT '',
        manufacturer TEXT NOT NULL DEFAULT '',
        hsn_code TEXT NOT NULL DEFAULT '',
        gst_rate_bp INTEGER NOT NULL DEFAULT 1200,
        mrp_paise INTEGER NOT NULL DEFAULT 0,
        sale_price_paise INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 10,
        is_active INTEGER NOT NULL DEFAULT 1,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX IF NOT EXISTS idx_medicines_name
        ON medicines(tenant_id, name);

      CREATE TABLE IF NOT EXISTS pharmacy_batches (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        batch_no TEXT NOT NULL DEFAULT '',
        expiry_date TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 0,
        purchase_price_paise INTEGER NOT NULL DEFAULT 0,
        supplier TEXT NOT NULL DEFAULT '',
        received_at INTEGER NOT NULL,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX IF NOT EXISTS idx_pharmacy_batches_medicine
        ON pharmacy_batches(tenant_id, medicine_id, expiry_date);

      CREATE TABLE IF NOT EXISTS pharmacy_sales (
        id TEXT PRIMARY KEY,
        bill_no TEXT NOT NULL,
        patient_id TEXT NOT NULL DEFAULT '',
        patient_name TEXT NOT NULL DEFAULT 'Walk-in',
        sale_date INTEGER NOT NULL,
        subtotal_paise INTEGER NOT NULL DEFAULT 0,
        discount_paise INTEGER NOT NULL DEFAULT 0,
        taxable_paise INTEGER NOT NULL DEFAULT 0,
        cgst_paise INTEGER NOT NULL DEFAULT 0,
        sgst_paise INTEGER NOT NULL DEFAULT 0,
        round_off_paise INTEGER NOT NULL DEFAULT 0,
        total_paise INTEGER NOT NULL DEFAULT 0,
        payment_mode TEXT NOT NULL DEFAULT 'cash'
          CHECK (payment_mode IN ('cash','upi','card','bank')),
        status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','cancelled')),
        notes TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pharmacy_sales_tenant_no
        ON pharmacy_sales(tenant_id, bill_no);
      CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_date
        ON pharmacy_sales(tenant_id, sale_date);

      CREATE TABLE IF NOT EXISTS pharmacy_sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        medicine_id TEXT NOT NULL,
        batch_id TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        batch_no TEXT NOT NULL DEFAULT '',
        expiry_date TEXT NOT NULL DEFAULT '',
        qty INTEGER NOT NULL DEFAULT 1,
        unit_price_paise INTEGER NOT NULL DEFAULT 0,
        gst_rate_bp INTEGER NOT NULL DEFAULT 0,
        amount_paise INTEGER NOT NULL DEFAULT 0,
        taxable_paise INTEGER NOT NULL DEFAULT 0,
        cgst_paise INTEGER NOT NULL DEFAULT 0,
        sgst_paise INTEGER NOT NULL DEFAULT 0,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX IF NOT EXISTS idx_pharmacy_sale_items_sale
        ON pharmacy_sale_items(sale_id);

      UPDATE settings
      SET value = json_insert(value, '$[#]', 'admissions'), updated_at = 0
      WHERE key = 'enabled_modules' AND tenant_id = 'tenant-default'
        AND value NOT LIKE '%"admissions"%';

      UPDATE settings
      SET value = json_insert(value, '$[#]', 'pharmacy'), updated_at = 0
      WHERE key = 'enabled_modules' AND tenant_id = 'tenant-default'
        AND value NOT LIKE '%"pharmacy"%';
    `,
  },
  {
    version: 16,
    name: "generic hospital service and IPD billing",
    sql: `
      CREATE TABLE IF NOT EXISTS hospital_services (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Room',
        price_paise INTEGER NOT NULL DEFAULT 0,
        gst_rate_bp INTEGER NOT NULL DEFAULT 0,
        sac_code TEXT NOT NULL DEFAULT '9993',
        is_active INTEGER NOT NULL DEFAULT 1,
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX IF NOT EXISTS idx_hospital_services_name
        ON hospital_services(tenant_id, name);

      CREATE TABLE IF NOT EXISTS hospital_charges (
        id TEXT PRIMARY KEY,
        admission_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        service_id TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        unit_price_paise INTEGER NOT NULL DEFAULT 0,
        gst_rate_bp INTEGER NOT NULL DEFAULT 0,
        amount_paise INTEGER NOT NULL DEFAULT 0,
        taxable_paise INTEGER NOT NULL DEFAULT 0,
        cgst_paise INTEGER NOT NULL DEFAULT 0,
        sgst_paise INTEGER NOT NULL DEFAULT 0,
        charged_at INTEGER NOT NULL,
        created_by TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX IF NOT EXISTS idx_hospital_charges_admission
        ON hospital_charges(tenant_id, admission_id);

      CREATE TABLE IF NOT EXISTS hospital_bill_payments (
        id TEXT PRIMARY KEY,
        admission_id TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        mode TEXT NOT NULL DEFAULT 'cash'
          CHECK (mode IN ('cash','upi','card','bank')),
        paid_at INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL DEFAULT '',
        ${SYNC_COLUMNS},
        ${TENANT_COLUMN}
      );
      CREATE INDEX IF NOT EXISTS idx_hospital_payments_admission
        ON hospital_bill_payments(tenant_id, admission_id);
    `,
  },
  {
    version: 17,
    name: "append-only cloud sync queue",
    sql: `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        entity_type TEXT NOT NULL
          CHECK (entity_type IN ('invoice','report','admission')),
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL
          CHECK (operation IN ('upsert','cancel')),
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sync_queue_pending
        ON sync_queue(tenant_id, created_at);

      CREATE TABLE IF NOT EXISTS sync_ack (
        queue_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        ack_id TEXT NOT NULL,
        synced_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sync_ack_synced
        ON sync_ack(tenant_id, synced_at);

      -- Existing local records are appended once so the first push catches up.
      INSERT OR IGNORE INTO sync_queue
        (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
      SELECT lower(hex(randomblob(16))), i.tenant_id, i.device_id, 'invoice', i.id,
             CASE WHEN i.deleted = 1 OR i.status = 'cancelled' THEN 'cancel' ELSE 'upsert' END,
             json_object(
               'id', i.id, 'invoice_no', i.invoice_no, 'invoice_date', i.invoice_date,
               'patient_id', i.patient_id, 'patient_name', i.patient_name,
               'doctor_id', i.doctor_id, 'subtotal_paise', i.subtotal_paise,
               'discount_paise', i.discount_paise, 'taxable_paise', i.taxable_paise,
               'cgst_paise', i.cgst_paise, 'sgst_paise', i.sgst_paise,
               'round_off_paise', i.round_off_paise, 'total_paise', i.total_paise,
               'status', i.status, 'cancel_reason', i.cancel_reason,
               'created_at', i.created_at, 'updated_at', i.updated_at,
               'device_id', i.device_id, 'deleted', i.deleted
             ),
             CAST(strftime('%s','now') AS INTEGER) * 1000
      FROM invoices i
      WHERE i.dirty = 1;

      INSERT OR IGNORE INTO sync_queue
        (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
      SELECT lower(hex(randomblob(16))), ro.tenant_id, ro.device_id, 'report', ro.id,
             CASE WHEN ro.deleted = 1 OR ro.status = 'rejected' THEN 'cancel' ELSE 'upsert' END,
             json_object(
               'id', ro.id, 'invoice_id', ro.invoice_id, 'patient_id', ro.patient_id,
               'test_id', ro.test_id, 'test_name', ro.test_name, 'status', ro.status,
               'result_text', ro.result_text, 'result_value', ro.result_value,
               'unit', ro.unit, 'ref_range', ro.ref_range, 'abnormal', ro.abnormal,
               'critical_flag', ro.critical_flag, 'verified_by', ro.verified_by,
               'reported_at', ro.reported_at, 'sample_id', ro.sample_id,
               'analysis_completed_at', ro.analysis_completed_at,
               'created_at', ro.created_at, 'updated_at', ro.updated_at,
               'device_id', ro.device_id, 'deleted', ro.deleted,
               'parameters', COALESCE((
                 SELECT json_group_array(json_object(
                   'name', rp.parameter_name, 'result', rp.result_text,
                   'unit', rp.unit, 'ref_range', rp.ref_range, 'abnormal', rp.abnormal
                 ))
                 FROM report_parameters rp
                 WHERE rp.report_order_id = ro.id AND rp.deleted = 0
                   AND rp.tenant_id = ro.tenant_id
               ), '[]')
             ),
             CAST(strftime('%s','now') AS INTEGER) * 1000
      FROM report_orders ro
      WHERE ro.dirty = 1;

      INSERT OR IGNORE INTO sync_queue
        (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
      SELECT lower(hex(randomblob(16))), a.tenant_id, a.device_id, 'admission', a.id,
             CASE WHEN a.deleted = 1 OR a.status = 'cancelled' THEN 'cancel' ELSE 'upsert' END,
             json_object(
               'id', a.id, 'admission_no', a.admission_no, 'patient_id', a.patient_id,
               'doctor_id', a.doctor_id, 'status', a.status, 'ward', a.ward, 'bed', a.bed,
               'reason', a.reason, 'diagnosis', a.diagnosis, 'admitted_at', a.admitted_at,
               'discharged_at', a.discharged_at, 'discharge_summary', a.discharge_summary,
               'created_at', a.created_at, 'updated_at', a.updated_at,
               'device_id', a.device_id, 'deleted', a.deleted
             ),
             CAST(strftime('%s','now') AS INTEGER) * 1000
      FROM admissions a
      WHERE a.dirty = 1;

      CREATE TRIGGER IF NOT EXISTS sync_queue_invoice_insert
      AFTER INSERT ON invoices
      BEGIN
        INSERT INTO sync_queue (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
        VALUES (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'invoice', NEW.id,
          CASE WHEN NEW.deleted = 1 OR NEW.status = 'cancelled' THEN 'cancel' ELSE 'upsert' END,
          json_object(
            'id', NEW.id, 'invoice_no', NEW.invoice_no, 'invoice_date', NEW.invoice_date,
            'patient_id', NEW.patient_id, 'patient_name', NEW.patient_name,
            'doctor_id', NEW.doctor_id, 'subtotal_paise', NEW.subtotal_paise,
            'discount_paise', NEW.discount_paise, 'taxable_paise', NEW.taxable_paise,
            'cgst_paise', NEW.cgst_paise, 'sgst_paise', NEW.sgst_paise,
            'round_off_paise', NEW.round_off_paise, 'total_paise', NEW.total_paise,
            'status', NEW.status, 'cancel_reason', NEW.cancel_reason,
            'created_at', NEW.created_at, 'updated_at', NEW.updated_at,
            'device_id', NEW.device_id, 'deleted', NEW.deleted
          ),
          CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS sync_queue_invoice_update
      AFTER UPDATE ON invoices
      BEGIN
        INSERT INTO sync_queue (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
        VALUES (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'invoice', NEW.id,
          CASE WHEN NEW.deleted = 1 OR NEW.status = 'cancelled' THEN 'cancel' ELSE 'upsert' END,
          json_object(
            'id', NEW.id, 'invoice_no', NEW.invoice_no, 'invoice_date', NEW.invoice_date,
            'patient_id', NEW.patient_id, 'patient_name', NEW.patient_name,
            'doctor_id', NEW.doctor_id, 'subtotal_paise', NEW.subtotal_paise,
            'discount_paise', NEW.discount_paise, 'taxable_paise', NEW.taxable_paise,
            'cgst_paise', NEW.cgst_paise, 'sgst_paise', NEW.sgst_paise,
            'round_off_paise', NEW.round_off_paise, 'total_paise', NEW.total_paise,
            'status', NEW.status, 'cancel_reason', NEW.cancel_reason,
            'created_at', NEW.created_at, 'updated_at', NEW.updated_at,
            'device_id', NEW.device_id, 'deleted', NEW.deleted
          ),
          CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS sync_queue_report_insert
      AFTER INSERT ON report_orders
      BEGIN
        INSERT INTO sync_queue (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
        VALUES (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'report', NEW.id,
          CASE WHEN NEW.deleted = 1 OR NEW.status = 'rejected' THEN 'cancel' ELSE 'upsert' END,
          json_object(
            'id', NEW.id, 'invoice_id', NEW.invoice_id, 'patient_id', NEW.patient_id,
            'test_id', NEW.test_id, 'test_name', NEW.test_name, 'status', NEW.status,
            'result_text', NEW.result_text, 'result_value', NEW.result_value,
            'unit', NEW.unit, 'ref_range', NEW.ref_range, 'abnormal', NEW.abnormal,
            'critical_flag', NEW.critical_flag, 'verified_by', NEW.verified_by,
            'reported_at', NEW.reported_at, 'sample_id', NEW.sample_id,
            'analysis_completed_at', NEW.analysis_completed_at,
            'created_at', NEW.created_at, 'updated_at', NEW.updated_at,
            'device_id', NEW.device_id, 'deleted', NEW.deleted,
            'parameters', COALESCE((
              SELECT json_group_array(json_object(
                'name', rp.parameter_name, 'result', rp.result_text,
                'unit', rp.unit, 'ref_range', rp.ref_range, 'abnormal', rp.abnormal
              ))
              FROM report_parameters rp
              WHERE rp.report_order_id = NEW.id AND rp.deleted = 0
                AND rp.tenant_id = NEW.tenant_id
            ), '[]')
          ),
          CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS sync_queue_report_update
      AFTER UPDATE ON report_orders
      BEGIN
        INSERT INTO sync_queue (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
        VALUES (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'report', NEW.id,
          CASE WHEN NEW.deleted = 1 OR NEW.status = 'rejected' THEN 'cancel' ELSE 'upsert' END,
          json_object(
            'id', NEW.id, 'invoice_id', NEW.invoice_id, 'patient_id', NEW.patient_id,
            'test_id', NEW.test_id, 'test_name', NEW.test_name, 'status', NEW.status,
            'result_text', NEW.result_text, 'result_value', NEW.result_value,
            'unit', NEW.unit, 'ref_range', NEW.ref_range, 'abnormal', NEW.abnormal,
            'critical_flag', NEW.critical_flag, 'verified_by', NEW.verified_by,
            'reported_at', NEW.reported_at, 'sample_id', NEW.sample_id,
            'analysis_completed_at', NEW.analysis_completed_at,
            'created_at', NEW.created_at, 'updated_at', NEW.updated_at,
            'device_id', NEW.device_id, 'deleted', NEW.deleted,
            'parameters', COALESCE((
              SELECT json_group_array(json_object(
                'name', rp.parameter_name, 'result', rp.result_text,
                'unit', rp.unit, 'ref_range', rp.ref_range, 'abnormal', rp.abnormal
              ))
              FROM report_parameters rp
              WHERE rp.report_order_id = NEW.id AND rp.deleted = 0
                AND rp.tenant_id = NEW.tenant_id
            ), '[]')
          ),
          CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS sync_queue_admission_insert
      AFTER INSERT ON admissions
      BEGIN
        INSERT INTO sync_queue (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
        VALUES (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'admission', NEW.id,
          CASE WHEN NEW.deleted = 1 OR NEW.status = 'cancelled' THEN 'cancel' ELSE 'upsert' END,
          json_object(
            'id', NEW.id, 'admission_no', NEW.admission_no, 'patient_id', NEW.patient_id,
            'doctor_id', NEW.doctor_id, 'status', NEW.status, 'ward', NEW.ward, 'bed', NEW.bed,
            'reason', NEW.reason, 'diagnosis', NEW.diagnosis, 'admitted_at', NEW.admitted_at,
            'discharged_at', NEW.discharged_at, 'discharge_summary', NEW.discharge_summary,
            'created_at', NEW.created_at, 'updated_at', NEW.updated_at,
            'device_id', NEW.device_id, 'deleted', NEW.deleted
          ),
          CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS sync_queue_admission_update
      AFTER UPDATE ON admissions
      BEGIN
        INSERT INTO sync_queue (id, tenant_id, device_id, entity_type, entity_id, operation, payload_json, created_at)
        VALUES (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'admission', NEW.id,
          CASE WHEN NEW.deleted = 1 OR NEW.status = 'cancelled' THEN 'cancel' ELSE 'upsert' END,
          json_object(
            'id', NEW.id, 'admission_no', NEW.admission_no, 'patient_id', NEW.patient_id,
            'doctor_id', NEW.doctor_id, 'status', NEW.status, 'ward', NEW.ward, 'bed', NEW.bed,
            'reason', NEW.reason, 'diagnosis', NEW.diagnosis, 'admitted_at', NEW.admitted_at,
            'discharged_at', NEW.discharged_at, 'discharge_summary', NEW.discharge_summary,
            'created_at', NEW.created_at, 'updated_at', NEW.updated_at,
            'device_id', NEW.device_id, 'deleted', NEW.deleted
          ),
          CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;
    `,
  },
  {
    version: 18,
    name: "decoupled local CSV export queue",
    sql: `
      -- Local-only export ledger: no network endpoint, token or ACK table is
      -- involved. Each row remains pending until a CSV file is written.
      CREATE TABLE IF NOT EXISTS local_export_queue (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        device_id TEXT NOT NULL DEFAULT '',
        module_type TEXT NOT NULL
          CHECK (module_type IN ('Pharmacy','Diagnostics','Hospital')),
        transaction_id TEXT NOT NULL,
        patient_id TEXT NOT NULL DEFAULT '',
        total_amount_paise INTEGER NOT NULL DEFAULT 0,
        occurred_at INTEGER NOT NULL,
        exported_at INTEGER,
        export_file TEXT NOT NULL DEFAULT '',
        last_error TEXT NOT NULL DEFAULT '',
        last_attempt_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_local_export_pending
        ON local_export_queue(tenant_id, exported_at, created_at);

      -- Stop writing the legacy cloud queue. Historical sync_queue/sync_ack
      -- rows are left untouched for audit but are no longer read by the app.
      DROP TRIGGER IF EXISTS sync_queue_invoice_insert;
      DROP TRIGGER IF EXISTS sync_queue_invoice_update;
      DROP TRIGGER IF EXISTS sync_queue_report_insert;
      DROP TRIGGER IF EXISTS sync_queue_report_update;
      DROP TRIGGER IF EXISTS sync_queue_admission_insert;
      DROP TRIGGER IF EXISTS sync_queue_admission_update;

      -- Backfill current transactions so the first local export catches up.
      INSERT INTO local_export_queue
        (id, tenant_id, device_id, module_type, transaction_id, patient_id,
         total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
      SELECT lower(hex(randomblob(16))), i.tenant_id, i.device_id, 'Diagnostics', i.id,
             i.patient_id, i.total_paise,
             COALESCE(NULLIF(i.updated_at, 0), i.created_at,
                      CAST(strftime('%s','now') AS INTEGER) * 1000),
             NULL, '', '',
             CAST(strftime('%s','now') AS INTEGER) * 1000
      FROM invoices i;

      INSERT INTO local_export_queue
        (id, tenant_id, device_id, module_type, transaction_id, patient_id,
         total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
      SELECT lower(hex(randomblob(16))), ps.tenant_id, ps.device_id, 'Pharmacy', ps.id,
             ps.patient_id, ps.total_paise,
             COALESCE(NULLIF(ps.updated_at, 0), ps.sale_date,
                      CAST(strftime('%s','now') AS INTEGER) * 1000),
             NULL, '', '',
             CAST(strftime('%s','now') AS INTEGER) * 1000
      FROM pharmacy_sales ps;

      INSERT INTO local_export_queue
        (id, tenant_id, device_id, module_type, transaction_id, patient_id,
         total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
      SELECT lower(hex(randomblob(16))), a.tenant_id, a.device_id, 'Hospital', a.id,
             a.patient_id,
             COALESCE((
               SELECT SUM(h.amount_paise)
               FROM hospital_charges h
               WHERE h.admission_id = a.id AND h.tenant_id = a.tenant_id
                 AND h.deleted = 0
             ), 0),
             COALESCE(NULLIF(a.updated_at, 0), a.admitted_at,
                      CAST(strftime('%s','now') AS INTEGER) * 1000),
             NULL, '', '',
             CAST(strftime('%s','now') AS INTEGER) * 1000
      FROM admissions a;

      CREATE TRIGGER IF NOT EXISTS local_export_invoice_insert
      AFTER INSERT ON invoices
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        VALUES
          (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'Diagnostics', NEW.id,
           NEW.patient_id, NEW.total_paise,
           COALESCE(NULLIF(NEW.updated_at, 0), NEW.created_at,
                    CAST(strftime('%s','now') AS INTEGER) * 1000),
           NULL, '', '', CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS local_export_invoice_update
      AFTER UPDATE ON invoices
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        VALUES
          (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'Diagnostics', NEW.id,
           NEW.patient_id, NEW.total_paise,
           COALESCE(NULLIF(NEW.updated_at, 0), NEW.created_at,
                    CAST(strftime('%s','now') AS INTEGER) * 1000),
           NULL, '', '', CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS local_export_pharmacy_sale_insert
      AFTER INSERT ON pharmacy_sales
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        VALUES
          (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'Pharmacy', NEW.id,
           NEW.patient_id, NEW.total_paise,
           COALESCE(NULLIF(NEW.updated_at, 0), NEW.sale_date,
                    CAST(strftime('%s','now') AS INTEGER) * 1000),
           NULL, '', '', CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS local_export_pharmacy_sale_update
      AFTER UPDATE ON pharmacy_sales
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        VALUES
          (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'Pharmacy', NEW.id,
           NEW.patient_id, NEW.total_paise,
           COALESCE(NULLIF(NEW.updated_at, 0), NEW.sale_date,
                    CAST(strftime('%s','now') AS INTEGER) * 1000),
           NULL, '', '', CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS local_export_admission_insert
      AFTER INSERT ON admissions
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        VALUES
          (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'Hospital', NEW.id,
           NEW.patient_id,
           COALESCE((
             SELECT SUM(h.amount_paise)
             FROM hospital_charges h
             WHERE h.admission_id = NEW.id AND h.tenant_id = NEW.tenant_id
               AND h.deleted = 0
           ), 0),
           COALESCE(NULLIF(NEW.updated_at, 0), NEW.admitted_at,
                    CAST(strftime('%s','now') AS INTEGER) * 1000),
           NULL, '', '', CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS local_export_admission_update
      AFTER UPDATE ON admissions
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        VALUES
          (lower(hex(randomblob(16))), NEW.tenant_id, NEW.device_id, 'Hospital', NEW.id,
           NEW.patient_id,
           COALESCE((
             SELECT SUM(h.amount_paise)
             FROM hospital_charges h
             WHERE h.admission_id = NEW.id AND h.tenant_id = NEW.tenant_id
               AND h.deleted = 0
           ), 0),
           COALESCE(NULLIF(NEW.updated_at, 0), NEW.admitted_at,
                    CAST(strftime('%s','now') AS INTEGER) * 1000),
           NULL, '', '', CAST(strftime('%s','now') AS INTEGER) * 1000);
      END;

      CREATE TRIGGER IF NOT EXISTS local_export_hospital_charge_insert
      AFTER INSERT ON hospital_charges
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        SELECT lower(hex(randomblob(16))), a.tenant_id, a.device_id, 'Hospital', a.id,
               a.patient_id,
               COALESCE(SUM(h.amount_paise), 0),
               NEW.charged_at, NULL, '', '',
               CAST(strftime('%s','now') AS INTEGER) * 1000
        FROM admissions a
        LEFT JOIN hospital_charges h
          ON h.admission_id = a.id AND h.tenant_id = a.tenant_id AND h.deleted = 0
        WHERE a.id = NEW.admission_id AND a.tenant_id = NEW.tenant_id
        GROUP BY a.id;
      END;

      CREATE TRIGGER IF NOT EXISTS local_export_hospital_charge_update
      AFTER UPDATE ON hospital_charges
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        SELECT lower(hex(randomblob(16))), a.tenant_id, a.device_id, 'Hospital', a.id,
               a.patient_id,
               COALESCE(SUM(h.amount_paise), 0),
               NEW.charged_at, NULL, '', '',
               CAST(strftime('%s','now') AS INTEGER) * 1000
        FROM admissions a
        LEFT JOIN hospital_charges h
          ON h.admission_id = a.id AND h.tenant_id = a.tenant_id AND h.deleted = 0
        WHERE a.id = NEW.admission_id AND a.tenant_id = NEW.tenant_id
        GROUP BY a.id;
      END;

      CREATE TRIGGER IF NOT EXISTS local_export_hospital_charge_delete
      AFTER DELETE ON hospital_charges
      BEGIN
        INSERT INTO local_export_queue
          (id, tenant_id, device_id, module_type, transaction_id, patient_id,
           total_amount_paise, occurred_at, exported_at, export_file, last_error, created_at)
        SELECT lower(hex(randomblob(16))), a.tenant_id, a.device_id, 'Hospital', a.id,
               a.patient_id,
               COALESCE(SUM(h.amount_paise), 0),
               OLD.charged_at, NULL, '', '',
               CAST(strftime('%s','now') AS INTEGER) * 1000
        FROM admissions a
        LEFT JOIN hospital_charges h
          ON h.admission_id = a.id AND h.tenant_id = a.tenant_id AND h.deleted = 0
        WHERE a.id = OLD.admission_id AND a.tenant_id = OLD.tenant_id
        GROUP BY a.id;
      END;
    `,
  },
];

/** First-boot seed data: lab settings, admin user, expense categories, sample catalog. */
export const SEED_SQL = `
  INSERT OR IGNORE INTO meta (key, value) VALUES ('bootstrapped_at', '1');

  -- Default tenant for single-tenant desktop use (backward compatible)
  INSERT OR IGNORE INTO tenants (id, name, slug, type, status, settings_json, subscription_plan, created_at, updated_at, device_id, dirty, deleted) VALUES
    ('tenant-default', 'Default Diagnostic Centre', 'default', 'diagnostic', 'active', '{}', 'free', 0, 0, '', 0, 0);

  INSERT OR IGNORE INTO settings (key, value, updated_at, device_id, tenant_id) VALUES
    ('lab_name', 'My Diagnostic Centre', 0, '', 'tenant-default'),
    ('lab_address', '', 0, '', 'tenant-default'),
    ('lab_phone', '', 0, '', 'tenant-default'),
    ('lab_gstin', '', 0, '', 'tenant-default'),
    ('invoice_prefix', 'INV-', 0, '', 'tenant-default'),
    ('device_code', 'A', 0, '', 'tenant-default'),
    ('invoice_device_code', '1', 0, '', 'tenant-default'),
    ('pathologist_name', '', 0, '', 'tenant-default'),
    ('pathologist_qualification', '', 0, '', 'tenant-default'),
    ('currency', 'INR', 0, '', 'tenant-default'),
    ('facility_hfr_id', '', 0, '', 'tenant-default'),
    ('facility_hip_id', '', 0, '', 'tenant-default'),
    ('abdm_environment', 'disabled', 0, '', 'tenant-default'),
    ('accreditation_body', '', 0, '', 'tenant-default'),
    ('accreditation_number', '', 0, '', 'tenant-default'),
    ('accreditation_valid_until', '', 0, '', 'tenant-default');

  INSERT OR IGNORE INTO expense_categories (id, name, sort_order, created_at, updated_at, device_id, dirty, deleted, tenant_id) VALUES
    ('expcat-rent', 'Rent', 1, 0, 0, '', 0, 0, 'tenant-default'),
    ('expcat-electricity', 'Electricity', 2, 0, 0, '', 0, 0, 'tenant-default'),
    ('expcat-salary', 'Salaries', 3, 0, 0, '', 0, 0, 'tenant-default'),
    ('expcat-consumables', 'Reagents & Consumables', 4, 0, 0, '', 0, 0, 'tenant-default'),
    ('expcat-maintenance', 'Equipment Maintenance', 5, 0, 0, '', 0, 0, 'tenant-default'),
    ('expcat-marketing', 'Marketing', 6, 0, 0, '', 0, 0, 'tenant-default'),
    ('expcat-misc', 'Miscellaneous', 7, 0, 0, '', 0, 0, 'tenant-default');

  -- Starter catalog, EDIT FREELY (prices are pre-tax examples, adjust to your rate list)
  INSERT OR IGNORE INTO tests (id, code, name, category, price_paise, gst_rate_bp, sac_code, unit, ref_range, ref_min, ref_max, report_type, is_active, created_at, updated_at, device_id, dirty, deleted, tenant_id) VALUES
    ('test-cbc',   'CBC',    'Complete Blood Count (CBC)',        'Pathology', 30000, 1200, '999316', 'cells/cmm', '4,000 - 11,000', 4000, 11000, 'numeric', 1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-hb',    'HB',     'Haemoglobin',                      'Pathology', 10000, 1200, '999316', 'g/dL',      '12 - 16',       12,   16,   'numeric', 1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-fbs',   'FBS',    'Blood Sugar Fasting',              'Pathology', 10000, 1200, '999316', 'mg/dL',     '70 - 100',      70,   100,  'numeric', 1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-rbs',   'RBS',    'Blood Sugar Random',               'Pathology', 10000, 1200, '999316', 'mg/dL',     '70 - 140',      70,   140,  'numeric', 1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-lipid', 'LIPID',  'Lipid Profile',                    'Pathology', 40000, 1200, '999316', '',          '',              NULL, NULL, 'text',    1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-lft',   'LFT',    'Liver Function Test (LFT)',        'Pathology', 50000, 1200, '999316', '',          '',              NULL, NULL, 'text',    1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-kft',   'KFT',    'Kidney Function Test (KFT)',       'Pathology', 50000, 1200, '999316', '',          '',              NULL, NULL, 'text',    1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-urine', 'URINE',  'Urine Routine Examination',        'Pathology', 15000, 1200, '999316', '',          '',              NULL, NULL, 'text',    1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-tsh',   'TSH',    'Thyroid Stimulating Hormone',      'Pathology', 25000, 1200, '999316', 'mIU/L',     '0.4 - 4.0',     0.4,  4,    'numeric', 1, 0, 0, '', 0, 0, 'tenant-default'),
    ('test-hba1c', 'HBA1C',  'Glycated Haemoglobin (HbA1c)',     'Pathology', 55000, 1200, '999316', '%',          '< 5.7',         NULL, 5.7,  'numeric', 1, 0, 0, '', 0, 0, 'tenant-default'),
    ('xr-chestpa', 'CXP',    'Chest X-Ray PA View',              'X-Ray',     30000, 1200, '999316', '',          '',              NULL, NULL, 'text',    1, 0, 0, '', 0, 0, 'tenant-default'),
    ('xr-chestlat', 'CXL',   'Chest X-Ray Lateral View',         'X-Ray',     30000, 1200, '999316', '',          '',              NULL, NULL, 'text',    1, 0, 0, '', 0, 0, 'tenant-default'),
    ('xr-abdomen', 'ABXP',   'X-Ray Abdomen PA View',            'X-Ray',     35000, 1200, '999316', '',          '',              NULL, NULL, 'text',    1, 0, 0, '', 0, 0, 'tenant-default'),
    ('xr-knee',    'KNEE',   'X-Ray Knee AP & Lateral',          'X-Ray',     40000, 1200, '999316', '',          '',              NULL, NULL, 'text',    1, 0, 0, '', 0, 0, 'tenant-default');

  -- Starter specimen metadata. Seed runs after migrations, so keep this here as
  -- well as in the upgrade repair migration.
  UPDATE tests SET specimen_type = 'Whole Blood', container_type = 'EDTA (lavender top)',
    department = 'Haematology', method = 'Automated analyser'
  WHERE id IN ('test-cbc','test-hb') AND tenant_id = 'tenant-default' AND specimen_type = '';
  UPDATE tests SET specimen_type = 'Serum', container_type = 'Clot activator / gel (gold top)',
    department = 'Clinical Biochemistry'
  WHERE id IN ('test-fbs','test-rbs','test-lft','test-kft','test-lipid','test-tsh','test-hba1c')
    AND tenant_id = 'tenant-default' AND specimen_type = '';
  UPDATE tests SET specimen_type = 'Urine', container_type = 'Sterile urine container',
    department = 'Clinical Pathology', method = 'Dipstick and microscopy'
  WHERE id = 'test-urine' AND tenant_id = 'tenant-default' AND specimen_type = '';
  UPDATE tests SET department = 'Radiology', method = 'Radiography'
  WHERE id IN ('xr-chestpa','xr-chestlat','xr-abdomen','xr-knee')
    AND tenant_id = 'tenant-default' AND department = '';

  INSERT OR IGNORE INTO packages (id, name, price_paise, gst_rate_bp, is_active, created_at, updated_at, device_id, dirty, deleted, tenant_id) VALUES
    ('pkg-fasting', 'Fasting Sugar + Lipid Combo', 45000, 1200, 1, 0, 0, '', 0, 0, 'tenant-default'),
    ('pkg-master',  'Master Health Check (Basic)', 99900, 1200, 1, 0, 0, '', 0, 0, 'tenant-default');

  INSERT OR IGNORE INTO package_items (id, package_id, test_id, created_at, updated_at, device_id, dirty, deleted, tenant_id) VALUES
    ('pkgi-1', 'pkg-fasting', 'test-fbs',   0, 0, '', 0, 0, 'tenant-default'),
    ('pkgi-2', 'pkg-fasting', 'test-lipid', 0, 0, '', 0, 0, 'tenant-default'),
    ('pkgi-3', 'pkg-master',  'test-cbc',   0, 0, '', 0, 0, 'tenant-default'),
    ('pkgi-4', 'pkg-master',  'test-fbs',   0, 0, '', 0, 0, 'tenant-default'),
    ('pkgi-5', 'pkg-master',  'test-lipid', 0, 0, '', 0, 0, 'tenant-default'),
    ('pkgi-6', 'pkg-master',  'test-lft',   0, 0, '', 0, 0, 'tenant-default'),
    ('pkgi-7', 'pkg-master',  'test-kft',   0, 0, '', 0, 0, 'tenant-default'),
    ('pkgi-8', 'pkg-master',  'test-urine', 0, 0, '', 0, 0, 'tenant-default');
`;
