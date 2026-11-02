// Hydrates a released report for the offline ABDM FHIR draft. No network calls.

import type { DataSource } from "../db";
import { writeAudit } from "../db/audit";
import { getDeviceId, now, uuid } from "../db/helpers";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import { getSettings } from "../db/settings";
import type {
  AbdmConsentRow,
  InvoiceRow,
  PatientRow,
  ReportOrderRow,
  ReportParameterRow,
  SampleRow,
  TestRow,
  UserRow,
} from "../db/types";
import { buildLabDiagnosticBundle, validateAbdmBundle, type AbdmPrepared } from "./fhir";

export interface AbdmDraft extends AbdmPrepared {
  issues: string[];
  orderId: string;
  patientId: string;
}

export async function prepareAbdmDraft(
  db: DataSource,
  orderId: string
): Promise<AbdmDraft> {
  const tenantId = getCurrentTenantId();
  const [tenantClause, tenantParams] = tenantAnd();

  const order = await db.get<ReportOrderRow>(
    `SELECT * FROM report_orders WHERE id = ? AND deleted = 0 ${tenantClause}`,
    [orderId, ...tenantParams]
  );
  if (!order) throw new Error("Report order not found");
  const invoice = await db.get<InvoiceRow>(
    `SELECT * FROM invoices WHERE id = ? AND deleted = 0 ${tenantClause}`,
    [order.invoice_id, ...tenantParams]
  );
  if (!invoice) throw new Error("Invoice not found");
  const patient = await db.get<PatientRow>(
    `SELECT * FROM patients WHERE id = ? AND deleted = 0 ${tenantClause}`,
    [order.patient_id, ...tenantParams]
  );
  if (!patient) throw new Error("Patient not found");
  const test = (await db.get<TestRow>(
    `SELECT * FROM tests WHERE id = ? ${tenantClause}`,
    [order.test_id, ...tenantParams]
  )) ?? null;
  const sample = order.sample_id
    ? (await db.get<SampleRow>(
        `SELECT * FROM samples WHERE id = ? AND deleted = 0 ${tenantClause}`,
        [order.sample_id, ...tenantParams]
      )) ?? null
    : null;
  const parameters = await db.all<ReportParameterRow>(
    `SELECT * FROM report_parameters WHERE report_order_id = ? ${tenantClause}
     ORDER BY created_at`,
    [order.id, ...tenantParams]
  );
  const consent = await db.get<AbdmConsentRow>(
    `SELECT * FROM abdm_consents
     WHERE patient_id = ? AND status = 'active' AND deleted = 0 ${tenantClause}
     ORDER BY granted_at DESC LIMIT 1`,
    [patient.id, ...tenantParams]
  );
  if (!consent) {
    throw new Error("Record active ABDM-sharing consent for this patient before generating a document");
  }
  if (consent.expires_at && consent.expires_at <= now()) {
    throw new Error("The patient's ABDM-sharing consent has expired");
  }

  const verifierId = order.verified_by || order.approved_by;
  if (!verifierId) throw new Error("This report has no recorded authorizing user");
  const verifierUser = await db.get<UserRow>(
    `SELECT * FROM users WHERE id = ? AND deleted = 0 ${tenantClause}`,
    [verifierId, ...tenantParams]
  );
  const revision = await db.get<{ n: number }>(
    `SELECT COALESCE(MAX(revision_no), 1) AS n
     FROM report_result_revisions
     WHERE report_order_id = ? AND deleted = 0 ${tenantClause}`,
    [order.id, ...tenantParams]
  );
  const settings = await getSettings(db, [
    "lab_name",
    "lab_address",
    "lab_phone",
    "facility_hfr_id",
    "facility_hip_id",
  ]);

  const prepared = buildLabDiagnosticBundle({
    tenantId,
    labName: settings.lab_name,
    labAddress: settings.lab_address,
    labPhone: settings.lab_phone,
    hfrId: settings.facility_hfr_id,
    hipId: settings.facility_hip_id,
    order,
    invoice,
    patient,
    test,
    sample,
    parameters,
    verifier: {
      id: verifierUser?.id ?? verifierId,
      name: verifierUser?.full_name || verifierUser?.username || "Authorized user",
      registration: "",
    },
    revisionNo: revision?.n ?? 1,
    consent,
    bundleId: uuid(),
    now: now(),
  });

  return {
    ...prepared,
    issues: validateAbdmBundle(prepared.bundle),
    orderId: order.id,
    patientId: patient.id,
  };
}

export async function saveAbdmDraft(
  db: DataSource,
  draft: AbdmDraft,
  userId: string
): Promise<string> {
  if (draft.issues.length > 0) {
    throw new Error(`The local FHIR document failed validation: ${draft.issues.join("; ")}`);
  }
  const id = uuid();
  const ts = now();
  await db.tx(async () => {
    await db.run(
      `INSERT INTO abdm_outbox
         (id, order_id, patient_id, consent_id, bundle_id, fhir_version,
          profile_version, environment, status, bundle_json, generated_at,
          generated_by, sent_at, last_error, created_at, updated_at, device_id,
          dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,'R4','6.5.0','draft','draft',?,?,?,NULL,'',?,?,?,1,0,?)`,
      [
        id,
        draft.orderId,
        draft.patientId,
        draft.consentId,
        draft.bundleId,
        JSON.stringify(draft.bundle),
        ts,
        userId,
        ts,
        ts,
        getDeviceId(),
        getCurrentTenantId(),
      ]
    );
    await writeAudit(db, {
      userId,
      action: "abdm.draft.create",
      entity: "abdm_outbox",
      entityId: id,
      detail: `Offline FHIR R4 draft · profile 6.5.0 · order ${draft.orderId}`,
    });
  });
  return id;
}
