// Monitoring layout — the read-only web version's shell.
//
// Same visual language as the terminal, but the navigation contains only pages
// that can be safely served read-only, and there is a permanent reminder that
// this is a viewer. The absence of editing controls is enforced separately:
// pages branch on `useMonitor()` and the database itself rejects writes.
//
// Money sections are hidden from operators. A receptionist needs to check a
// bill or a report; she does not need the centre's expenses on a personal
// phone.

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { getSetting } from "../db/settings";
import { useMonitor } from "../app/MonitorContext";
import {
  ALL_MODULE_IDS,
  MODULES_CHANGED_EVENT,
  readEnabledModules,
  type ModuleId,
} from "../app/modules";
import { APP_NAME, APP_TAGLINE } from "../app/brand";
import { useLicense } from "../licensing/LicenseContext";
import { READ_ONLY_MODULES } from "../licensing/types";
import { Icon } from "../ui/kit";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  section?: string;
  /** Money screens — admins only. */
  adminOnly?: boolean;
  moduleId?: ModuleId;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "dashboard", section: "Overview" },
  {
    to: "/invoices",
    label: "Invoices",
    icon: "receipt",
    section: "Front desk",
    moduleId: "invoices",
  },
  { to: "/dues", label: "Dues", icon: "rupee", moduleId: "dues" },
  {
    to: "/admissions",
    label: "Admissions",
    icon: "users",
    section: "Hospital",
    moduleId: "admissions",
  },
  { to: "/reports", label: "Reports", icon: "flask", section: "Diagnostics", moduleId: "reports" },
  { to: "/pharmacy", label: "Pharmacy", icon: "flask", section: "Pharmacy", moduleId: "pharmacy" },
  {
    to: "/expenses",
    label: "Expenses",
    icon: "wallet",
    section: "Money",
    adminOnly: true,
    moduleId: "expenses",
  },
];

export default function MonitorLayout() {
  const { user, logout } = useAuth();
  const license = useLicense();
  const { cloudState, cloudNote } = useMonitor();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [labName, setLabName] = useState("");
  const [logoData, setLogoData] = useState("");
  const [enabledModules, setEnabledModules] = useState<Set<ModuleId>>(
    () => new Set(ALL_MODULE_IDS)
  );

  useEffect(() => {
    const loadBranding = async () => {
      const db = await getDb();
      setLabName(await getSetting(db, "lab_name"));
      setLogoData(await getSetting(db, "logo_data"));
      setEnabledModules(await readEnabledModules(db));
    };
    void loadBranding();
    window.addEventListener(MODULES_CHANGED_EVENT, loadBranding);
    return () => window.removeEventListener(MODULES_CHANGED_EVENT, loadBranding);
  }, []);

  useEffect(() => setDrawer(false), [location.pathname]);

  const items = NAV.filter(
    (n) =>
      (!n.adminOnly || user?.role === "admin") &&
      (!n.moduleId ||
        (enabledModules.has(n.moduleId) &&
          license.modules.has(n.moduleId) &&
          (!license.readOnly || READ_ONLY_MODULES.has(n.moduleId))))
  );

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {items.map((item, i) => {
        const showSection =
          item.section && (i === 0 || items[i - 1].section !== item.section);
        return (
          <div key={item.to}>
            {showSection && (
              <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:mt-1">
                {item.section}
              </p>
            )}
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-600/15 text-teal-700"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          </div>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
      {logoData ? (
        <img
          src={logoData}
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-sm font-bold text-white">
          M
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {labName || APP_NAME}
        </p>
        <p className="truncate text-[11px] text-slate-400">{APP_TAGLINE} · Monitoring</p>
      </div>
    </div>
  );

  const cloudTone =
    cloudState === "live"
      ? "bg-emerald-50 text-emerald-700"
      : cloudState === "error"
        ? "bg-rose-50 text-rose-600"
        : cloudState === "connecting"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-500";

  return (
    <div className="flex h-full">
      <aside className="no-print hidden w-60 shrink-0 flex-col bg-slate-900 md:flex">
        {brand}
        {nav}
        <div className="border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">
          Read-only view
        </div>
      </aside>

      {drawer && (
        <div className="no-print fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setDrawer(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-xl">
            {brand}
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 md:px-6">
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${cloudTone}`}
              title={cloudNote}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {cloudNote || "Read-only"}
            </span>
            <div className="text-right">
              <p className="text-xs font-semibold leading-tight">
                {user?.full_name || user?.username}
              </p>
              <p className="text-[11px] capitalize leading-tight text-slate-400">
                {user?.role}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Sign out"
            >
              <Icon name="logout" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="no-print mb-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
              <Icon name="alert" className="h-4 w-4 shrink-0" />
              <span>
                You are viewing a read-only monitoring copy. Billing and record
                entry happen only on the centre's computers.
              </span>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
