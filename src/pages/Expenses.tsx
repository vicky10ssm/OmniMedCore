import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { useMonitor } from "../app/MonitorContext";
import {
  EXPENSE_MODULES,
  expenseModulesLabel,
  parseExpenseModules,
  serializeExpenseModules,
  type ExpenseModuleId,
} from "../app/expenseModules";
import { getDb } from "../db";
import { csvRupees, exportCsv as exportCsvFile } from "../db/csv";
import {
  formatDate,
  formatINR,
  getDeviceId,
  now,
  rupeesToPaise,
  uuid,
} from "../db/helpers";
import type { ExpenseCategoryRow, ExpenseRow } from "../db/types";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
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
  inputCls,
} from "../ui/kit";

type Mode = "cash" | "upi" | "card" | "bank";

interface ExpenseForm {
  category_id: string;
  paid_at: string;
  payee: string;
  amount: string;
  mode: Mode;
  bill_no: string;
  note: string;
  modules: ExpenseModuleId[];
}

const MODES: { value: Mode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank transfer" },
];

/** epoch ms → "yyyy-mm-dd" for <input type="date"> */
function toDateInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInput(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0).getTime();
}

function emptyForm(categoryId: string): ExpenseForm {
  return {
    category_id: categoryId,
    paid_at: toDateInput(Date.now()),
    payee: "",
    amount: "",
    mode: "cash",
    bill_no: "",
    note: "",
    modules: [],
  };
}

