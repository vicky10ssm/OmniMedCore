import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { formatINR, getDeviceId, now, rupeesToPaise, uuid } from "../db/helpers";
import {
  computeLine,
  computeTotals,
  saveInvoice,
  type BillLineInput,
  type PaymentMode,
} from "../db/invoicing";
import type { DoctorRow, PackageRow, PatientRow, TestRow } from "../db/types";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import {
  Btn,
  Card,
  ErrorNote,
  Icon,
  Labeled,
  Modal,
  PageHeader,
  Select,
  TextInput,
  inputCls,
} from "../ui/kit";

interface CatalogOption {
  kind: "test" | "package";
  id: string;
  name: string;
  category: string;
  price_paise: number;
  gst_rate_bp: number;
}

interface LineDraft {
  key: string;
  item_type: "test" | "package";
  test_id: string;
  package_id: string;
  description: string;
  gst_rate_bp: number;
  qty: string;
  rate: string;
  discount: string;
}

const MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank transfer" },
  { value: "credit", label: "Credit (pay later)" },
];

export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientRow[]>([]);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "" as "" | "male" | "female" | "other",
  });
  const [newPatientError, setNewPatientError] = useState("");

  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [doctorId, setDoctorId] = useState("");

  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogOption[]>([]);
  const [lines, setLines] = useState<LineDraft[]>([]);

  const [mode, setMode] = useState<PaymentMode>("cash");
  const [paymentText, setPaymentText] = useState("");
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Load doctors + catalog once
  useEffect(() => {
    void (async () => {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      setDoctors(
        await db.all<DoctorRow>(
          `SELECT * FROM doctors WHERE deleted = 0 AND is_active = 1 ${tenantClause} ORDER BY name`,
          tenantParams
        )
      );
      const tests = await db.all<TestRow>(
        `SELECT * FROM tests WHERE deleted = 0 AND is_active = 1 ${tenantClause} ORDER BY name`,
        tenantParams
      );
      const pkgs = await db.all<PackageRow>(
        `SELECT * FROM packages WHERE deleted = 0 AND is_active = 1 ${tenantClause} ORDER BY name`,
        tenantParams
      );
      setCatalog([
        ...tests.map((t) => ({
          kind: "test" as const,
          id: t.id,
          name: t.name,
          category: t.category,
          price_paise: t.price_paise,
          gst_rate_bp: t.gst_rate_bp,
        })),
        ...pkgs.map((p) => ({
          kind: "package" as const,
          id: p.id,
          name: p.name,
          category: "Package",
          price_paise: p.price_paise,
          gst_rate_bp: p.gst_rate_bp,
        })),
      ]);
    })();
  }, []);

  // Patient search
  useEffect(() => {
    const term = patientQuery.trim();
    if (!term) {
      setPatientResults([]);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        const db = await getDb();
        const [tenantClause, tenantParams] = tenantAnd();
        setPatientResults(
          await db.all<PatientRow>(
            `SELECT * FROM patients WHERE deleted = 0 AND (phone LIKE ? OR name LIKE ?) ${tenantClause}
             ORDER BY updated_at DESC LIMIT 6`,
            [`%${term}%`, `%${term}%`, ...tenantParams]
          )
        );
      })();
    }, 200);
    return () => clearTimeout(t);
  }, [patientQuery]);

  const billLines: BillLineInput[] = useMemo(
    () =>
      lines.map((l) => ({
        item_type: l.item_type,
        test_id: l.test_id,
        package_id: l.package_id,
        description: l.description,
        qty: Math.max(1, Number(l.qty) || 1),
        unit_price_paise: rupeesToPaise(Number(l.rate) || 0),
        gst_rate_bp: l.gst_rate_bp,
        discount_paise: rupeesToPaise(Number(l.discount) || 0),
      })),
    [lines]
  );

  const totals = useMemo(() => computeTotals(billLines), [billLines]);

  // Payment defaults to the full total until the user edits it
  useEffect(() => {
    if (!paymentTouched && mode !== "credit") {
      setPaymentText((totals.total / 100).toFixed(2));
    }
    if (mode === "credit") setPaymentText("0");
  }, [totals.total, mode, paymentTouched]);

  const addCatalogItem = (opt: CatalogOption) => {
    setLines((prev) => {
      const existing = prev.find(
        (l) => l.item_type === opt.kind && l.test_id + l.package_id === opt.id
      );
      if (existing) {
        return prev.map((l) =>
          l.key === existing.key
            ? { ...l, qty: String(Math.max(1, Number(l.qty) || 1) + 1) }
            : l
        );
      }
      return [
        ...prev,
        {
          key: uuid(),
          item_type: opt.kind,
          test_id: opt.kind === "test" ? opt.id : "",
          package_id: opt.kind === "package" ? opt.id : "",
          description: opt.name,
          gst_rate_bp: opt.gst_rate_bp,
          qty: "1",
          rate: (opt.price_paise / 100).toFixed(2),
          discount: "",
        },
      ];
    });
    setCatalogQuery("");
  };

  const patchLine = (key: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const saveNewPatient = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPatient.name.trim()) return setNewPatientError("Name is required");
    if (newPatient.phone.trim() && !/^\d{10}$/.test(newPatient.phone.trim())) {
      return setNewPatientError("Phone should be 10 digits");
    }
    const db = await getDb();
    const id = uuid();
    await db.run(
      `INSERT INTO patients (id, phone, name, age, gender, address, created_by,
         created_at, updated_at, device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,'',?,?,?,?,1,0,?)`,
      [
        id,
        newPatient.phone.trim(),
        newPatient.name.trim(),
        newPatient.age.trim() ? Number(newPatient.age) : null,
        newPatient.gender || null,
        user?.id ?? "",
        now(),
        now(),
        getDeviceId(),
        getCurrentTenantId(),
      ]
    );
    setPatient({
      id,
      phone: newPatient.phone.trim(),
      name: newPatient.name.trim(),
      age: newPatient.age.trim() ? Number(newPatient.age) : null,
      gender: newPatient.gender || null,
      address: "",
      created_by: user?.id ?? "",
      created_at: now(),
      updated_at: now(),
      device_id: getDeviceId(),
      dirty: 1,
      deleted: 0,
      tenant_id: "tenant-default",
    } as PatientRow);
    setNewPatientOpen(false);
    setNewPatient({ name: "", phone: "", age: "", gender: "" });
    setPatientQuery("");
    setPatientResults([]);
  };

  const submit = async () => {
    setError("");
    if (!patient) return setError("Select a patient first");
    if (lines.length === 0) return setError("Add at least one test or package");
    setBusy(true);
    try {
      const db = await getDb();
      const { id } = await saveInvoice(
        db,
        {
          patientId: patient.id,
          patientName: patient.name,
          doctorId,
          invoiceDate: now(),
          lines: billLines,
          notes,
          paymentPaise:
            mode === "credit" ? 0 : rupeesToPaise(Number(paymentText) || 0),
          paymentMode: mode,
        },
        user?.id ?? ""
      );
      navigate(`/invoices/${id}?print=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save invoice");
      setBusy(false);
    }
  };

  const catalogMatches = catalogQuery.trim()
    ? catalog
        .filter((c) => {
          const q = catalogQuery.trim().toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  const paidNow = mode === "credit" ? 0 : rupeesToPaise(Number(paymentText) || 0);
  const balance = Math.max(0, totals.total - paidNow);

  return (
    <>
      <PageHeader
        title="New bill"
        subtitle="GST invoice — CGST + SGST are calculated automatically"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Patient + doctor */}
          <Card className="p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">
                  Patient *
                </p>
                {patient ? (
                  <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{patient.name}</p>
                      <p className="num text-xs text-slate-500">
                        {patient.phone || "no phone"}
                        {patient.age ? ` · ${patient.age}y` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => setPatient(null)}
                      className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-600"
                      title="Change patient"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <TextInput
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder="Search phone or name…"
                      autoFocus
                    />
                    {patientQuery.trim() !== "" && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                        {patientResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setPatient(p);
                              setPatientQuery("");
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="num shrink-0 text-xs text-slate-400">
                              {p.phone}
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setNewPatient((f) => ({
                              ...f,
                              phone: /^\d{10}$/.test(patientQuery.trim())
                                ? patientQuery.trim()
                                : "",
                            }));
                            setNewPatientOpen(true);
                          }}
                          className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-teal-700 hover:bg-teal-50"
                        >
                          <Icon name="plus" className="h-4 w-4" />
                          {patientResults.length === 0
                            ? "No match — add new patient"
                            : "Add as new patient"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Labeled label="Referring doctor (optional)">
                <Select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name}
                      {d.specialization ? ` (${d.specialization})` : ""}
                    </option>
                  ))}
                </Select>
              </Labeled>
            </div>
          </Card>

          {/* Catalog picker */}
          <Card className="p-4">
            <Labeled label="Add test or package">
              <TextInput
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Type to search your rate list…"
              />
            </Labeled>
            {catalogMatches.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                {catalogMatches.map((c) => (
                  <button
                    key={`${c.kind}-${c.id}`}
                    onClick={() => addCatalogItem(c)}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.category}</span>
                    </span>
                    <span className="num shrink-0 text-slate-600">
                      {formatINR(c.price_paise)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 overflow-x-auto">
              {lines.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                  No items yet — search above to add tests
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-2">Item</th>
                      <th className="w-14 py-2 pr-2">Qty</th>
                      <th className="w-24 py-2 pr-2">Rate ₹</th>
                      <th className="w-24 py-2 pr-2">Disc ₹</th>
                      <th className="w-20 py-2 pr-2">GST</th>
                      <th className="w-24 py-2 pr-2 text-right">Amount</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, idx) => {
                      const t = computeLine(billLines[idx]);
                      return (
                        <tr key={l.key} className="border-b border-slate-100 last:border-0">
                          <td className="max-w-[220px] py-2 pr-2">
                            <p className="truncate font-medium">{l.description}</p>
                            {l.item_type === "package" && (
                              <p className="text-[11px] text-slate-400">Package</p>
                            )}
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              className={`${inputCls} px-2 py-1`}
                              value={l.qty}
                              inputMode="numeric"
                              onChange={(e) => patchLine(l.key, { qty: e.target.value })}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              className={`${inputCls} px-2 py-1`}
                              value={l.rate}
                              inputMode="decimal"
                              onChange={(e) => patchLine(l.key, { rate: e.target.value })}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              className={`${inputCls} px-2 py-1`}
                              value={l.discount}
                              inputMode="decimal"
                              placeholder="0"
                              onChange={(e) =>
                                patchLine(l.key, { discount: e.target.value })
                              }
                            />
                          </td>
                          <td className="num py-2 pr-2 text-slate-500">
                            {l.gst_rate_bp / 100}%
                          </td>
                          <td className="num py-2 pr-2 text-right font-medium">
                            {formatINR(t.taxable + t.tax)}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => removeLine(l.key)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Remove"
                            >
                              <Icon name="x" className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-2 p-4">
            <h2 className="mb-3 text-sm font-semibold">Bill summary</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatINR(totals.subtotal)} />
              {totals.discount > 0 && (
                <Row label="Discount" value={`− ${formatINR(totals.discount)}`} />
              )}
              <Row label="Taxable value" value={formatINR(totals.taxable)} />
              <Row label="CGST" value={formatINR(totals.cgst)} />
              <Row label="SGST" value={formatINR(totals.sgst)} />
              {totals.roundOff !== 0 && (
                <Row label="Round off" value={formatINR(totals.roundOff)} />
              )}
              <div className="!mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-medium text-slate-600">Total</span>
                <span className="num text-xl font-bold">{formatINR(totals.total)}</span>
              </div>
            </dl>

            <div className="mt-4 space-y-3">
              <Labeled label="Payment mode">
                <Select
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value as PaymentMode);
                    setPaymentTouched(false);
                  }}
                >
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Labeled>
              {mode !== "credit" && (
                <Labeled label="Amount received (₹)">
                  <TextInput
                    value={paymentText}
                    inputMode="decimal"
                    onChange={(e) => {
                      setPaymentTouched(true);
                      setPaymentText(e.target.value);
                    }}
                  />
                </Labeled>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Balance (due)</span>
                <span
                  className={`num font-semibold ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {formatINR(balance)}
                </span>
              </div>
              <Labeled label="Notes">
                <TextInput
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </Labeled>

              <ErrorNote message={error} />

              <Btn
                variant="primary"
                className="w-full !py-2.5"
                onClick={() => void submit()}
                disabled={busy}
              >
                <Icon name="check" className="h-4 w-4" />
                {busy ? "Saving…" : "Save & print invoice"}
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick add patient */}
      <Modal
        open={newPatientOpen}
        title="New patient"
        onClose={() => setNewPatientOpen(false)}
      >
        <form onSubmit={saveNewPatient} className="space-y-3">
          <Labeled label="Full name *">
            <TextInput
              value={newPatient.name}
              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
              autoFocus
            />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Phone">
              <TextInput
                value={newPatient.phone}
                inputMode="numeric"
                maxLength={10}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
              />
            </Labeled>
            <Labeled label="Age">
              <TextInput
                value={newPatient.age}
                inputMode="numeric"
                onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
              />
            </Labeled>
          </div>
          <Labeled label="Gender">
            <Select
              value={newPatient.gender}
              onChange={(e) =>
                setNewPatient({
                  ...newPatient,
                  gender: e.target.value as typeof newPatient.gender,
                })
              }
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Labeled>
          <ErrorNote message={newPatientError} />
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setNewPatientOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary">
              Save patient
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="num text-slate-700">{value}</dd>
    </div>
  );
}
