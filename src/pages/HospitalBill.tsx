// Generic hospital/IPD service billing for one admission.
// Services are hospital-defined (room, nursing, procedure, consumable, etc.),
// with GST and payments. This is intentionally independent of diagnostic tests.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { formatDateTime, formatINR, getDeviceId, now, uuid } from "../db/helpers";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import { getSettings } from "../db/settings";
import { printA4 } from "../db/print";
import type {
  HospitalBillPaymentRow,
  HospitalChargeRow,
  HospitalServiceRow,
} from "../db/types";
import {
  Btn,
  ErrorNote,
  Icon,
  Labeled,
  Modal,
  Select,
  TextInput,
} from "../ui/kit";

export default function HospitalBill({
  admission,
  readOnly,
  onClose,
}: {
  admission: {
    id: string;
    admission_no: string;
    patient_id: string;
    patient_name: string;
    status: string;
  };
  readOnly: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [services, setServices] = useState<HospitalServiceRow[]>([]);
  const [charges, setCharges] = useState<HospitalChargeRow[]>([]);
  const [payments, setPayments] = useState<HospitalBillPaymentRow[]>([]);
  const [lab, setLab] = useState<Record<string, string>>({});
  const [serviceId, setServiceId] = useState("");
  const [qty, setQty] = useState("1");
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<"cash" | "upi" | "card" | "bank">("cash");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newServiceOpen, setNewServiceOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    code: "",
    name: "",
    category: "Room",
    price: "",
    gst: "0",
    sac: "9993",
  });

  const load = async () => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    setServices(
      await db.all<HospitalServiceRow>(
        `SELECT * FROM hospital_services WHERE deleted = 0 AND is_active = 1 ${tenantClause}
         ORDER BY category, name`,
        tenantParams
      )
    );
    setCharges(
      await db.all<HospitalChargeRow>(
        `SELECT * FROM hospital_charges WHERE admission_id = ? AND deleted = 0 ${tenantClause}
         ORDER BY charged_at`,
        [admission.id, ...tenantParams]
      )
    );
    setPayments(
      await db.all<HospitalBillPaymentRow>(
        `SELECT * FROM hospital_bill_payments WHERE admission_id = ? AND deleted = 0 ${tenantClause}
         ORDER BY paid_at`,
        [admission.id, ...tenantParams]
      )
    );
    setLab(await getSettings(db, ["lab_name", "lab_address", "lab_phone", "logo_data"]));
  };

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load hospital bill")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admission.id]);

  const totals = useMemo(() => {
    const subtotal = charges.reduce((s, c) => s + c.taxable_paise, 0);
    const cgst = charges.reduce((s, c) => s + c.cgst_paise, 0);
    const sgst = charges.reduce((s, c) => s + c.sgst_paise, 0);
    const total = charges.reduce((s, c) => s + c.amount_paise + c.cgst_paise + c.sgst_paise, 0);
    const paid = payments.reduce((s, p) => s + p.amount_paise, 0);
    return { subtotal, cgst, sgst, total, paid, balance: total - paid };
  }, [charges, payments]);

  const addCharge = async () => {
    if (!user || readOnly) return;
    const service = services.find((s) => s.id === serviceId);
    if (!service) return setError("Select a hospital service");
    const quantity = Math.max(1, Math.floor(Number(qty) || 0));
    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const ts = now();
      const gross = service.price_paise * quantity;
      const tax = Math.round((gross * service.gst_rate_bp) / 10000);
      const cgst = Math.floor(tax / 2);
      const sgst = tax - cgst;
      const id = uuid();
      await db.tx(async () => {
        await db.run(
          `INSERT INTO hospital_charges
             (id, admission_id, patient_id, service_id, description, qty,
              unit_price_paise, gst_rate_bp, amount_paise, taxable_paise,
              cgst_paise, sgst_paise, charged_at, created_by, created_at,
              updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
          [
            id,
            admission.id,
            admission.patient_id,
            service.id,
            service.name,
            quantity,
            service.price_paise,
            service.gst_rate_bp,
            gross,
            gross,
            cgst,
            sgst,
            ts,
            user.id,
            ts,
            ts,
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
        await writeAudit(db, {
          userId: user.id,
          action: "hospital.charge",
          entity: "admission",
          entityId: admission.id,
          detail: `${service.name} × ${quantity} · ₹${((gross + tax) / 100).toFixed(2)}`,
        });
      });
      setServiceId("");
      setQty("1");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add charge");
    } finally {
      setBusy(false);
    }
  };

  const addService = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!serviceForm.name.trim()) return setError("Service name is required");
    const price = Number(serviceForm.price || 0);
    if (!Number.isFinite(price) || price < 0) return setError("Invalid service price");
    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const ts = now();
      await db.run(
        `INSERT INTO hospital_services
           (id, code, name, category, price_paise, gst_rate_bp, sac_code, is_active,
            created_at, updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,1,0,?)`,
        [
          uuid(),
          serviceForm.code.trim().toUpperCase(),
          serviceForm.name.trim(),
          serviceForm.category,
          Math.round(price * 100),
          Math.round(Number(serviceForm.gst || 0) * 100),
          serviceForm.sac.trim(),
          ts,
          ts,
          getDeviceId(),
          getCurrentTenantId(),
        ]
      );
      setNewServiceOpen(false);
      setServiceForm({ code: "", name: "", category: "Room", price: "", gst: "0", sac: "9993" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add service");
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async () => {
    if (!user || readOnly) return;
    const amount = Math.round(Number(payAmount || 0) * 100);
    if (amount <= 0) return setError("Payment amount must be positive");
    if (amount > totals.balance) return setError("Payment exceeds the outstanding balance");
    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const ts = now();
      await db.tx(async () => {
        await db.run(
          `INSERT INTO hospital_bill_payments
             (id, admission_id, amount_paise, mode, paid_at, note, created_by,
              created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,'',?,?,?,?,1,0,?)`,
          [
            uuid(),
            admission.id,
            amount,
            payMode,
            ts,
            user.id,
            ts,
            ts,
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
        await writeAudit(db, {
          userId: user.id,
          action: "hospital.payment",
          entity: "admission",
          entityId: admission.id,
          detail: `${payMode} · ₹${(amount / 100).toFixed(2)}`,
        });
      });
      setPayAmount("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={`Hospital bill — ${admission.admission_no}`} onClose={onClose} wide>
      <div className="space-y-4">
        {!readOnly && (
          <div className="no-print grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_100px_auto]">
            <Labeled label="Add hospital service">
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Select service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.category} · {s.name} · {formatINR(s.price_paise)}
                  </option>
                ))}
              </Select>
            </Labeled>
            <Labeled label="Qty">
              <TextInput value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
            </Labeled>
            <div className="flex items-end gap-2">
              <Btn variant="primary" onClick={() => void addCharge()} disabled={busy || !serviceId}>
                Add charge
              </Btn>
              <Btn variant="ghost" onClick={() => setNewServiceOpen(true)}>New service</Btn>
            </div>
          </div>
        )}

        {newServiceOpen && (
          <form onSubmit={addService} className="no-print grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
            <Labeled label="Service name *"><TextInput value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} autoFocus /></Labeled>
            <Labeled label="Category"><TextInput value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} placeholder="Room / Nursing / Procedure" /></Labeled>
            <Labeled label="Price (₹) *"><TextInput value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} inputMode="decimal" /></Labeled>
            <Labeled label="GST %"><Select value={serviceForm.gst} onChange={(e) => setServiceForm({ ...serviceForm, gst: e.target.value })}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option></Select></Labeled>
            <Labeled label="Code"><TextInput value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })} /></Labeled>
            <Labeled label="SAC"><TextInput value={serviceForm.sac} onChange={(e) => setServiceForm({ ...serviceForm, sac: e.target.value })} /></Labeled>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Btn onClick={() => setNewServiceOpen(false)}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={busy}>Add service</Btn>
            </div>
          </form>
        )}

        <div className="print-area rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between border-b border-slate-300 pb-3 text-xs">
            <div className="flex gap-2">
              {lab.logo_data && <img src={lab.logo_data} alt="" className="max-h-12 max-w-20 object-contain" />}
              <div>
                <p className="text-base font-bold uppercase">{lab.lab_name || "Hospital"}</p>
                {lab.lab_address && <p className="whitespace-pre-line text-slate-500">{lab.lab_address}</p>}
                {lab.lab_phone && <p className="text-slate-500">{lab.lab_phone}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold uppercase">Hospital service bill</p>
              <p className="num">{admission.admission_no}</p>
              <p>{admission.patient_name}</p>
            </div>
          </div>
          <table className="mt-3 w-full text-xs">
            <thead><tr className="border-b border-slate-200 text-left text-[10px] uppercase text-slate-500"><th className="py-1">Service</th><th className="py-1 text-right">Qty</th><th className="py-1 text-right">Rate</th><th className="py-1 text-right">GST</th><th className="py-1 text-right">Amount</th></tr></thead>
            <tbody>
              {charges.length === 0 ? <tr><td colSpan={5} className="py-5 text-center text-slate-400">No charges added.</td></tr> : charges.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-1">{c.description}</td>
                  <td className="num py-1 text-right">{c.qty}</td>
                  <td className="num py-1 text-right">{formatINR(c.unit_price_paise)}</td>
                  <td className="num py-1 text-right">{c.gst_rate_bp / 100}%</td>
                  <td className="num py-1 text-right">{formatINR(c.amount_paise + c.cgst_paise + c.sgst_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto mt-3 w-56 space-y-1 text-xs">
            <div className="flex justify-between"><span>Taxable</span><span className="num">{formatINR(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>CGST</span><span className="num">{formatINR(totals.cgst)}</span></div>
            <div className="flex justify-between"><span>SGST</span><span className="num">{formatINR(totals.sgst)}</span></div>
            <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span className="num">{formatINR(totals.total)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span className="num">{formatINR(totals.paid)}</span></div>
            <div className="flex justify-between font-semibold"><span>Balance</span><span className="num">{formatINR(totals.balance)}</span></div>
          </div>
          {payments.length > 0 && <p className="mt-2 text-[10px] text-slate-500">{payments.length} payment(s) · last {formatDateTime(payments[payments.length - 1].paid_at)}</p>}
        </div>

        {!readOnly && (
          <div className="no-print flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
            <Labeled label="Payment (₹)"><TextInput value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal" className="w-32" /></Labeled>
            <Labeled label="Mode"><Select value={payMode} onChange={(e) => setPayMode(e.target.value as typeof payMode)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank">Bank</option></Select></Labeled>
            <Btn variant="primary" onClick={() => void recordPayment()} disabled={busy || totals.balance <= 0}>Record payment</Btn>
            <Btn onClick={printA4}><Icon name="printer" className="h-4 w-4" /> Print bill</Btn>
          </div>
        )}

        <ErrorNote message={error} />
        <div className="no-print flex justify-between gap-2">
          {readOnly && (
            <Btn onClick={printA4}><Icon name="printer" className="h-4 w-4" /> Print bill</Btn>
          )}
          <div className="ml-auto"><Btn onClick={onClose}>Close</Btn></div>
        </div>
      </div>
    </Modal>
  );
}
