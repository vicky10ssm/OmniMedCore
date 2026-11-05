import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { getSetting } from "../db/settings";
import { tenantAnd } from "../db/tenant";
import {
  ALL_MODULE_IDS,
  MODULES_CHANGED_EVENT,
  readEnabledModules,
  type ModuleId,
} from "../app/modules";
import { APP_NAME, APP_TAGLINE } from "../app/brand";
import { useLicense } from "../licensing/LicenseContext";
import { READ_ONLY_MODULES } from "../licensing/types";
import { Icon } from "./kit";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  section?: string;
  moduleId?: ModuleId;
  /** Hidden from terminal operators; their default screen is Expenses. */
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: "dashboard",
    section: "Overview",
    adminOnly: true,
  },
  {
    to: "/patients",
    label: "Patients",
    icon: "users",
    section: "Front desk",
    moduleId: "patients",
  },
  { to: "/billing", label: "New Bill", icon: "plus", moduleId: "billing" },
  { to: "/invoices", label: "Invoices", icon: "receipt", moduleId: "invoices" },
  { to: "/dues", label: "Dues", icon: "rupee", moduleId: "dues" },
  {
    to: "/admissions",
    label: "Admissions",
    icon: "users",
    section: "Hospital",
    moduleId: "admissions",
  },
  { to: "/samples", label: "Samples", icon: "alert", section: "Diagnostics", moduleId: "samples" },
  { to: "/reports", label: "Reports", icon: "flask", moduleId: "reports" },
  { to: "/tests", label: "Tests & Packages", icon: "chart", moduleId: "tests" },
  { to: "/doctors", label: "Doctors", icon: "stethoscope", moduleId: "doctors" },
  { to: "/pharmacy", label: "Pharmacy", icon: "flask", section: "Pharmacy", moduleId: "pharmacy" },
  { to: "/expenses", label: "Expenses", icon: "wallet", section: "Money", moduleId: "expenses" },
  {
    to: "/compliance",
    label: "Compliance",
    icon: "check",
    section: "System",
    moduleId: "compliance",
    adminOnly: true,
  },
  { to: "/settings", label: "Settings", icon: "settings", adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const license = useLicense();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [labName, setLabName] = useState("");
  const [logoData, setLogoData] = useState("");
  const [enabledModules, setEnabledModules] = useState<Set<ModuleId>>(
    () => new Set(ALL_MODULE_IDS)
  );
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const loadBranding = async () => {
      const db = await getDb();
      setLabName(await getSetting(db, "lab_name"));
      setLogoData(await getSetting(db, "logo_data"));
      setEnabledModules(await readEnabledModules(db));
    };
    void loadBranding();
    window.addEventListener(MODULES_CHANGED_EVENT, loadBranding);
    window.addEventListener("diagbill:branding-changed", loadBranding);
    return () => {
      window.removeEventListener(MODULES_CHANGED_EVENT, loadBranding);
      window.removeEventListener("diagbill:branding-changed", loadBranding);
    };
  }, []);

  useEffect(() => {
    void getDb().then(async (db) => {
      const [tenantClause, tenantParams] = tenantAnd();
      const tables = [
        "patients",
        "tests",
        "packages",
        "doctors",
        "invoices",
        "invoice_items",
        "payments",
        "report_orders",
        "expenses",
      ];
      let total = 0;
      for (const t of tables) {
        const r = await db.get<{ n: number }>(
          `SELECT COUNT(*) AS n FROM ${t} WHERE dirty = 1 ${tenantClause}`,
          tenantParams
        );
        total += r?.n ?? 0;
      }
      setPending(total);
    });
  }, []);

  const syncNote = pending
    ? `${pending} record${pending === 1 ? "" : "s"} waiting`
    : "All changes saved locally";

  useEffect(() => setDrawer(false), [location.pathname]);

  const visibleNav = NAV.filter(
    (item) =>
      (!item.adminOnly || user?.role === "admin") &&
      (!item.moduleId ||
        (enabledModules.has(item.moduleId) &&
          license.modules.has(item.moduleId) &&
          (!license.readOnly || READ_ONLY_MODULES.has(item.moduleId))))
  );

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {visibleNav.map((item, i) => {
        const showSection =
          item.section && (i === 0 || visibleNav[i - 1].section !== item.section);
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
          O
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {labName || APP_NAME}
        </p>
        <p className="truncate text-[11px] text-slate-400">{APP_TAGLINE}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-60 shrink-0 flex-col bg-slate-900 md:flex">
        {brand}
        {nav}
        <div className="border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">
          {syncNote}
        </div>
      </aside>

      {/* Mobile drawer */}
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
          <div className="hidden md:block" />
          <div className="ml-auto flex items-center gap-3">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
                syncNote ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
              title={syncNote}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${syncNote ? "bg-emerald-500" : "bg-emerald-500"}`}
              />
              {syncNote || "Local database"}
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
            {license.status === "grace" && (
              <div className="no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Licence expired and is in the 30-day grace period. Renew from Settings â†’ Licence.
              </div>
            )}
            {license.status === "expired" && (
              <div className="no-print mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                Licence grace period has ended. OmniMed Core is in read-only mode; existing records can be
                viewed, printed and exported. Renew from Settings â†’ Licence.
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
