// Development/demo data only. Never called by the production application.
//
// The seed is designed to make every buyer-facing workflow demonstrable without
// touching real patient data: paid/partial/credit/cancelled bills, sample states,
// parameter reports, amendments, expenses and ABDM drafts.

import type { DataSource } from "./index";
import { writeAudit } from "./audit";
import { getDeviceId, now, uuid } from "./helpers";
import {
  computeTotals,
  saveInvoice,
  cancelInvoice,
  type BillLineInput,
  type PaymentMode,
} from "./invoicing";
import { saveAbdmDraft, prepareAbdmDraft } from "../abdm/export";
import { getCurrentTenantId, tenantAnd } from "./tenant";
import type {
  MetaRow,
  PackageRow,
  ReportOrderRow,
  ReportParameterRow,
  TestParameterRow,
  TestRow,
  UserRow,
} from "./types";

export const DEMO_SEED_VERSION = "2026-10-26-v1";
const SEED_KEY = "demo_seed_version";
const TENANT = "tenant-default";

interface SeedPatient {
  name: string;
  phone: string;
  age: number;
  gender: "male" | "female" | "other";
  address: string;
  abha?: string;
  consent?: "active" | "revoked";
}

interface Prescription {
  patient: number;
  doctor: number;
  items: Array<{ kind: "test" | "package"; id: string }>;
  daysAgo: number;
  discountPaise?: number;
  pay: "full" | "partial" | "credit";
  fraction?: number;
  mode: PaymentMode;
  workflow:
    | "done-selective"
    | "done"
    | "done-amend"
    | "draft"
    | "rejected"
    | "accepted-pending"
    | "received"
    | "collected"
    | "expected"
    | "xray"
    | "cancelled";
  label: string;
}

const PATIENTS: SeedPatient[] = [
  { name: "Aarav Sharma", phone: "9000000001", age: 35, gender: "male", address: "Indiranagar, Bengaluru", abha: "91-0000-0000-0001", consent: "active" },
  { name: "Meera Iyer", phone: "9000000002", age: 42, gender: "female", address: "Jayanagar, Bengaluru", abha: "91-0000-0000-0002", consent: "active" },
  { name: "Rohan Patil", phone: "9000000003", age: 28, gender: "male", address: "Kothrud, Pune" },
  { name: "Sana Khan", phone: "9000000004", age: 31, gender: "female", address: "Banjara Hills, Hyderabad" },
  { name: "Vikram Nair", phone: "9000000005", age: 55, gender: "male", address: "Kochi, Kerala" },
  { name: "Priya Sen", phone: "9000000006", age: 24, gender: "female", address: "Salt Lake, Kolkata" },
  { name: "Joseph Thomas", phone: "9000000007", age: 63, gender: "male", address: "Thrissur, Kerala" },
  { name: "Farah Ali", phone: "9000000008", age: 39, gender: "female", address: "Lucknow, Uttar Pradesh" },
  { name: "Devansh Gupta", phone: "9000000009", age: 19, gender: "male", address: "Dwarka, New Delhi" },
  { name: "Ananya Bose", phone: "9000000010", age: 47, gender: "female", address: "Bhubaneswar, Odisha", abha: "91-0000-0000-0010", consent: "revoked" },
  { name: "Karan Malhotra", phone: "9000000011", age: 52, gender: "male", address: "Chandigarh" },
  { name: "Lakshmi Menon", phone: "9000000012", age: 68, gender: "female", address: "Chennai, Tamil Nadu" },
];

const DOCTORS = [
  { id: "demo-doctor-1", name: "Dr. Ananya Rao", qualification: "MBBS, MD (Radiology)", specialization: "Radiology", reg_no: "KA-RAD-10231", phone: "9880000001" },
  { id: "demo-doctor-2", name: "Dr. Vikram Mehta", qualification: "MBBS, MD (Pathology)", specialization: "Pathology", reg_no: "MH-PATH-22018", phone: "9880000002" },
  { id: "demo-doctor-3", name: "Dr. Neha Kulkarni", qualification: "MBBS, DGO", specialization: "Obstetrics", reg_no: "KA-OBG-40882", phone: "9880000003" },
  { id: "demo-doctor-4", name: "Dr. Arjun Nair", qualification: "MBBS, MD (General Medicine)", specialization: "General Medicine", reg_no: "KL-MED-33190", phone: "9880000004" },
];

const EXTRA_TESTS = [
  { id: "test-crp", code: "CRP", name: "C-Reactive Protein", price: 80000, unit: "mg/L", ref: "< 10", min: 0, max: 10, specimen: "Serum", container: "Clot activator / gel", department: "Clinical Biochemistry", method: "Immunoturbidimetry", loinc: "1988-5" },
  { id: "test-esr", code: "ESR", name: "Erythrocyte Sedimentation Rate", price: 15000, unit: "mm/hr", ref: "0 - 20", min: 0, max: 20, specimen: "Whole Blood", container: "EDTA", department: "Haematology", method: "Westergren", loinc: "30341-2" },
  { id: "test-vdrl", code: "VDRL", name: "VDRL / RPR", price: 40000, unit: "", ref: "Non-Reactive", min: null, max: null, specimen: "Serum", container: "Clot activator / gel", department: "Serology", method: "Slide agglutination", loinc: "" },
  { id: "test-ptinr", code: "PTINR", name: "Prothrombin Time / INR", price: 35000, unit: "ratio", ref: "0.8 - 1.2", min: 0.8, max: 1.2, specimen: "Citrated Plasma", container: "Sodium citrate", department: "Haematology", method: "Optical coagulometry", loinc: "5902-2" },
];

