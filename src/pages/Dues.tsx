import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDb } from "../db";
import { useMonitor } from "../app/MonitorContext";
import { formatDate, formatINR, startOfDay } from "../db/helpers";
import { tenantAnd } from "../db/tenant";
import type { InvoiceRow } from "../db/types";
import { Btn, Card, EmptyState, Icon, PageHeader, TextInput } from "../ui/kit";

interface DueRow extends InvoiceRow {
  paid_paise: number;
}

const DAY = 24 * 60 * 60 * 1000;

export default function Dues() {
  const [rows, setRows] = useState<DueRow[]>([]);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const { monitor } = useMonitor();

  useEffect(() => {
    void (async () => {
      const db = await getDb();
      const [, tenantParams] = tenantAnd();
      setRows(
        await db.all<DueRow>(
          `SELECT i.*,
             COALESCE((SELECT SUM(p.amount_paise) FROM payments p
                       WHERE p.invoice_id = i.id AND p.deleted = 0 AND p.tenant_id = i.tenant_id), 0) AS paid_paise
           FROM invoices i
           WHERE i.deleted = 0 AND i.status IN ('unpaid', 'partial') AND i.tenant_id = ?
           ORDER BY i.invoice_date ASC`,
          tenantParams
        )
      );
      setLoaded(true);
    })();
  }, []);

  const today = startOfDay(Date.now());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.invoice_no.toLowerCase().includes(q) ||
        r.patient_name.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const totalDue = rows.reduce(
    (s, r) => s + Math.max(0, r.total_paise - r.paid_paise),
    0
  );

  return (
    <>
      <PageHeader
        title="Dues"
        subtitle={`${rows.length} unpaid invoice${rows.length === 1 ? "" : "s"} · ${formatINR(totalDue)} outstanding`}
        actions={
          !monitor && (
            <Link to="/billing">
              <Btn variant="primary">
                <Icon name="plus" className="h-4 w-4" /> New bill
              </Btn>
            </Link>
          )
        }
      />

      <Card>
        <div className="border-b border-slate-200 p-3">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice no. or patient…"
            className="max-w-xs"
          />
        </div>

        {!loaded ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            message={rows.length === 0 ? "Nothing outstanding" : "No match"}
            hint={
              rows.length === 0
                ? "Every invoice is fully paid. Dues will appear here as they build up."
                : "Try a different invoice number or patient name."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Invoice</th>
                  <th className="px-4 py-2.5">Patient</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Billed on</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                  <th className="hidden px-4 py-2.5 text-right md:table-cell">Age</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const balance = Math.max(0, r.total_paise - r.paid_paise);
                  const days = Math.max(
                    0,
                    Math.floor((today - startOfDay(r.invoice_date)) / DAY)
                  );
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
                      <td className="num px-4 py-2.5 text-right font-semibold text-rose-600">
                        {formatINR(balance)}
                      </td>
                      <td className="hidden px-4 py-2.5 text-right md:table-cell">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            days >= 30
                              ? "bg-rose-50 text-rose-600"
                              : days >= 7
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {days} day{days === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link to={`/invoices/${r.id}`}>
                          <Btn variant="ghost">{monitor ? "View" : "Collect"}</Btn>
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
