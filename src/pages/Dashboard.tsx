import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDb } from "../db";
import { useMonitor } from "../app/MonitorContext";
import { EXPENSE_MODULES, parseExpenseModules } from "../app/expenseModules";
import { formatDate, formatINR } from "../db/helpers";
import { csvRupees, exportCsv as exportCsvFile } from "../db/csv";
import { printA4 } from "../db/print";
import { tenantAnd, tenantAndOn } from "../db/tenant";
import { BarList, LineChart, StatCard, type BarItem } from "../ui/charts";
import { Btn, Card, Icon, PageHeader, Select, TextInput } from "../ui/kit";

type Tab = "overview" | "billing" | "diagnostics" | "expenses" | "pharmacy" | "hospital";
type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

interface RecentInvoice {
  id: string;
  invoice_no: string;
  invoice_date: number;
  patient_name: string;
  total_paise: number;
  status: string;
}

interface DailyRow {
  key: string;
  label: string;
  billed: number;
  collected: number;
  expenses: number;
  diagnosticsBilled: number;
  diagnosticsCollected: number;
  pharmacyBilled: number;
  pharmacyCollected: number;
  hospitalCharges: number;
  hospitalPaid: number;
}

interface DashboardData {
  rangeLabel: string;
  daily: DailyRow[];
  recent: RecentInvoice[];
  periodBilled: number;
  periodCollected: number;
  periodExpenses: number;
  diagnosticsBilled: number;
  diagnosticsCollected: number;
  pharmacyBilled: number;
  pharmacyBills: number;
  hospitalBilled: number;
  hospitalCollected: number;
  outstanding: number;
  pendingReports: number;
  newPatients: number;
  activeAdmissions: number;
  hospitalOutstanding: number;
  paymentMix: BarItem[];
  pharmacyMix: BarItem[];
  duesAging: BarItem[];
  expenseCategories: BarItem[];
  expenseModules: BarItem[];
  expensePayees: BarItem[];
  topTests: BarItem[];
  sampleStatuses: BarItem[];
  wardAdmissions: BarItem[];
  diagnostics: {
    pending: number;
    done: number;
    rejected: number;
    pathology: number;
    xray: number;
    avgTatHours: number;
  };
  pharmacy: {
    stockValue: number;
    lowStock: number;
    expiring: number;
  };
  hospital: {
    admissions: number;
    discharges: number;
    periodCharges: number;
    periodPayments: number;
  };
}

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "billing", label: "Billing" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "expenses", label: "Expenses" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "hospital", label: "Hospital" },
];

const RANGES: { id: RangeKey; label: string; days: number }[] = [
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "custom", label: "Custom range", days: 0 },
];

