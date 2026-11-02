import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDb } from "../db";
import { tenantAnd } from "../db/tenant";
import { useMonitor } from "../app/MonitorContext";
import { formatINR, formatDate, startOfDay, startOfMonth } from "../db/helpers";
import { Card, Icon, PageHeader } from "../ui/kit";

interface Stats {
  todayRevenue: number;
  todayInvoices: number;
  outstanding: number;
  monthRevenue: number;
  monthExpenses: number;
  pendingReports: number;
  newPatientsToday: number;
  pharmacyToday: number;
  pharmacyBillsToday: number;
  admittedPatients: number;
  hospitalBilledToday: number;
  hospitalCollectedToday: number;
  hospitalOutstanding: number;
}

interface RecentInvoice {
  id: string;
  invoice_no: string;
  invoice_date: number;
  patient_name: string;
  total_paise: number;
  status: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const { monitor } = useMonitor();

  useEffect(() => {
    void (async () => {
      const db = await getDb();
      const nowTs = Date.now();
      const today = startOfDay(nowTs);
      const month = startOfMonth(nowTs);
      const [tenantClause, tenantParams] = tenantAnd();

      const todayRow = await db.get<{ revenue: number; invoices: number }>(
        `SELECT COALESCE(SUM(total_paise),0) AS revenue, COUNT(*) AS invoices
         FROM invoices WHERE deleted=0 AND status<>'cancelled' AND invoice_date >= ? ${tenantClause}`,
        [today, ...tenantParams]
      );
      const billed = await db.get<{ v: number }>(
        `SELECT COALESCE(SUM(total_paise),0) AS v FROM invoices
         WHERE deleted=0 AND status<>'cancelled' ${tenantClause}`,
        tenantParams
      );
      const collected = await db.get<{ v: number }>(
        `SELECT COALESCE(SUM(p.amount_paise),0) AS v FROM payments p
         JOIN invoices i ON i.id = p.invoice_id
         WHERE p.deleted=0 AND i.deleted=0 AND i.status<>'cancelled'
           AND p.tenant_id = ? AND i.tenant_id = ?`,
        [...tenantParams, ...tenantParams]
      );
      const monthRevenue = await db.get<{ v: number }>(
        `SELECT COALESCE(SUM(total_paise),0) AS v FROM invoices
         WHERE deleted=0 AND status<>'cancelled' AND invoice_date >= ? ${tenantClause}`,
        [month, ...tenantParams]
      );
      const monthExpenses = await db.get<{ v: number }>(
        `SELECT COALESCE(SUM(amount_paise),0) AS v FROM expenses
         WHERE deleted=0 AND paid_at >= ? ${tenantClause}`,
        [month, ...tenantParams]
      );
      const pending = await db.get<{ v: number }>(
        `SELECT COUNT(*) AS v FROM report_orders WHERE deleted=0 AND status='pending' ${tenantClause}`,
        tenantParams
      );
      const newPatients = await db.get<{ v: number }>(
        `SELECT COUNT(*) AS v FROM patients WHERE deleted=0 AND created_at >= ? ${tenantClause}`,
        [today, ...tenantParams]
      );
      const pharmacyToday = await db.get<{ revenue: number; bills: number }>(
        `SELECT COALESCE(SUM(total_paise),0) AS revenue, COUNT(*) AS bills
         FROM pharmacy_sales WHERE deleted=0 AND status='paid' AND sale_date >= ? ${tenantClause}`,
        [today, ...tenantParams]
      );
      const admitted = await db.get<{ v: number }>(
        `SELECT COUNT(*) AS v FROM admissions WHERE deleted=0 AND status='admitted' ${tenantClause}`,
        tenantParams
      );
      const hospitalCharges = await db.get<{ today: number; total: number }>(
        `SELECT COALESCE(SUM(CASE WHEN charged_at >= ? THEN amount_paise + cgst_paise + sgst_paise ELSE 0 END), 0) AS today,
                COALESCE(SUM(amount_paise + cgst_paise + sgst_paise), 0) AS total
         FROM hospital_charges WHERE deleted=0 ${tenantClause}`,
        [today, ...tenantParams]
      );
      const hospitalPaid = await db.get<{ today: number; total: number }>(
        `SELECT COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount_paise ELSE 0 END), 0) AS today,
                COALESCE(SUM(amount_paise), 0) AS total
         FROM hospital_bill_payments WHERE deleted=0 ${tenantClause}`,
        [today, ...tenantParams]
      );

      setStats({
        todayRevenue: todayRow?.revenue ?? 0,
        todayInvoices: todayRow?.invoices ?? 0,
        outstanding: (billed?.v ?? 0) - (collected?.v ?? 0),
        monthRevenue: monthRevenue?.v ?? 0,
        monthExpenses: monthExpenses?.v ?? 0,
        pendingReports: pending?.v ?? 0,
        newPatientsToday: newPatients?.v ?? 0,
        pharmacyToday: pharmacyToday?.revenue ?? 0,
        pharmacyBillsToday: pharmacyToday?.bills ?? 0,
        admittedPatients: admitted?.v ?? 0,
        hospitalBilledToday: hospitalCharges?.today ?? 0,
        hospitalCollectedToday: hospitalPaid?.today ?? 0,
        hospitalOutstanding: Math.max(0, (hospitalCharges?.total ?? 0) - (hospitalPaid?.total ?? 0)),
      });

      setRecent(
        await db.all<RecentInvoice>(
          `SELECT id, invoice_no, invoice_date, patient_name, total_paise, status
           FROM invoices WHERE deleted=0 ${tenantClause} ORDER BY invoice_date DESC LIMIT 8`,
          tenantParams
        )
      );
    })();
  }, []);

