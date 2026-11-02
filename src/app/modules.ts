// Per-tenant clinic module visibility.
//
// Dashboard and Settings are always available. Everything else can be hidden
// for a centre that does not use it. Visibility is presentation/configuration,
// not a security boundary; route guards still enforce admin/report permissions.

import type { DataSource } from "../db";
import { getSetting } from "../db/settings";

export const MODULES_CHANGED_EVENT = "diagbill:modules-changed";
export const ENABLED_MODULES_KEY = "enabled_modules";

export const MODULE_DEFINITIONS = [
  {
    id: "patients",
    label: "Patients",
    description: "Patient registration, identity, consent and history",
  },
  {
    id: "billing",
    label: "New Bill",
    description: "Create GST invoices and collect payment",
  },
  {
    id: "invoices",
    label: "Invoices",
    description: "Invoice list and invoice detail/reprint",
  },
  {
    id: "dues",
    label: "Dues",
    description: "Outstanding balances and balance collection",
  },
  {
    id: "admissions",
    label: "Admissions",
    description: "Hospital inpatient admission, ward/bed and discharge summary",
  },
  {
    id: "samples",
    label: "Samples",
    description: "Accession, collection, receipt and acceptance",
  },
  {
    id: "reports",
    label: "Reports",
    description: "Result entry, verification, amendment and printing",
  },
  {
    id: "tests",
    label: "Tests & Packages",
    description: "Rate list, report parameters and specimen metadata",
  },
  {
    id: "doctors",
    label: "Doctors",
    description: "Referring doctors directory and contact details",
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    description: "Medicine inventory, batches, expiry, stock and dispensing",
  },
  {
    id: "expenses",
    label: "Expenses",
    description: "Expense entry and category reporting",
  },
  {
    id: "compliance",
    label: "Compliance",
    description: "Audit evidence and compliance overview",
  },
] as const;

export type ModuleId = (typeof MODULE_DEFINITIONS)[number]["id"];

export const ALL_MODULE_IDS: ModuleId[] = MODULE_DEFINITIONS.map((m) => m.id);

/** Missing/empty configuration means every existing module is enabled. */
export function parseEnabledModules(raw: string): Set<ModuleId> {
  if (!raw.trim()) return new Set(ALL_MODULE_IDS);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set(ALL_MODULE_IDS);
    const known = new Set(ALL_MODULE_IDS);
    return new Set(
      parsed.filter((id): id is ModuleId => typeof id === "string" && known.has(id as ModuleId))
    );
  } catch {
    return new Set(ALL_MODULE_IDS);
  }
}

export async function readEnabledModules(db: DataSource): Promise<Set<ModuleId>> {
  return parseEnabledModules(await getSetting(db, ENABLED_MODULES_KEY, ""));
}

export function notifyModulesChanged(): void {
  window.dispatchEvent(new Event(MODULES_CHANGED_EVENT));
}