function dateKey(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function buildDays(start: number, end: number) {
  const days: { key: string; label: string; ms: number }[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(23, 59, 59, 999);
  while (cursor.getTime() <= last.getTime()) {
    days.push({
      key: dateKey(cursor.getTime()),
      label: shortDate(cursor.getTime()),
      ms: cursor.getTime(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function startOfRange(range: RangeKey, nowMs: number): number {
  const days = RANGES.find((item) => item.id === range)?.days ?? 30;
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d.getTime();
}

function dateKeyDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return dateKey(d.getTime());
}

function parseDateInput(value: string, endOfDay: boolean): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function sumBy<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}

function topBars(map: Map<string, number>, limit = 8): BarItem[] {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function moneyBars(map: Map<string, number>, limit = 8): BarItem[] {
  return topBars(map, limit);
}

export default function Dashboard() {
  const { monitor } = useMonitor();
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<RangeKey>("30d");
  const [customStart, setCustomStart] = useState(() => dateKeyDaysAgo(29));
  const [customEnd, setCustomEnd] = useState(() => dateKeyDaysAgo(0));
  const [customApplied, setCustomApplied] = useState(0);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setError("");
        const db = await getDb();
        const nowMs = Date.now();
        let start: number;
        let end: number;
        let rangeLabel: string;
        if (range === "custom") {
          const customStartMs = parseDateInput(customStart, false);
          const customEndMs = parseDateInput(customEnd, true);
          if (
            customStartMs === null ||
            customEndMs === null ||
            customStartMs > customEndMs
          ) {
            setError("Choose a valid custom range where the start date is on or before the end date.");
            setData(null);
            return;
          }
          start = customStartMs;
          end = customEndMs;
          rangeLabel = `${formatDate(start)} – ${formatDate(end)}`;
        } else {
          start = startOfRange(range, nowMs);
          end = nowMs;
          rangeLabel =
            RANGES.find((item) => item.id === range)?.label ?? "Last 30 days";
        }
        const [tenantClause, tenantParams] = tenantAnd();
        const [roTenantClause, roTenantParams] = tenantAndOn("ro");
        const [pTenantClause, pTenantParams] = tenantAndOn("p");
        const [iTenantClause, iTenantParams] = tenantAndOn("i");
        const [bTenantClause, bTenantParams] = tenantAndOn("b");
        const days = buildDays(start, end);
        const byDay = new Map(
          days.map((day) => [
            day.key,
            {
              key: day.key,
              label: day.label,
              billed: 0,
              collected: 0,
              expenses: 0,
              diagnosticsBilled: 0,
              diagnosticsCollected: 0,
              pharmacyBilled: 0,
              pharmacyCollected: 0,
              hospitalCharges: 0,
              hospitalPaid: 0,
            } satisfies DailyRow,
          ])
        );
        const add = (
          at: number,
          field: keyof Omit<DailyRow, "key" | "label">,
          amount: number
        ) => {
          const row = byDay.get(dateKey(at));
          if (row) row[field] += amount;
        };

        const [
          invoiceRows,
          paymentRows,
          expenseRows,
          categoryRows,
          pharmacyRows,
          batchRows,
          allHospitalCharges,
          allHospitalPayments,
          admissionRows,
          reportRows,
          sampleRows,
          topTestRows,
          duesRows,
          recentRows,
          newPatientRows,
        ] = await Promise.all([
          db.all<{ invoice_date: number; total_paise: number }>(
            `SELECT invoice_date, total_paise
             FROM invoices
             WHERE deleted = 0 AND status <> 'cancelled'
               AND invoice_date BETWEEN ? AND ? ${tenantClause}`,
            [start, end, ...tenantParams]
          ),
          db.all<{ paid_at: number; amount_paise: number; mode: string }>(
            `SELECT p.paid_at, p.amount_paise, p.mode
             FROM payments p
             JOIN invoices i
               ON i.id = p.invoice_id AND i.tenant_id = p.tenant_id
             WHERE p.deleted = 0 AND i.deleted = 0 AND i.status <> 'cancelled'
               AND p.paid_at BETWEEN ? AND ? ${pTenantClause}`,
            [start, end, ...pTenantParams]
          ),
          db.all<{
            paid_at: number;
            amount_paise: number;
            category_id: string;
            payee: string;
            modules: string;
          }>(
            `SELECT paid_at, amount_paise, category_id, payee, modules
             FROM expenses
             WHERE deleted = 0 AND paid_at BETWEEN ? AND ? ${tenantClause}`,
            [start, end, ...tenantParams]
          ),
          db.all<{ id: string; name: string }>(
            `SELECT id, name FROM expense_categories
             WHERE deleted = 0 ${tenantClause}`,
            tenantParams
          ),
          db.all<{
            sale_date: number;
            total_paise: number;
            payment_mode: string;
          }>(
            `SELECT sale_date, total_paise, payment_mode
             FROM pharmacy_sales
             WHERE deleted = 0 AND status = 'paid'
               AND sale_date BETWEEN ? AND ? ${tenantClause}`,
            [start, end, ...tenantParams]
          ),
          db.all<{
            medicine_id: string;
            expiry_date: string;
            quantity: number;
            purchase_price_paise: number;
            name: string;
            reorder_level: number;
          }>(
            `SELECT b.medicine_id, b.expiry_date, b.quantity,
                    b.purchase_price_paise, m.name, m.reorder_level
             FROM pharmacy_batches b
             JOIN medicines m
               ON m.id = b.medicine_id AND m.tenant_id = b.tenant_id
             WHERE b.deleted = 0 AND m.deleted = 0 AND b.quantity > 0
               ${bTenantClause}`,
            bTenantParams
          ),
          db.all<{ charged_at: number; amount: number }>(
            `SELECT charged_at, amount_paise + cgst_paise + sgst_paise AS amount
             FROM hospital_charges
             WHERE deleted = 0 ${tenantClause}`,
            tenantParams
          ),
          db.all<{ paid_at: number; amount_paise: number }>(
            `SELECT paid_at, amount_paise
             FROM hospital_bill_payments
             WHERE deleted = 0 ${tenantClause}`,
            tenantParams
          ),
          db.all<{
            status: string;
            ward: string;
            admitted_at: number;
            discharged_at: number | null;
          }>(
            `SELECT status, ward, admitted_at, discharged_at
             FROM admissions
             WHERE deleted = 0 ${tenantClause}`,
            tenantParams
          ),
          db.all<{
            status: string;
            created_at: number;
            reported_at: number | null;
            specimen_received_at: number | null;
            test_category: string;
          }>(
            `SELECT ro.status, ro.created_at, ro.reported_at,
                    ro.specimen_received_at,
                    COALESCE(t.category, 'Pathology') AS test_category
             FROM report_orders ro
             LEFT JOIN tests t
               ON t.id = ro.test_id AND t.tenant_id = ro.tenant_id
             WHERE ro.deleted = 0
               AND ro.created_at BETWEEN ? AND ? ${roTenantClause}`,
            [start, end, ...roTenantParams]
          ),
          db.all<{ status: string; n: number }>(
            `SELECT status, COUNT(*) AS n
             FROM samples
             WHERE deleted = 0 AND created_at BETWEEN ? AND ? ${tenantClause}
             GROUP BY status`,
            [start, end, ...tenantParams]
          ),
          db.all<{ name: string; n: number; amount: number }>(
            `SELECT ii.description AS name, COUNT(*) AS n,
                    COALESCE(SUM(ii.amount_paise), 0) AS amount
             FROM invoice_items ii
             JOIN invoices i
               ON i.id = ii.invoice_id AND i.tenant_id = ii.tenant_id
             WHERE ii.deleted = 0 AND i.deleted = 0 AND i.status <> 'cancelled'
               AND i.invoice_date BETWEEN ? AND ? ${iTenantClause}
             GROUP BY ii.description
             ORDER BY amount DESC
             LIMIT 8`,
            [start, end, ...iTenantParams]
          ),
          db.all<{
            id: string;
            invoice_date: number;
            total_paise: number;
            paid_paise: number;
          }>(
            `SELECT i.id, i.invoice_date, i.total_paise,
                    COALESCE(SUM(p.amount_paise), 0) AS paid_paise
             FROM invoices i
             LEFT JOIN payments p
               ON p.invoice_id = i.id AND p.tenant_id = i.tenant_id AND p.deleted = 0
             WHERE i.deleted = 0 AND i.status <> 'cancelled' ${iTenantClause}
             GROUP BY i.id, i.invoice_date, i.total_paise`,
            iTenantParams
          ),
          db.all<RecentInvoice>(
            `SELECT id, invoice_no, invoice_date, patient_name, total_paise, status
             FROM invoices WHERE deleted = 0 ${tenantClause}
             ORDER BY invoice_date DESC LIMIT 8`,
            tenantParams
          ),
          db.all<{ n: number }>(
            `SELECT COUNT(*) AS n FROM patients
             WHERE deleted = 0 AND created_at BETWEEN ? AND ? ${tenantClause}`,
            [start, end, ...tenantParams]
          ),
        ]);

        if (cancelled) return;

        for (const row of invoiceRows) {
          add(row.invoice_date, "billed", row.total_paise);
          add(row.invoice_date, "diagnosticsBilled", row.total_paise);
        }
        for (const row of paymentRows) {
          add(row.paid_at, "collected", row.amount_paise);
          add(row.paid_at, "diagnosticsCollected", row.amount_paise);
        }
        for (const row of expenseRows) {
          add(row.paid_at, "expenses", row.amount_paise);
        }
        for (const row of pharmacyRows) {
          add(row.sale_date, "billed", row.total_paise);
          add(row.sale_date, "collected", row.total_paise);
          add(row.sale_date, "pharmacyBilled", row.total_paise);
          add(row.sale_date, "pharmacyCollected", row.total_paise);
        }
        for (const row of allHospitalCharges) {
          if (row.charged_at >= start && row.charged_at <= end) {
            add(row.charged_at, "billed", row.amount);
            add(row.charged_at, "hospitalCharges", row.amount);
          }
        }
        for (const row of allHospitalPayments) {
          if (row.paid_at >= start && row.paid_at <= end) {
            add(row.paid_at, "collected", row.amount_paise);
            add(row.paid_at, "hospitalPaid", row.amount_paise);
          }
        }

        const daily = [...byDay.values()];
        const paymentMixMap = new Map<string, number>();
        for (const row of paymentRows) {
          paymentMixMap.set(row.mode, (paymentMixMap.get(row.mode) ?? 0) + row.amount_paise);
        }
        const pharmacyMixMap = new Map<string, number>();
        for (const row of pharmacyRows) {
          pharmacyMixMap.set(
            row.payment_mode,
            (pharmacyMixMap.get(row.payment_mode) ?? 0) + row.total_paise
          );
        }

        const categoryName = new Map(categoryRows.map((row) => [row.id, row.name]));
        const expenseCategoryMap = new Map<string, number>();
        const expenseModuleMap = new Map<string, number>();
        const expensePayeeMap = new Map<string, number>();
        for (const row of expenseRows) {
          const category = categoryName.get(row.category_id) ?? "Uncategorised";
          expenseCategoryMap.set(
            category,
            (expenseCategoryMap.get(category) ?? 0) + row.amount_paise
          );
          const modules = parseExpenseModules(row.modules);
          if (modules.length === 0) {
            expenseModuleMap.set(
              "Unassigned",
              (expenseModuleMap.get("Unassigned") ?? 0) + row.amount_paise
            );
          } else {
            for (const id of modules) {
              const label =
                EXPENSE_MODULES.find((module) => module.id === id)?.label ?? id;
              expenseModuleMap.set(
                label,
                (expenseModuleMap.get(label) ?? 0) + row.amount_paise
              );
            }
          }
          const payee = row.payee.trim() || "Unspecified";
          expensePayeeMap.set(
            payee,
            (expensePayeeMap.get(payee) ?? 0) + row.amount_paise
          );
        }

        const duesAgingMap = new Map<string, number>([
          ["0-30 days", 0],
          ["31-60 days", 0],
          ["61-90 days", 0],
          ["90+ days", 0],
        ]);
        const diagnosticsOutstanding = duesRows.reduce((total, row) => {
          const due = Math.max(0, row.total_paise - row.paid_paise);
          if (due <= 0) return total;
          const age = Math.floor((nowMs - row.invoice_date) / 86_400_000);
          const bucket =
            age <= 30
              ? "0-30 days"
              : age <= 60
                ? "31-60 days"
                : age <= 90
                  ? "61-90 days"
                  : "90+ days";
          duesAgingMap.set(bucket, (duesAgingMap.get(bucket) ?? 0) + due);
          return total + due;
        }, 0);

        const reportStatus = new Map<string, number>();
        const reportCategory = new Map<string, number>();
        let tatTotal = 0;
        let tatCount = 0;
        for (const row of reportRows) {
          reportStatus.set(row.status, (reportStatus.get(row.status) ?? 0) + 1);
          reportCategory.set(
            row.test_category,
            (reportCategory.get(row.test_category) ?? 0) + 1
          );
          if (row.reported_at) {
            const baseline = row.specimen_received_at ?? row.created_at;
            const hours = (row.reported_at - baseline) / 3_600_000;
            if (hours >= 0) {
              tatTotal += hours;
              tatCount += 1;
            }
          }
        }

        const sampleStatusMap = new Map<string, number>();
        for (const row of sampleRows) sampleStatusMap.set(row.status, row.n);

        const stockByMedicine = new Map<
          string,
          { name: string; quantity: number; reorderLevel: number }
        >();
        let stockValue = 0;
        let expiring = 0;
        const expiryLimit = new Date();
        expiryLimit.setDate(expiryLimit.getDate() + 90);
        for (const batch of batchRows) {
          stockValue += batch.quantity * batch.purchase_price_paise;
          const current =
            stockByMedicine.get(batch.medicine_id) ?? {
              name: batch.name,
              quantity: 0,
              reorderLevel: batch.reorder_level,
            };
          current.quantity += batch.quantity;
          stockByMedicine.set(batch.medicine_id, current);
          const expiry = new Date(`${batch.expiry_date}T23:59:59`);
          if (expiry >= new Date() && expiry <= expiryLimit) expiring += 1;
        }
        const lowStock = [...stockByMedicine.values()].filter(
          (item) => item.quantity < item.reorderLevel
        ).length;

        const activeAdmissions = admissionRows.filter(
          (row) => row.status === "admitted"
        );
        const wardMap = new Map<string, number>();
        for (const row of activeAdmissions) {
          const ward = row.ward.trim() || "Unspecified";
          wardMap.set(ward, (wardMap.get(ward) ?? 0) + 1);
        }
        const hospitalChargesTotal = sumBy(allHospitalCharges, (row) => row.amount);
        const hospitalPaidTotal = sumBy(allHospitalPayments, (row) => row.amount_paise);
        const periodCharges = allHospitalCharges
          .filter((row) => row.charged_at >= start && row.charged_at <= end)
          .reduce((total, row) => total + row.amount, 0);
        const periodPayments = allHospitalPayments
          .filter((row) => row.paid_at >= start && row.paid_at <= end)
          .reduce((total, row) => total + row.amount_paise, 0);

        const diagnosticsBilled = sumBy(invoiceRows, (row) => row.total_paise);
        const diagnosticsCollected = sumBy(paymentRows, (row) => row.amount_paise);
        const pharmacyBilled = sumBy(pharmacyRows, (row) => row.total_paise);
        const periodBilled = diagnosticsBilled + pharmacyBilled + periodCharges;
        const periodCollected =
          diagnosticsCollected + pharmacyBilled + periodPayments;
        const periodExpenses = sumBy(expenseRows, (row) => row.amount_paise);
        const hospitalOutstanding = Math.max(
          0,
          hospitalChargesTotal - hospitalPaidTotal
        );

        setData({
          rangeLabel,
          daily,
          recent: recentRows,
          periodBilled,
          periodCollected,
          periodExpenses,
          diagnosticsBilled,
          diagnosticsCollected,
          pharmacyBilled,
          pharmacyBills: pharmacyRows.length,
          hospitalBilled: periodCharges,
          hospitalCollected: periodPayments,
          outstanding: diagnosticsOutstanding + hospitalOutstanding,
          pendingReports:
            (reportStatus.get("pending") ?? 0) +
            (reportStatus.get("in_progress") ?? 0),
          newPatients: newPatientRows[0]?.n ?? 0,
          activeAdmissions: activeAdmissions.length,
          hospitalOutstanding,
          paymentMix: [...paymentMixMap.entries()].map(([label, value]) => ({
            label: label.toUpperCase(),
            value,
          })),
          pharmacyMix: [...pharmacyMixMap.entries()].map(([label, value]) => ({
            label: label.toUpperCase(),
            value,
          })),
          duesAging: [...duesAgingMap.entries()]
            .map(([label, value]) => ({ label, value }))
            .filter((item) => item.value > 0),
          expenseCategories: moneyBars(expenseCategoryMap),
          expenseModules: moneyBars(expenseModuleMap),
          expensePayees: moneyBars(expensePayeeMap, 6),
          topTests: topTestRows.map((row) => ({
            label: `${row.name} (${row.n})`,
            value: row.amount,
          })),
          sampleStatuses: [...sampleStatusMap.entries()].map(([label, value]) => ({
            label,
            value,
          })),
          wardAdmissions: topBars(wardMap, 8),
          diagnostics: {
            pending:
              (reportStatus.get("pending") ?? 0) +
              (reportStatus.get("in_progress") ?? 0),
            done: reportStatus.get("done") ?? 0,
            rejected: sampleStatusMap.get("rejected") ?? 0,
            pathology: reportCategory.get("Pathology") ?? 0,
            xray: reportCategory.get("X-Ray") ?? 0,
            avgTatHours: tatCount > 0 ? tatTotal / tatCount : 0,
          },
          pharmacy: { stockValue, lowStock, expiring },
          hospital: {
            admissions: admissionRows.filter(
              (row) => row.admitted_at >= start && row.admitted_at <= end
            ).length,
            discharges: admissionRows.filter(
              (row) =>
                row.status === "discharged" &&
                row.discharged_at != null &&
                row.discharged_at >= start &&
                row.discharged_at <= end
            ).length,
            periodCharges,
            periodPayments,
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load dashboard");
          setData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, customApplied]);

  const applyCustomRange = () => {
    const start = parseDateInput(customStart, false);
    const end = parseDateInput(customEnd, true);
    if (start === null || end === null || start > end) {
      setError("Choose a valid custom range where the start date is on or before the end date.");
      return;
    }
    setError("");
    setCustomApplied((current) => current + 1);
  };

  const exportDashboard = () => {
    if (!data) return;
    exportCsvFile(
      range === "custom"
        ? `dashboard-${customStart}-to-${customEnd}.csv`
        : `dashboard-${range}.csv`,
      [
        "Date",
        "Billed",
        "Collected",
        "Expenses",
        "Diagnostics billed",
        "Diagnostics collected",
        "Pharmacy sales",
        "Hospital charges",
        "Hospital payments",
      ],
      data.daily.map((row) => [
        row.key,
        csvRupees(row.billed),
        csvRupees(row.collected),
        csvRupees(row.expenses),
        csvRupees(row.diagnosticsBilled),
        csvRupees(row.diagnosticsCollected),
        csvRupees(row.pharmacyBilled),
        csvRupees(row.hospitalCharges),
        csvRupees(row.hospitalPaid),
      ])
    );
  };

  return (
    <div className="print-area">
      <PageHeader
        title="Dashboard"
        subtitle={
          monitor
            ? `Read-only local overview · ${data?.rangeLabel ?? "loading"}`
            : `Administrator overview · ${data?.rangeLabel ?? "loading"} · live local data`
        }
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Select
              value={range}
              onChange={(event) => setRange(event.target.value as RangeKey)}
              className="w-40"
              aria-label="Dashboard date range"
            >
              {RANGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
            {range === "custom" && (
              <>
                <TextInput
                  type="date"
                  value={customStart}
                  max={dateKeyDaysAgo(0)}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-36"
                  aria-label="Custom range start date"
                  title="Custom range start date"
                />
                <TextInput
                  type="date"
                  value={customEnd}
                  max={dateKeyDaysAgo(0)}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="w-36"
                  aria-label="Custom range end date"
                  title="Custom range end date"
                />
                <Btn onClick={applyCustomRange}>Apply</Btn>
              </>
            )}
            <Btn onClick={exportDashboard} disabled={!data}>
              <Icon name="receipt" className="h-4 w-4" /> CSV
            </Btn>
            <Btn onClick={printA4} disabled={!data}>
              <Icon name="printer" className="h-4 w-4" /> Print
            </Btn>
          </div>
        }
      />

      <div className="no-print mb-4 flex flex-wrap gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === item.id
                ? "bg-teal-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="mb-4 border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </Card>
      )}

      {!data ? (
        <Card className="p-8 text-center text-sm text-slate-500">Loading…</Card>
      ) : (
        <>
          {tab === "overview" && <Overview data={data} />}
          {tab === "billing" && <Billing data={data} />}
          {tab === "diagnostics" && <Diagnostics data={data} />}
          {tab === "expenses" && <Expenses data={data} />}
          {tab === "pharmacy" && <Pharmacy data={data} />}
          {tab === "hospital" && <Hospital data={data} />}
        </>
      )}
    </div>
  );
}

function Overview({ data }: { data: DashboardData }) {
  const series = [
    {
      label: "Billed",
      color: "#0f766e",
      values: data.daily.map((row) => row.diagnosticsBilled + row.pharmacyBilled + row.hospitalCharges),
    },
    {
      label: "Collected",
      color: "#2563eb",
      values: data.daily.map((row) => row.diagnosticsCollected + row.pharmacyCollected + row.hospitalPaid),
    },
    {
      label: "Expenses",
      color: "#e11d48",
      values: data.daily.map((row) => row.expenses),
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Period collected" value={formatINR(data.periodCollected)} icon={<Icon name="rupee" />} />
        <StatCard label="Period billed" value={formatINR(data.periodBilled)} icon={<Icon name="receipt" />} tone="text-indigo-600 bg-indigo-50" />
        <StatCard label="Outstanding dues" value={formatINR(data.outstanding)} icon={<Icon name="alert" />} tone="text-rose-600 bg-rose-50" />
        <StatCard label="Period expenses" value={formatINR(data.periodExpenses)} icon={<Icon name="wallet" />} tone="text-amber-600 bg-amber-50" />
        <StatCard label="Cash profit" value={formatINR(data.periodCollected - data.periodExpenses)} hint="Collections minus expenses" icon={<Icon name="check" />} tone={data.periodCollected >= data.periodExpenses ? "text-emerald-700 bg-emerald-50" : "text-rose-600 bg-rose-50"} />
        <StatCard label="Pending reports" value={String(data.pendingReports)} icon={<Icon name="flask" />} tone="text-cyan-700 bg-cyan-50" />
        <StatCard label="New patients" value={String(data.newPatients)} icon={<Icon name="users" />} tone="text-violet-600 bg-violet-50" />
        <StatCard label="Active admissions" value={String(data.activeAdmissions)} icon={<Icon name="users" />} tone="text-indigo-600 bg-indigo-50" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Billed, collected and expenses</h2>
          <p className="mb-3 text-xs text-slate-400">Daily totals across active modules.</p>
          {data.daily.length > 1 ? (
            data.daily.some((row) => row.billed || row.collected || row.expenses) ? (
              <LineChart
                labels={data.daily.map((row) => row.label)}
                series={series}
                valueFormatter={(value) => formatINR(value)}
              />
            ) : (
              <p className="text-sm text-slate-400">No activity in this range.</p>
            )
          ) : (
            <p className="text-sm text-slate-400">Select 7 days or more to see a trend.</p>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Module contribution</h2>
          <p className="mb-3 text-xs text-slate-400">Billed value in this period.</p>
          <BarList
            items={[
              { label: "Diagnostics", value: data.diagnosticsBilled },
              { label: "Pharmacy", value: data.pharmacyBilled },
              { label: "Hospital", value: data.hospitalBilled },
            ]}
            valueFormatter={(value) => formatINR(value)}
            emptyMessage="No billed activity in this period."
          />
        </Card>
      </div>

      <RecentBills rows={data.recent} />
    </div>
  );
}

function Billing({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Diagnostics billed" value={formatINR(data.diagnosticsBilled)} icon={<Icon name="receipt" />} />
        <StatCard label="Diagnostics collected" value={formatINR(data.diagnosticsCollected)} icon={<Icon name="rupee" />} tone="text-blue-700 bg-blue-50" />
        <StatCard label="Outstanding" value={formatINR(data.outstanding)} icon={<Icon name="alert" />} tone="text-rose-600 bg-rose-50" />
        <StatCard label="Top test revenue" value={data.topTests.length ? formatINR(data.topTests[0].value) : formatINR(0)} icon={<Icon name="chart" />} tone="text-indigo-600 bg-indigo-50" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Payment mode mix</h2>
          <p className="mb-3 text-xs text-slate-400">Invoice payments in this period.</p>
          <BarList items={data.paymentMix} valueFormatter={(value) => formatINR(value)} tone="bg-blue-600" emptyMessage="No diagnostics payments in this period." />
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Dues ageing</h2>
          <p className="mb-3 text-xs text-slate-400">All outstanding invoice balances.</p>
          <BarList items={data.duesAging} valueFormatter={(value) => formatINR(value)} tone="bg-rose-500" emptyMessage="No outstanding dues." />
        </Card>
      </div>
      <Card className="p-4">
        <h2 className="text-sm font-semibold">Top tests and packages by revenue</h2>
        <p className="mb-3 text-xs text-slate-400">Invoice lines in this period.</p>
        <BarList items={data.topTests} valueFormatter={(value) => formatINR(value)} emptyMessage="No billed tests in this period." />
      </Card>
    </div>
  );
}

function Diagnostics({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending reports" value={String(data.diagnostics.pending)} icon={<Icon name="flask" />} tone="text-amber-700 bg-amber-50" />
        <StatCard label="Completed reports" value={String(data.diagnostics.done)} icon={<Icon name="check" />} tone="text-emerald-700 bg-emerald-50" />
        <StatCard label="Average TAT" value={`${data.diagnostics.avgTatHours.toFixed(1)} h`} hint="Received to reported" icon={<Icon name="chart" />} tone="text-cyan-700 bg-cyan-50" />
        <StatCard label="Rejected samples" value={String(data.diagnostics.rejected)} icon={<Icon name="alert" />} tone="text-rose-600 bg-rose-50" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Test volume</h2>
          <p className="mb-3 text-xs text-slate-400">Orders created in this period.</p>
          <BarList
            items={[
              { label: "Pathology", value: data.diagnostics.pathology },
              { label: "X-ray", value: data.diagnostics.xray },
            ]}
            tone="bg-teal-600"
            emptyMessage="No report orders in this period."
          />
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Sample status</h2>
          <p className="mb-3 text-xs text-slate-400">Samples created in this period.</p>
          <BarList items={data.sampleStatuses} tone="bg-cyan-600" emptyMessage="No samples in this period." />
        </Card>
      </div>
    </div>
  );
}

function Expenses({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Period expenses" value={formatINR(data.periodExpenses)} icon={<Icon name="wallet" />} tone="text-amber-600 bg-amber-50" />
        <StatCard label="Expense categories" value={String(data.expenseCategories.length)} icon={<Icon name="chart" />} />
        <StatCard label="Vendors" value={String(data.expensePayees.length)} icon={<Icon name="users" />} tone="text-indigo-600 bg-indigo-50" />
        <StatCard label="Attributed modules" value={String(data.expenseModules.filter((item) => item.label !== "Unassigned").length)} hint="Modules with tagged spend" icon={<Icon name="receipt" />} tone="text-cyan-700 bg-cyan-50" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Expenses by category</h2>
          <p className="mb-3 text-xs text-slate-400">Paid in this period.</p>
          <BarList items={data.expenseCategories} valueFormatter={(value) => formatINR(value)} tone="bg-amber-500" emptyMessage="No expenses in this period." />
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Expenses by module tag</h2>
          <p className="mb-3 text-xs text-slate-400">Shared expenses are tagged in each selected module, not split.</p>
          <BarList items={data.expenseModules} valueFormatter={(value) => formatINR(value)} tone="bg-violet-600" emptyMessage="No module attribution in this period." />
        </Card>
      </div>
      <Card className="p-4">
        <h2 className="text-sm font-semibold">Top vendors</h2>
        <p className="mb-3 text-xs text-slate-400">Payees with the highest expense value.</p>
        <BarList items={data.expensePayees} valueFormatter={(value) => formatINR(value)} tone="bg-rose-500" emptyMessage="No payees in this period." />
      </Card>
    </div>
  );
}

function Pharmacy({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pharmacy sales" value={formatINR(data.pharmacyBilled)} icon={<Icon name="receipt" />} tone="text-emerald-700 bg-emerald-50" />
        <StatCard label="Pharmacy bills" value={String(data.pharmacyBills)} icon={<Icon name="chart" />} tone="text-cyan-700 bg-cyan-50" />
        <StatCard label="Stock value" value={formatINR(data.pharmacy.stockValue)} hint="At purchase price" icon={<Icon name="wallet" />} tone="text-indigo-600 bg-indigo-50" />
        <StatCard label="Expiring in 90 days" value={String(data.pharmacy.expiring)} icon={<Icon name="alert" />} tone="text-amber-700 bg-amber-50" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Payment mix</h2>
          <p className="mb-3 text-xs text-slate-400">Paid pharmacy sales in this period.</p>
          <BarList items={data.pharmacyMix} valueFormatter={(value) => formatINR(value)} tone="bg-emerald-600" emptyMessage="No pharmacy sales in this period." />
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Stock alerts</h2>
          <p className="mb-3 text-xs text-slate-400">Current inventory state.</p>
          <BarList
            items={[
              { label: "Low stock items", value: data.pharmacy.lowStock },
              { label: "Batches expiring in 90 days", value: data.pharmacy.expiring },
            ]}
            tone="bg-amber-500"
            emptyMessage="No stock alerts."
          />
        </Card>
      </div>
    </div>
  );
}

function Hospital({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active admissions" value={String(data.activeAdmissions)} icon={<Icon name="users" />} tone="text-indigo-600 bg-indigo-50" />
        <StatCard label="Admissions in period" value={String(data.hospital.admissions)} icon={<Icon name="plus" />} tone="text-teal-700 bg-teal-50" />
        <StatCard label="Discharges in period" value={String(data.hospital.discharges)} icon={<Icon name="check" />} tone="text-emerald-700 bg-emerald-50" />
        <StatCard label="Hospital outstanding" value={formatINR(data.hospitalOutstanding)} icon={<Icon name="alert" />} tone="text-rose-600 bg-rose-50" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Hospital billed vs collected</h2>
          <p className="mb-3 text-xs text-slate-400">Charges and payments in this period.</p>
          <BarList
            items={[
              { label: "Charges", value: data.hospitalBilled },
              { label: "Payments", value: data.hospitalCollected },
            ]}
            valueFormatter={(value) => formatINR(value)}
            tone="bg-indigo-600"
            emptyMessage="No hospital activity in this period."
          />
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Active admissions by ward</h2>
          <p className="mb-3 text-xs text-slate-400">Current inpatient distribution.</p>
          <BarList items={data.wardAdmissions} tone="bg-teal-600" emptyMessage="No active admissions." />
        </Card>
      </div>
    </div>
  );
}

function RecentBills({ rows }: { rows: RecentInvoice[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Recent bills</h2>
        <Link to="/invoices" className="text-xs font-medium text-teal-700 hover:underline">
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">
          No bills yet. Create one from{" "}
          <Link to="/billing" className="font-medium text-teal-700 hover:underline">
            New bill
          </Link>
          .
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
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="num px-4 py-2.5 font-medium">{row.invoice_no}</td>
                  <td className="px-4 py-2.5">{row.patient_name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(row.invoice_date)}</td>
                  <td className="num px-4 py-2.5 text-right">{formatINR(row.total_paise)}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
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
