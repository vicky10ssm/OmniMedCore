// Row types for every table. Money fields are suffixed _paise (integer rupees × 100).

export interface SyncCols {
  created_at: number;
  updated_at: number;
  device_id: string;
  dirty: number;
  deleted: number;
  tenant_id: string;
}

export interface MetaRow {
  key: string;
  value: string;
}

export interface SettingRow {
  key: string;
  value: string;
  updated_at: number;
  device_id: string;
  tenant_id: string;
}

export interface UserRow extends SyncCols {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "operator";
  password_hash: string;
  must_change_password: number;
  is_active: number;
  totp_secret: string;
  totp_enabled: number;
  totp_last_step: number;
  /** JSON array of PBKDF2-hashed one-time recovery codes. */
  recovery_codes: string;
  /** Explicit authority to review and release clinical reports. */
  can_authorize_reports: number;
}

export interface PatientRow extends SyncCols {
  id: string;
  phone: string;
  name: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  address: string;
  created_by: string;
  dob: string;
  id_proof_type: string;
  id_proof_no: string;
  abha_id: string;
  consent_given: number;
  consent_at: number | null;
}

export interface TestRow extends SyncCols {
  id: string;
  code: string;
  name: string;
  category: string;
  price_paise: number;
  gst_rate_bp: number;
  sac_code: string;
  unit: string;
  ref_range: string;
  ref_min: number | null;
  ref_max: number | null;
  report_type: "text" | "numeric";
  is_active: number;
  method: string;
  specimen_type: string;
  container_type: string;
  equipment_id: string;
  loinc_code: string;
  turnaround_time_hours: number | null;
  department: string;
  accreditation_status: string;
}

export interface PackageRow extends SyncCols {
  id: string;
  name: string;
  price_paise: number;
  gst_rate_bp: number;
  is_active: number;
}

export interface PackageItemRow extends SyncCols {
  id: string;
  package_id: string;
  test_id: string;
}

export interface DoctorRow extends SyncCols {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  reg_no: string;
  phone: string;
  address: string;
  email: string;
  /** Legacy columns retained for historical data; not exposed or accrued by the current UI. */
  commission_type: "percent" | "flat";
  /** percent → basis points (1000 = 10.00%); flat → paise per invoice line */
  commission_value: number;
  is_active: number;
  notes: string;
  council_name: string;
  digital_signature_path: string;
  is_reporting_pathologist: number;
}

export interface InvoiceBlockRow extends SyncCols {
  id: string;
  purpose: string;
  prefix: string;
  next_no: number;
  end_no: number;
}

export interface InvoiceRow extends SyncCols {
  id: string;
  invoice_no: string;
  invoice_date: number;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  subtotal_paise: number;
  discount_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  round_off_paise: number;
  total_paise: number;
  status: "unpaid" | "partial" | "paid" | "cancelled";
  cancel_reason: string;
  notes: string;
  created_by: string;
  sample_ids: string;
  reporting_pathologist_id: string;
}

export interface InvoiceItemRow extends SyncCols {
  id: string;
  invoice_id: string;
  line_no: number;
  item_type: "test" | "package";
  test_id: string;
  package_id: string;
  description: string;
  qty: number;
  unit_price_paise: number;
  gst_rate_bp: number;
  amount_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
}

export interface PaymentRow extends SyncCols {
  id: string;
  invoice_id: string;
  amount_paise: number;
  mode: "cash" | "upi" | "card" | "bank" | "credit";
  paid_at: number;
  note: string;
  created_by: string;
}

export interface ExpenseCategoryRow extends SyncCols {
  id: string;
  name: string;
  sort_order: number;
}

export interface ExpenseRow extends SyncCols {
  id: string;
  category_id: string;
  paid_at: number;
  payee: string;
  amount_paise: number;
  mode: "cash" | "upi" | "card" | "bank";
  bill_no: string;
  note: string;
  created_by: string;
}

/** Legacy commission payout row; not used by current screens or invoice flows. */
export interface PayoutRow extends SyncCols {
  id: string;
  doctor_id: string;
  amount_paise: number;
  paid_at: number;
  mode: string;
  note: string;
  created_by: string;
}

/** Legacy commission ledger row; retained for historical data only. */
export interface CommissionEntryRow extends SyncCols {
  id: string;
  invoice_id: string;
  doctor_id: string;
  amount_paise: number;
  reason: "accrual" | "reversal";
  accrued_at: number;
  payout_id: string;
  status: "accrued" | "paid";
}

export interface ReportOrderRow extends SyncCols {
  id: string;
  invoice_id: string;
  patient_id: string;
  test_id: string;
  test_name: string;
  package_id: string;
  status: "pending" | "in_progress" | "verified" | "done" | "rejected";
  result_value: number | null;
  result_text: string;
  unit: string;
  ref_range: string;
  ref_min: number | null;
  ref_max: number | null;
  abnormal: number;
  critical_flag: number;
  entered_by: string;
  verified_by: string;
  reported_at: number | null;
  printed_at: number | null;
  sample_id: string;
  specimen_collected_at: number | null;
  specimen_received_at: number | null;
  analysis_started_at: number | null;
  analysis_completed_at: number | null;
  equipment_id: string;
  reagent_lot: string;
  comments: string;
  technologist_notes: string;
  approval_status: string;
  approved_by: string;
  approved_at: number | null;
}

