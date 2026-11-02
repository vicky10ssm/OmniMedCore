import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDb } from "../db";
import { getDeviceId } from "../db/helpers";
import { getCurrentTenantId } from "../db/tenant";
import type { ModuleId } from "../app/modules";
import type { Edition, LicenseFile, LicensePayload } from "./types";
import { EDITION_MODULES } from "./types";
import {
  parseLicenseJson,
  statusForPayload,
  validModuleSet,
  verifyLicenseFile,
} from "./verify";

const LICENSE_STORAGE_KEY = "medicore.license.v1";

interface LicenseContextValue {
  status: "loading" | "active" | "grace" | "expired" | "unlicensed" | "invalid";
  payload: LicensePayload | null;
  modules: Set<ModuleId>;
  tenantId: string;
  deviceId: string;
  readOnly: boolean;
  daysRemaining: number | null;
  error: string;
  dbUnavailable: boolean;
  importLicenseText: (text: string) => Promise<void>;
  removeLicense: () => void;
  reloadLicense: () => Promise<void>;
  editionLabel: string;
}

const Ctx = createContext<LicenseContextValue | null>(null);

function editionLabel(payload: LicensePayload | null): string {
  if (!payload) return "Unlicensed";
  return payload.edition === "custom"
    ? "Custom"
    : payload.edition.charAt(0).toUpperCase() + payload.edition.slice(1);
}

function developmentLicense(tenantId: string, deviceId: string): LicenseFile {
  let modules: ModuleId[] = [...EDITION_MODULES.complete];
  try {
    const override = localStorage.getItem("medicore.devEdition") as Edition | null;
    if (override && EDITION_MODULES[override]) modules = [...EDITION_MODULES[override]];
  } catch {
    // localStorage unavailable: keep complete development licence
  }
  const now = Date.now();
  return {
    payload: {
      v: 1,
      licenseId: "DEV-LICENSE",
      customerName: "Development / demonstration licence",
      tenantIds: [tenantId],
      deviceIds: [deviceId],
      edition: "complete",
      modules,
      maxTerminals: 99,
      issuedAt: now - 86_400_000,
      expiresAt: now + 3650 * 86_400_000,
      graceDays: 30,
      status: "active",
      supportReference: "development",
    },
    signature: "development",
  };
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenseContextValue["status"]>("loading");
  const [payload, setPayload] = useState<LicensePayload | null>(null);
  const [modules, setModules] = useState<Set<ModuleId>>(new Set());
  const [tenantId, setTenantId] = useState(getCurrentTenantId());
  const [deviceId, setDeviceId] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [dbUnavailable, setDbUnavailable] = useState(false);

  const apply = useCallback(
    async (file: LicenseFile, tenant: string, device: string) => {
      const verified = file.signature === "development" ? file.payload : await verifyLicenseFile(file);
      if (!verified.tenantIds.includes(tenant)) {
        throw new Error(
          `This licence is not issued for tenant ${tenant}. Request a licence for this installation.`
        );
      }
      if (!verified.deviceIds.includes(device)) {
        throw new Error(
          `This licence is not activated for device ${device}. Send this device ID to MediCore to activate it.`
        );
      }
      const state = statusForPayload(verified);
      setPayload(verified);
      setModules(validModuleSet(verified));
      setStatus(state.status);
      setReadOnly(state.readOnly);
      setDaysRemaining(state.daysRemaining);
      setError("");
    },
    []
  );

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      await getDb();
      setDbUnavailable(false);
    } catch (e) {
      // An encrypted database has not been unlocked yet. Boot will unlock it
      // first; LicenseGate retries once the database becomes readable.
      setDbUnavailable(true);
      setPayload(null);
      setModules(new Set());
      setStatus("invalid");
      setReadOnly(true);
      setError(e instanceof Error ? e.message : "Could not open the database");
      return;
    }

    try {
      const tenant = getCurrentTenantId();
      const device = getDeviceId();
      setTenantId(tenant);
      setDeviceId(device);

      const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
      let file: LicenseFile;
      if (stored) {
        file = parseLicenseJson(stored);
      } else if (import.meta.env.DEV) {
        file = developmentLicense(tenant, device);
      } else {
        setPayload(null);
        setModules(new Set());
        setStatus("unlicensed");
        setReadOnly(false);
        setDaysRemaining(null);
        return;
      }
      await apply(file, tenant, device);
    } catch (e) {
      setPayload(null);
      setModules(new Set());
      setStatus("invalid");
      setReadOnly(true);
      setError(e instanceof Error ? e.message : "Could not verify the licence");
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const importLicenseText = useCallback(
    async (text: string) => {
      const file = parseLicenseJson(text);
      await apply(file, tenantId, deviceId || getDeviceId());
      localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(file));
    },
    [apply, deviceId, tenantId]
  );

  const removeLicense = useCallback(() => {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
    if (import.meta.env.DEV) {
      void load();
    } else {
      setStatus("unlicensed");
      setPayload(null);
      setModules(new Set());
      setReadOnly(false);
    }
  }, [load]);

  const value = useMemo(
    () => ({
      status,
      payload,
      modules,
      tenantId,
      deviceId,
      readOnly,
      daysRemaining,
      error,
      dbUnavailable,
      importLicenseText,
      removeLicense,
      reloadLicense: load,
      editionLabel: editionLabel(payload),
    }),
    [
      status,
      payload,
      modules,
      tenantId,
      deviceId,
      readOnly,
      daysRemaining,
      error,
      dbUnavailable,
      importLicenseText,
      removeLicense,
      load,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLicense(): LicenseContextValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useLicense outside LicenseProvider");
  return value;
}