const INVOICES: Prescription[] = [
  { patient: 0, doctor: 3, items: [{ kind: "test", id: "test-cbc" }], daysAgo: 0, pay: "full", mode: "cash", workflow: "done-selective", label: "CBC selected parameters" },
  { patient: 1, doctor: 3, items: [{ kind: "test", id: "test-lft" }, { kind: "test", id: "test-kft" }], daysAgo: 1, discountPaise: 5000, pay: "full", mode: "upi", workflow: "done", label: "LFT + KFT" },
  { patient: 2, doctor: 1, items: [{ kind: "test", id: "test-fbs" }, { kind: "test", id: "test-hba1c" }], daysAgo: 2, pay: "full", mode: "card", workflow: "done-amend", label: "Diabetes follow-up with amendment" },
  { patient: 3, doctor: 1, items: [{ kind: "test", id: "test-lipid" }], daysAgo: 3, pay: "full", mode: "cash", workflow: "done", label: "Abnormal lipid profile" },
  { patient: 4, doctor: 0, items: [{ kind: "test", id: "test-urine" }], daysAgo: 4, pay: "full", mode: "upi", workflow: "done", label: "Urine routine" },
  { patient: 5, doctor: 2, items: [{ kind: "test", id: "test-tsh" }], daysAgo: 5, pay: "full", mode: "cash", workflow: "done", label: "Thyroid" },
  { patient: 6, doctor: 3, items: [{ kind: "test", id: "test-cbc" }, { kind: "test", id: "test-lft" }], daysAgo: 6, pay: "full", mode: "bank", workflow: "done", label: "CBC + LFT" },
  { patient: 7, doctor: 0, items: [{ kind: "test", id: "xr-chestpa" }], daysAgo: 7, pay: "full", mode: "cash", workflow: "xray", label: "Chest X-ray" },
  { patient: 8, doctor: 3, items: [{ kind: "test", id: "test-fbs" }], daysAgo: 8, pay: "credit", mode: "credit", workflow: "expected", label: "Credit bill awaiting sample" },
  { patient: 9, doctor: 1, items: [{ kind: "test", id: "test-kft" }], daysAgo: 9, pay: "partial", fraction: 0.5, mode: "cash", workflow: "received", label: "Partial payment / sample received" },
  { patient: 10, doctor: 3, items: [{ kind: "test", id: "test-cbc" }], daysAgo: 10, pay: "partial", fraction: 0.4, mode: "upi", workflow: "accepted-pending", label: "Partial payment / accepted sample" },
  { patient: 11, doctor: 0, items: [{ kind: "test", id: "test-lipid" }, { kind: "test", id: "test-fbs" }], daysAgo: 11, pay: "credit", mode: "credit", workflow: "collected", label: "Credit bill / collected" },
  { patient: 1, doctor: 2, items: [{ kind: "package", id: "pkg-fasting" }], daysAgo: 12, pay: "full", mode: "cash", workflow: "done", label: "Fasting package" },
  { patient: 0, doctor: 3, items: [{ kind: "test", id: "test-cbc" }], daysAgo: 13, pay: "full", mode: "cash", workflow: "cancelled", label: "Cancelled paid invoice" },
  { patient: 4, doctor: 3, items: [{ kind: "test", id: "test-crp" }, { kind: "test", id: "test-esr" }], daysAgo: 14, pay: "full", mode: "upi", workflow: "done", label: "Inflammation markers" },
  { patient: 5, doctor: 0, items: [{ kind: "test", id: "test-vdrl" }], daysAgo: 15, pay: "credit", mode: "credit", workflow: "rejected", label: "Rejected sample" },
  { patient: 8, doctor: 2, items: [{ kind: "test", id: "test-ptinr" }], daysAgo: 16, pay: "full", mode: "upi", workflow: "expected", label: "Coagulation pending" },
];

