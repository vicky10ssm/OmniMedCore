// Pharmacy: medicine master, batch/expiry stock, dispensing and receipts.
// This is intentionally lightweight, but stock movements and sales are transactional.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { useMonitor } from "../app/MonitorContext";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { formatDate, formatDateTime, formatINR, getDeviceId, now, uuid } from "../db/helpers";
import { allocateDocumentNo } from "../db/invoiceNo";
import { getCurrentTenantId, tenantAnd, tenantAndOn } from "../db/tenant";
import { getSettings } from "../db/settings";
import { printA4, printThermal } from "../db/print";
import type {
  MedicineRow,
  PatientRow,
  PharmacyBatchRow,
  PharmacySaleItemRow,
  PharmacySaleRow,
} from "../db/types";
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

interface InventoryRow extends MedicineRow {
  stock: number;
  batch_count: number;
  nearest_expiry: string | null;
}

interface BatchOption extends PharmacyBatchRow {
  medicine_name: string;
  form: string;
  strength: string;
  sale_price_paise: number;
  mrp_paise: number;
  gst_rate_bp: number;
  hsn_code: string;
}

interface SaleLine {
  batch_id: string;
  medicine_id: string;
  description: string;
  batch_no: string;
  expiry_date: string;
  available: number;
  qty: string;
  unit_price: string;
  gst: number;
  hsn: string;
}

type Tab = "sale" | "inventory" | "sales";

