import { useEffect, useState, type FormEvent } from "react";
import { getDb } from "../db";
import { getDeviceId, now, uuid } from "../db/helpers";
import {
  normalizeReferrerType,
  referrerLabel,
} from "../db/referrer";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import type { DoctorRow } from "../db/types";
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

interface DoctorForm {
  name: string;
  type: "doctor" | "hospital" | "self";
  qualification: string;
  specialization: string;
  reg_no: string;
  phone: string;
  address: string;
  email: string;
  is_active: boolean;
  notes: string;
}

const EMPTY: DoctorForm = {
  name: "",
  type: "doctor",
  qualification: "",
  specialization: "",
  reg_no: "",
  phone: "",
  address: "",
  email: "",
  is_active: true,
  notes: "",
};

export default function Doctors() {
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [form, setForm] = useState<DoctorForm>(EMPTY);
  const [editing, setEditing] = useState<DoctorRow | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    setRows(
      await db.all<DoctorRow>(
        `SELECT * FROM doctors WHERE deleted = 0 ${tenantClause} ORDER BY is_active DESC, name`,
        tenantParams
      )
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setOpen(true);
  };

  const openEdit = (d: DoctorRow) => {
    setEditing(d);
    setForm({
      name: d.name,
      type:
        d.type === "hospital" || d.type === "self" ? d.type : "doctor",
      qualification: d.qualification,
      specialization: d.specialization,
      reg_no: d.reg_no,
      phone: d.phone,
      address: d.address,
      email: d.email,
      is_active: d.is_active === 1,
      notes: d.notes,
    });
    setError("");
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Doctor name is required");
    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const values = [
        form.name.trim(),
        form.type,
        form.qualification.trim(),
        form.specialization.trim(),
        form.reg_no.trim(),
        form.phone.trim(),
        form.address.trim(),
        form.email.trim(),
        form.is_active ? 1 : 0,
        form.notes.trim(),
      ];
      if (editing) {
        const [tenantClause, tenantParams] = tenantAnd();
        await db.run(
          `UPDATE doctors SET name=?, type=?, qualification=?, specialization=?, reg_no=?, phone=?, address=?, email=?,
             is_active=?, notes=?, updated_at=?, dirty=1
             WHERE id=? ${tenantClause}`,
          [...values, now(), editing.id, ...tenantParams]
        );
      } else {
        await db.run(
          `INSERT INTO doctors (id, name, type, qualification, specialization, reg_no, phone, address, email,
             is_active, notes, created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
          [
            uuid(),
            ...values,
            now(),
            now(),
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save doctor");
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((d) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.type ?? "doctor").toLowerCase().includes(q) ||
      d.specialization.toLowerCase().includes(q) ||
      d.phone.includes(q)
    );
  });

  return (
    <>
      <PageHeader
        title="Doctors & hospitals"
        subtitle="Referring doctors, hospitals and self / walk-in entries"
        actions={
          <Btn variant="primary" onClick={openNew}>
            <Icon name="plus" className="h-4 w-4" /> New entry
          </Btn>
        }
      />

      <Card>
        <div className="border-b border-slate-200 p-3">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, speciality or phone…"
            className="max-w-sm"
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            message={rows.length === 0 ? "No doctors or hospitals yet" : "No match"}
            hint="Add doctors, hospitals or self / walk-in entries here with their contact and registration details."
            action={
              rows.length === 0 && (
                <Btn variant="primary" onClick={openNew}>
                  <Icon name="plus" className="h-4 w-4" /> Add first entry
                </Btn>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Doctor / hospital</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Type</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Specialization</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{referrerLabel(d)}</p>
                      <p className="text-xs text-slate-400">
                        {[d.qualification, d.reg_no && `Reg. ${d.reg_no}`]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                        {normalizeReferrerType(d.type)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-slate-600 sm:table-cell">
                      {d.specialization || "—"}
                    </td>
                    <td className="num px-4 py-2.5 text-slate-600">{d.phone || "—"}</td>
                    <td className="px-4 py-2.5">
                      {d.is_active ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Btn variant="ghost" onClick={() => openEdit(d)}>
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
        title={editing ? "Edit doctor / hospital" : "New doctor / hospital"}
        onClose={() => setOpen(false)}
        wide
      >
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Name *" className="sm:col-span-2">
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              placeholder={
                form.type === "hospital"
                  ? "e.g. City General Hospital"
                  : form.type === "self"
                    ? "Self / walk-in"
                    : "Dr. …"
              }
            />
          </Labeled>
          <Labeled label="Type">
            <Select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as DoctorForm["type"],
                })
              }
            >
              <option value="doctor">Doctor</option>
              <option value="hospital">Hospital / facility</option>
              <option value="self">Self / walk-in</option>
            </Select>
          </Labeled>
          <Labeled label="Qualification">
            <TextInput
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              placeholder="MBBS, MD"
            />
          </Labeled>
          <Labeled label="Specialization">
            <TextInput
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              placeholder="Pathology, Radiology…"
            />
          </Labeled>
          <Labeled label="Registration no.">
            <TextInput
              value={form.reg_no}
              onChange={(e) => setForm({ ...form, reg_no: e.target.value })}
              placeholder="State medical council number"
            />
          </Labeled>
          <Labeled label="Phone">
            <TextInput
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="numeric"
              maxLength={10}
            />
          </Labeled>
          <Labeled label="Email" className="sm:col-span-2">
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Labeled>
          <Labeled label="Address" className="sm:col-span-2">
            <TextInput
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Labeled>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 accent-teal-700"
            />
            Active ( selectable on bills)
          </label>
          <Labeled label="Notes">
            <TextInput
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Labeled>

          <div className="sm:col-span-2">
            <ErrorNote message={error} />
          </div>
          <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add entry"}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
