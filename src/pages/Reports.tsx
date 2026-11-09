// Reports: the lab work list.
//
// Billing creates one report_order per test (packages expand into their tests),
// so a paid-or-not bill still queues the work. Here you enter results, see
// out-of-range flags, verify, and print the report on the lab letterhead.

import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMonitor } from "../app/MonitorContext";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { formatDate, formatDateTime, getDeviceId, now, uuid } from "../db/helpers";
import type {
  InvoiceRow,
  PatientRow,
  ReportOrderRow,
  ReportParameterRow,
  RadiologistRow,
  ReportResultRevisionRow,
  SampleRow,
  TestParameterRow,
} from "../db/types";
import { getSettings } from "../db/settings";
import { printA4 } from "../db/print";
import { getCurrentTenantId, tenantAnd, tenantAndOn } from "../db/tenant";
import { UpdateExecutionTimestamp } from "../licensing/executionClock";
import {
  PrintLetterheadHint,
  PrintPageStyle,
  PRINT_LETTERHEAD_KEYS,
  printLetterheadHideClass,
  readPrintLetterhead,
} from "../ui/printLetterhead";
import AbdmExport from "./AbdmExport";
import {
  Btn,
  Card,
  EmptyState,
  ErrorNote,
  Icon,
  Labeled,
  Modal,
  PageHeader,
  Select,
  TextInput,
} from "../ui/kit";

type Filter = "pending" | "done" | "all";

interface WorkRow extends ReportOrderRow {
  invoice_no: string;
  invoice_date: number;
  /** Alias of report_orders.test_name — included so print/report code can use one name. */
  patient_name: string;
  patient_phone: string;
  patient_age: number | null;
  patient_gender: string | null;
  test_category: string;
  test_loinc_code: string;
  accession_no: string | null;
  sample_status: SampleRow["status"] | null;
  sample_specimen_type?: string | null;
  sample_collected_at?: number | null;
  sample_received_at?: number | null;
  verified_by_name?: string;
  revision_no?: number;
}

interface HistoryRow extends ReportResultRevisionRow {
  acted_by_name: string;
}

interface ParameterEntry {
  parameterId: string;
  reportParameterId: string;
  name: string;
  result: string;
  unit: string;
  refRange: string;
  refMin: number | null;
  refMax: number | null;
  selected: boolean;
  loincCode: string;
}

