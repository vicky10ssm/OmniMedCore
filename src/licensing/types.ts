import type { ModuleId } from "../app/modules";

export type Edition = "diagnostics" | "pharmacy" | "hospital" | "complete" | "custom";

export interface LicensePayload {
  v: 1;
  licenseId: string;
  customerName: string;
  tenantIds: string[];
  deviceIds: string[];
  edition: Edition;
  modules: ModuleId[];
  maxTerminals: number;
  issuedAt: number;
  expiresAt: number | null;
  graceDays: number;
  status: "active" | "revoked";
  supportReference?: string;
}

export interface LicenseFile {
  payload: LicensePayload;
  signature: string;
}

export type LicenseStatus =
  | "loading"
  | "active"
  | "grace"
  | "expired"
  | "unlicensed"
  | "invalid";

export interface LicenseRuntime {
  status: LicenseStatus;
  payload: LicensePayload | null;
  modules: Set<ModuleId>;
  deviceId: string;
  tenantId: string;
  /** True after grace: existing data/print/export only, no new clinical/financial writes. */
  readOnly: boolean;
  error: string;
  daysRemaining: number | null;
}

/** Modules that remain readable/exportable after licence grace expires. */
export const READ_ONLY_MODULES = new Set<ModuleId>([
  "invoices",
  "dues",
  "admissions",
  "reports",
  "pharmacy",
  "expenses",
  "compliance",
]);

export const EDITION_MODULES: Record<Edition, ModuleId[]> = {
  diagnostics: [
    "patients",
    "billing",
    "invoices",
    "dues",
    "samples",
    "reports",
    "tests",
    "doctors",
    "expenses",
    "compliance",
  ],
  pharmacy: ["patients", "pharmacy", "expenses", "compliance"],
  hospital: ["patients", "admissions", "expenses", "compliance"],
  complete: [
    "patients",
    "billing",
    "invoices",
    "dues",
    "admissions",
    "samples",
    "reports",
    "tests",
    "doctors",
    "pharmacy",
    "expenses",
    "compliance",
  ],
  custom: [],
};
