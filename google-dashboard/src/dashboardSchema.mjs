// Dashboard reporting contract.
//
// The full snapshot contains every business table, including patient names and
// clinical free text. The dashboard does not need those fields. These lists are
// an explicit column allowlist: only the fields below are loaded into BigQuery.
// Anything not listed is discarded by the ingestion job before it leaves the
// clinic's Cloud Run environment.

export const TRANSACTION_COLUMNS = [
  "Sync_Timestamp",
  "Transaction_ID",
  "Module_Type",
  "Masked_Patient_ID",
  "Total_Amount",
];

/**
 * @typedef {{ required: boolean, columns: string[] }} TableContract
 */

/** @type {Record<string, TableContract>} */
export const DASHBOARD_TABLES = {
  tenants: {
    required: true,
    columns: ["id", "name", "type", "status", "created_at", "deleted"],
  },
  patients: {
    required: false,
    columns: ["id", "tenant_id", "age", "gender", "created_at", "deleted"],
  },
  doctors: {
    required: false,
    columns: [
      "id",
      "tenant_id",
      "name",
      "specialization",
      "is_active",
      "deleted",
    ],
  },
  tests: {
    required: false,
    columns: [
      "id",
      "tenant_id",
      "code",
      "name",
      "category",
      "price_paise",
      "gst_rate_bp",
      "is_active",
      "deleted",
    ],
  },
  expense_categories: {
    required: false,
    columns: ["id", "tenant_id", "name", "sort_order", "deleted"],
  },
  invoices: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "invoice_no",
      "invoice_date",
      "patient_id",
      "doctor_id",
      "subtotal_paise",
      "discount_paise",
      "taxable_paise",
      "cgst_paise",
      "sgst_paise",
      "round_off_paise",
      "total_paise",
      "status",
      "deleted",
    ],
  },
  invoice_items: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "invoice_id",
      "line_no",
      "item_type",
      "test_id",
      "package_id",
      "description",
      "qty",
      "unit_price_paise",
      "gst_rate_bp",
      "amount_paise",
      "taxable_paise",
      "cgst_paise",
      "sgst_paise",
      "deleted",
    ],
  },
  payments: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "invoice_id",
      "amount_paise",
      "mode",
      "paid_at",
      "deleted",
    ],
  },
  expenses: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "category_id",
      "paid_at",
      "amount_paise",
      "mode",
      "modules",
      "deleted",
    ],
  },
  report_orders: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "invoice_id",
      "patient_id",
      "test_id",
      "test_name",
      "status",
      "reported_at",
      "printed_at",
      "sample_id",
      "specimen_collected_at",
      "specimen_received_at",
      "analysis_started_at",
      "analysis_completed_at",
      "abnormal",
      "critical_flag",
      "deleted",
    ],
  },
  samples: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "accession_no",
      "invoice_id",
      "patient_id",
      "specimen_type",
      "status",
      "collected_at",
      "received_at",
      "accepted_at",
      "rejected_at",
      "disposed_at",
      "deleted",
    ],
  },
  pharmacy_sales: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "bill_no",
      "patient_id",
      "sale_date",
      "subtotal_paise",
      "discount_paise",
      "taxable_paise",
      "cgst_paise",
      "sgst_paise",
      "round_off_paise",
      "total_paise",
      "payment_mode",
      "status",
      "deleted",
    ],
  },
  admissions: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "admission_no",
      "patient_id",
      "doctor_id",
      "status",
      "ward",
      "bed",
      "admitted_at",
      "discharged_at",
      "deleted",
    ],
  },
  hospital_charges: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "admission_id",
      "patient_id",
      "service_id",
      "qty",
      "unit_price_paise",
      "gst_rate_bp",
      "amount_paise",
      "taxable_paise",
      "cgst_paise",
      "sgst_paise",
      "charged_at",
      "deleted",
    ],
  },
  hospital_bill_payments: {
    required: true,
    columns: [
      "id",
      "tenant_id",
      "admission_id",
      "amount_paise",
      "mode",
      "paid_at",
      "deleted",
    ],
  },
};

export const SENSITIVE_COLUMNS = new Set([
  "phone",
  "address",
  "dob",
  "id_proof_type",
  "id_proof_no",
  "abha_id",
  "patient_name",
  "password_hash",
  "totp_secret",
  "recovery_codes",
  "totp_last_step",
  "clinical_history",
  "findings",
  "impression",
  "diagnosis",
  "comments",
  "notes",
  "rejection_reason",
  "discharge_summary",
  "signature",
  "signature_path",
]);

export function selectedColumns(table, manifestColumns) {
  const contract = DASHBOARD_TABLES[table];
  if (!contract) return [];
  const available = new Set(manifestColumns.map((column) => column.toLowerCase()));
  return contract.columns.filter((column) =>
    available.has(column.toLowerCase())
  );
}