function numericValue(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function parameterFlag(p: ParameterEntry): "Low" | "High" | "" {
  const value = numericValue(p.result);
  if (value === null) return "";
  if (p.refMin !== null && value < p.refMin) return "Low";
  if (p.refMax !== null && value > p.refMax) return "High";
  return "";
}

function isRadiologyReport(row: Pick<WorkRow, "test_category">): boolean {
  const category = row.test_category.toLowerCase();
  return category.includes("x-ray") || category.includes("xray") || category.includes("radiology");
}

/**
 * Keep an existing report's signature selectable even if its radiologist was
 * later deactivated or deleted. The report stores its own immutable snapshot.
 */
function radiologistFromOrder(row: WorkRow): RadiologistRow | null {
  if (!row.radiologist_id) return null;
  return {
    id: row.radiologist_id,
    name: row.radiologist_name || "Radiologist",
    qualification: row.radiologist_qualification || "",
    signature_data: row.radiologist_signature || "",
    is_active: 0,
    sort_order: 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    device_id: row.device_id,
    dirty: 0,
    deleted: 0,
    tenant_id: row.tenant_id,
  };
}

const DEFAULT_XRAY_DISCLAIMER =
  "This report is based on the information available at the time of examination. It is not a substitute for clinical correlation or further investigation.";

function revisionResultSummary(snapshotJson: string): string {
  try {
    const snapshot = JSON.parse(snapshotJson) as { order?: { result_text?: string } };
    return snapshot.order?.result_text || "No result summary";
  } catch {
    return "Result snapshot unavailable";
  }
}

export default function Reports() {
  const { user } = useAuth();
  const { monitor } = useMonitor();
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [entering, setEntering] = useState<WorkRow | null>(null);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [entryParameters, setEntryParameters] = useState<ParameterEntry[]>([]);
  const [parametersLoading, setParametersLoading] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [xrayClinicalHistory, setXrayClinicalHistory] = useState("");
  const [xrayFindings, setXrayFindings] = useState("");
  const [xrayImpression, setXrayImpression] = useState("");
  const [radiologists, setRadiologists] = useState<RadiologistRow[]>([]);
  const [selectedRadiologistId, setSelectedRadiologistId] = useState("");

  const [printingInvoice, setPrintingInvoice] = useState<string | null>(null);
  const [printingXray, setPrintingXray] = useState<WorkRow | null>(null);
  const [historyFor, setHistoryFor] = useState<WorkRow | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [abdmOrder, setAbdmOrder] = useState<WorkRow | null>(null);

  const load = async () => {
    const db = await getDb();
    const [, tenantParams] = tenantAnd();
    setRows(
      await db.all<WorkRow>(
        `SELECT ro.*, i.invoice_no, i.invoice_date,
                p.name AS patient_name, p.phone AS patient_phone,
                p.age AS patient_age, p.gender AS patient_gender,
                COALESCE(t.category, '') AS test_category,
                COALESCE(t.loinc_code, '') AS test_loinc_code,
                smp.accession_no, smp.status AS sample_status,
                smp.specimen_type AS sample_specimen_type,
                smp.collected_at AS sample_collected_at,
                smp.received_at AS sample_received_at,
                COALESCE(u.full_name, u.username, '') AS verified_by_name,
                (SELECT COALESCE(MAX(rr.revision_no), 0)
                 FROM report_result_revisions rr
                 WHERE rr.report_order_id = ro.id AND rr.deleted = 0
                   AND rr.tenant_id = ro.tenant_id) AS revision_no
         FROM report_orders ro
         JOIN invoices i ON i.id = ro.invoice_id AND i.tenant_id = ro.tenant_id
         JOIN patients p ON p.id = ro.patient_id AND p.tenant_id = ro.tenant_id
         LEFT JOIN tests t ON t.id = ro.test_id AND t.tenant_id = ro.tenant_id
         LEFT JOIN samples smp ON smp.id = ro.sample_id AND smp.tenant_id = ro.tenant_id
         LEFT JOIN users u ON u.id = ro.verified_by AND u.tenant_id = ro.tenant_id
         WHERE ro.deleted = 0 AND i.deleted = 0 AND i.status <> 'cancelled'
           AND ro.tenant_id = ? AND i.tenant_id = ? AND p.tenant_id = ?
         ORDER BY ro.created_at DESC LIMIT 400`,
        [...tenantParams, ...tenantParams, ...tenantParams]
      )
    );
    setLoaded(true);
  };

  useEffect(() => {
    void load();
  }, []);

  const openHistory = async (row: WorkRow) => {
    setHistoryFor(row);
    setHistoryRows([]);
    setHistoryLoaded(false);
    setHistoryError("");
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAndOn("rr");
      setHistoryRows(
        await db.all<HistoryRow>(
          `SELECT rr.*, COALESCE(u.full_name, u.username, rr.acted_by) AS acted_by_name
           FROM report_result_revisions rr
           LEFT JOIN users u ON u.id = rr.acted_by AND u.tenant_id = rr.tenant_id
           WHERE rr.report_order_id = ? AND rr.deleted = 0 ${tenantClause}
           ORDER BY rr.revision_no DESC`,
          [row.id, ...tenantParams]
        )
      );
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Could not load report history");
    } finally {
      setHistoryLoaded(true);
    }
  };

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "pending").length,
      done: rows.filter((r) => r.status === "done").length,
      abnormal: rows.filter((r) => r.abnormal === 1).length,
    }),
    [rows]
  );

  const selectedRadiologist = useMemo(
    () =>
      radiologists.find(
        (radiologist) => radiologist.id === selectedRadiologistId
      ) ?? null,
    [radiologists, selectedRadiologistId]
  );

  const xraySignatureReady =
    !entering ||
    !isRadiologyReport(entering) ||
    Boolean(selectedRadiologist?.signature_data.trim());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchF =
        filter === "all"
          ? true
          : filter === "pending"
            ? r.status === "pending"
            : r.status === "done";
      const matchQ =
        !q ||
        r.patient_name.toLowerCase().includes(q) ||
        r.patient_phone.includes(q) ||
        r.test_name.toLowerCase().includes(q) ||
        r.invoice_no.toLowerCase().includes(q);
      return matchF && matchQ;
    });
  }, [rows, filter, query]);

  /** Patients with at least one test still to be entered. */
  const waiting = useMemo(() => {
    const map = new Map<string, { name: string; pending: number }>();
    for (const r of rows) {
      if (r.status !== "pending") continue;
      const cur = map.get(r.patient_id);
      map.set(r.patient_id, {
        name: r.patient_name,
        pending: (cur?.pending ?? 0) + 1,
      });
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }));
  }, [rows]);

  /** Invoice groups whose every test is verified — a printable report each. */
  const printableInvoices = useMemo(() => {
    const byInvoice = new Map<string, WorkRow[]>();
    for (const r of rows) {
      const list = byInvoice.get(r.invoice_id) ?? [];
      list.push(r);
      byInvoice.set(r.invoice_id, list);
    }
    const out: {
      invoiceId: string;
      invoiceNo: string;
      name: string;
      tests: number;
      date: string;
    }[] = [];
    for (const [invoiceId, list] of byInvoice) {
      if (list.length === 0) continue;
      // Printable only when every test in this invoice is verified.
      if (list.some((r) => r.status !== "done")) continue;
      // X-ray reporting has its own template and print control.
      const printableOrders = list.filter((r) => !isRadiologyReport(r));
      if (printableOrders.length === 0) continue;
      out.push({
        invoiceId,
        invoiceNo: list[0].invoice_no,
        name: list[0].patient_name,
        tests: printableOrders.length,
        date: formatDate(list[0].invoice_date),
      });
    }
    return out.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo));
  }, [rows]);

  const xrayReady = useMemo(
    () => rows.filter((r) => r.status === "done" && isRadiologyReport(r)),
    [rows]
  );

  const openEntry = async (r: WorkRow) => {
    if (r.status === "rejected") {
      setError("This sample was rejected. Register and accept a replacement sample first.");
      return;
    }
    setEntering(r);
    setResultText(r.result_text || "");
    setEntryParameters([]);
    setParametersLoading(true);
    setAmendmentReason("");
    setXrayClinicalHistory(r.clinical_history || "");
    setXrayFindings(r.findings_text || "");
    setXrayImpression(r.impression_text || "");
    setRadiologists([]);
    setSelectedRadiologistId("");
    setError("");

    if (isRadiologyReport(r)) {
      try {
        const db = await getDb();
        const [tenantClause, tenantParams] = tenantAnd();
        const list = await db.all<RadiologistRow>(
          `SELECT * FROM radiologists
           WHERE is_active = 1 AND deleted = 0 ${tenantClause}
           ORDER BY sort_order, name`,
          tenantParams
        );
        if (
          r.radiologist_id &&
          !list.some((radiologist) => radiologist.id === r.radiologist_id)
        ) {
          const snapshot = radiologistFromOrder(r);
          if (snapshot) list.push(snapshot);
        }
        setRadiologists(list);
        setSelectedRadiologistId(r.radiologist_id || "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load radiologist signatures"
        );
      } finally {
        setParametersLoading(false);
      }
      return;
    }

    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const templates = await db.all<TestParameterRow>(
        `SELECT * FROM test_parameters
         WHERE test_id = ? AND is_active = 1 AND deleted = 0 ${tenantClause}
         ORDER BY sort_order, name`,
        [r.test_id, ...tenantParams]
      );
      // Include tombstones: they record parameters deliberately excluded from
      // this patient's report, so the selection survives draft/reopen.
      const saved = await db.all<ReportParameterRow>(
        `SELECT * FROM report_parameters
         WHERE report_order_id = ? ${tenantClause}
         ORDER BY created_at`,
        [r.id, ...tenantParams]
      );
      const savedByParameter = new Map(saved.map((p) => [p.parameter_id, p]));
      const entries: ParameterEntry[] = templates.map((p) => {
        const existing = savedByParameter.get(p.id);
        return {
          parameterId: p.id,
          reportParameterId: existing?.id ?? "",
          name: existing?.parameter_name || p.name,
          result: existing?.result_text || "",
          unit: existing ? existing.unit : p.unit,
          refRange: existing ? existing.ref_range : p.ref_range,
          refMin: existing ? existing.ref_min : p.ref_min,
          refMax: existing ? existing.ref_max : p.ref_max,
          selected: existing ? existing.deleted === 0 : saved.length === 0,
          loincCode: existing?.loinc_code || p.loinc_code,
        };
      });
      // A removed template must not remove values from an existing report.
      for (const p of saved) {
        if (templates.some((template) => template.id === p.parameter_id)) continue;
        entries.push({
          parameterId: p.parameter_id,
          reportParameterId: p.id,
          name: p.parameter_name,
          result: p.result_text || "",
          unit: p.unit,
          refRange: p.ref_range,
          refMin: p.ref_min,
          refMax: p.ref_max,
          selected: p.deleted === 0,
          loincCode: p.loinc_code,
        });
      }
      // A historical single-result report may predate its new one-parameter
      // template. Carry the saved result into that parameter so an amendment
      // cannot silently lose it.
      if (entries.length === 1 && saved.length === 0) {
        const only = entries[0];
        only.result =
          r.result_text.trim() ||
          (r.result_value !== null ? String(r.result_value) : "");
        if (r.unit) only.unit = r.unit;
        if (r.ref_range) only.refRange = r.ref_range;
        if (r.ref_min !== null) only.refMin = r.ref_min;
        if (r.ref_max !== null) only.refMax = r.ref_max;
      }
      setEntryParameters(entries);
      setResultText(entries.length > 0 ? "" : r.result_text || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load report parameters");
    } finally {
      setParametersLoading(false);
    }
  };

  const updateParameter = (parameterId: string, patch: Partial<ParameterEntry>) => {
    setEntryParameters((current) =>
      current.map((p) => (p.parameterId === parameterId ? { ...p, ...patch } : p))
    );
  };

  const saveResult = async (markDone: boolean) => {
    if (!entering || parametersLoading) return;
    try {
      // Creating or amending a clinical report is a critical licence action.
      await UpdateExecutionTimestamp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "System Clock Manipulation Detected.");
      return;
    }
    const hasParameters = entryParameters.length > 0;
    const selected = entryParameters.filter((p) => p.selected);
    const text = resultText.trim();
    const isAmendment = entering.status === "done";
    const radiology = isRadiologyReport(entering);

    if (markDone && !user?.can_authorize_reports) {
      return setError(
        "Your account does not have authority to release clinical reports. Ask an administrator to grant report authorization."
      );
    }
    if (isAmendment && !markDone) {
      return setError("An issued report cannot be returned to draft. Save an amendment with a reason.");
    }
    if (isAmendment && amendmentReason.trim().length < 5) {
      return setError("Enter a reason for amending this issued report");
    }
    if (hasParameters && markDone) {
      if (selected.length === 0) {
        return setError("Select at least one parameter to include in this report");
      }
      const missing = selected.find((p) => !p.result.trim());
      if (missing) {
        return setError(`Enter a result for ${missing.name}, or deselect that parameter`);
      }
    }
    if (radiology && markDone && !xrayFindings.trim() && !xrayImpression.trim()) {
      return setError("Enter X-ray findings or impression before verifying the report");
    }
    if (radiology && markDone && !selectedRadiologist) {
      return setError(
        "Select the radiologist whose signature should appear on this X-ray report"
      );
    }
    if (radiology && markDone && !selectedRadiologist?.signature_data.trim()) {
      return setError(
        "The selected radiologist has no signature image. Upload one in Settings → Radiologists before releasing."
      );
    }
    if (!radiology && !hasParameters && markDone && !text) {
      return setError("Enter a result before verifying, or save as pending draft");
    }

    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const tenantId = getCurrentTenantId();
      const ts = now();
      const deviceId = getDeviceId();
      if (markDone && entering.test_category === "Pathology") {
        if (!entering.sample_id) {
          return setError(
            "No sample is linked to this pathology order. Register and accept a sample in the Samples desk before release."
          );
        }
        const sample = await db.get<SampleRow>(
          `SELECT * FROM samples WHERE id = ? AND deleted = 0 ${tenantClause}`,
          [entering.sample_id, ...tenantParams]
        );
        if (!sample || sample.status !== "accepted") {
          return setError(
            `Sample ${sample?.accession_no ?? ""} is ${sample?.status ?? "missing"}. It must be accepted before this report can be released.`
          );
        }
      }
      const singleNumeric = radiology ? null : numericValue(text);
      let abnormal = 0;
      if (!radiology && singleNumeric !== null && entering.ref_min !== null && singleNumeric < entering.ref_min) {
        abnormal = 1;
      }
      if (!radiology && singleNumeric !== null && entering.ref_max !== null && singleNumeric > entering.ref_max) {
        abnormal = 1;
      }
      if (hasParameters) {
        abnormal = selected.some((p) => parameterFlag(p)) ? 1 : 0;
      }
      const xrayClinicalHistoryValue = radiology
        ? xrayClinicalHistory.trim()
        : entering.clinical_history || "";
      const xrayFindingsValue = radiology ? xrayFindings.trim() : entering.findings_text || "";
      const xrayImpressionValue = radiology
        ? xrayImpression.trim()
        : entering.impression_text || "";
      const radiologistIdValue = radiology
        ? selectedRadiologist?.id ?? ""
        : entering.radiologist_id || "";
      const radiologistNameValue = radiology
        ? selectedRadiologist?.name.trim() ?? ""
        : entering.radiologist_name || "";
      const radiologistQualificationValue = radiology
        ? selectedRadiologist?.qualification.trim() ?? ""
        : entering.radiologist_qualification || "";
      const radiologistSignatureValue = radiology
        ? selectedRadiologist?.signature_data.trim() ?? ""
        : entering.radiologist_signature || "";
      const combined = radiology
        ? [
            xrayFindingsValue ? `Findings:\n${xrayFindingsValue}` : "",
            xrayImpressionValue ? `Impression:\n${xrayImpressionValue}` : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        : hasParameters
          ? selected
              .filter((p) => p.result.trim())
              .map((p) => `${p.name}: ${p.result.trim()}${p.unit.trim() ? ` ${p.unit.trim()}` : ""}`)
              .join(" | ")
          : text;

      await db.tx(async () => {
        if (hasParameters) {
          for (const p of entryParameters) {
            const value = p.result.trim();
            const numeric = numericValue(value);
            const pAbnormal = p.selected && parameterFlag(p) ? 1 : 0;
            if (p.reportParameterId) {
              await db.run(
                `UPDATE report_parameters
                 SET parameter_name = ?, unit = ?, ref_range = ?, ref_min = ?, ref_max = ?,
                     result_text = ?, result_value = ?, abnormal = ?, deleted = ?,
                     loinc_code = ?, updated_at = ?, dirty = 1
                 WHERE id = ? ${tenantClause}`,
                [
                  p.name,
                  p.unit.trim(),
                  p.refRange.trim(),
                  p.refMin,
                  p.refMax,
                  value,
                  numeric,
                  pAbnormal,
                  p.selected ? 0 : 1,
                  p.loincCode.trim(),
                  ts,
                  p.reportParameterId,
                  ...tenantParams,
                ]
              );
            } else {
              await db.run(
                `INSERT INTO report_parameters
                   (id, report_order_id, parameter_id, parameter_name, unit, ref_range,
                    ref_min, ref_max, result_value, result_text, abnormal, loinc_code,
                    created_at, updated_at, device_id, dirty, deleted, tenant_id)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
                [
                  uuid(),
                  entering.id,
                  p.parameterId,
                  p.name,
                  p.unit.trim(),
                  p.refRange.trim(),
                  p.refMin,
                  p.refMax,
                  numeric,
                  value,
                  pAbnormal,
                  p.loincCode.trim(),
                  ts,
                  ts,
                  deviceId,
                  p.selected ? 0 : 1,
                  tenantId,
                ]
              );
            }
          }
        }

        await db.run(
          `UPDATE report_orders
           SET result_text = ?, clinical_history = ?, findings_text = ?, impression_text = ?,
               radiologist_id = ?, radiologist_name = ?, radiologist_qualification = ?,
               radiologist_signature = ?,
               result_value = ?, abnormal = ?, status = ?,
               entered_by = ?, verified_by = ?, reported_at = ?,
               approval_status = ?, approved_by = ?, approved_at = ?,
               analysis_started_at = COALESCE(analysis_started_at, ?),
               analysis_completed_at = CASE WHEN ? = 1 THEN ? ELSE analysis_completed_at END,
               updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [
            combined,
            xrayClinicalHistoryValue,
            xrayFindingsValue,
            xrayImpressionValue,
            radiologistIdValue,
            radiologistNameValue,
            radiologistQualificationValue,
            radiologistSignatureValue,
            hasParameters ? null : singleNumeric,
            abnormal,
            markDone ? "done" : "pending",
            user?.id ?? "",
            markDone ? (user?.id ?? "") : "",
            markDone ? ts : null,
            markDone ? "approved" : "pending",
            markDone ? (user?.id ?? "") : "",
            markDone ? ts : null,
            ts,
            markDone ? 1 : 0,
            ts,
            ts,
            entering.id,
            ...tenantParams,
          ]
        );

        const updatedOrder = await db.get<ReportOrderRow>(
          `SELECT * FROM report_orders WHERE id = ? ${tenantClause}`,
          [entering.id, ...tenantParams]
        );
        const savedParameters = await db.all<ReportParameterRow>(
          `SELECT * FROM report_parameters WHERE report_order_id = ? ${tenantClause}
           ORDER BY created_at`,
          [entering.id, ...tenantParams]
        );
        const revision = await db.get<{ n: number }>(
          `SELECT COALESCE(MAX(revision_no), 0) + 1 AS n
           FROM report_result_revisions
           WHERE report_order_id = ? AND deleted = 0 ${tenantClause}`,
          [entering.id, ...tenantParams]
        );
        const action = isAmendment ? "amended" : markDone ? "verified" : "draft";
        await db.run(
          `INSERT INTO report_result_revisions
             (id, report_order_id, invoice_id, revision_no, action, reason,
              snapshot_json, acted_by, acted_at, created_at, updated_at, device_id,
              dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
          [
            uuid(),
            entering.id,
            entering.invoice_id,
            revision?.n ?? 1,
            action,
            isAmendment
              ? amendmentReason.trim()
              : markDone
                ? "Initial verification"
                : "Draft save",
            JSON.stringify({ order: updatedOrder, parameters: savedParameters }),
            user?.id ?? "",
            ts,
            ts,
            ts,
            deviceId,
            tenantId,
          ]
        );

        if (markDone) {
          await writeAudit(db, {
            userId: user?.id ?? "",
            action: isAmendment ? "report.amend" : "report.verify",
            entity: "report_order",
            entityId: entering.id,
            detail: `Revision ${revision?.n ?? 1}${isAmendment ? ` · ${amendmentReason.trim()}` : ""}`,
          });
        }
      });
      setEntering(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the result");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${counts.pending} pending · ${counts.done} completed${counts.abnormal ? ` · ${counts.abnormal} abnormal` : ""}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patient, phone, test or invoice…"
                className="max-w-xs"
              />
              <div className="flex gap-1">
                {(
                  [
                    ["pending", "Pending"],
                    ["done", "Completed"],
                    ["all", "All"],
                  ] as [Filter, string][]
                ).map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      filter === f
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!loaded ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                message={
                  rows.length === 0
                    ? "No tests billed yet"
                    : filter === "pending"
                      ? "Nothing pending — all results entered"
                      : "No reports match"
                }
                hint="Each test on a bill appears here for result entry. Packages expand into their individual tests."
                action={
                  !monitor &&
                  rows.length === 0 && (
                    <Link to="/billing">
                      <Btn variant="primary">
                        <Icon name="plus" className="h-4 w-4" /> Create a bill
                      </Btn>
                    </Link>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5">Patient</th>
                      <th className="px-4 py-2.5">Test</th>
                      <th className="hidden px-4 py-2.5 sm:table-cell">Invoice</th>
                      <th className="px-4 py-2.5">Result</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-medium">{r.patient_name}</span>
                          <span className="block text-xs text-slate-400">
                            {r.patient_age != null ? `${r.patient_age}y` : ""}
                            {r.patient_gender ? ` · ${r.patient_gender}` : ""}
                            {r.patient_phone ? ` · ${r.patient_phone}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {r.test_name}
                          {r.package_id && (
                            <span className="ml-1 text-[10px] text-slate-400">
                              (package)
                            </span>
                          )}
                          {r.ref_range && (
                            <span className="block text-xs text-slate-400">
                              Ref: {r.ref_range} {r.unit}
                            </span>
                          )}
                          {r.test_category === "Pathology" && (
                            <span className="mt-0.5 block text-[11px]">
                              {r.accession_no ? (
                                <span className={r.sample_status === "accepted" ? "text-emerald-700" : "text-amber-700"}>
                                  {r.accession_no} · {r.sample_status}
                                </span>
                              ) : (
                                <Link to="/samples" className="text-rose-600 hover:underline">
                                  No sample linked — open Samples
                                </Link>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-2.5 sm:table-cell">
                          <Link
                            to={`/invoices/${r.invoice_id}`}
                            className="num text-teal-700 hover:underline"
                          >
                            {r.invoice_no}
                          </Link>
                          <span className="block text-xs text-slate-400">
                            {formatDate(r.invoice_date)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {r.status === "pending" ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Pending
                            </span>
                          ) : r.status === "rejected" ? (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                              Sample rejected
                            </span>
                          ) : (
                            <span className="num">
                              {r.result_text || "—"}
                              {r.abnormal === 1 && (
                                <span className="ml-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                                  abnormal
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <Btn variant="ghost" onClick={() => void openHistory(r)}>
                            History
                          </Btn>
                          {!monitor && r.status === "done" && r.test_category === "Pathology" && (
                            <Btn variant="ghost" onClick={() => setAbdmOrder(r)}>
                              ABDM
                            </Btn>
                          )}
                          {!monitor && r.status === "done" && isRadiologyReport(r) && (
                            <Btn variant="ghost" onClick={() => setPrintingXray(r)}>
                              Print X-ray
                            </Btn>
                          )}
                          {!monitor && r.status !== "rejected" && (
                            <Btn
                              variant={r.status === "pending" ? "primary" : "outline"}
                              onClick={() => void openEntry(r)}
                            >
                              {r.status === "pending" ? "Enter result" : r.status === "done" ? "Amend" : "Edit"}
                            </Btn>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-1 text-sm font-semibold">Waiting on results</h2>
            <p className="mb-3 text-xs text-slate-400">
              Patients with tests still to be entered.
            </p>
            {waiting.length === 0 ? (
              <p className="text-sm text-slate-400">
                {rows.length === 0
                  ? "No work in the queue."
                  : "All results entered — print from the list below."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {waiting.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {p.pending} pending
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-400">
              A report prints once every test on that bill is verified — one report
              per bill, not per patient.
            </p>
          </Card>

          {printableInvoices.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-1 text-sm font-semibold">Reports ready to print</h2>
              <p className="mb-3 text-xs text-slate-400">
                One report per bill, once every test on it is verified.
              </p>
              <ul className="divide-y divide-slate-100 text-sm">
                {printableInvoices.slice(0, 8).map((p) => (
                  <li key={p.invoiceId} className="flex items-center justify-between py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{p.name}</span>
                      <span className="num text-xs text-slate-400">
                        {p.invoiceNo} · {p.tests} test{p.tests === 1 ? "" : "s"} ·{" "}
                        {p.date}
                      </span>
                    </span>
                    <Btn
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setPrintingInvoice(p.invoiceId)}
                    >
                      <Icon name="printer" className="h-4 w-4" /> Print
                    </Btn>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {xrayReady.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-1 text-sm font-semibold">X-ray reports ready</h2>
              <p className="mb-3 text-xs text-slate-400">
                Independent radiology letterhead with findings, impression, signature and disclaimer.
              </p>
              <ul className="divide-y divide-slate-100 text-sm">
                {xrayReady.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{r.patient_name}</span>
                      <span className="block truncate text-xs text-slate-400">
                        {r.test_name} A� {r.invoice_no} A� {formatDate(r.invoice_date)}
                      </span>
                    </span>
                    <Btn
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setPrintingXray(r)}
                    >
                      <Icon name="printer" className="h-4 w-4" /> Print X-ray
                    </Btn>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={entering !== null}
        title={
          entering
            ? `${isRadiologyReport(entering) ? "X-ray report" : "Result"} - ${entering.test_name}`
            : "Result"
        }
        onClose={() => setEntering(null)}
        wide
      >
        {entering && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium">{entering.patient_name}</p>
              <p className="text-xs text-slate-500">
                {entering.patient_age != null ? `${entering.patient_age} years` : ""}
                {entering.patient_gender ? ` · ${entering.patient_gender}` : ""}
              </p>
              {!isRadiologyReport(entering) &&
                entering.ref_range &&
                entryParameters.length === 0 &&
                !parametersLoading && (
                <p className="mt-1 text-xs text-slate-500">
                  Reference: {entering.ref_range}
                  {entering.unit ? ` ${entering.unit}` : ""}
                </p>
              )}
            </div>

            {isRadiologyReport(entering) ? (
              <div className="space-y-3">
                <Labeled
                  label="Clinical history"
                  hint="Optional. Printed above the radiological findings."
                >
                  <textarea
                    value={xrayClinicalHistory}
                    onChange={(e) => setXrayClinicalHistory(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    placeholder="e.g. Dry cough and fever for 3 days"
                  />
                </Labeled>
                <Labeled
                  label="Findings *"
                  hint="Radiologist narrative for the X-ray study."
                >
                  <textarea
                    value={xrayFindings}
                    onChange={(e) => setXrayFindings(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    placeholder="Describe the radiological findings..."
                  />
                </Labeled>
                <Labeled
                  label="Impression"
                  hint="Short summary or diagnosis for the report footer."
                >
                  <textarea
                    value={xrayImpression}
                    onChange={(e) => setXrayImpression(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    placeholder="e.g. No significant abnormality detected"
                  />
                </Labeled>
                <Labeled
                  label="Radiologist signature *"
                  hint="The selected name, qualification and signature are stored on this report."
                >
                  <Select
                    value={selectedRadiologistId}
                    onChange={(e) => setSelectedRadiologistId(e.target.value)}
                  >
                    <option value="">Select radiologist</option>
                    {radiologists.map((radiologist) => (
                      <option key={radiologist.id} value={radiologist.id}>
                        {radiologist.name}
                        {radiologist.qualification
                          ? ` - ${radiologist.qualification}`
                          : ""}
                        {radiologist.is_active === 0 ? " (inactive)" : ""}
                      </option>
                    ))}
                  </Select>
                </Labeled>
                {selectedRadiologist?.signature_data && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="mb-1 text-[11px] font-medium text-slate-500">
                      Signature preview
                    </p>
                    <img
                      src={selectedRadiologist.signature_data}
                      alt="Selected radiologist signature"
                      className="max-h-20 max-w-56 object-contain"
                    />
                  </div>
                )}
                {radiologists.length === 0 && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No active radiologist signatures are configured. Ask an
                    administrator to add one in Settings → Radiologists before
                    releasing an X-ray report.
                  </p>
                )}
                {selectedRadiologist &&
                  !selectedRadiologist.signature_data.trim() && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      This radiologist has no signature image. Upload one in
                      Settings → Radiologists before releasing.
                    </p>
                  )}
              </div>
            ) : parametersLoading ? (
              <p className="py-6 text-center text-sm text-slate-400">Loading parameters…</p>
            ) : entryParameters.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Parameters on this report ({entryParameters.filter((p) => p.selected).length} selected)
                  </p>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      className="text-teal-700 hover:underline"
                      onClick={() => setEntryParameters((all) => all.map((p) => ({ ...p, selected: true })))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:underline"
                      onClick={() => setEntryParameters((all) => all.map((p) => ({ ...p, selected: false })))}
                    >
                      Select none
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs text-slate-500">
                        <th className="px-2 py-1.5">Include</th>
                        <th className="px-3 py-1.5">Parameter</th>
                        <th className="px-3 py-1.5">Result</th>
                        <th className="px-3 py-1.5">Unit</th>
                        <th className="px-3 py-1.5">Reference range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entryParameters.map((p) => {
                        const flag = parameterFlag(p);
                        return (
                          <tr key={p.parameterId} className="border-t border-slate-100">
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={p.selected}
                                onChange={(e) => updateParameter(p.parameterId, { selected: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                                aria-label={`Include ${p.name}`}
                              />
                            </td>
                            <td className="px-3 py-1.5 font-medium">
                              {p.name}
                              {p.selected && flag && (
                                <span className="ml-1.5 text-[10px] font-bold uppercase text-rose-600">{flag}</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5">
                              <TextInput
                                value={p.result}
                                onChange={(e) => updateParameter(p.parameterId, { result: e.target.value })}
                                placeholder="Value"
                                className="w-32"
                                disabled={!p.selected}
                                aria-label={`${p.name} result`}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <TextInput
                                value={p.unit}
                                onChange={(e) => updateParameter(p.parameterId, { unit: e.target.value })}
                                placeholder="Unit"
                                className="w-28"
                                disabled={!p.selected}
                                aria-label={`${p.name} unit`}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <TextInput
                                value={p.refRange}
                                onChange={(e) => updateParameter(p.parameterId, { refRange: e.target.value })}
                                placeholder="Reference"
                                className="w-36"
                                disabled={!p.selected}
                                aria-label={`${p.name} reference range`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400">
                  Only selected parameters are printed. Unit and reference changes apply
                  to this report; numeric results outside the normal limits are flagged.
                </p>
              </div>
            ) : (
              <Labeled
                label="Result"
                hint={
                  entering.ref_min !== null || entering.ref_max !== null
                    ? "A number outside the reference range is flagged abnormal automatically."
                    : "Free text (e.g. “Normal study”, “No growth after 24 hrs”). Define parameters under Tests & Packages for a parameter-wise report."
                }
              >
                <TextInput
                  value={resultText}
                  autoFocus
                  onChange={(e) => setResultText(e.target.value)}
                  placeholder={entering.unit ? `e.g. value in ${entering.unit}` : "Result"}
                />
              </Labeled>
            )}

            {entering.test_category === "Pathology" && entering.sample_status !== "accepted" && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {entering.accession_no
                  ? `Sample ${entering.accession_no} is ${entering.sample_status ?? "not available"}. It must be accepted in the Samples desk before release.`
                  : "No sample is linked to this pathology order. Register and accept a sample before releasing results."}
              </p>
            )}

            {entering.status === "done" && (
              <Labeled
                label="Amendment reason *"
                hint="The issued report is preserved in history; this reason is recorded with the amended revision."
              >
                <textarea
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  placeholder="e.g. Corrected transposed WBC result after repeat analysis"
                />
              </Labeled>
            )}

            {!user?.can_authorize_reports && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Your account can enter results but cannot release reports. Ask an administrator
                for report authorization.
              </p>
            )}

            <ErrorNote message={error} />

            <div className="flex flex-wrap justify-end gap-2">
              <Btn onClick={() => setEntering(null)}>Cancel</Btn>
              {entering.status !== "done" && (
                <Btn onClick={() => void saveResult(false)} disabled={busy || parametersLoading}>
                  Save draft
                </Btn>
              )}
              <Btn
                variant="primary"
                onClick={() => void saveResult(true)}
                disabled={
                  busy ||
                  parametersLoading ||
                  !user?.can_authorize_reports ||
                  !xraySignatureReady
                }
              >
                <Icon name="check" className="h-4 w-4" />
                {entering.status === "done" ? "Save amendment" : "Verify & release"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!historyFor}
        title={historyFor ? `Report history — ${historyFor.test_name}` : "Report history"}
        onClose={() => setHistoryFor(null)}
        wide
      >
        {historyFor && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium">{historyFor.patient_name}</p>
              <p className="text-xs text-slate-500">
                {historyFor.invoice_no} · {historyFor.accession_no || "No linked sample"}
              </p>
            </div>
            {!historyLoaded ? (
              <p className="py-6 text-center text-sm text-slate-400">Loading history…</p>
            ) : historyRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No revisions recorded for this report yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {historyRows.map((h) => (
                  <li key={h.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium capitalize">
                        Revision {h.revision_no} · {h.action}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(h.acted_at)} · {h.acted_by_name || "Unknown user"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{h.reason || "No reason recorded"}</p>
                    <p className="num mt-1 break-words text-xs text-slate-500">
                      {revisionResultSummary(h.snapshot_json)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <ErrorNote message={historyError} />
            <p className="text-xs text-slate-400">
              Revision snapshots are append-only. Issued results are amended; they are not
              silently overwritten.
            </p>
          </div>
        )}
      </Modal>

      {abdmOrder && (
        <AbdmExport
          orderId={abdmOrder.id}
          testName={abdmOrder.test_name}
          onClose={() => setAbdmOrder(null)}
        />
      )}

      {printingInvoice && (
        <ReportPrint
          invoiceId={printingInvoice}
          onClose={() => setPrintingInvoice(null)}
        />
      )}

      {printingXray && (
        <XrayReportPrint
          order={printingXray}
          onClose={() => setPrintingXray(null)}
        />
      )}
    </>
  );
}

// ---- Printable report (letterhead) ----

function ReportPrint({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<WorkRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [lab, setLab] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [paramsByOrder, setParamsByOrder] = useState<Record<string, ReportParameterRow[]>>({});

  useEffect(() => {
    void (async () => {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      // One report per bill: only this invoice's verified tests.
      const list = await db.all<WorkRow>(
        `SELECT ro.*, i.invoice_no, i.invoice_date,
                p.name AS patient_name, p.phone AS patient_phone,
                p.age AS patient_age, p.gender AS patient_gender,
                COALESCE(t.category, '') AS test_category,
                smp.accession_no, smp.status AS sample_status,
                smp.specimen_type AS sample_specimen_type,
                smp.collected_at AS sample_collected_at,
                smp.received_at AS sample_received_at,
                COALESCE(u.full_name, u.username, '') AS verified_by_name,
                (SELECT COALESCE(MAX(rr.revision_no), 0)
                 FROM report_result_revisions rr
                 WHERE rr.report_order_id = ro.id AND rr.deleted = 0
                   AND rr.tenant_id = ro.tenant_id) AS revision_no
         FROM report_orders ro
         JOIN invoices i ON i.id = ro.invoice_id AND i.tenant_id = ro.tenant_id
         JOIN patients p ON p.id = ro.patient_id AND p.tenant_id = ro.tenant_id
         LEFT JOIN tests t ON t.id = ro.test_id AND t.tenant_id = ro.tenant_id
         LEFT JOIN samples smp ON smp.id = ro.sample_id AND smp.tenant_id = ro.tenant_id
         LEFT JOIN users u ON u.id = ro.verified_by AND u.tenant_id = ro.tenant_id
         WHERE ro.invoice_id = ? AND ro.deleted = 0 AND ro.status = 'done'
           AND i.deleted = 0 AND i.status <> 'cancelled'
           AND ro.tenant_id = ? AND i.tenant_id = ? AND p.tenant_id = ?
         ORDER BY ro.created_at`,
        [invoiceId, ...tenantParams, ...tenantParams, ...tenantParams]
      );
      const printableOrders = list.filter((order) => !isRadiologyReport(order));
      setOrders(printableOrders);
      const map: Record<string, ReportParameterRow[]> = {};
      for (const o of printableOrders) {
        const rp = await db.all<ReportParameterRow>(
          `SELECT * FROM report_parameters WHERE report_order_id = ? AND deleted = 0 ${tenantClause} ORDER BY created_at`,
          [o.id, ...tenantParams]
        );
        if (rp.length) map[o.id] = rp;
      }
      setParamsByOrder(map);
      const inv =
        (await db.get<InvoiceRow>(
          `SELECT * FROM invoices WHERE id = ? ${tenantClause}`,
          [invoiceId, ...tenantParams]
        )) ?? null;
      setInvoice(inv);
      setPatient(
        inv
          ? ((await db.get<PatientRow>(
              `SELECT * FROM patients WHERE id = ? ${tenantClause}`,
              [inv.patient_id, ...tenantParams]
            )) ?? null)
          : null
      );
      setLab(
        await getSettings(db, [
          "lab_name",
          "lab_address",
          "lab_phone",
          "lab_gstin",
          "pathologist_name",
          "pathologist_qualification",
          "accreditation_body",
          "accreditation_number",
          "accreditation_valid_until",
          "logo_data",
          ...PRINT_LETTERHEAD_KEYS,
        ])
      );
      setReady(true);
    })();
  }, [invoiceId]);

  useEffect(() => {
    if (ready && orders.length > 0) {
      const t = setTimeout(() => printA4(), 400);
      return () => clearTimeout(t);
    }
  }, [ready, orders.length]);

  const doctorName = useDoctorName(invoice?.doctor_id ?? "");
  const reportVersion = Math.max(1, ...orders.map((o) => o.revision_no ?? 1));
  const authorizerName =
    orders.find((o) => o.verified_by_name)?.verified_by_name ||
    lab.pathologist_name ||
    "Authorized signatory";
  const printConfig = readPrintLetterhead(lab);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/50 p-0 sm:p-6">
      <PrintPageStyle config={printConfig} />
      <div className="mx-auto w-full max-w-3xl">
        <div className="no-print flex items-center justify-between gap-2 rounded-t-xl bg-white px-4 py-2.5">
          <span className="text-sm font-medium">Report preview</span>
          <div className="flex gap-2">
            <Btn onClick={onClose}>Close</Btn>
            <Btn variant="primary" onClick={printA4}>
              <Icon name="printer" className="h-4 w-4" /> Print
            </Btn>
          </div>
        </div>

        <div className="no-print bg-white px-4 pb-2">
          <PrintLetterheadHint config={printConfig} />
        </div>

        <div className="print-area bg-white p-8 shadow-xl sm:rounded-b-xl print:shadow-none">
          <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-3">
            <div className={`flex items-start gap-3 ${printLetterheadHideClass(printConfig)}`}>
              {lab.logo_data && (
                <img
                  src={lab.logo_data}
                  alt=""
                  className="max-h-16 max-w-28 shrink-0 object-contain"
                />
              )}
              <div>
                <h1 className="text-lg font-bold uppercase tracking-wide">
                  {lab.lab_name || "Diagnostic Centre"}
                </h1>
                {lab.lab_address && (
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
                    {lab.lab_address}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  {lab.lab_phone && `Phone: ${lab.lab_phone}`}
                  {lab.lab_gstin && ` · GSTIN: ${lab.lab_gstin}`}
                </p>
                {lab.accreditation_number && (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {lab.accreditation_body || "Accreditation"}: {lab.accreditation_number}
                    {lab.accreditation_valid_until
                      ? ` · valid until ${formatDate(new Date(lab.accreditation_valid_until).getTime())}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="ml-auto text-right text-xs text-slate-600">
              <p className="text-sm font-bold uppercase tracking-widest">
                {reportVersion > 1 ? "Amended Report" : "Report"}
              </p>
              {invoice && <p className="num mt-0.5">{invoice.invoice_no}</p>}
              <p>Version {reportVersion}</p>
              <p>{formatDate(Date.now())}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 text-xs">
            <div>
              <p className="font-semibold text-slate-500">Patient</p>
              <p className="mt-0.5 text-sm font-semibold">{patient?.name}</p>
              <p className="text-slate-600">
                {patient?.age != null ? `${patient.age} years` : ""}
                {patient?.gender ? ` · ${patient.gender}` : ""}
                {patient?.dob ? ` · DOB ${formatDate(new Date(patient.dob).getTime())}` : ""}
              </p>
              {patient?.abha_id && (
                <p className="num text-[10px] text-slate-500">
                  ABHA (as recorded): {patient.abha_id}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-500">Referred by</p>
              <p className="mt-0.5 text-sm">
                {doctorName ? `Dr. ${doctorName}` : "Self / walk-in"}
              </p>
            </div>
          </div>

          <table className="w-full border-t border-slate-300 text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-1.5 pr-2">Investigation / Parameter</th>
                <th className="py-1.5 pr-2">Result</th>
                <th className="py-1.5 pr-2">Unit</th>
                <th className="py-1.5">Reference range</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const params = paramsByOrder[o.id] || [];
                if (params.length > 0) {
                  return (
                    <Fragment key={o.id}>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <td colSpan={4} className="py-1.5 pr-2">
                          <span className="font-semibold">{o.test_name}</span>
                          {o.accession_no && (
                            <span className="ml-2 text-[10px] font-normal text-slate-500">
                              Sample {o.accession_no}
                              {o.sample_specimen_type ? ` · ${o.sample_specimen_type}` : ""}
                              {o.sample_collected_at
                                ? ` · collected ${formatDateTime(o.sample_collected_at)}`
                                : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                      {params.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100">
                          <td className="py-1.5 pr-2 pl-4">{p.parameter_name}</td>
                          <td className="num py-1.5 pr-2 font-semibold">
                            {p.result_text || "—"}
                            {p.abnormal === 1 && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase text-rose-600">
                                abnormal
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-2 text-slate-600">{p.unit || "—"}</td>
                          <td className="py-1.5 text-slate-600">{p.ref_range || "—"}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                }
                return (
                  <tr key={o.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-medium">
                      {o.test_name}
                      {o.accession_no && (
                        <span className="block text-[10px] font-normal text-slate-500">
                          Sample {o.accession_no}
                          {o.sample_specimen_type ? ` · ${o.sample_specimen_type}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="num py-2 pr-2 font-semibold">
                      {o.result_text || "—"}
                      {o.abnormal === 1 && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase text-rose-600">
                          abnormal
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-slate-600">{o.unit || "—"}</td>
                    <td className="py-2 text-slate-600">{o.ref_range || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-3 text-[10px] text-slate-500">
            Results relate only to the sample(s) received. Please correlate with
            clinical findings.
          </p>

          <div className="mt-10 flex items-end justify-between text-[10px] text-slate-600">
            <div>
              <p className="border-t border-slate-400 pt-1 font-semibold">
                {authorizerName}
                {lab.pathologist_qualification && authorizerName === lab.pathologist_name
                  ? `, ${lab.pathologist_qualification}`
                  : ""}
              </p>
              <p className="text-slate-500">Authorized for release</p>
            </div>
            <p>Released {formatDateTime(orders[0]?.reported_at ?? Date.now())}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Printable X-ray / radiology report ----

function XrayReportPrint({
  order,
  onClose,
}: {
  order: WorkRow;
  onClose: () => void;
}) {
  const [lab, setLab] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const db = await getDb();
      setLab(
        await getSettings(db, [
          "lab_name",
          "lab_address",
          "lab_phone",
          "lab_gstin",
          "pathologist_name",
          "pathologist_qualification",
          "radiologist_name",
          "radiologist_qualification",
          "xray_disclaimer",
          "logo_data",
          ...PRINT_LETTERHEAD_KEYS,
        ])
      );
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => printA4(), 400);
    return () => clearTimeout(t);
  }, [ready]);

  const radiologistName =
    order.radiologist_name?.trim() ||
    lab.radiologist_name?.trim() ||
    order.verified_by_name?.trim() ||
    lab.pathologist_name?.trim() ||
    "Radiologist";
  const radiologistQualification =
    order.radiologist_qualification?.trim() ||
    lab.radiologist_qualification?.trim() ||
    (radiologistName === lab.pathologist_name ? lab.pathologist_qualification?.trim() : "");
  const radiologistSignature = order.radiologist_signature?.trim() || "";
  const disclaimer = lab.xray_disclaimer?.trim() || DEFAULT_XRAY_DISCLAIMER;
  const findings = order.findings_text?.trim() || "";
  const impression = order.impression_text?.trim() || "";
  const clinicalHistory = order.clinical_history?.trim() || "";
  const printConfig = readPrintLetterhead(lab);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/50 p-0 sm:p-6">
      <PrintPageStyle config={printConfig} />
      <div className="mx-auto w-full max-w-3xl">
        <div className="no-print flex items-center justify-between gap-2 rounded-t-xl bg-white px-4 py-2.5">
          <span className="text-sm font-medium">X-ray report preview</span>
          <div className="flex gap-2">
            <Btn onClick={onClose}>Close</Btn>
            <Btn variant="primary" onClick={printA4}>
              <Icon name="printer" className="h-4 w-4" /> Print
            </Btn>
          </div>
        </div>

        <div className="no-print bg-white px-4 pb-2">
          <PrintLetterheadHint config={printConfig} />
        </div>

        <div className="print-area bg-white p-8 shadow-xl sm:rounded-b-xl print:shadow-none">
          <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-3">
            <div className={`flex items-start gap-3 ${printLetterheadHideClass(printConfig)}`}>
              {lab.logo_data && (
                <img
                  src={lab.logo_data}
                  alt=""
                  className="max-h-16 max-w-28 shrink-0 object-contain"
                />
              )}
              <div>
                <h1 className="text-lg font-bold uppercase tracking-wide">
                  {lab.lab_name || "Diagnostic Centre"}
                </h1>
                {lab.lab_address && (
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
                    {lab.lab_address}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  {lab.lab_phone && `Phone: ${lab.lab_phone}`}
                  {lab.lab_gstin && ` | GSTIN: ${lab.lab_gstin}`}
                </p>
              </div>
            </div>
            <div className="ml-auto text-right text-xs text-slate-600">
              <p className="text-sm font-bold uppercase tracking-widest">X-Ray Report</p>
              <p className="num mt-0.5">{order.invoice_no}</p>
              <p>Exam: {order.test_name}</p>
              <p>Study: {formatDate(order.invoice_date)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 text-xs">
            <div>
              <p className="font-semibold text-slate-500">Patient</p>
              <p className="mt-0.5 text-sm font-semibold">{order.patient_name}</p>
              <p className="text-slate-600">
                {order.patient_age != null ? `${order.patient_age} years` : ""}
                {order.patient_gender ? ` | ${order.patient_gender}` : ""}
                {order.patient_phone ? ` | ${order.patient_phone}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-500">Accession / Study date</p>
              <p className="num mt-0.5">
                {order.accession_no || "—"} | {formatDate(order.invoice_date)}
              </p>
              <p>{order.test_category || "Radiology"}</p>
            </div>
          </div>

          {clinicalHistory && (
            <div className="border-t border-slate-200 py-3 text-xs">
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                Clinical history
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{clinicalHistory}</p>
            </div>
          )}

          <div className="border-t border-slate-300 py-4 text-xs">
            <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">Findings</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {findings || "No findings recorded."}
            </p>
          </div>

          <div className="border-t border-slate-200 py-3 text-xs">
            <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">Impression</p>
            <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-800">
              {impression || "No impression recorded."}
            </p>
          </div>

          <div className="mt-10 flex items-end justify-between text-[10px] text-slate-600">
            <div>
              {radiologistSignature && (
                <img
                  src={radiologistSignature}
                  alt=""
                  className="mb-1 max-h-16 max-w-44 object-contain"
                />
              )}
              <p className="border-t border-slate-400 pt-1 font-semibold">
                {radiologistName}
                {radiologistQualification ? `, ${radiologistQualification}` : ""}
              </p>
              <p className="text-slate-500">Radiologist</p>
            </div>
            <p>Reported {formatDateTime(order.reported_at ?? Date.now())}</p>
          </div>

          <div className="mt-6 border-t border-slate-300 pt-2 text-[10px] leading-4 text-slate-500">
            <span className="font-semibold uppercase tracking-wide">Disclaimer: </span>
            {disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Looks up the referring doctor's display name for the report. */
function useDoctorName(doctorId: string): string {
  const [name, setName] = useState("");
  useEffect(() => {
    if (!doctorId) {
      setName("");
      return;
    }
    void (async () => {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const row = await db.get<{ name: string }>(
        `SELECT name FROM doctors WHERE id = ? ${tenantClause}`,
        [doctorId, ...tenantParams]
      );
      setName(row?.name ?? "");
    })();
  }, [doctorId]);
  return name;
}