  const cards = stats
    ? [
        { label: "Today's collection", value: formatINR(stats.todayRevenue), icon: "rupee", tone: "text-teal-700 bg-teal-50" },
        { label: "Bills today", value: String(stats.todayInvoices), icon: "receipt", tone: "text-slate-600 bg-slate-100" },
        { label: "Outstanding dues", value: formatINR(stats.outstanding), icon: "alert", tone: "text-rose-600 bg-rose-50" },
        { label: "Month revenue", value: formatINR(stats.monthRevenue), icon: "chart", tone: "text-indigo-600 bg-indigo-50" },
        { label: "Month expenses", value: formatINR(stats.monthExpenses), icon: "wallet", tone: "text-amber-600 bg-amber-50" },
        {
          label: "Month profit",
          value: formatINR(stats.monthRevenue - stats.monthExpenses),
          icon: "check",
          tone: (stats.monthRevenue - stats.monthExpenses) >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-600 bg-rose-50",
        },
        { label: "Pending reports", value: String(stats.pendingReports), icon: "flask", tone: "text-cyan-700 bg-cyan-50" },
        { label: "New patients today", value: String(stats.newPatientsToday), icon: "users", tone: "text-violet-600 bg-violet-50" },
        ...(stats.pharmacyToday > 0 || stats.pharmacyBillsToday > 0
          ? [
              {
                label: "Pharmacy sales today",
                value: formatINR(stats.pharmacyToday),
                icon: "receipt",
                tone: "text-emerald-700 bg-emerald-50",
              },
              {
                label: "Pharmacy bills today",
                value: String(stats.pharmacyBillsToday),
                icon: "chart",
                tone: "text-cyan-700 bg-cyan-50",
              },
            ]
          : []),
        ...(stats.admittedPatients > 0
          ? [
              {
                label: "Admitted patients",
                value: String(stats.admittedPatients),
                icon: "users",
                tone: "text-indigo-600 bg-indigo-50",
              },
            ]
          : []),
        ...(stats.hospitalBilledToday > 0 || stats.hospitalOutstanding > 0
          ? [
              {
                label: "IPD billed today",
                value: formatINR(stats.hospitalBilledToday),
                icon: "receipt",
                tone: "text-indigo-600 bg-indigo-50",
              },
              {
                label: "IPD outstanding",
                value: formatINR(stats.hospitalOutstanding),
                icon: "alert",
                tone: "text-amber-700 bg-amber-50",
              },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          monitor
            ? "Today at a glance — recorded at the centre"
            : "Today at a glance — figures from this terminal's database"
        }
      />

      {!stats ? (
        <Card className="p-8 text-center text-sm text-slate-500">Loading…</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.tone}`}>
                    <Icon name={c.icon} className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="num truncate text-lg font-semibold leading-tight">
                      {c.value}
                    </p>
                    <p className="truncate text-xs text-slate-500">{c.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-5">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold">Recent bills</h2>
              <Link to="/invoices" className="text-xs font-medium text-teal-700 hover:underline">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                {monitor ? (
                  "No bills recorded at the centre yet."
                ) : (
                  <>
                    No bills yet — create your first one from{" "}
                    <Link to="/billing" className="font-medium text-teal-700 hover:underline">
                      New bill
                    </Link>
                    .
                  </>
                )}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5">Invoice</th>
                      <th className="px-4 py-2.5">Patient</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="num px-4 py-2.5 font-medium">{r.invoice_no}</td>
                        <td className="px-4 py-2.5">{r.patient_name}</td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {formatDate(r.invoice_date)}
                        </td>
                        <td className="num px-4 py-2.5 text-right">
                          {formatINR(r.total_paise)}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700",
    partial: "bg-amber-50 text-amber-700",
    unpaid: "bg-rose-50 text-rose-600",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tones[status] ?? tones.unpaid}`}>
      {status}
    </span>
  );
}
