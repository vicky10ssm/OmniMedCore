// Sample desk: the pre-examination chain required for pathology traceability.
//
// A billed pathology test creates an EXPECTED sample. Collection, receipt,
// acceptance/rejection and disposal are explicit, time-stamped, user-linked
// events. Results cannot be released from Reports until a linked sample is
// accepted.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { formatDateTime, getDeviceId, now, uuid } from "../db/helpers";
import { getCurrentTenantId, tenantAnd, tenantAndOn } from "../db/tenant";
import type { SampleRow } from "../db/types";
import {
  Btn,
  Card,
  EmptyState,
  ErrorNote,
  Labeled,
  Modal,
  PageHeader,
  Select,
  TextInput,
} from "../ui/kit";

interface SampleListRow extends SampleRow {
  patient_name: string;
  patient_phone: string;
  invoice_no: string;
  test_names: string;
  report_count: number;
  result_count: number;
}

/**
 * A linked report is complete for disposal when it is verified, or when every
 * selected parameter (or the single result field) has saved data. Merely opening
 * the form, saving an empty draft, or entering only one of several parameters is
 * not enough.
 */
const RESULT_ENTERED_SQL = `(
  ro.status = 'done'
  OR (
    NOT EXISTS (
      SELECT 1 FROM report_parameters rp
      WHERE rp.report_order_id = ro.id AND rp.deleted = 0
        AND rp.tenant_id = ro.tenant_id
    )
    AND (TRIM(ro.result_text) <> '' OR ro.result_value IS NOT NULL)
  )
  OR (
    EXISTS (
      SELECT 1 FROM report_parameters rp
      WHERE rp.report_order_id = ro.id AND rp.deleted = 0
        AND rp.tenant_id = ro.tenant_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM report_parameters rp
      WHERE rp.report_order_id = ro.id AND rp.deleted = 0
        AND rp.tenant_id = ro.tenant_id
        AND TRIM(rp.result_text) = '' AND rp.result_value IS NULL
    )
  )
)`;

interface UnlinkedOrder {
  id: string;
  invoice_id: string;
  invoice_no: string;
  patient_id: string;
  patient_name: string;
  test_name: string;
  specimen_type: string;
  container_type: string;
}

const STATUS_STYLE: Record<SampleRow["status"], string> = {
  expected: "bg-slate-100 text-slate-600",
  collected: "bg-sky-50 text-sky-700",
  received: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  disposed: "bg-slate-100 text-slate-500",
};