export default function Expenses() {
  const { user } = useAuth();
  const { monitor } = useMonitor();
  const isAdmin = user?.role === "admin";

  const [categories, setCategories] = useState<ExpenseCategoryRow[]>([]);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [categoryFilter, setCategoryFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseForm>(() => emptyForm(""));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState("");

  const loadCategories = async () => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    const cats = await db.all<ExpenseCategoryRow>(
      `SELECT * FROM expense_categories WHERE deleted = 0 ${tenantClause} ORDER BY sort_order, name`,
      tenantParams
    );
    setCategories(cats);
    return cats;
  };

  const loadExpenses = async () => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    setRows(
      await db.all<ExpenseRow>(
        `SELECT * FROM expenses WHERE deleted = 0 ${tenantClause} ORDER BY paid_at DESC, created_at DESC LIMIT 500`,
        tenantParams
      )
    );
    setLoaded(true);
  };

  useEffect(() => {
    void (async () => {
      const cats = await loadCategories();
      setForm(emptyForm(cats[0]?.id ?? ""));
      await loadExpenses();
    })();
  }, []);

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  /** Expenses of the selected month (yyyy-mm), before text/category filtering. */
  const monthRows = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return rows;
    const from = new Date(y, m - 1, 1, 0, 0, 0, 0).getTime();
    const to = new Date(y, m, 1, 0, 0, 0, 0).getTime();
    return rows.filter((r) => r.paid_at >= from && r.paid_at < to);
  }, [rows, month]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthRows.filter((r) => {
      const matchCat = !categoryFilter || r.category_id === categoryFilter;
      const matchModule =
        !moduleFilter || parseExpenseModules(r.modules).includes(moduleFilter as ExpenseModuleId);
      const matchQ =
        !q ||
        r.payee.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q) ||
        r.bill_no.toLowerCase().includes(q) ||
        catName(r.category_id).toLowerCase().includes(q) ||
        expenseModulesLabel(r.modules).toLowerCase().includes(q);
      return matchCat && matchModule && matchQ;
    });
  }, [monthRows, categoryFilter, moduleFilter, query, categories]);

  const monthTotal = monthRows.reduce((s, r) => s + r.amount_paise, 0);
  const filteredTotal = filtered.reduce((s, r) => s + r.amount_paise, 0);

  /** Category-wise totals for the month. */
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of monthRows) {
      map.set(r.category_id, (map.get(r.category_id) ?? 0) + r.amount_paise);
    }
    return [...map.entries()]
      .map(([id, total]) => ({ id, name: catName(id), total }))
      .sort((a, b) => b.total - a.total);
  }, [monthRows, categories]);

  // Operators may add and review expenses but must not receive the centre's
  // collected revenue or profit summary.
  const monthRevenue = useMonthRevenue(month, isAdmin);

  const toggleModule = (id: ExpenseModuleId) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(id)
        ? current.modules.filter((module) => module !== id)
        : [...current.modules, id],
    }));
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm(categories[0]?.id ?? ""));
    setError("");
    setOpen(true);
  };

  const openEdit = (e: ExpenseRow) => {
    setEditing(e);
    setForm({
      category_id: e.category_id,
      paid_at: toDateInput(e.paid_at),
      payee: e.payee,
      amount: (e.amount_paise / 100).toFixed(2),
      mode: e.mode,
      bill_no: e.bill_no,
      note: e.note,
      modules: parseExpenseModules(e.modules),
    });
    setError("");
    setOpen(true);
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!form.category_id) return setError("Pick a category");
    if (form.modules.length === 0) {
      return setError("Select at least one module for this expense");
    }
    const amount = rupeesToPaise(Number(form.amount) || 0);
    if (amount <= 0) return setError("Enter an amount greater than zero");
    if (!form.paid_at) return setError("Pick the date the money was paid");

    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      const ts = now();
      const paidAt = fromDateInput(form.paid_at);
      const values = [
        form.category_id,
        paidAt,
        form.payee.trim(),
        amount,
        form.mode,
        form.bill_no.trim(),
        form.note.trim(),
        serializeExpenseModules(form.modules),
      ];
      if (editing) {
        const [tenantClause, tenantParams] = tenantAnd();
        await db.run(
          `UPDATE expenses SET category_id=?, paid_at=?, payee=?, amount_paise=?,
             mode=?, bill_no=?, note=?, modules=?, updated_at=?, dirty=1
           WHERE id=? ${tenantClause}`,
          [...values, ts, editing.id, ...tenantParams]
        );
      } else {
        await db.run(
          `INSERT INTO expenses (id, category_id, paid_at, payee, amount_paise, mode,
             bill_no, note, modules, created_by, created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
          [
            uuid(),
            ...values,
            user?.id ?? "",
            ts,
            ts,
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
      }
      setOpen(false);
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (e: ExpenseRow) => {
    if (!window.confirm(`Delete this ${catName(e.category_id)} expense of ₹${(e.amount_paise / 100).toFixed(2)}?`))
      return;
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    await db.run(
      `UPDATE expenses SET deleted = 1, updated_at = ?, dirty = 1 WHERE id = ? ${tenantClause}`,
      [now(), e.id, ...tenantParams]
    );
    await loadExpenses();
  };

  const addCategory = async (ev: FormEvent) => {
    ev.preventDefault();
    const name = newCat.trim();
    if (!name) return setCatError("Category name is required");
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return setCatError("That category already exists");
    }
    const db = await getDb();
    const ts = now();
    await db.run(
      `INSERT INTO expense_categories (id, name, sort_order, created_at, updated_at,
         device_id, dirty, deleted, tenant_id)
       VALUES (?,?,?,?,?,?,1,0,?)`,
      [
        uuid(),
        name,
        categories.length + 1,
        ts,
        ts,
        getDeviceId(),
        getCurrentTenantId(),
      ]
    );
    setNewCat("");
    setCatError("");
    setCatOpen(false);
    await loadCategories();
  };

  const exportCsv = () => {
    exportCsvFile(
      `expenses-${month}.csv`,
      ["Date", "Category", "Modules", "Payee", "Amount", "Mode", "Bill no", "Note"],
      filtered.map((r) => [
        toDateInput(r.paid_at),
        catName(r.category_id),
        expenseModulesLabel(r.modules),
        r.payee,
        csvRupees(r.amount_paise),
        r.mode,
        r.bill_no,
        r.note,
      ])
    );
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={
          isAdmin
            ? `${formatINR(monthTotal)} spent this month · profit so far ${formatINR(monthRevenue - monthTotal)}`
            : `${formatINR(monthTotal)} spent this month`
        }
        actions={
          <>
            <Btn onClick={exportCsv} disabled={filtered.length === 0}>
              <Icon name="receipt" className="h-4 w-4" /> CSV
            </Btn>
            {!monitor && (
              <Btn variant="primary" onClick={openNew}>
                <Icon name="plus" className="h-4 w-4" /> Add expense
              </Btn>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={`${inputCls} w-40`}
              />
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-48"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-44"
              >
                <option value="">All modules</option>
                {EXPENSE_MODULES.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.label}
                  </option>
                ))}
              </Select>
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search payee, bill, note or module…"
                className="max-w-xs"
              />
            </div>

            {!loaded ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                message={
                  rows.length === 0 ? "No expenses recorded" : "Nothing in this month"
                }
                hint="Rent, electricity, reagents, salaries — log them here so the profit figure is real."
                action={
                  !monitor && (
                    <Btn variant="primary" onClick={openNew}>
                      <Icon name="plus" className="h-4 w-4" /> Add expense
                    </Btn>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Module</th>
                      <th className="px-4 py-2.5">Payee</th>
                      <th className="hidden px-4 py-2.5 md:table-cell">Bill no</th>
                      <th className="px-4 py-2.5">Mode</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-2.5 text-slate-500">
                          {formatDate(r.paid_at)}
                        </td>
                        <td className="px-4 py-2.5 font-medium">
                          {catName(r.category_id)}
                          {r.note && (
                            <span className="block truncate text-xs font-normal text-slate-400">
                              {r.note}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {(parseExpenseModules(r.modules).length > 0 ? (
                            <span className="flex flex-wrap gap-1">
                              {parseExpenseModules(r.modules).map((id) => (
                                <span
                                  key={id}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                >
                                  {EXPENSE_MODULES.find((m) => m.id === id)?.label ?? id}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Unassigned</span>
                          ))}
                        </td>
                        <td className="px-4 py-2.5">{r.payee || "—"}</td>
                        <td className="hidden px-4 py-2.5 text-slate-500 md:table-cell">
                          {r.bill_no || "—"}
                        </td>
                        <td className="px-4 py-2.5 capitalize text-slate-500">{r.mode}</td>
                        <td className="num px-4 py-2.5 text-right font-medium">
                          {formatINR(r.amount_paise)}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {isAdmin && !monitor ? (
                            <>
                              <button
                                onClick={() => openEdit(r)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                title="Edit"
                              >
                                <Icon name="edit" className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => void remove(r)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Delete"
                              >
                                <Icon name="x" className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold">
                      <td className="px-4 py-2.5" colSpan={6}>
                        {filtered.length === monthRows.length
                          ? "Month total"
                          : "Filtered total"}
                      </td>
                      <td className="num px-4 py-2.5 text-right">
                        {formatINR(filteredTotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {isAdmin && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">This month at a glance</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Collected</dt>
                  <dd className="num">{formatINR(monthRevenue)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Expenses</dt>
                  <dd className="num text-rose-600">− {formatINR(monthTotal)}</dd>
                </div>
                <div className="!mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3">
                  <span className="font-medium text-slate-600">Profit</span>
                  <span
                    className={`num text-lg font-bold ${
                      monthRevenue - monthTotal >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {formatINR(monthRevenue - monthTotal)}
                  </span>
                </div>
              </dl>
              <p className="mt-2 text-xs text-slate-400">
                Collected = payments received in this month. Profit here is cash-based,
                not accounting profit.
              </p>
            </Card>
          )}

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Category-wise</h2>
              {!monitor && (
                <Btn variant="ghost" onClick={() => setCatOpen(true)}>
                  <Icon name="plus" className="h-3.5 w-3.5" /> Category
                </Btn>
              )}
            </div>
            {byCategory.length === 0 ? (
              <p className="text-sm text-slate-400">No expenses this month yet.</p>
            ) : (
              <ul className="space-y-2">
                {byCategory.map((c) => {
                  const pct = monthTotal ? Math.round((c.total / monthTotal) * 100) : 0;
                  return (
                    <li key={c.id}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="truncate text-slate-600">{c.name}</span>
                        <span className="num shrink-0 font-medium">
                          {formatINR(c.total)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={open}
        title={editing ? "Edit expense" : "Add expense"}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Category *">
              <Select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">— Select —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Labeled>
            <Labeled label="Date paid *">
              <input
                type="date"
                value={form.paid_at}
                onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Amount (₹) *">
              <TextInput
                value={form.amount}
                inputMode="decimal"
                autoFocus
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Labeled>
            <Labeled label="Payment mode">
              <Select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as Mode })}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Labeled>
          </div>
          <Labeled
            label="Module attribution *"
            hint="Select every module this expense supports. Shared expenses are tagged, not split."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPENSE_MODULES.map((module) => (
                <label
                  key={module.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    form.modules.includes(module.id)
                      ? "border-teal-200 bg-teal-50/60"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.modules.includes(module.id)}
                    onChange={() => toggleModule(module.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                  />
                  {module.label}
                </label>
              ))}
            </div>
          </Labeled>
          <Labeled label="Payee / vendor">
            <TextInput
              value={form.payee}
              onChange={(e) => setForm({ ...form, payee: e.target.value })}
              placeholder="e.g. Sharma Medicals"
            />
          </Labeled>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Bill / invoice no.">
              <TextInput
                value={form.bill_no}
                onChange={(e) => setForm({ ...form, bill_no: e.target.value })}
              />
            </Labeled>
            <Labeled label="Note">
              <TextInput
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Optional"
              />
            </Labeled>
          </div>
          <ErrorNote message={error} />
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add expense"}
            </Btn>
          </div>
        </form>
      </Modal>

      <Modal open={catOpen} title="Expense categories" onClose={() => setCatOpen(false)}>
        <form onSubmit={addCategory} className="space-y-3">
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{c.name}</span>
                <span className="text-xs text-slate-400">
                  {formatINR(
                    monthRows
                      .filter((r) => r.category_id === c.id)
                      .reduce((s, r) => s + r.amount_paise, 0)
                  )}
                </span>
              </li>
            ))}
          </ul>
          <Labeled label="Add a category">
            <div className="flex gap-2">
              <TextInput
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="e.g. Equipment rental"
              />
              <Btn type="submit" variant="primary" className="shrink-0">
                Add
              </Btn>
            </div>
          </Labeled>
          <ErrorNote message={catError} />
          <p className="text-xs text-slate-400">
            Categories can't be renamed or removed yet — that arrives with the settings
            module.
          </p>
        </form>
      </Modal>
    </>
  );
}

/** Payments received in the given yyyy-mm month (admin-only profit tile). */
function useMonthRevenue(month: string, enabled: boolean): number {
  const [revenue, setRevenue] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setRevenue(0);
      return;
    }
    void (async () => {
      const [y, m] = month.split("-").map(Number);
      if (!y || !m) return;
      const from = new Date(y, m - 1, 1, 0, 0, 0, 0).getTime();
      const to = new Date(y, m, 1, 0, 0, 0, 0).getTime();
      const db = await getDb();
      const [, tenantParams] = tenantAnd();
      const row = await db.get<{ v: number }>(
        `SELECT COALESCE(SUM(p.amount_paise), 0) AS v FROM payments p
         JOIN invoices i ON i.id = p.invoice_id AND i.tenant_id = p.tenant_id
         WHERE p.deleted = 0 AND i.deleted = 0 AND i.status <> 'cancelled'
           AND p.paid_at >= ? AND p.paid_at < ? AND p.tenant_id = ? AND i.tenant_id = ?`,
        [from, to, ...tenantParams, ...tenantParams]
      );
      setRevenue(row?.v ?? 0);
    })();
  }, [month, enabled]);
  return revenue;
}
