// Expense attribution across service lines. A shared expense can belong to
// more than one module; the amount is not split, it is tagged for reporting.

export const EXPENSE_MODULES = [
  { id: "pathology", label: "Pathology" },
  { id: "xray", label: "X-ray" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "hospital", label: "Hospital" },
  { id: "general", label: "General / shared" },
] as const;

export type ExpenseModuleId = (typeof EXPENSE_MODULES)[number]["id"];

const KNOWN = new Set<string>(EXPENSE_MODULES.map((module) => module.id));

export function parseExpenseModules(raw: string | null | undefined): ExpenseModuleId[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is ExpenseModuleId =>
        typeof value === "string" && KNOWN.has(value)
    );
  } catch {
    return [];
  }
}

export function serializeExpenseModules(modules: ExpenseModuleId[]): string {
  return JSON.stringify(
    EXPENSE_MODULES.filter((module) => modules.includes(module.id)).map(
      (module) => module.id
    )
  );
}

export function expenseModulesLabel(raw: string | null | undefined): string {
  const modules = parseExpenseModules(raw);
  if (modules.length === 0) return "Unassigned";
  return modules
    .map(
      (id) =>
        EXPENSE_MODULES.find((module) => module.id === id)?.label ?? id
    )
    .join(", ");
}
