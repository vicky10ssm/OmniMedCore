// Hospital inpatient admissions. A patient can be admitted, assigned a ward/bed,
// and discharged with a diagnosis and summary. This is separate from OPD billing.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { useMonitor } from "../app/MonitorContext";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { formatDateTime, getDeviceId, now, uuid } from "../db/helpers";
import { allocateDocumentNo } from "../db/invoiceNo";
import { getCurrentTenantId, tenantAnd, tenantAndOn } from "../db/tenant";
import type { AdmissionRow, DoctorRow, PatientRow } from "../db/types";
import HospitalBill from "./HospitalBill";
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

interface AdmissionListRow extends AdmissionRow {
  patient_name: string;
  patient_phone: string;
  patient_age: number | null;
  patient_gender: string | null;
  doctor_name: string;
}

type Filter = "admitted" | "discharged" | "all";

function localDateTime(ts = now()): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Admissions() {
  const { user } = useAuth();
  const { monitor } = useMonitor();
  const [rows, setRows] = useState<AdmissionListRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [filter, setFilter] = useState<Filter>("admitted");
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    patient_id: "",
    doctor_id: "",
    ward: "",
    bed: "",
    reason: "",
    admitted_at: localDateTime(),
  });
  const [admitError, setAdmitError] = useState("");

  const [billFor, setBillFor] = useState<AdmissionListRow | null>(null);
  const [dischargeFor, setDischargeFor] = useState<AdmissionListRow | null>(null);
  const [dischargeForm, setDischargeForm] = useState({
    diagnosis: "",
    summary: "",
    discharged_at: localDateTime(),
  });
  const [dischargeError, setDischargeError] = useState("");

  const load = async () => {
    const db = await getDb();
    const [admissionTenant, admissionParams] = tenantAndOn("a");
    const [patientTenant, patientParams] = tenantAndOn("p");
    const [tenantClause, tenantParams] = tenantAnd();
    setRows(
      await db.all<AdmissionListRow>(
        `SELECT a.*, p.name AS patient_name, p.phone AS patient_phone,
                p.age AS patient_age, p.gender AS patient_gender,
                COALESCE(d.name, '') AS doctor_name
         FROM admissions a
         JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
         LEFT JOIN doctors d ON d.id = a.doctor_id AND d.tenant_id = a.tenant_id
         WHERE a.deleted = 0 ${admissionTenant} ${patientTenant}
         ORDER BY CASE a.status WHEN 'admitted' THEN 0 ELSE 1 END, a.admitted_at DESC
         LIMIT 500`,
        [...admissionParams, ...patientParams]
      )
    );
    setPatients(
      await db.all<PatientRow>(
        `SELECT * FROM patients WHERE deleted = 0 ${tenantClause} ORDER BY name LIMIT 1000`,
        tenantParams
      )
    );
    setDoctors(
      await db.all<DoctorRow>(
        `SELECT * FROM doctors WHERE deleted = 0 AND is_active = 1 ${tenantClause} ORDER BY name`,
        tenantParams
      )
    );
    setLoaded(true);
  };

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load admissions")
    );
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const match = filter === "all" || r.status === filter;
      const text =
        !q ||
        r.patient_name.toLowerCase().includes(q) ||
        r.patient_phone.includes(q) ||
        r.admission_no.toLowerCase().includes(q) ||
        r.ward.toLowerCase().includes(q) ||
        r.bed.toLowerCase().includes(q);
      return match && text;
    });
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      admitted: rows.filter((r) => r.status === "admitted").length,
      discharged: rows.filter((r) => r.status === "discharged").length,
    }),
    [rows]
  );

  const openAdmit = () => {
    setAdmitForm({
      patient_id: "",
      doctor_id: "",
      ward: "",
      bed: "",
      reason: "",
      admitted_at: localDateTime(),
    });
    setAdmitError("");
    setAdmitOpen(true);
  };

  const submitAdmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!admitForm.patient_id) return setAdmitError("Select a patient");
    const admittedAt = new Date(admitForm.admitted_at).getTime();
    if (!Number.isFinite(admittedAt)) return setAdmitError("Admission date/time is invalid");
    setBusy(true);
    setAdmitError("");
    try {
      const db = await getDb();
      const ts = now();
      const tenantId = getCurrentTenantId();
      const { documentNo } = await allocateDocumentNo(db, "admission", "ADM-", 4);
      const admissionId = uuid();
      await db.tx(async () => {
        await db.run(
          `INSERT INTO admissions
             (id, admission_no, patient_id, doctor_id, status, ward, bed, reason,
              diagnosis, admitted_at, discharged_at, discharge_summary, created_by,
              created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,'admitted',?,?,?,'',?,NULL,'',?,?,?,?,1,0,?)`,
          [
            admissionId,
            documentNo,
            admitForm.patient_id,
            admitForm.doctor_id,
            admitForm.ward.trim(),
            admitForm.bed.trim(),
            admitForm.reason.trim(),
            admittedAt,
            user.id,
            ts,
            ts,
            getDeviceId(),
            tenantId,
          ]
        );
        await writeAudit(db, {
          userId: user.id,
          action: "admission.create",
          entity: "admission",
          entityId: admissionId,
          detail: `${documentNo} · ${admitForm.ward} ${admitForm.bed}`.trim(),
        });
      });
      setAdmitOpen(false);
      await load();
    } catch (err) {
      setAdmitError(err instanceof Error ? err.message : "Could not admit patient");
    } finally {
      setBusy(false);
    }
  };

  const openDischarge = (row: AdmissionListRow) => {
    setDischargeFor(row);
    setDischargeForm({
      diagnosis: row.diagnosis,
      summary: row.discharge_summary,
      discharged_at: localDateTime(),
    });
    setDischargeError("");
  };

  const submitDischarge = async (e: FormEvent) => {
    e.preventDefault();
    if (!dischargeFor || !user) return;
    if (!dischargeForm.diagnosis.trim()) {
      return setDischargeError("Enter the discharge diagnosis");
    }
    const dischargedAt = new Date(dischargeForm.discharged_at).getTime();
    if (!Number.isFinite(dischargedAt)) {
      return setDischargeError("Discharge date/time is invalid");
    }
    setBusy(true);
    setDischargeError("");
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      await db.tx(async () => {
        await db.run(
          `UPDATE admissions
           SET status = 'discharged', diagnosis = ?, discharge_summary = ?,
               discharged_at = ?, updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [
            dischargeForm.diagnosis.trim(),
            dischargeForm.summary.trim(),
            dischargedAt,
            now(),
            dischargeFor.id,
            ...tenantParams,
          ]
        );
        await writeAudit(db, {
          userId: user.id,
          action: "admission.discharge",
          entity: "admission",
          entityId: dischargeFor.id,
          detail: `${dischargeFor.admission_no} · ${dischargeForm.diagnosis.trim()}`,
        });
      });
      setDischargeFor(null);
      await load();
    } catch (err) {
      setDischargeError(err instanceof Error ? err.message : "Could not discharge patient");
    } finally {
      setBusy(false);
    }
  };

  const cancelAdmission = async (row: AdmissionListRow) => {
    if (!user) return;
    if (!window.confirm(`Cancel admission ${row.admission_no}?`)) return;
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    await db.run(
      `UPDATE admissions SET status = 'cancelled', updated_at = ?, dirty = 1
       WHERE id = ? ${tenantClause}`,
      [now(), row.id, ...tenantParams]
    );
    await writeAudit(db, {
      userId: user.id,
      action: "admission.cancel",
      entity: "admission",
      entityId: row.id,
      detail: row.admission_no,
    });
    await load();
  };

  return (
    <>
      <PageHeader
        title="Admissions"
        subtitle={`${counts.admitted} currently admitted · ${counts.discharged} discharged`}
        actions={
          !monitor ? (
            <Btn variant="primary" onClick={openAdmit}>
              <Icon name="plus" className="h-4 w-4" /> Admit patient
            </Btn>
          ) : undefined
        }
      />

      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient, admission no, ward or bed…"
            className="max-w-xs"
          />
          <div className="flex gap-1">
            {(["admitted", "discharged", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  filter === f ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
            message="No admissions match"
            hint="Admit an inpatient and record ward, bed and treating doctor."
            action={!monitor ? <Btn variant="primary" onClick={openAdmit}>Admit patient</Btn> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Admission</th>
                  <th className="px-4 py-2.5">Patient</th>
                  <th className="px-4 py-2.5">Ward / bed</th>
                  <th className="px-4 py-2.5">Doctor</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="num px-4 py-2.5 font-medium">
                      {r.admission_no}
                      <span className="block text-xs font-normal text-slate-400">
                        {formatDateTime(r.admitted_at)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{r.patient_name}</span>
                      <span className="block text-xs text-slate-400">
                        {r.patient_age != null ? `${r.patient_age}y` : ""}
                        {r.patient_gender ? ` · ${r.patient_gender}` : ""}
                        {r.patient_phone ? ` · ${r.patient_phone}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {r.ward || "—"}
                      {r.bed ? ` / ${r.bed}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.doctor_name || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          r.status === "admitted"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.status === "discharged"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.discharged_at && (
                        <span className="block text-[10px] text-slate-400">
                          {formatDateTime(r.discharged_at)}
                        </span>
                      )}
                      {r.diagnosis && (
                        <span className="block max-w-[220px] text-[10px] text-slate-500">
                          {r.diagnosis}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <Btn variant="ghost" onClick={() => setBillFor(r)}>Bill</Btn>
                      {r.status === "admitted" ? (
                        monitor ? (
                          <span className="text-xs text-slate-400">Admitted</span>
                        ) : (
                          <>
                            <Btn variant="primary" onClick={() => openDischarge(r)}>
                              Discharge
                            </Btn>
                            {user?.role === "admin" && (
                              <Btn variant="ghost" onClick={() => void cancelAdmission(r)}>
                                Cancel
                              </Btn>
                            )}
                          </>
                        )
                      ) : r.status === "discharged" ? (
                        <Btn variant="ghost" onClick={() => openDischarge(r)}>
                          Summary
                        </Btn>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={admitOpen} title="Admit patient" onClose={() => setAdmitOpen(false)}>
        <form onSubmit={submitAdmit} className="space-y-3">
          <Labeled label="Patient *">
            <Select
              value={admitForm.patient_id}
              onChange={(e) => setAdmitForm({ ...admitForm, patient_id: e.target.value })}
              autoFocus
            >
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.phone ? ` · ${p.phone}` : ""}
                </option>
              ))}
            </Select>
          </Labeled>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Treating doctor">
              <Select
                value={admitForm.doctor_id}
                onChange={(e) => setAdmitForm({ ...admitForm, doctor_id: e.target.value })}
              >
                <option value="">—</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Labeled>
            <Labeled label="Admitted at">
              <TextInput
                type="datetime-local"
                value={admitForm.admitted_at}
                onChange={(e) => setAdmitForm({ ...admitForm, admitted_at: e.target.value })}
              />
            </Labeled>
            <Labeled label="Ward">
              <TextInput
                value={admitForm.ward}
                onChange={(e) => setAdmitForm({ ...admitForm, ward: e.target.value })}
                placeholder="e.g. General Ward"
              />
            </Labeled>
            <Labeled label="Bed / room">
              <TextInput
                value={admitForm.bed}
                onChange={(e) => setAdmitForm({ ...admitForm, bed: e.target.value })}
                placeholder="e.g. GW-12"
              />
            </Labeled>
          </div>
          <Labeled label="Reason for admission">
            <textarea
              value={admitForm.reason}
              onChange={(e) => setAdmitForm({ ...admitForm, reason: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              placeholder="Presenting complaints, planned procedure, etc."
            />
          </Labeled>
          <ErrorNote message={admitError} />
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setAdmitOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? "Admitting…" : "Admit patient"}
            </Btn>
          </div>
        </form>
      </Modal>

      {billFor && (
        <HospitalBill
          admission={{
            id: billFor.id,
            admission_no: billFor.admission_no,
            patient_id: billFor.patient_id,
            patient_name: billFor.patient_name,
            status: billFor.status,
          }}
          readOnly={monitor}
          onClose={() => setBillFor(null)}
        />
      )}

      <Modal
        open={!!dischargeFor}
        title={
          dischargeFor?.status === "discharged"
            ? `Discharge summary — ${dischargeFor.admission_no}`
            : `Discharge — ${dischargeFor?.admission_no ?? ""}`
        }
        onClose={() => setDischargeFor(null)}
        wide
      >
        {dischargeFor && (
          <form onSubmit={submitDischarge} className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium">{dischargeFor.patient_name}</p>
              <p className="text-xs text-slate-500">
                {dischargeFor.admission_no} · {dischargeFor.ward}
                {dischargeFor.bed ? ` / ${dischargeFor.bed}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Reason: {dischargeFor.reason || "—"}
              </p>
            </div>
            <Labeled label="Discharge diagnosis *">
              <TextInput
                value={dischargeForm.diagnosis}
                onChange={(e) => setDischargeForm({ ...dischargeForm, diagnosis: e.target.value })}
              />
            </Labeled>
            <Labeled label="Discharge summary">
              <textarea
                value={dischargeForm.summary}
                onChange={(e) => setDischargeForm({ ...dischargeForm, summary: e.target.value })}
                rows={5}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="Course in hospital, treatment, follow-up advice…"
              />
            </Labeled>
            <Labeled label="Discharged at">
              <TextInput
                type="datetime-local"
                value={dischargeForm.discharged_at}
                onChange={(e) => setDischargeForm({ ...dischargeForm, discharged_at: e.target.value })}
              />
            </Labeled>
            <ErrorNote message={dischargeError} />
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setDischargeFor(null)}>
                {dischargeFor.status === "discharged" ? "Close" : "Cancel"}
              </Btn>
              {dischargeFor.status !== "discharged" && !monitor && (
                <Btn type="submit" variant="primary" disabled={busy}>
                  {busy ? "Discharging…" : "Discharge patient"}
                </Btn>
              )}
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
