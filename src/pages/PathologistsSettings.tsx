// Administrator-managed pathologist signature catalogue.
//
// The signature is stored as an image data URL on a tenant-scoped pathologist
// row. When an operator issues a pathology report, the selected name,
// qualification and signature are copied into that report order so later edits
// to this catalogue cannot change an already issued report.

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { getDeviceId, now, uuid } from "../db/helpers";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import type { PathologistRow } from "../db/types";
import { readImageFile, validateImageFile } from "../ui/logo";
import {
  Btn,
  Card,
  ErrorNote,
  Icon,
  Labeled,
  Modal,
  TextInput,
} from "../ui/kit";

interface PathologistForm {
  id: string;
  name: string;
  qualification: string;
  signatureData: string;
  isActive: boolean;
}

const EMPTY_FORM: PathologistForm = {
  id: "",
  name: "",
  qualification: "",
  signatureData: "",
  isActive: true,
};

export default function PathologistsSettings({ canEdit }: { canEdit: boolean }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PathologistRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PathologistRow | null>(null);
  const [form, setForm] = useState<PathologistForm>(EMPTY_FORM);

  const load = async () => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    setError("");
    setRows(
      await db.all<PathologistRow>(
        `SELECT * FROM pathologists
         WHERE deleted = 0 ${tenantClause}
         ORDER BY sort_order, name`,
        tenantParams
      )
    );
    setLoaded(true);
  };

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load pathologists");
      setLoaded(true);
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setOpen(true);
  };

  const openEdit = (row: PathologistRow) => {
    setEditing(row);
    setForm({
      id: row.id,
      name: row.name,
      qualification: row.qualification,
      signatureData: row.signature_data,
      isActive: row.is_active === 1,
    });
    setFormError("");
    setOpen(true);
  };

  const handleSignatureFile = async (file: File | null) => {
    if (!file) return;
    const validation = validateImageFile(file, "Signature");
    if (validation) return setFormError(validation);
    try {
      setFormError("");
      setForm({
        ...form,
        signatureData: await readImageFile(file, "Signature"),
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not read the signature image"
      );
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    if (!form.name.trim()) return setFormError("Pathologist name is required");
    if (!form.signatureData.trim()) {
      return setFormError(
        "Upload a signature image (PNG, JPG or WebP, up to 500 KB) for this pathologist."
      );
    }

    setBusy(true);
    setFormError("");
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const ts = now();
      const pathologistId = editing?.id ?? uuid();
      if (editing) {
        await db.run(
          `UPDATE pathologists
           SET name = ?, qualification = ?, signature_data = ?, is_active = ?,
               updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [
            form.name.trim(),
            form.qualification.trim(),
            form.signatureData,
            form.isActive ? 1 : 0,
            ts,
            editing.id,
            ...tenantParams,
          ]
        );
      } else {
        const max = await db.get<{ n: number }>(
          `SELECT COALESCE(MAX(sort_order), 0) + 1 AS n
           FROM pathologists WHERE deleted = 0 ${tenantClause}`,
          tenantParams
        );
        await db.run(
          `INSERT INTO pathologists
             (id, name, qualification, signature_data, is_active, sort_order,
              created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,1,0,?)`,
          [
            pathologistId,
            form.name.trim(),
            form.qualification.trim(),
            form.signatureData,
            form.isActive ? 1 : 0,
            max?.n ?? 1,
            ts,
            ts,
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
      }

      await writeAudit(db, {
        userId: user?.id ?? "",
        action: editing ? "pathologist.update" : "pathologist.create",
        entity: "pathologist",
        entityId: pathologistId,
        detail: `${form.name.trim()}${form.isActive ? "" : " (inactive)"} | signature ${form.signatureData ? "set" : "missing"}`,
      });
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save pathologist");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row: PathologistRow) => {
    if (!canEdit) return;
    const next = row.is_active === 1 ? 0 : 1;
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    await db.run(
      `UPDATE pathologists SET is_active = ?, updated_at = ?, dirty = 1
       WHERE id = ? ${tenantClause}`,
      [next, now(), row.id, ...tenantParams]
    );
    await writeAudit(db, {
      userId: user?.id ?? "",
      action: "pathologist.update",
      entity: "pathologist",
      entityId: row.id,
      detail: `${row.name} marked ${next === 1 ? "active" : "inactive"}`,
    });
    await load();
  };

  const remove = async (row: PathologistRow) => {
    if (!canEdit) return;
    if (
      !window.confirm(
        `Delete ${row.name} from the pathologist list? Already issued reports keep their saved signature snapshot.`
      )
    ) {
      return;
    }
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    await db.run(
      `UPDATE pathologists
       SET deleted = 1, is_active = 0, updated_at = ?, dirty = 1
       WHERE id = ? ${tenantClause}`,
      [now(), row.id, ...tenantParams]
    );
    await writeAudit(db, {
      userId: user?.id ?? "",
      action: "pathologist.delete",
      entity: "pathologist",
      entityId: row.id,
      detail: row.name,
    });
    await load();
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Pathologist signatures</h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              Add one record per pathologist, with a scanned signature image.
              Operators select a pathologist when issuing a pathology report. The
              selected name, qualification and signature are copied into the
              report, so later edits here do not alter historical reports.
            </p>
          </div>
          {canEdit && (
            <Btn variant="primary" onClick={openNew}>
              <Icon name="plus" className="h-4 w-4" /> Add pathologist
            </Btn>
          )}
        </div>

        <div className="mt-4">
          <ErrorNote message={error} />
          {!loaded ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading.</p>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                No pathologist signatures yet
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Add the pathologists who issue pathology reports, then select one at
                report entry.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-4 px-4 py-3"
                >
                  <div className="flex h-20 w-40 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
                    {row.signature_data ? (
                      <img
                        src={row.signature_data}
                        alt={`${row.name} signature`}
                        className="max-h-16 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        No signature image
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-slate-500">
                      {row.qualification || "No qualification recorded"}
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        row.is_active === 1
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.is_active === 1 ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-1">
                      <Btn variant="ghost" onClick={() => openEdit(row)}>
                        Edit
                      </Btn>
                      <Btn variant="ghost" onClick={() => void toggleActive(row)}>
                        {row.is_active === 1 ? "Deactivate" : "Activate"}
                      </Btn>
                      <Btn variant="ghost" onClick={() => void remove(row)}>
                        Delete
                      </Btn>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          Signature images are tenant-scoped, stored in the encrypted local
          database, included in backups and full data snapshots, and never leave
          the machine unless you export or back up the data.
        </p>
      </Card>

      <Modal
        open={open}
        title={editing ? `Edit ${editing.name}` : "Add pathologist"}
        onClose={() => setOpen(false)}
        wide
      >
        <form onSubmit={(event) => void save(event)} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Pathologist name *">
              <TextInput
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Dr. A. Sharma"
                disabled={!canEdit || busy}
              />
            </Labeled>
            <Labeled label="Qualification">
              <TextInput
                value={form.qualification}
                onChange={(event) =>
                  setForm({ ...form, qualification: event.target.value })
                }
                placeholder="MD (Pathology)"
                disabled={!canEdit || busy}
              />
            </Labeled>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">
              Signature image *
            </p>
            <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              {form.signatureData ? (
                <img
                  src={form.signatureData}
                  alt="Signature preview"
                  className="max-h-24 max-w-full object-contain"
                />
              ) : (
                <p className="text-xs text-slate-400">
                  Upload a PNG, JPG or WebP signature up to 500 KB
                </p>
              )}
            </div>
            {canEdit && (
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => {
                      void handleSignatureFile(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                  {form.signatureData ? "Replace signature" : "Upload signature"}
                </label>
                {form.signatureData && (
                  <Btn
                    variant="ghost"
                    onClick={() => setForm({ ...form, signatureData: "" })}
                    disabled={busy}
                  >
                    Remove image
                  </Btn>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm({ ...form, isActive: event.target.checked })
              }
              disabled={!canEdit || busy}
              className="h-4 w-4 rounded border-slate-300 accent-teal-700"
            />
            Available for selection on new pathology reports
          </label>

          <ErrorNote message={formError} />

          <div className="flex justify-end gap-2 pt-1">
            <Btn onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Btn>
            {canEdit && (
              <Btn type="submit" variant="primary" disabled={busy}>
                {busy ? "Saving." : editing ? "Save changes" : "Add pathologist"}
              </Btn>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