function tsDaysAgo(days: number, hour = 10): number {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

function resultFor(name: string, min: number | null, max: number | null): {
  value: number | null;
  text: string;
  abnormal: number;
} {
  const n = name.toLowerCase();
  let value: string = "Normal";
  let numeric: number | null = null;

  if (n.includes("haemoglobin")) numeric = 13.4;
  else if (n.includes("leukocyte")) numeric = 8200;
  else if (n.includes("platelet")) numeric = 252000;
  else if (n.includes("rbc count")) numeric = 4.8;
  else if (n.includes("packed cell")) numeric = 42;
  else if (n === "mcv") numeric = 88;
  else if (n === "mch") numeric = 29;
  else if (n.includes("mchc")) numeric = 33;
  else if (n.includes("rdw")) numeric = 13.2;
  else if (n.includes("neutrophil")) numeric = 58;
  else if (n.includes("lymphocyte")) numeric = 32;
  else if (n.includes("eosinophil")) numeric = 3;
  else if (n.includes("monocyte")) numeric = 5;
  else if (n.includes("basophil")) numeric = 1;
  else if (n.includes("bilirubin total")) numeric = 1.1;
  else if (n.includes("bilirubin direct")) numeric = 0.3;
  else if (n.includes("bilirubin indirect")) numeric = 0.8;
  else if (n.includes("sgot")) numeric = 35;
  else if (n.includes("sgpt")) numeric = 42;
  else if (n.includes("alkaline")) numeric = 96;
  else if (n.includes("gamma")) numeric = 31;
  else if (n.includes("total protein")) numeric = 7.2;
  else if (n.includes("albumin")) numeric = 4.3;
  else if (n.includes("globulin")) numeric = 2.9;
  else if (n.includes("albumin / globulin")) numeric = 1.48;
  else if (n.includes("blood urea nitrogen")) numeric = 12;
  else if (n.includes("blood urea")) numeric = 28;
  else if (n.includes("creatinine")) numeric = 0.9;
  else if (n.includes("uric")) numeric = 5.2;
  else if (n.includes("sodium")) numeric = 140;
  else if (n.includes("potassium")) numeric = 4.2;
  else if (n.includes("chloride")) numeric = 102;
  else if (n.includes("calcium")) numeric = 9.5;
  else if (n.includes("phosphorus")) numeric = 3.4;
  else if (n.includes("total cholesterol") && !n.includes("/")) numeric = 215;
  else if (n.includes("triglyceride")) numeric = 160;
  else if (n.includes("hdl cholesterol")) numeric = 42;
  else if (n.includes("ldl cholesterol")) numeric = 135;
  else if (n.includes("vldl")) numeric = 32;
  else if (n.includes("non-hdl")) numeric = 173;
  else if (n.includes("total cholesterol / hdl")) numeric = 5.1;
  else if (n.includes("ldl / hdl")) numeric = 3.2;
  else if (n === "ph") numeric = 6.0;
  else if (n.includes("specific gravity")) numeric = 1.015;
  else if (n.includes("pus cells")) numeric = 1;
  else if (n.includes("red blood cells")) numeric = 1;
  else if (n.includes("colour")) value = "Pale yellow";
  else if (n.includes("appearance")) value = "Clear";
  else if (n.includes("epithelial")) value = "Occasional";
  else if (n.includes("casts") || n.includes("crystals") || n.includes("bacteria")) value = "Absent";
  else if (n.includes("protein") || n.includes("glucose") || n.includes("ketone") || n.includes("blood") || n.includes("nitrite") || n.includes("leucocyte")) value = "Negative";
  else if (n.includes("urobilinogen")) value = "Normal";

  if (numeric !== null) {
    value = String(numeric);
    const abnormal =
      (min !== null && numeric < min) || (max !== null && numeric > max) ? 1 : 0;
    return { value: numeric, text: value, abnormal };
  }
  return { value: null, text: value, abnormal: 0 };
}

async function completeTest(
  db: DataSource,
  order: ReportOrderRow,
  userId: string,
  options: { draft?: boolean; selective?: boolean; amendmentValue?: string }
): Promise<{ order: ReportOrderRow; parameters: ReportParameterRow[] }> {
  const [tenantClause, tenantParams] = tenantAnd();
  const ts = now();
  const parameters = await db.all<TestParameterRow>(
    `SELECT * FROM test_parameters WHERE test_id = ? AND deleted = 0 AND is_active = 1 ${tenantClause}
     ORDER BY sort_order, name`,
    [order.test_id, ...tenantParams]
  );
  const selected =
    options.selective && parameters.length > 3
      ? parameters.filter((p) =>
          ["Haemoglobin", "Total Leukocyte Count", "Platelet Count"].includes(p.name)
        )
      : parameters;

  const saved: ReportParameterRow[] = [];
  let abnormal = 0;
  for (const p of selected) {
    const r = resultFor(p.name, p.ref_min, p.ref_max);
    const id = uuid();
    await db.run(
      `INSERT INTO report_parameters
         (id, report_order_id, parameter_id, parameter_name, unit, ref_range, ref_min,
          ref_max, result_value, result_text, abnormal, loinc_code, created_at,
          updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
      [
        id,
        order.id,
        p.id,
        p.name,
        p.unit,
        p.ref_range,
        p.ref_min,
        p.ref_max,
        r.value,
        r.text,
        r.abnormal,
        p.loinc_code,
        ts,
        ts,
        getDeviceId(),
        TENANT,
      ]
    );
    if (r.abnormal) abnormal = 1;
    saved.push({
      id,
      report_order_id: order.id,
      parameter_id: p.id,
      parameter_name: p.name,
      unit: p.unit,
      ref_range: p.ref_range,
      ref_min: p.ref_min,
      ref_max: p.ref_max,
      result_value: r.value,
      result_text: r.text,
      abnormal: r.abnormal,
      loinc_code: p.loinc_code,
      created_at: ts,
      updated_at: ts,
      device_id: getDeviceId(),
      dirty: 1,
      deleted: 0,
      tenant_id: TENANT,
    });
  }

  let resultText: string;
  let resultValue: number | null = null;
  if (saved.length > 0) {
    resultText = saved
      .map((p) => `${p.parameter_name}: ${p.result_text}${p.unit ? ` ${p.unit}` : ""}`)
      .join(" | ");
  } else {
    const direct =
      order.test_name.includes("Blood Sugar Fasting")
        ? { value: 128, text: "128", abnormal: 1 }
        : order.test_name.includes("HbA1c")
          ? { value: 6.4, text: "6.4", abnormal: 1 }
          : order.test_name.includes("TSH")
            ? { value: 5.8, text: "5.8", abnormal: 1 }
            : order.test_name.includes("Chest X-Ray")
              ? { value: null, text: "No active pulmonary lesion. Normal cardiac silhouette.", abnormal: 0 }
              : order.test_name.includes("VDRL")
                ? { value: null, text: "Non-Reactive", abnormal: 0 }
                : resultFor(order.test_name, order.ref_min, order.ref_max);
    resultText = options.amendmentValue ?? direct.text;
    resultValue = direct.value;
    abnormal = direct.abnormal;
  }

  const status = options.draft ? "pending" : "done";
  await db.run(
    `UPDATE report_orders
     SET result_text = ?, result_value = ?, abnormal = ?, status = ?,
         entered_by = ?, verified_by = ?, reported_at = ?, approval_status = ?,
         approved_by = ?, approved_at = ?, analysis_started_at = ?,
         analysis_completed_at = ?, specimen_received_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? ${tenantClause}`,
    [
      resultText,
      resultValue,
      abnormal,
      status,
      userId,
      options.draft ? "" : userId,
      options.draft ? null : ts,
      options.draft ? "pending" : "approved",
      options.draft ? "" : userId,
      options.draft ? null : ts,
      ts - 20 * 60 * 1000,
      options.draft ? null : ts,
      ts - 25 * 60 * 1000,
      ts,
      order.id,
      ...tenantParams,
    ]
  );

  const updated = (await db.get<ReportOrderRow>(
    `SELECT * FROM report_orders WHERE id = ? ${tenantClause}`,
    [order.id, ...tenantParams]
  ))!;
  const rows = await db.all<ReportParameterRow>(
    `SELECT * FROM report_parameters WHERE report_order_id = ? ${tenantClause}`,
    [order.id, ...tenantParams]
  );
  const revision = await db.get<{ n: number }>(
    `SELECT COALESCE(MAX(revision_no), 0) + 1 AS n
     FROM report_result_revisions WHERE report_order_id = ? AND deleted = 0 ${tenantClause}`,
    [order.id, ...tenantParams]
  );
  await db.run(
    `INSERT INTO report_result_revisions
       (id, report_order_id, invoice_id, revision_no, action, reason, snapshot_json,
        acted_by, acted_at, created_at, updated_at, device_id, dirty, deleted, tenant_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
    [
      uuid(),
      order.id,
      order.invoice_id,
      revision?.n ?? 1,
      options.draft ? "draft" : "verified",
      options.draft ? "Demo draft" : "Initial verification",
      JSON.stringify({ order: updated, parameters: rows }),
      userId,
      ts,
      ts,
      ts,
      getDeviceId(),
      TENANT,
    ]
  );
  if (!options.draft) {
    await writeAudit(db, {
      userId,
      action: "report.verify",
      entity: "report_order",
      entityId: order.id,
      detail: `Demo revision ${revision?.n ?? 1}`,
    });
  }
  return { order: updated, parameters: rows };
}

async function acceptSample(
  db: DataSource,
  order: ReportOrderRow,
  userId: string,
  state: "collected" | "received" | "accepted"
) {
  if (!order.sample_id) return;
  const [tenantClause, tenantParams] = tenantAnd();
  const ts = now();
  const collected = ts - 90 * 60 * 1000;
  const received = ts - 60 * 60 * 1000;
  const accepted = state === "accepted" ? ts : null;
  await db.run(
    `UPDATE samples
     SET status = ?, collected_at = ?, collected_by = ?, received_at = ?,
         received_by = ?, accepted_at = ?, accepted_by = ?, updated_at = ?, dirty = 1
     WHERE id = ? ${tenantClause}`,
    [
      state,
      collected,
      userId,
      state === "collected" ? null : received,
      state === "collected" ? "" : userId,
      accepted,
      accepted ? userId : "",
      ts,
      order.sample_id,
      ...tenantParams,
    ]
  );
  await db.run(
    `UPDATE report_orders
     SET specimen_collected_at = ?, specimen_received_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? ${tenantClause}`,
    [collected, state === "collected" ? null : received, ts, order.id, ...tenantParams]
  );
  if (state === "accepted") {
    await writeAudit(db, {
      userId,
      action: "sample.accepted",
      entity: "sample",
      entityId: order.sample_id,
      detail: "Demo sample accepted",
    });
  }
}

async function rejectSample(
  db: DataSource,
  order: ReportOrderRow,
  userId: string
) {
  if (!order.sample_id) return;
  const [tenantClause, tenantParams] = tenantAnd();
  const ts = now();
  await db.run(
    `UPDATE samples
     SET status = 'rejected', collected_at = ?, collected_by = ?, received_at = ?,
         received_by = ?, rejected_at = ?, rejected_by = ?,
         rejection_reason = 'Haemolysed sample — repeat collection required',
         updated_at = ?, dirty = 1
     WHERE id = ? ${tenantClause}`,
    [ts - 80 * 60 * 1000, userId, ts - 50 * 60 * 1000, userId, ts, userId, ts, order.sample_id, ...tenantParams]
  );
  await db.run(
    `UPDATE report_orders SET status = 'rejected', updated_at = ?, dirty = 1
     WHERE id = ? ${tenantClause}`,
    [ts, order.id, ...tenantParams]
  );
  await writeAudit(db, {
    userId,
    action: "sample.reject",
    entity: "sample",
    entityId: order.sample_id,
    detail: "Demo rejection: haemolysed sample",
  });
}

/** Repairs synthetic demo rows after starter-metadata changes. */
async function repairDemoMetadata(db: DataSource): Promise<void> {
  const [tenantClause, tenantParams] = tenantAnd();
  await db.run(
    `UPDATE tests SET specimen_type = 'Whole Blood', container_type = 'EDTA (lavender top)',
       department = 'Haematology', method = 'Automated analyser'
     WHERE id IN ('test-cbc','test-hb') AND specimen_type = '' ${tenantClause}`,
    tenantParams
  );
  await db.run(
    `UPDATE tests SET specimen_type = 'Serum', container_type = 'Clot activator / gel (gold top)',
       department = 'Clinical Biochemistry'
     WHERE id IN ('test-fbs','test-rbs','test-lft','test-kft','test-lipid','test-tsh','test-hba1c')
       AND specimen_type = '' ${tenantClause}`,
    tenantParams
  );
  await db.run(
    `UPDATE tests SET specimen_type = 'Urine', container_type = 'Sterile urine container',
       department = 'Clinical Pathology', method = 'Dipstick and microscopy'
     WHERE id = 'test-urine' AND specimen_type = '' ${tenantClause}`,
    tenantParams
  );
  // Only synthetic demo patients: accepted historical specimens are never
  // silently rewritten in real data.
  await db.run(
    `UPDATE samples
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
         updated_at = ?, dirty = 1
     WHERE patient_id LIKE 'demo-patient-%' AND deleted = 0 ${tenantClause}`,
    [now(), ...tenantParams]
  );
}

async function seedHospitalPharmacy(
  db: DataSource,
  user: UserRow
): Promise<{ admissions: number; medicines: number; pharmacySales: number }> {
  const ts = now();
  const admissions = [
    ["demo-adm-01", "ADM-A-D001", "demo-patient-01", "demo-doctor-4", "admitted", "General Ward", "GW-12", "Acute febrile illness with dehydration", "Viral fever with dehydration", ts - 2 * 24 * 60 * 60 * 1000, null, "", ""],
    ["demo-adm-02", "ADM-A-D002", "demo-patient-05", "demo-doctor-4", "admitted", "Private Room", "P-04", "Chest pain evaluation", "Unstable angina — under observation", ts - 1 * 24 * 60 * 60 * 1000, null, "", ""],
    ["demo-adm-03", "ADM-A-D003", "demo-patient-02", "demo-doctor-3", "discharged", "Maternity", "M-02", "Observation after procedure", "Post-operative recovery", ts - 12 * 24 * 60 * 60 * 1000, ts - 7 * 24 * 60 * 60 * 1000, "Recovered uneventfully. Review in OPD after one week.", "Dr. Neha Kulkarni"],
  ] as const;
  await db.tx(async () => {
    for (const a of admissions) {
      await db.run(
        `INSERT OR IGNORE INTO admissions
           (id, admission_no, patient_id, doctor_id, status, ward, bed, reason,
            diagnosis, admitted_at, discharged_at, discharge_summary, created_by,
            created_at, updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
        [
          a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11],
          user.id, ts, ts, getDeviceId(), TENANT,
        ]
      );
    }

    const hospitalServices = [
      ["demo-service-01", "GW", "General Ward bed charge", "Room", 150000, 0],
      ["demo-service-02", "PVT", "Private Room bed charge", "Room", 350000, 0],
      ["demo-service-03", "NUR", "Nursing care", "Nursing", 50000, 0],
      ["demo-service-04", "PROC", "Minor procedure", "Procedure", 250000, 0],
      ["demo-service-05", "CONS", "Specialist consultation", "Consultation", 80000, 0],
    ] as const;
    for (const s of hospitalServices) {
      await db.run(
        `INSERT OR IGNORE INTO hospital_services
           (id, code, name, category, price_paise, gst_rate_bp, sac_code, is_active,
            created_at, updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,'9993',1,?,?,?,1,0,?)`,
        [s[0], s[1], s[2], s[3], s[4], s[5], ts, ts, getDeviceId(), TENANT]
      );
    }
    const hospitalCharges = [
      ["demo-charge-01", "demo-adm-01", "demo-patient-01", "demo-service-01", "General Ward bed charge", 2, 150000],
      ["demo-charge-02", "demo-adm-01", "demo-patient-01", "demo-service-03", "Nursing care", 2, 50000],
      ["demo-charge-03", "demo-adm-01", "demo-patient-01", "demo-service-05", "Specialist consultation", 1, 80000],
      ["demo-charge-04", "demo-adm-02", "demo-patient-05", "demo-service-02", "Private Room bed charge", 1, 350000],
      ["demo-charge-05", "demo-adm-02", "demo-patient-05", "demo-service-05", "Specialist consultation", 2, 80000],
      ["demo-charge-06", "demo-adm-03", "demo-patient-02", "demo-service-01", "General Ward bed charge", 5, 150000],
    ] as const;
    for (const c of hospitalCharges) {
      const amount = c[5] * c[6];
      await db.run(
        `INSERT OR IGNORE INTO hospital_charges
           (id, admission_id, patient_id, service_id, description, qty, unit_price_paise,
            gst_rate_bp, amount_paise, taxable_paise, cgst_paise, sgst_paise, charged_at,
            created_by, created_at, updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,0,?,?,0,0,?,?,?,?,?,1,0,?)`,
        [c[0], c[1], c[2], c[3], c[4], c[5], c[6], amount, amount, ts - 86400000, user.id, ts, ts, getDeviceId(), TENANT]
      );
    }
    await db.run(
      `INSERT OR IGNORE INTO hospital_bill_payments
         (id, admission_id, amount_paise, mode, paid_at, note, created_by, created_at,
          updated_at, device_id, dirty, deleted, tenant_id)
       VALUES ('demo-hospital-payment-01','demo-adm-01',200000,'upi',?,'Demo IPD part payment',?,?,?,?,1,0,?)`,
      [ts - 43200000, user.id, ts, ts, getDeviceId(), TENANT]
    );

    const medicineRows = [
      ["demo-med-01", "PCM500", "Paracetamol", "Tablet", "500 mg", "Demo Pharma", "3004", 1200, 200, 180, 30],
      ["demo-med-02", "AMOX500", "Amoxicillin", "Capsule", "500 mg", "Demo Pharma", "3004", 1200, 9500, 8500, 20],
      ["demo-med-03", "MET500", "Metformin", "Tablet", "500 mg", "Demo Pharma", "3004", 1200, 2800, 2400, 25],
      ["demo-med-04", "ATOR10", "Atorvastatin", "Tablet", "10 mg", "Demo Pharma", "3004", 1200, 6500, 5600, 20],
      ["demo-med-05", "PAN40", "Pantoprazole", "Tablet", "40 mg", "Demo Pharma", "3004", 1200, 5200, 4500, 20],
      ["demo-med-06", "ORS", "Oral Rehydration Salts", "Sachet", "21.8 g", "Demo Pharma", "3004", 1200, 2200, 1800, 30],
      ["demo-med-07", "CET10", "Cetirizine", "Tablet", "10 mg", "Demo Pharma", "3004", 1200, 1800, 1400, 25],
      ["demo-med-08", "INS100", "Insulin Human", "Injection", "100 IU/mL", "Demo Biologics", "3004", 1200, 28500, 25000, 10],
    ] as const;
    for (const m of medicineRows) {
      await db.run(
        `INSERT OR IGNORE INTO medicines
           (id, code, name, form, strength, manufacturer, hsn_code, gst_rate_bp,
            mrp_paise, sale_price_paise, reorder_level, is_active, created_at,
            updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,1,0,?)`,
        [...m, ts, ts, getDeviceId(), TENANT]
      );
      // Repair demo rows seeded by the earlier incorrect tuple layout.
      await db.run(
        `UPDATE medicines
         SET gst_rate_bp = ?, mrp_paise = ?, sale_price_paise = ?, reorder_level = ?,
             updated_at = ?, dirty = 1
         WHERE id = ? AND tenant_id = ?`,
        [m[7], m[8], m[9], m[10], ts, m[0], TENANT]
      );
    }

    const batchRows = [
      ["demo-batch-01", "demo-med-01", "PCM26A", "2027-09-30", 180, 100, "Demo Distributors"],
      ["demo-batch-02", "demo-med-02", "AMX26B", "2027-06-30", 60, 6200, "Demo Distributors"],
      ["demo-batch-03", "demo-med-03", "MET26C", "2028-02-28", 240, 1600, "Demo Distributors"],
      ["demo-batch-04", "demo-med-04", "ATV26D", "2027-12-31", 100, 4200, "Demo Distributors"],
      ["demo-batch-05", "demo-med-05", "PAN26E", "2027-10-31", 140, 3000, "Demo Distributors"],
      ["demo-batch-06", "demo-med-06", "ORS26F", "2027-08-31", 90, 1200, "Demo Distributors"],
      ["demo-batch-07", "demo-med-07", "CET26G", "2027-11-30", 72, 900, "Demo Distributors"],
      ["demo-batch-08", "demo-med-08", "INS26H", "2027-04-30", 18, 21000, "Demo Biologics"],
      ["demo-batch-09", "demo-med-03", "MET27A", "2028-08-31", 120, 1600, "Demo Distributors"],
    ] as const;
    for (const b of batchRows) {
      await db.run(
        `INSERT OR IGNORE INTO pharmacy_batches
           (id, medicine_id, batch_no, expiry_date, quantity, purchase_price_paise,
            supplier, received_at, created_at, updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
        [...b, ts - 5 * 86400000, ts, ts, getDeviceId(), TENANT]
      );
    }

    const saleExists = await db.get<{ id: string }>(
      `SELECT id FROM pharmacy_sales WHERE id = 'demo-ph-sale-01' AND tenant_id = ?`,
      [TENANT]
    );
    if (!saleExists) {
      const saleId = "demo-ph-sale-01";
      const saleLines = [
        { id: "demo-ph-item-01", medicineId: "demo-med-01", batchId: "demo-batch-01", description: "Paracetamol 500 mg", batch: "PCM26A", expiry: "2027-09-30", qty: 10, price: 180, gst: 1200 },
        { id: "demo-ph-item-02", medicineId: "demo-med-06", batchId: "demo-batch-06", description: "Oral Rehydration Salts 21.8 g", batch: "ORS26F", expiry: "2027-08-31", qty: 4, price: 1800, gst: 1200 },
      ];
      let subtotal = 0;
      let cgst = 0;
      let sgst = 0;
      for (const l of saleLines) {
        const amount = l.qty * l.price;
        const tax = Math.round((amount * l.gst) / 10000);
        subtotal += amount;
        cgst += Math.floor(tax / 2);
        sgst += tax - Math.floor(tax / 2);
      }
      const exact = subtotal + cgst + sgst;
      const total = Math.round(exact / 100) * 100;
      await db.run(
        `INSERT INTO pharmacy_sales
           (id, bill_no, patient_id, patient_name, sale_date, subtotal_paise,
            discount_paise, taxable_paise, cgst_paise, sgst_paise, round_off_paise,
            total_paise, payment_mode, status, notes, created_by, created_at,
            updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,0,?,?,?,?,?,'upi','paid','Demo pharmacy sale',?,?,?,?,1,0,?)`,
        [
          saleId, "PH-A-D001", "demo-patient-01", "Aarav Sharma", ts, subtotal,
          subtotal, cgst, sgst, total - exact, total, user.id, ts, ts, getDeviceId(), TENANT,
        ]
      );
      for (const l of saleLines) {
        const amount = l.qty * l.price;
        const tax = Math.round((amount * l.gst) / 10000);
        const lineCgst = Math.floor(tax / 2);
        await db.run(
          `INSERT INTO pharmacy_sale_items
             (id, sale_id, medicine_id, batch_id, description, batch_no, expiry_date,
              qty, unit_price_paise, gst_rate_bp, amount_paise, taxable_paise,
              cgst_paise, sgst_paise, created_at, updated_at, device_id, dirty,
              deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
          [
            l.id, saleId, l.medicineId, l.batchId, l.description, l.batch, l.expiry,
            l.qty, l.price, l.gst, amount, amount, lineCgst, tax - lineCgst,
            ts, ts, getDeviceId(), TENANT,
          ]
        );
        await db.run(
          `UPDATE pharmacy_batches SET quantity = quantity - ?, updated_at = ?, dirty = 1
           WHERE id = ? AND tenant_id = ?`,
          [l.qty, ts, l.batchId, TENANT]
        );
      }
      await writeAudit(db, {
        userId: user.id,
        action: "pharmacy.sale",
        entity: "pharmacy_sale",
        entityId: saleId,
        detail: "Demo pharmacy bill PH-A-D001",
      });
    }
  });
  return { admissions: admissions.length, medicines: 8, pharmacySales: 1 };
}

export async function seedDemoData(db: DataSource): Promise<{
  created: boolean;
  version: string;
  summary?: Record<string, number>;
}> {
  if (!import.meta.env.DEV) {
    throw new Error("Demo data is disabled in production builds");
  }
  if (getCurrentTenantId() !== TENANT) {
    throw new Error("Demo seed is limited to the default development tenant");
  }
  await repairDemoMetadata(db);
  const user = await db.get<UserRow>(
    `SELECT * FROM users WHERE role = 'admin' AND deleted = 0 AND tenant_id = ? LIMIT 1`,
    [TENANT]
  );
  if (!user) throw new Error("Create the development admin account first");
  const marker = await db.get<MetaRow>(
    "SELECT * FROM meta WHERE key = ?",
    [SEED_KEY]
  );
  if (marker?.value === DEMO_SEED_VERSION) {
    const extensions = await seedHospitalPharmacy(db, user);
    void extensions;
    return { created: false, version: DEMO_SEED_VERSION };
  }

  const ts = now();
  const [tenantClause, tenantParams] = tenantAnd();

  // Masters: fixed IDs keep repeated/partial seed attempts safe.
  for (const d of DOCTORS) {
    await db.run(
      `INSERT OR IGNORE INTO doctors
         (id, name, qualification, specialization, reg_no, phone, address, email,
          is_active, notes, council_name, digital_signature_path,
          is_reporting_pathologist, created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,?,'','',1,'Demo data','State Medical Council','',0,?,?,?,1,0,?)`,
      [
        d.id,
        d.name,
        d.qualification,
        d.specialization,
        d.reg_no,
        d.phone,
        ts,
        ts,
        getDeviceId(),
        TENANT,
      ]
    );
  }

  const patientIds: string[] = [];
  for (let i = 0; i < PATIENTS.length; i += 1) {
    const p = PATIENTS[i];
    const id = `demo-patient-${String(i + 1).padStart(2, "0")}`;
    patientIds.push(id);
    const dobYear = new Date().getFullYear() - p.age;
    await db.run(
      `INSERT OR IGNORE INTO patients
         (id, phone, name, age, gender, address, created_by, dob, id_proof_type,
          id_proof_no, abha_id, consent_given, consent_at, created_at, updated_at,
          device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
      [
        id,
        p.phone,
        p.name,
        p.age,
        p.gender,
        p.address,
        user.id,
        `${dobYear}-06-15`,
        p.abha ? "Aadhaar" : "",
        p.abha ? `XXXX-XXXX-${p.phone.slice(-4)}` : "",
        p.abha ?? "",
        p.consent ? 1 : 0,
        p.consent ? ts : null,
        ts,
        ts,
        getDeviceId(),
        TENANT,
      ]
    );
  }

  for (const t of EXTRA_TESTS) {
    await db.run(
      `INSERT OR IGNORE INTO tests
         (id, code, name, category, price_paise, gst_rate_bp, sac_code, unit,
          ref_range, ref_min, ref_max, report_type, is_active, method, specimen_type,
          container_type, equipment_id, loinc_code, turnaround_time_hours, department,
          accreditation_status, created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,'Pathology',?,0,'999316',?,?,?,?,'numeric',1,?,?,?,'',?,4,?,'',?,?,?,1,0,?)`,
      [
        t.id,
        t.code,
        t.name,
        t.price,
        t.unit,
        t.ref,
        t.min,
        t.max,
        t.method,
        t.specimen,
        t.container,
        t.loinc,
        t.department,
        ts,
        ts,
        getDeviceId(),
        TENANT,
      ]
    );
  }

  for (const [i, p] of PATIENTS.entries()) {
    if (!p.consent) continue;
    const consentId = `demo-consent-${String(i + 1).padStart(2, "0")}`;
    await db.run(
      `INSERT OR IGNORE INTO abdm_consents
         (id, patient_id, purpose, status, consent_version, granted_at, granted_by,
          expires_at, revoked_at, revoked_by, artefact_json, created_at, updated_at,
          device_id, dirty, deleted, tenant_id)
       VALUES (?,?,'care-delivery',?,'1',?,?,?,?,?,?,?,?,?,1,0,?)`,
      [
        consentId,
        patientIds[i],
        p.consent ?? "active",
        ts,
        user.id,
        ts + 365 * 24 * 60 * 60 * 1000,
        p.consent === "revoked" ? ts : null,
        p.consent === "revoked" ? user.id : "",
        JSON.stringify({
          text: "Synthetic demo consent for ABDM-sharing workflow.",
          version: "1",
          purpose: "care-delivery",
        }),
        ts,
        ts,
        getDeviceId(),
        TENANT,
      ]
    );
  }

  const testRows = await db.all<TestRow>(
    `SELECT * FROM tests WHERE deleted = 0 ${tenantClause}`,
    tenantParams
  );
  const packageRows = await db.all<PackageRow>(
    `SELECT * FROM packages WHERE deleted = 0 ${tenantClause}`,
    tenantParams
  );

  const createdInvoices: Array<{
    spec: Prescription;
    id: string;
    invoiceNo: string;
  }> = [];

  for (const [index, spec] of INVOICES.entries()) {
    const note = `Demo data #${index + 1} — ${spec.label}`;
    const existing = await db.get<{ id: string }>(
      `SELECT id FROM invoices WHERE notes = ? AND deleted = 0 ${tenantClause}`,
      [note, ...tenantParams]
    );
    if (existing) {
      const row = await db.get<{ invoice_no: string }>(
        `SELECT invoice_no FROM invoices WHERE id = ? ${tenantClause}`,
        [existing.id, ...tenantParams]
      );
      createdInvoices.push({
        spec,
        id: existing.id,
        invoiceNo: row?.invoice_no ?? "",
      });
      continue;
    }

    const lines: BillLineInput[] = spec.items.map((item) => {
      if (item.kind === "package") {
        const pkg = packageRows.find((p) => p.id === item.id);
        if (!pkg) throw new Error(`Demo package missing: ${item.id}`);
        return {
          item_type: "package",
          test_id: "",
          package_id: pkg.id,
          description: pkg.name,
          qty: 1,
          unit_price_paise: pkg.price_paise,
          gst_rate_bp: pkg.gst_rate_bp,
          discount_paise: 0,
        };
      }
      const test = testRows.find((t) => t.id === item.id);
      if (!test) throw new Error(`Demo test missing: ${item.id}`);
      return {
        item_type: "test",
        test_id: test.id,
        package_id: "",
        description: test.name,
        qty: 1,
        unit_price_paise: test.price_paise,
        gst_rate_bp: test.gst_rate_bp,
        discount_paise: 0,
      };
    });
    if (lines[0] && spec.discountPaise) lines[0].discount_paise = spec.discountPaise;
    const total = computeTotals(lines).total;
    const paymentPaise =
      spec.pay === "full"
        ? total
        : spec.pay === "partial"
          ? Math.round(total * (spec.fraction ?? 0.5))
          : 0;

    const { id, invoiceNo } = await saveInvoice(
      db,
      {
        patientId: patientIds[spec.patient],
        patientName: PATIENTS[spec.patient].name,
        doctorId: DOCTORS[spec.doctor].id,
        invoiceDate: tsDaysAgo(spec.daysAgo, 10 + (index % 6)),
        lines,
        notes: note,
        paymentPaise,
        paymentMode: spec.mode,
      },
      user.id
    );
    createdInvoices.push({ spec, id, invoiceNo });
  }

  let completed = 0;
  let amended = 0;
  let rejected = 0;
  let draft = 0;
  let pendingSample = 0;
  let abdmDraft = false;

  for (const { spec, id } of createdInvoices) {
    const orders = await db.all<ReportOrderRow>(
      `SELECT * FROM report_orders WHERE invoice_id = ? AND deleted = 0 ${tenantClause}`,
      [id, ...tenantParams]
    );
    if (spec.workflow === "cancelled") {
      await cancelInvoice(
        db,
        id,
        "Demo cancellation: patient requested before examination",
        user.id
      );
      continue;
    }
    if (spec.workflow === "xray") {
      for (const order of orders) {
        await completeTest(db, order, user.id, {});
        completed += 1;
      }
      continue;
    }
    if (spec.workflow === "rejected") {
      for (const order of orders) {
        await rejectSample(db, order, user.id);
        rejected += 1;
      }
      continue;
    }
    if (spec.workflow === "expected") {
      pendingSample += orders.filter((o) => o.sample_id).length;
      continue;
    }
    if (spec.workflow === "collected") {
      for (const order of orders) await acceptSample(db, order, user.id, "collected");
      pendingSample += orders.filter((o) => o.sample_id).length;
      continue;
    }
    if (spec.workflow === "received") {
      for (const order of orders) await acceptSample(db, order, user.id, "received");
      for (const order of orders) {
        await completeTest(db, order, user.id, { draft: true });
        draft += 1;
      }
      continue;
    }
    if (spec.workflow === "accepted-pending") {
      for (const order of orders) await acceptSample(db, order, user.id, "accepted");
      pendingSample += orders.filter((o) => o.sample_id).length;
      continue;
    }

    for (const order of orders) {
      await acceptSample(db, order, user.id, "accepted");
      await completeTest(db, order, user.id, {
        selective: spec.workflow === "done-selective",
      });
      completed += 1;
    }

    if (spec.workflow === "done-amend") {
      const amending = orders.find((o) => o.test_id === "test-hba1c") ?? orders[0];
      if (amending) {
        const revisedText = "6.1";
        const revisedAt = now();
        await db.run(
          `UPDATE report_orders SET result_text = ?, result_value = 6.1, updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [revisedText, revisedAt, amending.id, ...tenantParams]
        );
        const updated = await db.get<ReportOrderRow>(
          `SELECT * FROM report_orders WHERE id = ? ${tenantClause}`,
          [amending.id, ...tenantParams]
        );
        const savedParams = await db.all<ReportParameterRow>(
          `SELECT * FROM report_parameters WHERE report_order_id = ? ${tenantClause}`,
          [amending.id, ...tenantParams]
        );
        const revision = await db.get<{ n: number }>(
          `SELECT COALESCE(MAX(revision_no), 0) + 1 AS n
           FROM report_result_revisions WHERE report_order_id = ? AND deleted = 0 ${tenantClause}`,
          [amending.id, ...tenantParams]
        );
        await db.run(
          `INSERT INTO report_result_revisions
             (id, report_order_id, invoice_id, revision_no, action, reason, snapshot_json,
              acted_by, acted_at, created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,'amended','Repeat analysis corrected the HbA1c result',?,?,?,?,?,?,1,0,?)`,
          [
            uuid(),
            amending.id,
            amending.invoice_id,
            revision?.n ?? 2,
            JSON.stringify({ order: updated, parameters: savedParams }),
            user.id,
            revisedAt,
            revisedAt,
            revisedAt,
            getDeviceId(),
            TENANT,
          ]
        );
        await writeAudit(db, {
          userId: user.id,
          action: "report.amend",
          entity: "report_order",
          entityId: amending.id,
          detail: "Demo amendment: HbA1c repeat analysis",
        });
        amended += 1;
      }
    }
  }

  const expenses = [
    ["demo-exp-01", "expcat-rent", 2500000, "Landlord", "cash", "Monthly rent", 5],
    ["demo-exp-02", "expcat-electricity", 850000, "BESCOM", "bank", "Electricity", 7],
    ["demo-exp-03", "expcat-consumables", 1850000, "MediReagents", "upi", "Reagents and controls", 3],
    ["demo-exp-04", "expcat-salary", 5000000, "Staff payroll", "bank", "Monthly salaries", 1],
    ["demo-exp-05", "expcat-maintenance", 350000, "Analyzer Services", "upi", "Quarterly maintenance", 12],
    ["demo-exp-06", "expcat-marketing", 500000, "Local campaign", "cash", "Campaign", 16],
    ["demo-exp-07", "expcat-misc", 275000, "Office supplies", "cash", "Consumables", 19],
    ["demo-exp-08", "expcat-misc", 99900, "Internet provider", "upi", "Monthly connectivity", 4],
  ] as const;
  for (const [id, category, amount, payee, mode, note, days] of expenses) {
    await db.run(
      `INSERT OR IGNORE INTO expenses
         (id, category_id, paid_at, payee, amount_paise, mode, bill_no, note,
          created_by, created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
      [
        id,
        category,
        tsDaysAgo(days, 12),
        payee,
        amount,
        mode,
        `DEMO-${id.slice(-2)}`,
        note,
        user.id,
        ts,
        ts,
        getDeviceId(),
        TENANT,
      ]
    );
  }

  // A clickable ABDM draft for the first consenting completed pathology report.
  try {
    const candidate = await db.get<{ id: string }>(
      `SELECT ro.id
       FROM report_orders ro
       JOIN patients p ON p.id = ro.patient_id AND p.tenant_id = ro.tenant_id
       JOIN abdm_consents c ON c.patient_id = p.id AND c.tenant_id = p.tenant_id
       WHERE ro.tenant_id = ? AND ro.status = 'done' AND ro.sample_id <> ''
         AND c.status = 'active' AND ro.deleted = 0
       ORDER BY ro.created_at LIMIT 1`,
      [TENANT]
    );
    if (candidate) {
      const prepared = await prepareAbdmDraft(db, candidate.id);
      await saveAbdmDraft(db, prepared, user.id);
      abdmDraft = true;
    }
  } catch {
    // ABDM draft is optional demo evidence; the rest of the dataset remains valid.
  }

  const extensions = await seedHospitalPharmacy(db, user);

  await db.run(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SEED_KEY, DEMO_SEED_VERSION]
  );
  await writeAudit(db, {
    userId: user.id,
    action: "demo.seed",
    entity: "meta",
    entityId: SEED_KEY,
    detail: `Synthetic demo dataset ${DEMO_SEED_VERSION}`,
  });

  return {
    created: true,
    version: DEMO_SEED_VERSION,
    summary: {
      patients: PATIENTS.length,
      doctors: DOCTORS.length,
      invoices: createdInvoices.length,
      completedReports: completed,
      amendedReports: amended,
      rejectedSamples: rejected,
      draftReports: draft,
      pendingSamples: pendingSample,
      expenses: expenses.length,
      abdmDrafts: abdmDraft ? 1 : 0,
      admissions: extensions.admissions,
      medicines: extensions.medicines,
      pharmacySales: extensions.pharmacySales,
    },
  };
}
