import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMonitor } from "../app/MonitorContext";
import { getDb } from "../db";
import { formatDate, formatDateTime, formatINR, rupeesToPaise } from "../db/helpers";
import { addPayment, cancelInvoice, type PaymentMode } from "../db/invoicing";
import { printA4, printThermal } from "../db/print";
import { getSettings } from "../db/settings";
import { tenantAnd } from "../db/tenant";
import type {
  DoctorRow,
  InvoiceItemRow,
  InvoiceRow,
  PatientRow,
  PaymentRow,
} from "../db/types";
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
} from "../ui/kit";
import { StatusPill } from "./Invoices";

const MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank transfer" },
];

export default function InvoiceView() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { monitor } = useMonitor();

  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [doctor, setDoctor] = useState<DoctorRow | null>(null);
  const [lab, setLab] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("cash");
  const [payError, setPayError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    const inv = await db.get<InvoiceRow>(
      `SELECT * FROM invoices WHERE id = ? ${tenantClause}`,
      [id, ...tenantParams]
    );
    if (!inv) {
      setLoaded(true);
      return;
    }
    setInvoice(inv);
    setItems(
      await db.all<InvoiceItemRow>(
        `SELECT * FROM invoice_items WHERE invoice_id = ? AND deleted = 0 ${tenantClause} ORDER BY line_no`,
        [id, ...tenantParams]
      )
    );
    setPayments(
      await db.all<PaymentRow>(
        `SELECT * FROM payments WHERE invoice_id = ? AND deleted = 0 ${tenantClause} ORDER BY paid_at`,
        [id, ...tenantParams]
      )
    );
    setPatient(
      (await db.get<PatientRow>(
        `SELECT * FROM patients WHERE id = ? ${tenantClause}`,
        [inv.patient_id, ...tenantParams]
      )) ?? null
    );
    if (inv.doctor_id) {
      setDoctor(
        (await db.get<DoctorRow>(
          `SELECT * FROM doctors WHERE id = ? ${tenantClause}`,
          [inv.doctor_id, ...tenantParams]
        )) ?? null
      );
    }
    setLab(
      await getSettings(db, [
        "lab_name",
        "lab_address",
        "lab_phone",
        "lab_gstin",
        "logo_data",
      ])
    );
    setLoaded(true);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (loaded && invoice && params.get("print") === "1") {
      const t = setTimeout(() => printA4(), 400);
      return () => clearTimeout(t);
    }
  }, [loaded, invoice, params]);

  const paid = payments.reduce((s, p) => s + p.amount_paise, 0);
  const balance = invoice ? Math.max(0, invoice.total_paise - paid) : 0;

  const openPayment = () => {
    setPayAmount((balance / 100).toFixed(2));
    setPayMode("cash");
    setPayError("");
    setPayOpen(true);
  };

  const submitPayment = async () => {
    if (!invoice) return;
    setBusy(true);
    setPayError("");
    try {
      const db = await getDb();
      await addPayment(
        db,
        invoice.id,
        rupeesToPaise(Number(payAmount) || 0),
        payMode,
        "",
        user?.id ?? ""
      );
      setPayOpen(false);
      await load();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    const reason = window.prompt(
      "Cancellation reason (invoice stays in the books, marked cancelled):"
    );
    if (!reason || !reason.trim()) return;
    if (!window.confirm(`Cancel invoice ${invoice.invoice_no}?`)) return;
    try {
      const db = await getDb();
      await cancelInvoice(db, invoice.id, reason, user?.id ?? "");
      await load();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not cancel");
    }
  };

  if (!loaded) {
    return (
      <>
        <PageHeader title="Invoice" />
        <Card className="p-10 text-center text-sm text-slate-400">Loading…</Card>
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        <PageHeader title="Invoice not found" />
        <Link to="/invoices">
          <Btn>
            <Icon name="arrowLeft" className="h-4 w-4" /> Back to invoices
          </Btn>
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`Invoice ${invoice.invoice_no}`}
          subtitle={`${invoice.patient_name} · ${formatDate(invoice.invoice_date)}`}
          actions={
            <>
              <Link to="/invoices">
                <Btn>
                  <Icon name="arrowLeft" className="h-4 w-4" /> Back
                </Btn>
              </Link>
              <Btn onClick={printA4}>
                <Icon name="printer" className="h-4 w-4" /> Print A4
              </Btn>
              <Btn onClick={printThermal} title="Print a receipt on an 80mm thermal roll">
                <Icon name="printer" className="h-4 w-4" /> Thermal 80mm
              </Btn>
              {!monitor && invoice.status !== "cancelled" && balance > 0 && (
                <Btn variant="primary" onClick={openPayment}>
                  <Icon name="rupee" className="h-4 w-4" /> Collect payment
                </Btn>
              )}
              {!monitor && invoice.status !== "cancelled" && user?.role === "admin" && (
                <Btn variant="danger" onClick={() => void handleCancel()}>
                  Cancel invoice
                </Btn>
              )}
            </>
          }
        />
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <StatusPill status={invoice.status} />
          <span className="text-slate-500">
            Paid {formatINR(paid)} of {formatINR(invoice.total_paise)}
          </span>
          {invoice.status === "cancelled" && invoice.cancel_reason && (
            <span className="text-rose-600">
              Reason: {invoice.cancel_reason}
            </span>
          )}
        </div>
        <ErrorNote message={payError} />
      </div>

      {/* Printable invoice */}
      <div className="print-area mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-4">
          <div className="flex items-start gap-3">
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
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-700">
              Tax Invoice
            </p>
            <p className="num mt-1 text-sm font-semibold">{invoice.invoice_no}</p>
            <p className="mt-0.5 text-xs text-slate-600">
              {formatDate(invoice.invoice_date)}
            </p>
            {invoice.status === "cancelled" && (
              <p className="mt-1 text-xs font-bold uppercase text-rose-600">
                Cancelled
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 text-xs">
          <div>
            <p className="font-semibold text-slate-500">Billed to</p>
            <p className="mt-0.5 text-sm font-semibold">{invoice.patient_name}</p>
            {patient?.phone && <p className="text-slate-600">{patient.phone}</p>}
            {patient?.age != null && (
              <p className="text-slate-600">
                {patient.age} years{patient.gender ? ` · ${patient.gender}` : ""}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-500">Referred by</p>
            <p className="mt-0.5 text-sm">
              {doctor ? `Dr. ${doctor.name}` : "Self / walk-in"}
            </p>
            {doctor?.reg_no && (
              <p className="text-slate-600">Reg. {doctor.reg_no}</p>
            )}
          </div>
        </div>

        <table className="w-full border-t border-slate-300 text-xs">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <th className="py-1.5 pr-2">#</th>
              <th className="py-1.5 pr-2">Description</th>
              <th className="py-1.5 pr-2 text-right">Qty</th>
              <th className="py-1.5 pr-2 text-right">Rate</th>
              <th className="py-1.5 pr-2 text-right">Taxable</th>
              <th className="py-1.5 pr-2 text-right">GST%</th>
              <th className="py-1.5 pr-2 text-right">CGST</th>
              <th className="py-1.5 pr-2 text-right">SGST</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="num py-1.5 pr-2 text-slate-500">{i + 1}</td>
                <td className="py-1.5 pr-2">
                  {it.description}
                  {it.item_type === "package" && (
                    <span className="ml-1 text-[10px] text-slate-400">(package)</span>
                  )}
                </td>
                <td className="num py-1.5 pr-2 text-right">{it.qty}</td>
                <td className="num py-1.5 pr-2 text-right">
                  {formatINR(it.unit_price_paise)}
                </td>
                <td className="num py-1.5 pr-2 text-right">
                  {formatINR(it.taxable_paise)}
                </td>
                <td className="num py-1.5 pr-2 text-right">
                  {it.gst_rate_bp / 100}%
                </td>
                <td className="num py-1.5 pr-2 text-right">{formatINR(it.cgst_paise)}</td>
                <td className="num py-1.5 pr-2 text-right">{formatINR(it.sgst_paise)}</td>
                <td className="num py-1.5 text-right font-medium">
                  {formatINR(it.taxable_paise + it.cgst_paise + it.sgst_paise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <dl className="w-64 space-y-1 text-xs">
            <SummaryRow label="Subtotal" value={formatINR(invoice.subtotal_paise)} />
            {invoice.discount_paise > 0 && (
              <SummaryRow
                label="Discount"
                value={`− ${formatINR(invoice.discount_paise)}`}
              />
            )}
            <SummaryRow label="Taxable value" value={formatINR(invoice.taxable_paise)} />
            <SummaryRow label="CGST" value={formatINR(invoice.cgst_paise)} />
            <SummaryRow label="SGST" value={formatINR(invoice.sgst_paise)} />
            {invoice.round_off_paise !== 0 && (
              <SummaryRow
                label="Round off"
                value={formatINR(invoice.round_off_paise)}
              />
            )}
            <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold">
              <dt>Total</dt>
              <dd className="num">{formatINR(invoice.total_paise)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Paid</dt>
              <dd className="num">{formatINR(paid)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Balance due</dt>
              <dd className={`num ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatINR(balance)}
              </dd>
            </div>
          </dl>
        </div>

        {invoice.notes && (
          <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-600">
            Note: {invoice.notes}
          </p>
        )}

        <div className="thermal-hide mt-8 flex items-end justify-between text-[10px] text-slate-500">
          <p>
            Payment mode:{" "}
            {payments.length === 0
              ? invoice.status === "cancelled"
                ? "—"
                : "Credit"
              : payments.map((p) => `${p.mode} ${formatINR(p.amount_paise)}`).join(", ")}
          </p>
          <div className="text-right">
            <p className="mb-8">For {lab.lab_name || "Diagnostic Centre"}</p>
            <p className="border-t border-slate-400 pt-1">Authorised signatory</p>
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <Card className="no-print mt-4 p-4">
          <h2 className="mb-2 text-sm font-semibold">Payments received</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="capitalize text-slate-600">
                  {p.mode} · {formatDateTime(p.paid_at)}
                </span>
                <span className="num font-medium">{formatINR(p.amount_paise)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={payOpen} title="Collect payment" onClose={() => setPayOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Outstanding balance: <b>{formatINR(balance)}</b>
          </p>
          <Labeled label="Amount received (₹)">
            <TextInput
              value={payAmount}
              inputMode="decimal"
              autoFocus
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </Labeled>
          <Labeled label="Mode">
            <Select
              value={payMode}
              onChange={(e) => setPayMode(e.target.value as PaymentMode)}
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Labeled>
          <ErrorNote message={payError} />
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setPayOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => void submitPayment()} disabled={busy}>
              {busy ? "Saving…" : `Receive ${payAmount ? `₹${payAmount}` : ""}`}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
