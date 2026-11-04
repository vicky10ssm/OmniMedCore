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
import { getCurrentTenantId } from "../db/tenant";
import { isTauriRuntime } from "../db/tauriStorage";
import type { ModuleId } from "../app/modules";
import type { Edition, LicenseFile, LicensePayload } from "./types";
import { EDITION_MODULES } from "./types";
import {
  GetMachineFingerprint,
  licenseBindsToDevice,
} from "./deviceIdentity";
import {
  ClockManipulationError,
  CLOCK_TAMPER_EVENT,
  UpdateExecutionTimestamp,
} from "./executionClock";
import {
  clearLegacyBrowserLicense,
  clearStoredLicense,
  loadStoredLicense,
  readLegacyBrowserLicense,
  storeLicense,
} from "./secureLicenseStore";
import {
  parseLicenseJson,
  statusForPayload,
  validModuleSet,
  verifyLicenseFile,
} from "./verify";

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
  removeLicense: () => Promise<void>;
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

  const revokeForClock = useCallback((message: string) => {
    setPayload(null);
    setModules(new Set());
    setStatus("invalid");
    setReadOnly(true);
    setDaysRemaining(null);
    setError(message);
  }, []);

  const apply = useCallback(
    async (file: LicenseFile, tenant: string, device: string) => {
      if (file.signature === "development" && !import.meta.env.DEV) {
        throw new Error(
          "Development licences are not accepted by a production build. Import a vendor-signed licence file."
        );
      }

      // The high-water mark is checked before licence expiry or grace status.
      await UpdateExecutionTimestamp();

      const verified =
        file.signature === "development" ? file.payload : await verifyLicenseFile(file);
      if (!verified.tenantIds.includes(tenant)) {
        throw new Error(
          `This licence is not issued for tenant ${tenant}. Request a licence for this installation.`
        );
      }
      if (!licenseBindsToDevice(verified.deviceIds, device)) {
        throw new Error(
          `Hardware mismatch: this licence is not activated for this device. Send the current Device ID to MediCore to reissue the licence for this machine.`
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
      const device = await GetMachineFingerprint();
      setTenantId(tenant);
      setDeviceId(device);

      // App startup is itself a critical action, even before a licence is
      // present. This keeps the high-water mark alive across licence removal.
      await UpdateExecutionTimestamp();

      const secure = await loadStoredLicense();
      let stored = secure;
      let legacyMigration = false;
      if (!stored && isTauriRuntime()) {
        // One-release migration for installations that stored the signed
        // JSON in localStorage. It is accepted only after the same signature,
        // tenant and hardware checks, then rewritten through DPAPI. Remove the
        // plaintext copy immediately; it is never used again after this boot.
        stored = readLegacyBrowserLicense();
        legacyMigration = Boolean(stored);
      }
      if (isTauriRuntime()) {
        // The DPAPI file is authoritative. Remove a stale plaintext copy even
        // when the secure licence already exists.
        clearLegacyBrowserLicense();
      }

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
      if (legacyMigration && stored) {
        await storeLicense(stored);
      }
    } catch (e) {
      setPayload(null);
      setModules(new Set());
      setStatus("invalid");
      setReadOnly(true);
      setDaysRemaining(null);
      setError(e instanceof Error ? e.message : "Could not verify the licence");
      if (isTauriRuntime()) clearLegacyBrowserLicense();
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  // A critical action (print/report save) reports a clock rollback here so the
  // whole UI leaves the active state immediately, not just the action that
  // happened to notice it.
  useEffect(() => {
    const onClockTamper = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      revokeForClock(detail || "System Clock Manipulation Detected.");
    };
    window.addEventListener(CLOCK_TAMPER_EVENT, onClockTamper);
    return () => window.removeEventListener(CLOCK_TAMPER_EVENT, onClockTamper);
  }, [revokeForClock]);

  // Catch a rollback while the app is left open. Critical actions also call
  // UpdateExecutionTimestamp; this is the in-session safety net.
  useEffect(() => {
    if (status === "loading" || status === "unlicensed" || status === "invalid") return;
    let cancelled = false;
    const check = async () => {
      try {
        await UpdateExecutionTimestamp();
      } catch (e) {
        if (!cancelled) {
          revokeForClock(
            e instanceof ClockManipulationError
              ? e.message
              : e instanceof Error
                ? e.message
                : "System Clock Manipulation Detected."
          );
        }
      }
    };
    const timer = window.setInterval(() => void check(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status, revokeForClock]);

  const importLicenseText = useCallback(
    async (text: string) => {
      const file = parseLicenseJson(text);
      const device = deviceId || (await GetMachineFingerprint());
      await apply(file, tenantId, device);
      try {
        await storeLicense(JSON.stringify(file));
      } catch (e) {
        revokeForClock(
          e instanceof Error
            ? `The licence could not be saved securely: ${e.message}`
            : "The licence could not be saved securely."
        );
        throw e;
      }
    },
    [apply, deviceId, revokeForClock, tenantId]
  );

  const removeLicense = useCallback(async () => {
    try {
      await clearStoredLicense();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not remove the protected licence: ${e.message}`
          : "Could not remove the protected licence."
      );
      return;
    }
    if (import.meta.env.DEV) {
      await load();
    } else {
      setStatus("unlicensed");
      setPayload(null);
      setModules(new Set());
      setReadOnly(false);
      setDaysRemaining(null);
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
