// Route guards.
//
// Hiding a navigation link is a convenience, not a control: the URL is still
// reachable, and a receptionist could see the centre's expenses by typing
// `#/expenses`. Anything hidden from a role must also be blocked here.

import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import {
  MODULES_CHANGED_EVENT,
  readEnabledModules,
  type ModuleId,
} from "../app/modules";
import { useLicense } from "../licensing/LicenseContext";
import { READ_ONLY_MODULES } from "../licensing/types";

/** Renders children only for admins; anyone else is sent to their role home. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Blocks a direct URL when the clinic disabled that module.
 * Load errors fail open so a settings-read problem cannot hide patient care.
 */
export function ModuleGate({
  moduleId,
  children,
  fallback = "/",
}: {
  moduleId: ModuleId;
  children: ReactNode;
  /** Safe destination when this module is hidden or unlicensed. */
  fallback?: string;
}) {
  const license = useLicense();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const db = await getDb();
        const ids = await readEnabledModules(db);
        if (alive) setEnabled(ids.has(moduleId));
      } catch {
        if (alive) setEnabled(true);
      }
    };
    void load();
    window.addEventListener(MODULES_CHANGED_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(MODULES_CHANGED_EVENT, load);
    };
  }, [moduleId]);

  if (enabled === null) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  }
  if (!license.modules.has(moduleId)) return <Navigate to={fallback} replace />;
  if (license.readOnly && !READ_ONLY_MODULES.has(moduleId)) {
    return <Navigate to={fallback} replace />;
  }
  if (!enabled) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