export default function Pharmacy() {
  const { user } = useAuth();
  const { monitor } = useMonitor();
  const [tab, setTab] = useState<Tab>(monitor ? "inventory" : "sale");
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [sales, setSales] = useState<PharmacySaleRow[]>([]);
  const [stockQuery, setStockQuery] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [medicineOpen, setMedicineOpen] = useState(false);
  const [medicineForm, setMedicineForm] = useState({
    code: "",
    name: "",
    form: "Tablet",
    strength: "",
    manufacturer: "",
    hsn_code: "3004",
    gst: "12",
    mrp: "",
    price: "",
    reorder_level: "10",
  });
  const [medicineError, setMedicineError] = useState("");

  const [stockOpen, setStockOpen] = useState(false);
  const [stockForm, setStockForm] = useState({
    medicine_id: "",
    batch_no: "",
    expiry_date: "",
    quantity: "",
    purchase_price: "",
    supplier: "",
  });
  const [stockError, setStockError] = useState("");

  const [salePatient, setSalePatient] = useState("");
  const [saleMode, setSaleMode] = useState<"cash" | "upi" | "card" | "bank">("cash");
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [saleError, setSaleError] = useState("");
  const [lastSaleId, setLastSaleId] = useState("");

  const load = async () => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    const [tenantB, paramsB] = tenantAndOn("b");
    const [tenantM, paramsM] = tenantAndOn("m");
    const inventoryRows = await db.all<InventoryRow>(
      `SELECT m.*,
              COALESCE(SUM(CASE WHEN b.expiry_date >= date('now') THEN b.quantity ELSE 0 END), 0) AS stock,
              COUNT(CASE WHEN b.quantity > 0 THEN 1 END) AS batch_count,
              MIN(CASE WHEN b.quantity > 0 THEN b.expiry_date END) AS nearest_expiry
       FROM medicines m
       LEFT JOIN pharmacy_batches b ON b.medicine_id = m.id AND b.tenant_id = m.tenant_id
       WHERE m.deleted = 0 ${tenantM}
       GROUP BY m.id
       ORDER BY m.name`,
      [...paramsM]
    );
    setInventory(inventoryRows);
    setBatches(
      await db.all<BatchOption>(
        `SELECT b.*, m.name AS medicine_name, m.form, m.strength,
                m.sale_price_paise, m.mrp_paise, m.gst_rate_bp, m.hsn_code
         FROM pharmacy_batches b
         JOIN medicines m ON m.id = b.medicine_id AND m.tenant_id = b.tenant_id
         WHERE b.deleted = 0 AND b.quantity > 0 AND b.expiry_date >= date('now')
           ${tenantB} ${tenantM}
         ORDER BY m.name, b.expiry_date`,
        [...paramsB, ...paramsM]
      )
    );
    setPatients(
      await db.all<PatientRow>(
        `SELECT * FROM patients WHERE deleted = 0 ${tenantClause} ORDER BY name LIMIT 1000`,
        tenantParams
      )
    );
    setSales(
      await db.all<PharmacySaleRow>(
        `SELECT * FROM pharmacy_sales WHERE deleted = 0 ${tenantClause}
         ORDER BY sale_date DESC LIMIT 200`,
        tenantParams
      )
    );
    setLoaded(true);
  };

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load pharmacy data")
    );
  }, []);

  const filteredInventory = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    return inventory.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q)
    );
  }, [inventory, stockQuery]);

  const lowStock = inventory.filter((m) => m.stock <= m.reorder_level).length;
  const totalStock = inventory.reduce((sum, m) => sum + m.stock, 0);
  const todaySales = sales.filter(
    (s) => s.status === "paid" && new Date(s.sale_date).toDateString() === new Date().toDateString()
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    for (const line of saleLines) {
      const qty = Math.max(0, Number(line.qty) || 0);
      const amount = Math.round(qty * (Number(line.unit_price) || 0) * 100);
      const tax = Math.round((amount * line.gst) / 10000);
      subtotal += amount;
      cgst += Math.floor(tax / 2);
      sgst += tax - Math.floor(tax / 2);
    }
    const exact = subtotal + cgst + sgst;
    const rounded = Math.round(exact / 100) * 100;
    return { subtotal, cgst, sgst, exact, roundOff: rounded - exact, total: rounded };
  }, [saleLines]);

  const addSaleLine = () => {
    const batch = batches.find((b) => b.id === selectedBatch);
    if (!batch) return;
    setSaleError("");
    setSaleLines((current) => {
      const existing = current.find((l) => l.batch_id === batch.id);
      if (existing) {
        return current.map((l) =>
          l.batch_id === batch.id
            ? { ...l, qty: String(Math.min(batch.quantity, (Number(l.qty) || 0) + 1)) }
            : l
        );
      }
      return [
        ...current,
        {
          batch_id: batch.id,
          medicine_id: batch.medicine_id,
          description: `${batch.medicine_name}${batch.strength ? ` ${batch.strength}` : ""}`,
          batch_no: batch.batch_no,
          expiry_date: batch.expiry_date,
          available: batch.quantity,
          qty: "1",
          unit_price: (batch.sale_price_paise / 100).toFixed(2),
          gst: batch.gst_rate_bp,
          hsn: batch.hsn_code,
        },
      ];
    });
    setSelectedBatch("");
  };

  const updateLine = (batchId: string, patch: Partial<SaleLine>) => {
    setSaleLines((current) =>
      current.map((l) => (l.batch_id === batchId ? { ...l, ...patch } : l))
    );
  };

  const clearSale = () => {
    setSaleLines([]);
    setSalePatient("");
    setSaleMode("cash");
    setSaleError("");
    setLastSaleId("");
  };

  const saveSale = async () => {
    if (!user) return;
    if (saleLines.length === 0) return setSaleError("Add at least one medicine");
    for (const l of saleLines) {
      const qty = Math.ceil(Number(l.qty) || 0);
      if (qty <= 0) return setSaleError(`Invalid quantity for ${l.description}`);
      if (qty > l.available) return setSaleError(`Only ${l.available} available for ${l.description}`);
    }
    setBusy(true);
    setSaleError("");
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const tenantId = getCurrentTenantId();
      const saleId = uuid();
      const ts = now();
      const patient = patients.find((p) => p.id === salePatient);
      const { documentNo } = await allocateDocumentNo(db, "pharmacy_sale", "PH-", 5);

      await db.tx(async () => {
        await db.run(
          `INSERT INTO pharmacy_sales
             (id, bill_no, patient_id, patient_name, sale_date, subtotal_paise,
              discount_paise, taxable_paise, cgst_paise, sgst_paise, round_off_paise,
              total_paise, payment_mode, status, notes, created_by, created_at,
              updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,0,?,?,?,?,?,?,'paid','',?,?,?,?,1,0,?)`,
          [
            saleId,
            documentNo,
            patient?.id ?? "",
            patient?.name ?? "Walk-in",
            ts,
            totals.subtotal,
            totals.subtotal,
            totals.cgst,
            totals.sgst,
            totals.roundOff,
            totals.total,
            saleMode,
            user.id,
            ts,
            ts,
            getDeviceId(),
            tenantId,
          ]
        );
        for (const l of saleLines) {
          const qty = Math.ceil(Number(l.qty));
          const unit = Math.round((Number(l.unit_price) || 0) * 100);
          const amount = qty * unit;
          const tax = Math.round((amount * l.gst) / 10000);
          const cgst = Math.floor(tax / 2);
          const sgst = tax - cgst;
          await db.run(
            `INSERT INTO pharmacy_sale_items
               (id, sale_id, medicine_id, batch_id, description, batch_no, expiry_date,
                qty, unit_price_paise, gst_rate_bp, amount_paise, taxable_paise,
                cgst_paise, sgst_paise, created_at, updated_at, device_id, dirty,
                deleted, tenant_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
            [
              uuid(),
              saleId,
              l.medicine_id,
              l.batch_id,
              l.description,
              l.batch_no,
              l.expiry_date,
              qty,
              unit,
              l.gst,
              amount,
              amount,
              cgst,
              sgst,
              ts,
              ts,
              getDeviceId(),
              tenantId,
            ]
          );
          await db.run(
            `UPDATE pharmacy_batches
             SET quantity = quantity - ?, updated_at = ?, dirty = 1
             WHERE id = ? ${tenantClause}`,
            [qty, ts, l.batch_id, ...tenantParams]
          );
        }
        await writeAudit(db, {
          userId: user.id,
          action: "pharmacy.sale",
          entity: "pharmacy_sale",
          entityId: saleId,
          detail: `${documentNo} · ₹${(totals.total / 100).toFixed(2)}`,
        });
      });

      setLastSaleId(saleId);
      setSaleLines([]);
      setSalePatient("");
      await load();
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : "Could not save pharmacy bill");
    } finally {
      setBusy(false);
    }
  };

  const addMedicine = async (e: FormEvent) => {
    e.preventDefault();
    if (!medicineForm.name.trim()) return setMedicineError("Medicine name is required");
    const price = Number(medicineForm.price || 0);
    if (!Number.isFinite(price) || price < 0) return setMedicineError("Invalid selling price");
    setBusy(true);
    setMedicineError("");
    try {
      const db = await getDb();
      const ts = now();
      await db.run(
        `INSERT INTO medicines
           (id, code, name, form, strength, manufacturer, hsn_code, gst_rate_bp,
            mrp_paise, sale_price_paise, reorder_level, is_active, created_at,
            updated_at, device_id, dirty, deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,1,0,?)`,
        [
          uuid(),
          medicineForm.code.trim().toUpperCase(),
          medicineForm.name.trim(),
          medicineForm.form,
          medicineForm.strength.trim(),
          medicineForm.manufacturer.trim(),
          medicineForm.hsn_code.trim(),
          Math.round(Number(medicineForm.gst || 0) * 100),
          Math.round(Number(medicineForm.mrp || 0) * 100),
          Math.round(price * 100),
          Math.max(0, Number(medicineForm.reorder_level) || 0),
          ts,
          ts,
          getDeviceId(),
          getCurrentTenantId(),
        ]
      );
      setMedicineOpen(false);
      setMedicineForm({
        code: "",
        name: "",
        form: "Tablet",
        strength: "",
        manufacturer: "",
        hsn_code: "3004",
        gst: "12",
        mrp: "",
        price: "",
        reorder_level: "10",
      });
      await load();
    } catch (err) {
      setMedicineError(err instanceof Error ? err.message : "Could not add medicine");
    } finally {
      setBusy(false);
    }
  };

  const receiveStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!stockForm.medicine_id) return setStockError("Select a medicine");
    if (!stockForm.batch_no.trim()) return setStockError("Batch number is required");
    if (!stockForm.expiry_date) return setStockError("Expiry date is required");
    const qty = Math.ceil(Number(stockForm.quantity) || 0);
    if (qty <= 0) return setStockError("Quantity must be positive");
    setBusy(true);
    setStockError("");
    try {
      const db = await getDb();
      const ts = now();
      await db.run(
        `INSERT INTO pharmacy_batches
           (id, medicine_id, batch_no, expiry_date, quantity, purchase_price_paise,
            supplier, received_at, created_at, updated_at, device_id, dirty,
            deleted, tenant_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
        [
          uuid(),
          stockForm.medicine_id,
          stockForm.batch_no.trim(),
          stockForm.expiry_date,
          qty,
          Math.round(Number(stockForm.purchase_price || 0) * 100),
          stockForm.supplier.trim(),
          ts,
          ts,
          ts,
          getDeviceId(),
          getCurrentTenantId(),
        ]
      );
      await writeAudit(db, {
        userId: user?.id ?? "",
        action: "pharmacy.stock.receive",
        entity: "pharmacy_batch",
        entityId: stockForm.batch_no,
        detail: `Medicine ${stockForm.medicine_id} · qty ${qty}`,
      });
      setStockOpen(false);
      setStockForm({
        medicine_id: "",
        batch_no: "",
        expiry_date: "",
        quantity: "",
        purchase_price: "",
        supplier: "",
      });
      await load();
    } catch (err) {
      setStockError(err instanceof Error ? err.message : "Could not receive stock");
    } finally {
      setBusy(false);
    }
  };

  const cancelSale = async (sale: PharmacySaleRow) => {
    if (!user) return;
    if (!window.confirm(`Cancel pharmacy bill ${sale.bill_no} and return stock?`)) return;
    const reason = window.prompt("Cancellation reason:");
    if (!reason?.trim()) return;
    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const ts = now();
      const items = await db.all<PharmacySaleItemRow>(
        `SELECT * FROM pharmacy_sale_items WHERE sale_id = ? AND deleted = 0 ${tenantClause}`,
        [sale.id, ...tenantParams]
      );
      await db.tx(async () => {
        for (const item of items) {
          if (item.batch_id) {
            await db.run(
              `UPDATE pharmacy_batches SET quantity = quantity + ?, updated_at = ?, dirty = 1
               WHERE id = ? ${tenantClause}`,
              [item.qty, ts, item.batch_id, ...tenantParams]
            );
          }
        }
        await db.run(
          `UPDATE pharmacy_sales SET status = 'cancelled', notes = ?, updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [reason.trim(), ts, sale.id, ...tenantParams]
        );
        await writeAudit(db, {
          userId: user.id,
          action: "pharmacy.sale.cancel",
          entity: "pharmacy_sale",
          entityId: sale.id,
          detail: `${sale.bill_no} · ${reason.trim()}`,
        });
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel sale");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Pharmacy"
        subtitle={`${totalStock} units in stock · ${lowStock} low-stock items · today ${formatINR(todaySales.reduce((s, x) => s + x.total_paise, 0))} across ${todaySales.length} bills`}
        actions={
          !monitor && tab === "inventory" ? (
            <>
              <Btn onClick={() => setStockOpen(true)}>
                <Icon name="plus" className="h-4 w-4" /> Receive stock
              </Btn>
              <Btn variant="primary" onClick={() => setMedicineOpen(true)}>
                <Icon name="plus" className="h-4 w-4" /> New medicine
              </Btn>
            </>
          ) : undefined
        }
      />

      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <div className="mb-4 flex gap-1">
        {([
          ...(!monitor ? ([["sale", "New sale"]] as [Tab, string][]) : []),
          ["inventory", "Inventory"],
          ["sales", "Sales history"],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === value ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <Card className="p-10 text-center text-sm text-slate-400">Loading pharmacy…</Card>
      ) : tab === "sale" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Patient (optional)">
                <Select value={salePatient} onChange={(e) => setSalePatient(e.target.value)}>
                  <option value="">Walk-in / OTC</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</option>
                  ))}
                </Select>
              </Labeled>
              <Labeled label="Payment mode">
                <Select value={saleMode} onChange={(e) => setSaleMode(e.target.value as typeof saleMode)}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank transfer</option>
                </Select>
              </Labeled>
            </div>

            <div className="mt-4">
              <Labeled label="Add medicine batch">
                <div className="flex gap-2">
                  <Select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Select available batch…</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.medicine_name} · {b.batch_no} · exp {b.expiry_date} · {b.quantity} left
                      </option>
                    ))}
                  </Select>
                  <Btn onClick={addSaleLine} disabled={!selectedBatch}>Add</Btn>
                </div>
              </Labeled>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500">
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2">Batch / expiry</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Rate</th>
                    <th className="px-3 py-2">GST</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {saleLines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                        Add medicines from available batches.
                      </td>
                    </tr>
                  ) : (
                    saleLines.map((l) => (
                      <tr key={l.batch_id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{l.description}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {l.batch_no} · {l.expiry_date}
                        </td>
                        <td className="px-3 py-2">
                          <TextInput
                            value={l.qty}
                            onChange={(e) => updateLine(l.batch_id, { qty: e.target.value })}
                            inputMode="numeric"
                            className="w-20"
                          />
                          <span className="ml-1 text-[10px] text-slate-400">/ {l.available}</span>
                        </td>
                        <td className="px-3 py-2">
                          <TextInput
                            value={l.unit_price}
                            onChange={(e) => updateLine(l.batch_id, { unit_price: e.target.value })}
                            inputMode="decimal"
                            className="w-24"
                          />
                        </td>
                        <td className="num px-3 py-2 text-slate-500">{l.gst / 100}%</td>
                        <td className="num px-3 py-2 text-right font-medium">
                          {formatINR(
                            Math.round(
                              Math.max(0, Number(l.qty) || 0) *
                                Math.round((Number(l.unit_price) || 0) * 100)
                            )
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setSaleLines((current) => current.filter((x) => x.batch_id !== l.batch_id))}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="h-fit p-4">
            <h2 className="text-sm font-semibold">Pharmacy bill summary</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="num">{formatINR(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">CGST</dt><dd className="num">{formatINR(totals.cgst)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">SGST</dt><dd className="num">{formatINR(totals.sgst)}</dd></div>
              {totals.roundOff !== 0 && (
                <div className="flex justify-between"><dt className="text-slate-500">Round off</dt><dd className="num">{formatINR(totals.roundOff)}</dd></div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><dt>Total</dt><dd className="num">{formatINR(totals.total)}</dd></div>
            </dl>
            <ErrorNote message={saleError} />
            <div className="mt-4 flex gap-2">
              <Btn onClick={clearSale} className="flex-1">Clear</Btn>
              <Btn variant="primary" onClick={() => void saveSale()} disabled={busy} className="flex-[2]">
                {busy ? "Saving…" : "Complete sale"}
              </Btn>
            </div>
            {lastSaleId && (
              <Btn className="mt-2 w-full" onClick={() => { setLastSaleId(""); setTab("sales"); }}>
                View bill
              </Btn>
            )}
          </Card>
        </div>
      ) : tab === "inventory" ? (
        <Card>
          <div className="border-b border-slate-200 p-3">
            <TextInput
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="Search medicine, code or manufacturer…"
              className="max-w-sm"
            />
          </div>
          {filteredInventory.length === 0 ? (
            <EmptyState
              message="No medicines in the pharmacy catalogue"
              hint="Add a medicine, then receive its first stock batch."
              action={!monitor ? <Btn variant="primary" onClick={() => setMedicineOpen(true)}>New medicine</Btn> : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Medicine</th>
                    <th className="px-4 py-2.5">Form</th>
                    <th className="px-4 py-2.5 text-right">Sale price</th>
                    <th className="px-4 py-2.5 text-right">Stock</th>
                    <th className="px-4 py-2.5">Nearest expiry</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{m.name}</span>
                        <span className="block text-xs text-slate-400">
                          {m.code || "—"}{m.strength ? ` · ${m.strength}` : ""}{m.manufacturer ? ` · ${m.manufacturer}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{m.form}</td>
                      <td className="num px-4 py-2.5 text-right">{formatINR(m.sale_price_paise)}</td>
                      <td className="num px-4 py-2.5 text-right font-medium">{m.stock}</td>
                      <td className="px-4 py-2.5 text-slate-600">{m.nearest_expiry || "—"}</td>
                      <td className="px-4 py-2.5">
                        {m.stock <= m.reorder_level ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">Low stock</span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Available</span>
                        )}
                        {m.nearest_expiry && m.nearest_expiry <= new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10) && (
                          <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Expiry soon</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          {sales.length === 0 ? (
            <EmptyState message="No pharmacy bills yet" hint="Create the first sale from New sale." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Bill</th>
                    <th className="px-4 py-2.5">Patient</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Mode</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className="num px-4 py-2.5 font-medium">{s.bill_no}</td>
                      <td className="px-4 py-2.5">{s.patient_name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{formatDate(s.sale_date)}</td>
                      <td className="px-4 py-2.5 capitalize text-slate-600">{s.payment_mode}</td>
                      <td className="num px-4 py-2.5 text-right">{formatINR(s.total_paise)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Btn variant="ghost" onClick={() => setLastSaleId(s.id)}>Receipt</Btn>
                        {!monitor && s.status === "paid" && user?.role === "admin" && (
                          <Btn variant="ghost" onClick={() => void cancelSale(s)}>Cancel</Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal open={medicineOpen} title="New medicine" onClose={() => setMedicineOpen(false)} wide>
        <form onSubmit={addMedicine} className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Medicine name *" className="sm:col-span-2">
            <TextInput value={medicineForm.name} onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })} autoFocus placeholder="e.g. Paracetamol" />
          </Labeled>
          <Labeled label="Code"><TextInput value={medicineForm.code} onChange={(e) => setMedicineForm({ ...medicineForm, code: e.target.value })} placeholder="e.g. PARA500" /></Labeled>
          <Labeled label="Form"><TextInput value={medicineForm.form} onChange={(e) => setMedicineForm({ ...medicineForm, form: e.target.value })} placeholder="Tablet / Syrup / Injection" /></Labeled>
          <Labeled label="Strength"><TextInput value={medicineForm.strength} onChange={(e) => setMedicineForm({ ...medicineForm, strength: e.target.value })} placeholder="e.g. 500 mg" /></Labeled>
          <Labeled label="Manufacturer"><TextInput value={medicineForm.manufacturer} onChange={(e) => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })} /></Labeled>
          <Labeled label="HSN code"><TextInput value={medicineForm.hsn_code} onChange={(e) => setMedicineForm({ ...medicineForm, hsn_code: e.target.value })} /></Labeled>
          <Labeled label="GST %"><Select value={medicineForm.gst} onChange={(e) => setMedicineForm({ ...medicineForm, gst: e.target.value })}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option></Select></Labeled>
          <Labeled label="MRP (₹)"><TextInput value={medicineForm.mrp} onChange={(e) => setMedicineForm({ ...medicineForm, mrp: e.target.value })} inputMode="decimal" /></Labeled>
          <Labeled label="Selling price (₹) *"><TextInput value={medicineForm.price} onChange={(e) => setMedicineForm({ ...medicineForm, price: e.target.value })} inputMode="decimal" /></Labeled>
          <Labeled label="Reorder level"><TextInput value={medicineForm.reorder_level} onChange={(e) => setMedicineForm({ ...medicineForm, reorder_level: e.target.value })} inputMode="numeric" /></Labeled>
          <div className="sm:col-span-2"><ErrorNote message={medicineError} /></div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Btn onClick={() => setMedicineOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>Add medicine</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={stockOpen} title="Receive stock" onClose={() => setStockOpen(false)}>
        <form onSubmit={receiveStock} className="space-y-3">
          <Labeled label="Medicine *">
            <Select value={stockForm.medicine_id} onChange={(e) => setStockForm({ ...stockForm, medicine_id: e.target.value })}>
              <option value="">Select medicine…</option>
              {inventory.map((m) => <option key={m.id} value={m.id}>{m.name}{m.strength ? ` ${m.strength}` : ""}</option>)}
            </Select>
          </Labeled>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Batch number *"><TextInput value={stockForm.batch_no} onChange={(e) => setStockForm({ ...stockForm, batch_no: e.target.value })} /></Labeled>
            <Labeled label="Expiry date *"><TextInput type="date" value={stockForm.expiry_date} onChange={(e) => setStockForm({ ...stockForm, expiry_date: e.target.value })} /></Labeled>
            <Labeled label="Quantity *"><TextInput value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} inputMode="numeric" /></Labeled>
            <Labeled label="Purchase price (₹)"><TextInput value={stockForm.purchase_price} onChange={(e) => setStockForm({ ...stockForm, purchase_price: e.target.value })} inputMode="decimal" /></Labeled>
          </div>
          <Labeled label="Supplier"><TextInput value={stockForm.supplier} onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })} /></Labeled>
          <ErrorNote message={stockError} />
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setStockOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>Receive stock</Btn>
          </div>
        </form>
      </Modal>

      {lastSaleId && (
        <PharmacyReceipt
          saleId={lastSaleId}
          onClose={() => setLastSaleId("")}
        />
      )}
    </>
  );
}

function PharmacyReceipt({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const [sale, setSale] = useState<PharmacySaleRow | null>(null);
  const [items, setItems] = useState<PharmacySaleItemRow[]>([]);
  const [lab, setLab] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      setSale((await db.get<PharmacySaleRow>(
        `SELECT * FROM pharmacy_sales WHERE id = ? ${tenantClause}`,
        [saleId, ...tenantParams]
      )) ?? null);
      setItems(await db.all<PharmacySaleItemRow>(
        `SELECT * FROM pharmacy_sale_items WHERE sale_id = ? ${tenantClause} ORDER BY created_at`,
        [saleId, ...tenantParams]
      ));
      setLab(await getSettings(db, ["lab_name", "lab_address", "lab_phone", "logo_data"]));
    })();
  }, [saleId]);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/50 p-0 sm:p-6">
      <div className="mx-auto w-full max-w-xl">
        <div className="no-print flex items-center justify-between gap-2 rounded-t-xl bg-white px-4 py-2.5">
          <span className="text-sm font-medium">Pharmacy receipt</span>
          <div className="flex gap-2">
            <Btn onClick={onClose}>Close</Btn>
            <Btn onClick={printThermal}>Thermal 80mm</Btn>
            <Btn variant="primary" onClick={printA4}>Print A4</Btn>
          </div>
        </div>
        <div className="print-area bg-white p-6 shadow-xl sm:rounded-b-xl print:shadow-none">
          <div className="flex items-start justify-between border-b border-slate-300 pb-3">
            <div className="flex items-center gap-2">
              {lab.logo_data && <img src={lab.logo_data} alt="" className="max-h-12 max-w-20 object-contain" />}
              <div>
                <h1 className="text-base font-bold uppercase">{lab.lab_name || "Pharmacy"}</h1>
                {lab.lab_address && <p className="whitespace-pre-line text-[10px] text-slate-500">{lab.lab_address}</p>}
                {lab.lab_phone && <p className="text-[10px] text-slate-500">{lab.lab_phone}</p>}
              </div>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold uppercase">Pharmacy bill</p>
              <p className="num">{sale?.bill_no}</p>
              <p>{sale ? formatDateTime(sale.sale_date) : ""}</p>
            </div>
          </div>
          <p className="mt-2 text-xs"><b>Patient:</b> {sale?.patient_name || "Walk-in"}</p>
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-1">Medicine</th>
                <th className="py-1">Batch</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="py-1">{i.description}</td>
                  <td className="py-1">{i.batch_no}</td>
                  <td className="num py-1 text-right">{i.qty}</td>
                  <td className="num py-1 text-right">{formatINR(i.unit_price_paise)}</td>
                  <td className="num py-1 text-right">{formatINR(i.amount_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sale && (
            <div className="ml-auto mt-3 w-48 text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span className="num">{formatINR(sale.subtotal_paise)}</span></div>
              <div className="flex justify-between"><span>CGST</span><span className="num">{formatINR(sale.cgst_paise)}</span></div>
              <div className="flex justify-between"><span>SGST</span><span className="num">{formatINR(sale.sgst_paise)}</span></div>
              <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span className="num">{formatINR(sale.total_paise)}</span></div>
              <div className="mt-1 capitalize text-slate-500">Paid by {sale.payment_mode}</div>
            </div>
          )}
          <p className="mt-4 text-[10px] text-slate-500">Medicines once sold are not returnable without authorisation. Keep out of reach of children.</p>
        </div>
      </div>
    </div>
  );
}