export default function Samples() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SampleListRow[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedOrder[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [registerOrder, setRegisterOrder] = useState<UnlinkedOrder | null>(null);
  const [registerForm, setRegisterForm] = useState({
    accession_no: "",
    specimen_type: "",
    container_type: "",
    collection_site: "",
    collected_now: true,
    notes: "",
  });
  const [registerError, setRegisterError] = useState("");

  const [actionSample, setActionSample] = useState<SampleRow | null>(null);
  const [actionKind, setActionKind] = useState<"reject" | "dispose">("reject");
  const [actionReason, setActionReason] = useState("");
  const [actionError, setActionError] = useState("");

  const load = async () => {
    const db = await getDb();
    const [sampleTenant, sampleParams] = tenantAndOn("s");
    const [orderTenant, orderParams] = tenantAndOn("ro");
    const [patientTenant, patientParams] = tenantAndOn("p");
    const [invoiceTenant, invoiceParams] = tenantAndOn("i");
    const [testTenant, testParams] = tenantAndOn("t");
    if (!sampleTenant || !orderTenant) return;
    const samples = await db.all<SampleListRow>(
      `SELECT s.*, p.name AS patient_name, p.phone AS patient_phone,
              i.invoice_no,
              COALESCE((
                SELECT group_concat(ro.test_name, ' · ')
                FROM report_orders ro
                WHERE ro.sample_id = s.id AND ro.deleted = 0 ${orderTenant}
              ), '') AS test_names,
              COALESCE((
                SELECT COUNT(*)
                FROM report_orders ro
                WHERE ro.sample_id = s.id AND ro.deleted = 0 ${orderTenant}
              ), 0) AS report_count,
              COALESCE((
                SELECT SUM(CASE WHEN ${RESULT_ENTERED_SQL} THEN 1 ELSE 0 END)
                FROM report_orders ro
                WHERE ro.sample_id = s.id AND ro.deleted = 0 ${orderTenant}
              ), 0) AS result_count
       FROM samples s
       JOIN patients p ON p.id = s.patient_id AND p.tenant_id = s.tenant_id
       JOIN invoices i ON i.id = s.invoice_id AND i.tenant_id = s.tenant_id
       WHERE s.deleted = 0 ${sampleTenant} ${patientTenant} ${invoiceTenant}
       ORDER BY s.created_at DESC LIMIT 400`,
      [
        ...orderParams,
        ...orderParams,
        ...orderParams,
        ...sampleParams,
        ...patientParams,
        ...invoiceParams,
      ]
    );
    setRows(samples);

    setUnlinked(
      await db.all<UnlinkedOrder>(
        `SELECT ro.id, ro.invoice_id, ro.patient_id, ro.test_name,
                i.invoice_no, p.name AS patient_name,
                COALESCE(NULLIF(t.specimen_type, ''), 'Unspecified') AS specimen_type,
                t.container_type
         FROM report_orders ro
         JOIN invoices i ON i.id = ro.invoice_id AND i.tenant_id = ro.tenant_id
         JOIN patients p ON p.id = ro.patient_id AND p.tenant_id = ro.tenant_id
         JOIN tests t ON t.id = ro.test_id AND t.tenant_id = ro.tenant_id
         LEFT JOIN samples s ON s.id = ro.sample_id AND s.tenant_id = ro.tenant_id
         WHERE ro.deleted = 0 AND s.id IS NULL AND t.category = 'Pathology'
           AND ro.status IN ('pending','in_progress')
           ${orderTenant} ${invoiceTenant} ${patientTenant} ${testTenant}
           AND i.status <> 'cancelled'
         ORDER BY ro.created_at DESC LIMIT 200`,
        [
          ...orderParams,
          ...invoiceParams,
          ...patientParams,
          ...testParams,
        ]
      )
    );
    setLoaded(true);
  };

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load samples")
    );
  }, []);

  const counts = useMemo(
    () => ({
      awaiting: rows.filter((r) => ["expected", "collected", "received"].includes(r.status)).length,
      accepted: rows.filter((r) => r.status === "accepted").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const active = filter === "all" || !["disposed", "rejected"].includes(r.status);
      const matches =
        !q ||
        r.accession_no.toLowerCase().includes(q) ||
        r.patient_name.toLowerCase().includes(q) ||
        r.patient_phone.includes(q) ||
        r.invoice_no.toLowerCase().includes(q) ||
        r.test_names.toLowerCase().includes(q);
      return active && matches;
    });
  }, [rows, filter, query]);

  const openRegister = async (order: UnlinkedOrder) => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    const count = await db.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM samples WHERE invoice_id = ? ${tenantClause}`,
      [order.invoice_id, ...tenantParams]
    );
    setRegisterOrder(order);
    setRegisterForm({
      accession_no: `${order.invoice_no}-S${String((count?.n ?? 0) + 1).padStart(2, "0")}`,
      specimen_type: order.specimen_type,
      container_type: order.container_type,
      collection_site: "",
      collected_now: true,
      notes: "",
    });
    setRegisterError("");
  };

  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!registerOrder || !user) return;
    if (!registerForm.accession_no.trim()) return setRegisterError("Accession number is required");
    if (!registerForm.specimen_type.trim()) return setRegisterError("Specimen type is required");

    setBusy(true);
    setRegisterError("");
    try {
      const db = await getDb();
      const ts = now();
      const tenantId = getCurrentTenantId();
      const status = registerForm.collected_now ? "collected" : "expected";
      const sampleId = uuid();
      await db.tx(async () => {
        await db.run(
          `INSERT INTO samples
             (id, accession_no, invoice_id, patient_id, specimen_type, container_type,
              status, collection_site, collected_at, collected_by, received_at, received_by,
              accepted_at, accepted_by, rejected_at, rejected_by, rejection_reason,
              storage_location, transport_note, disposed_at, disposed_by, disposal_method,
              notes, created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,NULL,'',NULL,'',NULL,'','','','',NULL,'','',?,?,?,?,1,0,?)`,
          [
            sampleId,
            registerForm.accession_no.trim(),
            registerOrder.invoice_id,
            registerOrder.patient_id,
            registerForm.specimen_type.trim(),
            registerForm.container_type.trim(),
            status,
            registerForm.collection_site.trim(),
            registerForm.collected_now ? ts : null,
            registerForm.collected_now ? user.id : "",
            registerForm.notes.trim(),
            ts,
            ts,
            getDeviceId(),
            tenantId,
          ]
        );
        const [tenantClause, tenantParams] = tenantAnd();
        await db.run(
          `UPDATE report_orders
           SET sample_id = ?,
               specimen_collected_at = CASE WHEN ? = 1 THEN ? ELSE specimen_collected_at END,
               updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [
            sampleId,
            registerForm.collected_now ? 1 : 0,
            ts,
            ts,
            registerOrder.id,
            ...tenantParams,
          ]
        );
        await writeAudit(db, {
          userId: user.id,
          action: "sample.register",
          entity: "sample",
          entityId: sampleId,
          detail: `${registerForm.accession_no.trim()} · ${status}`,
        });
      });
      setRegisterOrder(null);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not register sample";
      setRegisterError(
        /UNIQUE|unique/i.test(message)
          ? "That accession number is already in use — choose another."
          : message
      );
    } finally {
      setBusy(false);
    }
  };

  const advance = async (row: SampleRow, next: "collected" | "received" | "accepted") => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const ts = now();
      const [tenantClause, tenantParams] = tenantAnd();
      const field =
        next === "collected"
          ? "collected_at = ?, collected_by = ?"
          : next === "received"
            ? "received_at = ?, received_by = ?"
            : "accepted_at = ?, accepted_by = ?";
      await db.tx(async () => {
        await db.run(
          `UPDATE samples SET status = ?, ${field}, updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [next, ts, user.id, ts, row.id, ...tenantParams]
        );
        if (next === "collected") {
          await db.run(
            `UPDATE report_orders SET specimen_collected_at = ?, updated_at = ?, dirty = 1
             WHERE sample_id = ? ${tenantClause}`,
            [ts, ts, row.id, ...tenantParams]
          );
        }
        if (next === "received") {
          await db.run(
            `UPDATE report_orders SET specimen_received_at = ?, updated_at = ?, dirty = 1
             WHERE sample_id = ? ${tenantClause}`,
            [ts, ts, row.id, ...tenantParams]
          );
        }
        await writeAudit(db, {
          userId: user.id,
          action: `sample.${next}`,
          entity: "sample",
          entityId: row.id,
          detail: row.accession_no,
        });
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the sample");
    } finally {
      setBusy(false);
    }
  };

  /**
   * One-click acceptance for the routine bench flow. Collection, receipt and
   * acceptance are recorded together with the same timestamp and user; labs
   * that need separate stage times can still use the individual actions.
   */
  const acceptNow = async (row: SampleRow) => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const ts = now();
      const [tenantClause, tenantParams] = tenantAnd();
      await db.tx(async () => {
        await db.run(
          `UPDATE samples
           SET status = 'accepted',
               collected_at = COALESCE(collected_at, ?),
               collected_by = CASE WHEN collected_by = '' THEN ? ELSE collected_by END,
               received_at = COALESCE(received_at, ?),
               received_by = CASE WHEN received_by = '' THEN ? ELSE received_by END,
               accepted_at = ?, accepted_by = ?, updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [ts, user.id, ts, user.id, ts, user.id, ts, row.id, ...tenantParams]
        );
        await db.run(
          `UPDATE report_orders
           SET specimen_collected_at = COALESCE(specimen_collected_at, ?),
               specimen_received_at = COALESCE(specimen_received_at, ?),
               updated_at = ?, dirty = 1
           WHERE sample_id = ? ${tenantClause}`,
          [ts, ts, ts, row.id, ...tenantParams]
        );
        await writeAudit(db, {
          userId: user.id,
          action: "sample.accept",
          entity: "sample",
          entityId: row.id,
          detail: `${row.accession_no} accepted`,
        });
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the sample");
    } finally {
      setBusy(false);
    }
  };

  const canDispose = (r: SampleListRow) =>
    r.report_count > 0 && r.result_count >= r.report_count;

  const submitAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!actionSample || !user) return;
    if (!actionReason.trim()) {
      return setActionError(
        actionKind === "reject" ? "A rejection reason is required" : "Describe the disposal method"
      );
    }
    setBusy(true);
    setActionError("");
    try {
      const db = await getDb();
      const ts = now();
      const [tenantClause, tenantParams] = tenantAnd();
      if (actionKind === "dispose") {
        if (actionSample.status !== "accepted") {
          throw new Error(
            `Sample ${actionSample.accession_no} is ${actionSample.status}. Only an accepted sample can be disposed.`
          );
        }
        const linked = await db.get<{ total: number; entered: number }>(
          `SELECT COUNT(*) AS total,
                  COALESCE(SUM(CASE WHEN ${RESULT_ENTERED_SQL} THEN 1 ELSE 0 END), 0) AS entered
           FROM report_orders ro
           WHERE ro.sample_id = ? AND ro.deleted = 0 ${tenantClause}`,
          [actionSample.id, ...tenantParams]
        );
        if (!linked || linked.total === 0) {
          throw new Error(
            "No linked test order exists for this sample. Enter/link the test result before disposal."
          );
        }
        if (linked.entered < linked.total) {
          throw new Error(
            `Results are incomplete for this sample (${linked.entered}/${linked.total} linked tests entered). Complete the results before disposal.`
          );
        }
      }
      await db.tx(async () => {
        if (actionKind === "reject") {
          await db.run(
            `UPDATE samples SET status = 'rejected', rejected_at = ?, rejected_by = ?,
               rejection_reason = ?, updated_at = ?, dirty = 1
             WHERE id = ? ${tenantClause}`,
            [ts, user.id, actionReason.trim(), ts, actionSample.id, ...tenantParams]
          );
          await db.run(
            `UPDATE report_orders SET status = 'rejected', updated_at = ?, dirty = 1
             WHERE sample_id = ? AND status IN ('pending','in_progress') ${tenantClause}`,
            [ts, actionSample.id, ...tenantParams]
          );
        } else {
          await db.run(
            `UPDATE samples SET status = 'disposed', disposed_at = ?, disposed_by = ?,
               disposal_method = ?, updated_at = ?, dirty = 1
             WHERE id = ? ${tenantClause}`,
            [ts, user.id, actionReason.trim(), ts, actionSample.id, ...tenantParams]
          );
        }
        await writeAudit(db, {
          userId: user.id,
          action: actionKind === "reject" ? "sample.reject" : "sample.dispose",
          entity: "sample",
          entityId: actionSample.id,
          detail: `${actionSample.accession_no} · ${actionReason.trim()}`,
        });
      });
      setActionSample(null);
      setActionReason("");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update the sample");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Samples"
        subtitle={`${counts.awaiting} in the pre-examination chain · ${counts.accepted} accepted · ${counts.rejected} rejected`}
      />

      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      {unlinked.length > 0 && (
        <Card className="mb-4 border-amber-200">
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-amber-900">Pathology orders without a sample record</h2>
            <p className="mt-0.5 text-xs text-amber-700">
              These include legacy orders and any order whose sample was not registered.
              Register the sample before releasing results.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {unlinked.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{o.test_name}</p>
                  <p className="num text-xs text-slate-500">
                    {o.patient_name} · {o.invoice_no} · {o.specimen_type}
                    {o.container_type ? ` · ${o.container_type}` : ""}
                  </p>
                </div>
                <Btn variant="outline" onClick={() => void openRegister(o)}>
                  Register sample
                </Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accession, patient or invoice…"
            className="max-w-xs"
          />
          <div className="flex gap-1">
            {(["active", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  filter === f
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {!loaded ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            message={rows.length === 0 ? "No samples registered" : "No samples match"}
            hint="A pathology bill creates an expected sample automatically. Register legacy orders above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Accession</th>
                  <th className="px-4 py-2.5">Patient / order</th>
                  <th className="px-4 py-2.5">Specimen</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="num px-4 py-2.5 font-medium">{r.accession_no}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{r.patient_name}</span>
                      <span className="block text-xs text-slate-400">
                        {r.invoice_no} · {r.test_names || "No linked test"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {r.specimen_type || "—"}
                      {r.container_type && (
                        <span className="block text-xs text-slate-400">{r.container_type}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status]}`}>
                        {r.status}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {r.status === "collected" && r.collected_at
                          ? `Collected ${formatDateTime(r.collected_at)}`
                          : r.status === "received" && r.received_at
                            ? `Received ${formatDateTime(r.received_at)}`
                            : r.status === "accepted" && r.accepted_at
                              ? `Accepted ${formatDateTime(r.accepted_at)}`
                              : r.status === "rejected" && r.rejected_at
                                ? `Rejected ${formatDateTime(r.rejected_at)}`
                                : r.status === "disposed" && r.disposed_at
                                  ? `Disposed ${formatDateTime(r.disposed_at)}`
                                  : "Awaiting collection"}
                      </span>
                      {r.rejection_reason && (
                        <span className="mt-0.5 block max-w-[220px] text-[10px] text-rose-600">
                          {r.rejection_reason}
                        </span>
                      )}
                      {r.status === "accepted" && (
                        <span
                          className={`mt-0.5 block max-w-[220px] text-[10px] ${
                            canDispose(r) ? "text-emerald-600" : "text-amber-700"
                          }`}
                        >
                          {r.report_count === 0
                            ? "No linked tests"
                            : `${r.result_count}/${r.report_count} linked test result${r.report_count === 1 ? "" : "s"} entered`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {r.status === "expected" && (
                        <>
                          <Btn variant="primary" onClick={() => void acceptNow(r)} disabled={busy}>
                            Accept sample
                          </Btn>
                          <Btn variant="ghost" onClick={() => void advance(r, "collected")} disabled={busy}>
                            Collected only
                          </Btn>
                        </>
                      )}
                      {r.status === "collected" && (
                        <>
                          <Btn variant="primary" onClick={() => void acceptNow(r)} disabled={busy}>
                            Accept sample
                          </Btn>
                          <Btn variant="ghost" onClick={() => void advance(r, "received")} disabled={busy}>
                            Received only
                          </Btn>
                          <Btn variant="ghost" onClick={() => { setActionSample(r); setActionKind("reject"); setActionReason(""); setActionError(""); }}>
                            Reject
                          </Btn>
                        </>
                      )}
                      {r.status === "received" && (
                        <>
                          <Btn variant="primary" onClick={() => void acceptNow(r)} disabled={busy}>
                            Accept sample
                          </Btn>
                          <Btn variant="ghost" onClick={() => { setActionSample(r); setActionKind("reject"); setActionReason(""); setActionError(""); }}>
                            Reject
                          </Btn>
                        </>
                      )}
                      {r.status === "accepted" && (
                        <Btn
                          variant="ghost"
                          disabled={!canDispose(r)}
                          title={
                            canDispose(r)
                              ? "Record specimen disposal"
                              : "Enter results for every linked test before disposal"
                          }
                          onClick={() => {
                            if (!canDispose(r)) return;
                            setActionSample(r);
                            setActionKind("dispose");
                            setActionReason("Biomedical waste disposal");
                            setActionError("");
                          }}
                        >
                          Dispose
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

      <Modal
        open={!!registerOrder}
        title={registerOrder ? `Register sample — ${registerOrder.test_name}` : "Register sample"}
        onClose={() => setRegisterOrder(null)}
      >
        <form onSubmit={submitRegister} className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium">{registerOrder?.patient_name}</p>
            <p className="text-xs text-slate-500">
              {registerOrder?.invoice_no} · {registerOrder?.test_name}
            </p>
          </div>
          <Labeled label="Accession number *">
            <TextInput
              value={registerForm.accession_no}
              onChange={(e) => setRegisterForm({ ...registerForm, accession_no: e.target.value })}
              className="num"
            />
          </Labeled>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Specimen type *">
              <TextInput
                value={registerForm.specimen_type}
                onChange={(e) => setRegisterForm({ ...registerForm, specimen_type: e.target.value })}
                placeholder="e.g. Serum, Whole Blood EDTA"
              />
            </Labeled>
            <Labeled label="Container">
              <TextInput
                value={registerForm.container_type}
                onChange={(e) => setRegisterForm({ ...registerForm, container_type: e.target.value })}
                placeholder="e.g. Red top"
              />
            </Labeled>
            <Labeled label="Collection site">
              <TextInput
                value={registerForm.collection_site}
                onChange={(e) => setRegisterForm({ ...registerForm, collection_site: e.target.value })}
                placeholder="Main lab / collection centre"
              />
            </Labeled>
            <Labeled label="Collection status">
              <Select
                value={registerForm.collected_now ? "1" : "0"}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, collected_now: e.target.value === "1" })
                }
              >
                <option value="1">Collected now</option>
                <option value="0">Expected — collect later</option>
              </Select>
            </Labeled>
          </div>
          <Labeled label="Notes">
            <TextInput
              value={registerForm.notes}
              onChange={(e) => setRegisterForm({ ...registerForm, notes: e.target.value })}
              placeholder="Transport deviation, consent note, etc."
            />
          </Labeled>
          <ErrorNote message={registerError} />
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setRegisterOrder(null)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? "Registering…" : "Register sample"}
            </Btn>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!actionSample}
        title={actionKind === "reject" ? "Reject sample" : "Dispose sample"}
        onClose={() => setActionSample(null)}
      >
        <form onSubmit={submitAction} className="space-y-3">
          <p className="text-sm text-slate-600">
            {actionKind === "reject"
              ? "Rejection is recorded against the sample and linked pending tests. The reason is retained in the audit trail."
              : "Disposal is recorded as the final post-examination event. It is available only after every linked test has entered results."}
          </p>
          <Labeled label={actionKind === "reject" ? "Rejection reason *" : "Disposal method *"}>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              placeholder={
                actionKind === "reject"
                  ? "e.g. Haemolysed sample, insufficient volume, unlabelled container"
                  : "e.g. Autoclaved and handed to authorised biomedical waste vendor"
              }
            />
          </Labeled>
          <ErrorNote message={actionError} />
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setActionSample(null)}>Cancel</Btn>
            <Btn type="submit" variant={actionKind === "reject" ? "danger" : "primary"} disabled={busy}>
              {busy ? "Saving…" : actionKind === "reject" ? "Reject sample" : "Record disposal"}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
