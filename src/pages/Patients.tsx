import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { inspectAbhaIdentifier } from "../abdm/identity";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { getDeviceId, now, uuid } from "../db/helpers";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import type { AbdmConsentRow, PatientRow } from "../db/types";
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

interface PatientForm {
  name: string;
  phone: string;
  age: string;
  gender: "" | "male" | "female" | "other";
  address: string;
  dob: string;
  id_proof_type: string;
  id_proof_no: string;
  abha_id: string;
  consent_share: boolean;
  consent_expires_at: string;
}

const EMPTY: PatientForm = {
  name: "",
  phone: "",
  age: "",
  gender: "",
  address: "",
  dob: "",
  id_proof_type: "",
  id_proof_no: "",
  abha_id: "",
  consent_share: false,
  consent_expires_at: "",
};

export default function Patients() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PatientForm>(EMPTY);
  const [editing, setEditing] = useState<PatientRow | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeConsent, setActiveConsent] = useState<AbdmConsentRow | null>(null);

  const load = async (q = "") => {
    const db = await getDb();
    const term = q.trim();
    const [tenantClause, tenantParams] = tenantAnd();
    const list = term
      ? await db.all<PatientRow>(
          `SELECT * FROM patients WHERE deleted = 0 AND (
             phone LIKE ? OR name LIKE ?) ${tenantClause} ORDER BY updated_at DESC LIMIT 200`,
          [`%${term}%`, `%${term}%`, ...tenantParams]
        )
      : await db.all<PatientRow>(
          `SELECT * FROM patients WHERE deleted = 0 ${tenantClause} ORDER BY updated_at DESC LIMIT 200`,
          tenantParams
        );
    setRows(list);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const openNew = () => {
    setEditing(null);
    setActiveConsent(null);
    setForm(EMPTY);
    setError("");
    setOpen(true);
  };

  const openEdit = async (row: PatientRow) => {
    setEditing(row);
    setActiveConsent(null);
    setForm({
      name: row.name,
      phone: row.phone,
      age: row.age == null ? "" : String(row.age),
      gender: row.gender ?? "",
      address: row.address,
      dob: row.dob ?? "",
      id_proof_type: row.id_proof_type ?? "",
      id_proof_no: row.id_proof_no ?? "",
      abha_id: row.abha_id ?? "",
      consent_share: false,
      consent_expires_at: "",
    });
    setError("");
    setOpen(true);
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const consent = await db.get<AbdmConsentRow>(
        `SELECT * FROM abdm_consents
         WHERE patient_id = ? AND status = 'active' AND deleted = 0 ${tenantClause}
         ORDER BY granted_at DESC LIMIT 1`,
        [row.id, ...tenantParams]
      );
      if (consent) {
        setActiveConsent(consent);
        setForm((current) => ({
          ...current,
          consent_share: true,
          consent_expires_at: consent.expires_at
            ? new Date(consent.expires_at).toISOString().slice(0, 10)
            : "",
        }));
      }
    } catch {
      // Consent history is additional context; editing demographics still works.
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Patient name is required");
      return;
    }
    if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) {
      setError("Phone should be 10 digits (or leave blank)");
      return;
    }
    if (form.dob && !/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) {
      setError("Date of birth should be YYYY-MM-DD");
      return;
    }
    const abha = inspectAbhaIdentifier(form.abha_id);
    if (!abha.valid) return setError(abha.error);
    const expiresAt = form.consent_expires_at
      ? new Date(`${form.consent_expires_at}T23:59:59`).getTime()
      : null;
    if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt < now())) {
      setError("Consent expiry must be a valid future date");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const tenantId = getCurrentTenantId();
      const age = form.age.trim() ? Number(form.age) : null;
      const patientId = editing?.id ?? uuid();
      const ts = now();
      const userId = user?.id ?? "";

      await db.tx(async () => {
        if (editing) {
          await db.run(
            `UPDATE patients
             SET name=?, phone=?, age=?, gender=?, address=?, dob=?, id_proof_type=?,
                 id_proof_no=?, abha_id=?, updated_at=?, dirty=1
             WHERE id=? ${tenantClause}`,
            [
              form.name.trim(),
              form.phone.trim(),
              age,
              form.gender || null,
              form.address.trim(),
              form.dob,
              form.id_proof_type.trim(),
              form.id_proof_no.trim(),
              abha.normalized,
              ts,
              patientId,
              ...tenantParams,
            ]
          );
        } else {
          await db.run(
            `INSERT INTO patients
               (id, phone, name, age, gender, address, dob, id_proof_type, id_proof_no,
                abha_id, consent_given, consent_at, created_by, created_at, updated_at,
                device_id, dirty, deleted, tenant_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
            [
              patientId,
              form.phone.trim(),
              form.name.trim(),
              age,
              form.gender || null,
              form.address.trim(),
              form.dob,
              form.id_proof_type.trim(),
              form.id_proof_no.trim(),
              abha.normalized,
              form.consent_share ? 1 : 0,
              form.consent_share ? ts : null,
              userId,
              ts,
              ts,
              getDeviceId(),
              tenantId,
            ]
          );
        }

        if (form.consent_share) {
          if (activeConsent) {
            await db.run(
              `UPDATE abdm_consents SET expires_at = ?, updated_at = ?, dirty = 1
               WHERE id = ? ${tenantClause}`,
              [expiresAt, ts, activeConsent.id, ...tenantParams]
            );
            await writeAudit(db, {
              userId,
              action: "consent.update",
              entity: "abdm_consent",
              entityId: activeConsent.id,
              detail: `ABDM sharing consent expiry updated · patient ${patientId}`,
            });
          } else {
            const consentId = uuid();
            await db.run(
              `INSERT INTO abdm_consents
                 (id, patient_id, purpose, status, consent_version, granted_at, granted_by,
                  expires_at, revoked_at, revoked_by, artefact_json, created_at, updated_at,
                  device_id, dirty, deleted, tenant_id)
               VALUES (?,?,'care-delivery','active','1',?,?,?,NULL,'',?,?,?,?,1,0,?)`,
              [
                consentId,
                patientId,
                ts,
                userId,
                expiresAt,
                JSON.stringify({
                  text: "Consent to share this patient's diagnostic report through ABDM with intended recipients.",
                  version: "1",
                  purpose: "care-delivery",
                  grantedAt: ts,
                  expiresAt,
                }),
                ts,
                ts,
                getDeviceId(),
                tenantId,
              ]
            );
            await writeAudit(db, {
              userId,
              action: "consent.grant",
              entity: "abdm_consent",
              entityId: consentId,
              detail: `ABDM sharing consent granted · patient ${patientId}`,
            });
          }
        } else if (activeConsent) {
          await db.run(
            `UPDATE abdm_consents
             SET status = 'revoked', revoked_at = ?, revoked_by = ?, updated_at = ?, dirty = 1
             WHERE id = ? ${tenantClause}`,
            [ts, userId, ts, activeConsent.id, ...tenantParams]
          );
          await writeAudit(db, {
            userId,
            action: "consent.revoke",
            entity: "abdm_consent",
            entityId: activeConsent.id,
            detail: `ABDM sharing consent revoked · patient ${patientId}`,
          });
        }

        await writeAudit(db, {
          userId,
          action: editing ? "patient.update" : "patient.create",
          entity: "patient",
          entityId: patientId,
          detail: `Patient record saved · ${form.name.trim()}`,
        });
      });

      setOpen(false);
      setEditing(null);
      setActiveConsent(null);
      await load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save patient");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={`${rows.length} patient${rows.length === 1 ? "" : "s"}${query ? " matching search" : ""}`}
        actions={
          <Btn variant="primary" onClick={openNew}>
            <Icon name="plus" className="h-4 w-4" /> New patient
          </Btn>
        }
      />

      <Card>
        <div className="border-b border-slate-200 p-3">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by phone number or name…"
              className="pl-9"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            message={query ? "No patients match your search" : "No patients yet"}
            hint="Search by phone number finds the patient and their whole history — no duplicates."
            action={
              !query && (
                <Btn variant="primary" onClick={openNew}>
                  <Icon name="plus" className="h-4 w-4" /> Add first patient
                </Btn>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Age / Gender</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Address</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {r.name}
                      {r.abha_id && (
                        <span className="num block text-[10px] font-normal text-slate-400">
                          ABHA {r.abha_id}
                        </span>
                      )}
                    </td>
                    <td className="num px-4 py-2.5 text-slate-600">
                      {r.phone || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {r.age ?? "—"}
                      {r.gender ? ` / ${r.gender[0].toUpperCase() + r.gender.slice(1)}` : ""}
                    </td>
                    <td className="hidden max-w-[240px] truncate px-4 py-2.5 text-slate-500 sm:table-cell">
                      {r.address || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Btn variant="ghost" onClick={() => openEdit(r)}>
                        <Icon name="edit" className="h-4 w-4" /> Edit
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        title={editing ? "Edit patient" : "New patient"}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={submit} className="space-y-3">
          <Labeled label="Full name *">
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              placeholder="Patient name"
            />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Phone">
              <TextInput
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile"
              />
            </Labeled>
            <Labeled label="Age">
              <TextInput
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                inputMode="numeric"
                placeholder="Years"
              />
            </Labeled>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Gender">
              <Select
                value={form.gender}
                onChange={(e) =>
                  setForm({ ...form, gender: e.target.value as PatientForm["gender"] })
                }
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Labeled>
            <Labeled label="Address" className="col-span-2 sm:col-span-1">
              <TextInput
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Optional"
              />
            </Labeled>
          </div>

          <div className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
            <Labeled label="Date of birth">
              <TextInput
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
            </Labeled>
            <Labeled label="ID proof type">
              <Select
                value={form.id_proof_type}
                onChange={(e) => setForm({ ...form, id_proof_type: e.target.value })}
              >
                <option value="">—</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="PAN">PAN</option>
                <option value="Passport">Passport</option>
                <option value="Driving licence">Driving licence</option>
                <option value="Other">Other</option>
              </Select>
            </Labeled>
            <Labeled label="ID proof number">
              <TextInput
                value={form.id_proof_no}
                onChange={(e) => setForm({ ...form, id_proof_no: e.target.value })}
                placeholder="Optional — store only what is needed"
              />
            </Labeled>
            <Labeled
              label="ABHA number / address"
              hint="Format-checked locally only; not verified with ABDM."
            >
              <TextInput
                value={form.abha_id}
                onChange={(e) => setForm({ ...form, abha_id: e.target.value })}
                placeholder="14-digit number or name@abdm"
                className="num"
              />
            </Labeled>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.consent_share}
                onChange={(e) =>
                  setForm({ ...form, consent_share: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-700"
              />
              <span>
                <span className="block font-medium">Consent to share reports through ABDM</span>
                <span className="block text-xs text-slate-500">
                  Purpose: care delivery. This records consent locally; it does not transmit
                  anything. Removing it revokes the active ABDM-sharing consent.
                </span>
              </span>
            </label>
            {form.consent_share && (
              <Labeled label="Consent expiry (optional)" className="mt-3">
                <TextInput
                  type="date"
                  value={form.consent_expires_at}
                  onChange={(e) =>
                    setForm({ ...form, consent_expires_at: e.target.value })
                  }
                />
              </Labeled>
            )}
            {activeConsent && (
              <p className="mt-2 text-xs text-emerald-700">
                Active consent recorded {new Date(activeConsent.granted_at).toLocaleDateString("en-IN")}.
                Revocation is retained in history.
              </p>
            )}
          </div>

          <ErrorNote message={error} />
          <div className="flex justify-end gap-2 pt-1">
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add patient"}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
