import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDb } from "../db";
import { useMonitor } from "../app/MonitorContext";
import { csvDate, csvRupees, exportCsv } from "../db/csv";
import { formatDate, formatINR } from "../db/helpers";
import { tenantAnd } from "../db/tenant";
import type { InvoiceRow } from "../db/types";
import { Btn, Card, EmptyState, Icon, PageHeader, Select, TextInput } from "../ui/kit";

interface PaymentLite {
  amount_paise: number;
  mode: string;
  paid_at: number;
  note: string;
}

interface InvoiceListRow extends InvoiceRow {
  paid_paise: number;
  /** Payments on this invoice — used by the payments export. */
  payments: PaymentLite[];
}

type Filter = "all" | "due" | "paid" | "cancelled";

/** Date-range presets for the export — GST returns are filed by month. */
type Period = "all" | "this-month" | "last-month" | "this-fy";

export default function Invoices() {
  const [rows, setRows] = useState<InvoiceListRow[]>([]);
  const { monitor } = useMonitor();
  const [filter, setFilter] = useState<Filter>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const invoices = await db.all<Omit<InvoiceListRow, "payments">>(
        `SELECT i.*,
           COALESCE((SELECT SUM(p.amount_paise) FROM payments p
                     WHERE p.invoice_id = i.id AND p.deleted = 0 AND p.tenant_id = i.tenant_id), 0) AS paid_paise
         FROM invoices i WHERE i.deleted = 0 AND i.tenant_id = ?
         ORDER BY i.invoice_date DESC LIMIT 300`,
        tenantParams
      );
      const payments = await db.all<PaymentLite & { invoice_id: string }>(
        `SELECT invoice_id, amount_paise, mode, paid_at, note FROM payments
         WHERE deleted = 0 ${tenantClause}`,
        tenantParams
      );
      const byInvoice = new Map<string, PaymentLite[]>();
      for (const p of payments) {
        const list = byInvoice.get(p.invoice_id) ?? [];
        list.push(p);
        byInvoice.set(p.invoice_id, list);
      }
      setRows(
        invoices.map((r) => ({
          ...r,
          payments: (byInvoice.get(r.id) ?? []).sort((a, b) => a.paid_at - b.paid_at),
        }))
      );
      setLoaded(true);
    })();
  }, []);

  /** Start timestamp for the chosen period. This FY runs Apr–Mar in India. */
  const periodStart = useMemo(() => {
    const d = new Date();
    if (period === "all") return 0;
    if (period === "this-month")
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    if (period === "last-month")
      return new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
    // Indian financial year: 1 April – 31 March.
    const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return new Date(fyStartYear, 3, 1).getTime();
  }, [period]);

  const periodEnd = useMemo(() => {
    const d = new Date();
    if (period === "last-month")
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    return Number.MAX_SAFE_INTEGER;
  }, [period]);

  const inPeriod = useMemo(
    () => rows.filter((r) => r.invoice_date >= periodStart && r.invoice_date < periodEnd),
    [rows, periodStart, periodEnd]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inPeriod.filter((r) => {
      const matchQ =
        !q ||
        r.invoice_no.toLowerCase().includes(q) ||
        r.patient_name.toLowerCase().includes(q);
      const matchF =
        filter === "all"
          ? true
          : filter === "cancelled"
            ? r.status === "cancelled"
            : filter === "paid"
              ? r.status === "paid"
              : r.status === "unpaid" || r.status === "partial";
      return matchQ && matchF;
    });
  }, [inPeriod, filter, query]);

  const exportInvoices = () => {
    exportCsv(
      `invoices-${period}.csv`,
      [
        "Invoice no", "Date", "Patient", "Status",
        "Subtotal", "Discount", "Taxable", "CGST", "SGST", "Round off",
        "Total", "Paid", "Balance", "Cancel reason",
      ],
      filtered.map((r) => [
        r.invoice_no,
        csvDate(r.invoice_date),
        r.patient_name,
        r.status,
        csvRupees(r.subtotal_paise),
        csvRupees(r.discount_paise),
        csvRupees(r.taxable_paise),
        csvRupees(r.cgst_paise),
        csvRupees(r.sgst_paise),
        csvRupees(r.round_off_paise),
        csvRupees(r.total_paise),
        csvRupees(r.paid_paise),
        csvRupees(Math.max(0, r.total_paise - r.paid_paise)),
        r.cancel_reason,
      ])
    );
  };

  /** One row per payment received — the cash-book view for reconciliation. */
  const exportPayments = () => {
    const out: unknown[][] = [];
    for (const r of filtered) {
      for (const p of r.payments) {
        out.push([
          csvDate(p.paid_at),
          r.invoice_no,
          r.patient_name,
          csvRupees(p.amount_paise),
          p.mode,
          p.note,
        ]);
      }
    }
    if (out.length === 0) {
      window.alert(
        filtered.length === 0
          ? "No invoices in the selected period."
          : "No payments recorded on these invoices yet."
      );
      return;
    }
    exportCsv(
      `payments-${period}.csv`,
      ["Date", "Invoice no", "Patient", "Amount", "Mode", "Note"],
      out
    );
  };

  const totals = useMemo(() => {
    const live = inPeriod.filter((r) => r.status !== "cancelled");
    return {
      billed: live.reduce((s, r) => s + r.total_paise, 0),
      collected: live.reduce((s, r) => s + r.paid_paise, 0),
      due: live.reduce((s, r) => s + Math.max(0, r.total_paise - r.paid_paise), 0),
    };
  }, [inPeriod]);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${formatINR(totals.collected)} collected · ${formatINR(totals.due)} outstanding`}
        actions={
          <>
            <Btn onClick={exportPayments} disabled={filtered.length === 0}>
              <Icon name="receipt" className="h-4 w-4" /> Payments CSV
            </Btn>
            <Btn onClick={exportInvoices} disabled={filtered.length === 0}>
              <Icon name="receipt" className="h-4 w-4" /> Invoices CSV
            </Btn>
            {!monitor && (
              <Link to="/billing">
                <Btn variant="primary">
                  <Icon name="plus" className="h-4 w-4" /> New bill
                </Btn>
              </Link>
            )}
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice no. or patient…"
            className="max-w-xs"
          />
          <div className="flex gap-1">
            {(
              [
                ["all", "All"],
                ["due", "Due"],
                ["paid", "Paid"],
                ["cancelled", "Cancelled"],
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
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="ml-auto max-w-[11rem]"
            aria-label="Period"
          >
            <option value="all">All dates</option>
            <option value="this-month">This month</option>
            <option value="last-month">Last month</option>
            <option value="this-fy">This financial year</option>
          </Select>
        </div>

        {!loaded ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              rows.length === 0
                ? "No invoices yet"
                : inPeriod.length === 0
                  ? "No invoices in this period"
                  : "No invoices match"
            }
            hint={
              monitor
                ? "Bills recorded at the centre appear here with their payment status."
                : "Bills you create appear here with their payment status."
            }
            action={
              !monitor &&
              rows.length === 0 && (
                <Link to="/billing">
                  <Btn variant="primary">
                    <Icon name="plus" className="h-4 w-4" /> Create first bill
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
                  <th className="px-4 py-2.5">Invoice</th>
                  <th className="px-4 py-2.5">Patient</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Date</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const balance = Math.max(0, r.total_paise - r.paid_paise);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="num px-4 py-2.5 font-medium">{r.invoice_no}</td>
                      <td className="px-4 py-2.5">{r.patient_name}</td>
                      <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">
                        {formatDate(r.invoice_date)}
                      </td>
                      <td className="num px-4 py-2.5 text-right">
                        {formatINR(r.total_paise)}
                      </td>
                      <td
                        className={`num px-4 py-2.5 text-right ${balance > 0 && r.status !== "cancelled" ? "font-medium text-rose-600" : "text-slate-400"}`}
                      >
                        {r.status === "cancelled" ? "—" : formatINR(balance)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link to={`/invoices/${r.id}`}>
                          <Btn variant="ghost">Open</Btn>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700",
    partial: "bg-amber-50 text-amber-700",
    unpaid: "bg-rose-50 text-rose-600",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tones[status] ?? tones.unpaid}`}
    >
      {status}
    </span>
  );
}