export interface TestParameterRow extends SyncCols {
  id: string;
  test_id: string;
  name: string;
  sort_order: number;
  unit: string;
  ref_range: string;
  ref_min: number | null;
  ref_max: number | null;
  report_type: "text" | "numeric" | "select";
  options: string;
  is_active: number;
  loinc_code: string;
}

export interface ReportParameterRow extends SyncCols {
  id: string;
  report_order_id: string;
  parameter_id: string;
  parameter_name: string;
  unit: string;
  ref_range: string;
  ref_min: number | null;
  ref_max: number | null;
  result_value: number | null;
  result_text: string;
  abnormal: number;
  loinc_code: string;
}

export interface SampleRow extends SyncCols {
  id: string;
  accession_no: string;
  invoice_id: string;
  patient_id: string;
  specimen_type: string;
  container_type: string;
  status: "expected" | "collected" | "received" | "accepted" | "rejected" | "disposed";
  collection_site: string;
  collected_at: number | null;
  collected_by: string;
  received_at: number | null;
  received_by: string;
  accepted_at: number | null;
  accepted_by: string;
  rejected_at: number | null;
  rejected_by: string;
  rejection_reason: string;
  storage_location: string;
  transport_note: string;
  disposed_at: number | null;
  disposed_by: string;
  disposal_method: string;
  notes: string;
}

export interface AdmissionRow extends SyncCols {
  id: string;
  admission_no: string;
  patient_id: string;
  doctor_id: string;
  status: "admitted" | "discharged" | "cancelled";
  ward: string;
  bed: string;
  reason: string;
  diagnosis: string;
  admitted_at: number;
  discharged_at: number | null;
  discharge_summary: string;
  created_by: string;
}

export interface HospitalServiceRow extends SyncCols {
  id: string;
  code: string;
  name: string;
  category: string;
  price_paise: number;
  gst_rate_bp: number;
  sac_code: string;
  is_active: number;
}

export interface HospitalChargeRow extends SyncCols {
  id: string;
  admission_id: string;
  patient_id: string;
  service_id: string;
  description: string;
  qty: number;
  unit_price_paise: number;
  gst_rate_bp: number;
  amount_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  charged_at: number;
  created_by: string;
}

export interface HospitalBillPaymentRow extends SyncCols {
  id: string;
  admission_id: string;
  amount_paise: number;
  mode: "cash" | "upi" | "card" | "bank";
  paid_at: number;
  note: string;
  created_by: string;
}

export interface MedicineRow extends SyncCols {
  id: string;
  code: string;
  name: string;
  form: string;
  strength: string;
  manufacturer: string;
  hsn_code: string;
  gst_rate_bp: number;
  mrp_paise: number;
  sale_price_paise: number;
  reorder_level: number;
  is_active: number;
}

export interface PharmacyBatchRow extends SyncCols {
  id: string;
  medicine_id: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  purchase_price_paise: number;
  supplier: string;
  received_at: number;
}

export interface PharmacySaleRow extends SyncCols {
  id: string;
  bill_no: string;
  patient_id: string;
  patient_name: string;
  sale_date: number;
  subtotal_paise: number;
  discount_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  round_off_paise: number;
  total_paise: number;
  payment_mode: "cash" | "upi" | "card" | "bank";
  status: "paid" | "cancelled";
  notes: string;
  created_by: string;
}

export interface PharmacySaleItemRow extends SyncCols {
  id: string;
  sale_id: string;
  medicine_id: string;
  batch_id: string;
  description: string;
  batch_no: string;
  expiry_date: string;
  qty: number;
  unit_price_paise: number;
  gst_rate_bp: number;
  amount_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
}

export interface ReportResultRevisionRow extends SyncCols {
  id: string;
  report_order_id: string;
  invoice_id: string;
  revision_no: number;
  action: "draft" | "verified" | "amended";
  reason: string;
  snapshot_json: string;
  acted_by: string;
  acted_at: number;
}

export interface AbdmConsentRow extends SyncCols {
  id: string;
  patient_id: string;
  purpose: string;
  status: "active" | "revoked" | "expired";
  consent_version: string;
  granted_at: number;
  granted_by: string;
  expires_at: number | null;
  revoked_at: number | null;
  revoked_by: string;
  artefact_json: string;
}

export interface AbdmOutboxRow extends SyncCols {
  id: string;
  order_id: string;
  patient_id: string;
  consent_id: string;
  bundle_id: string;
  fhir_version: string;
  profile_version: string;
  environment: string;
  status: "draft" | "queued" | "sent" | "failed";
  bundle_json: string;
  generated_at: number;
  generated_by: string;
  sent_at: number | null;
  last_error: string;
}

export interface AuditLogRow extends SyncCols {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  detail: string;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  type: "diagnostic" | "hospital" | "clinic";
  status: "active" | "suspended" | "inactive";
  settings_json: string;
  subscription_plan: string;
  subscription_expires_at: number | null;
  created_at: number;
  updated_at: number;
  device_id: string;
  dirty: number;
  deleted: number;
}
