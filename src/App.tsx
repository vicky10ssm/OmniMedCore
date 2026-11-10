// App shell.
//
// Two builds share this file. `isMonitor()` picks which layout and which page
// set is mounted, but the components themselves are shared — a page such as
// Invoices renders its CSV export in both, and only its write controls are
// hidden. Keeping one route table means a fix to a query shows up in both
// products rather than drifting.

import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { MonitorContext, type MonitorContextValue } from "./app/MonitorContext";
import { isMonitor } from "./app/mode";
import { LicenseProvider, useLicense } from "./licensing/LicenseContext";
import { LicenseGate } from "./pages/License";
import Layout from "./ui/Layout";
import MonitorLayout from "./ui/MonitorLayout";
import { AdminOnly, ModuleGate } from "./ui/guards";
import UnlockScreen from "./db/UnlockScreen";
import { useState } from "react";
import Login, { ForcePasswordChange } from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Tests from "./pages/Tests";
import Doctors from "./pages/Doctors";
import Radiologists from "./pages/Radiologists";
import Pathologists from "./pages/Pathologists";
import Billing from "./pages/Billing";
import Invoices from "./pages/Invoices";
import InvoiceView from "./pages/InvoiceView";
import Dues from "./pages/Dues";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Samples from "./pages/Samples";
import Admissions from "./pages/Admissions";
import Pharmacy from "./pages/Pharmacy";
import Compliance from "./pages/Compliance";
import Settings from "./pages/Settings";

function Boot({ children }: { children: React.ReactNode }) {
  const { user, ready, bootError, retryBoot } = useAuth();
  const [locked, setLocked] = useState(false);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-slate-500">Opening database…</div>
      </div>
    );
  }
  // The database is encrypted and this session has no key yet. This is a normal
  // state, not a failure — so it gets a screen, not an error box.
  if (locked || bootError === "ENCRYPTED_LOCKED") {
    return (
      <UnlockScreen
        onUnlocked={() => {
          setLocked(false);
          retryBoot();
        }}
      />
    );
  }
  if (bootError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm">
          <p className="font-semibold text-rose-800">Can't open the database</p>
          <p className="mt-1 text-rose-700">{bootError}</p>
        </div>
      </div>
    );
  }
  if (!user) return <Login />;
  if (user.must_change_password) return <ForcePasswordChange />;
  return <>{children}</>;
}

/**
 * Terminal home. Operators work from Expenses and must not see the financial
 * dashboard; admins keep the full overview. Monitor mode has its own dashboard
 * route below, so this redirect never applies to the read-only web view.
 */
function TerminalHome() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/expenses" replace />;
  return <Dashboard />;
}

/**
 * Safe destination for an operator whose Expenses module is unavailable.
 * Settings is administrator-only, so it cannot be the fallback any more.
 */
function NoAccessibleSections() {
  const { user, logout } = useAuth();
  if (user?.role === "admin") return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Expenses is unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          The Expenses section is not licensed or enabled for {user?.full_name || user?.username}. Ask
          an administrator to enable it or use another section from the sidebar.
        </p>
        <button
          onClick={logout}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function ExpensesRoute() {
  const { user } = useAuth();
  return (
    <ModuleGate
      moduleId="expenses"
      fallback={user?.role === "admin" ? "/" : "/unavailable"}
    >
      <Expenses />
    </ModuleGate>
  );
}

/**
 * Route elements shared by both products.
 *
 * These are arrays, not components: React Router inspects `<Routes>`' direct
 * children and rejects anything that is not a `<Route>` or a fragment, so a
 * wrapper component (rendering `<SharedRoutes />`) would throw at runtime.
 */
const sharedRoutes = [
  <Route key="dashboard" path="/" element={<TerminalHome />} />,
  <Route
    key="invoices"
    path="/invoices"
    element={
      <ModuleGate moduleId="invoices">
        <Invoices />
      </ModuleGate>
    }
  />,
  <Route
    key="invoice"
    path="/invoices/:id"
    element={
      <ModuleGate moduleId="invoices">
        <InvoiceView />
      </ModuleGate>
    }
  />,
  <Route
    key="dues"
    path="/dues"
    element={
      <ModuleGate moduleId="dues">
        <Dues />
      </ModuleGate>
    }
  />,
  <Route
    key="bench"
    path="/bench"
    element={
      <ModuleGate moduleId="reports">
        <Reports initialView="bench" />
      </ModuleGate>
    }
  />,
  <Route
    key="reports"
    path="/reports"
    element={
      <ModuleGate moduleId="reports">
        <Reports initialView="reports" />
      </ModuleGate>
    }
  />,
  <Route key="expenses" path="/expenses" element={<ExpensesRoute />} />,
  <Route
    key="admissions"
    path="/admissions"
    element={
      <ModuleGate moduleId="admissions">
        <Admissions />
      </ModuleGate>
    }
  />,
  <Route
    key="pharmacy"
    path="/pharmacy"
    element={
      <ModuleGate moduleId="pharmacy">
        <Pharmacy />
      </ModuleGate>
    }
  />,
];

/**
 * Monitoring routes, with money screens wrapped in the admin guard. The same
 * pages exist in the terminal without the guard — there, an operator gaining
 * `#/expenses` is a legitimate member of staff on the centre's own machine,
 * not a personal phone on the internet.
 */
const monitorRoutes = [
  <Route key="dashboard" path="/" element={<Dashboard />} />,
  ...sharedRoutes.filter((r) => r.key !== "dashboard" && r.key !== "expenses"),
  <Route
    key="expenses"
    path="/expenses"
    element={
      <ModuleGate moduleId="expenses">
        <AdminOnly>
          <Expenses />
        </AdminOnly>
      </ModuleGate>
    }
  />,
];

/** Terminal-only routes — this is where data entry happens. */
const terminalRoutes = [
  <Route
    key="patients"
    path="/patients"
    element={
      <ModuleGate moduleId="patients">
        <Patients />
      </ModuleGate>
    }
  />,
  <Route
    key="samples"
    path="/samples"
    element={
      <ModuleGate moduleId="samples">
        <Samples />
      </ModuleGate>
    }
  />,
  <Route
    key="tests"
    path="/tests"
    element={
      <ModuleGate moduleId="tests">
        <Tests />
      </ModuleGate>
    }
  />,
  <Route
    key="doctors"
    path="/doctors"
    element={
      <ModuleGate moduleId="doctors">
        <Doctors />
      </ModuleGate>
    }
  />,
  <Route
    key="radiologists"
    path="/radiologists"
    element={
      <ModuleGate moduleId="reports">
        <AdminOnly>
          <Radiologists />
        </AdminOnly>
      </ModuleGate>
    }
  />,
  <Route
    key="pathologists"
    path="/pathologists"
    element={
      <ModuleGate moduleId="reports">
        <AdminOnly>
          <Pathologists />
        </AdminOnly>
      </ModuleGate>
    }
  />,
  <Route
    key="billing"
    path="/billing"
    element={
      <ModuleGate moduleId="billing">
        <Billing />
      </ModuleGate>
    }
  />,
  <Route
    key="compliance"
    path="/compliance"
    element={
      <ModuleGate moduleId="compliance">
        <AdminOnly>
          <Compliance />
        </AdminOnly>
      </ModuleGate>
    }
  />,
  <Route key="unavailable" path="/unavailable" element={<NoAccessibleSections />} />,
  <Route
    key="settings"
    path="/settings"
    element={
      <AdminOnly>
        <Settings />
      </AdminOnly>
    }
  />,
];

export default function App() {
  const monitor = isMonitor();
  return (
    <LicenseProvider>
      <AppShell monitorBuild={monitor} />
    </LicenseProvider>
  );
}

function AppShell({ monitorBuild }: { monitorBuild: boolean }) {
  const license = useLicense();
  const monitor = monitorBuild || license.readOnly;

  // The cloud tier is not connected yet, so a local monitoring session tells
  // the truth: it is a read-only mirror with no sync behind it. When the push
  // API lands, this object is what starts reporting "Synced 2 min ago".
  const monitorValue: MonitorContextValue = {
    monitor,
    cloudState: "disabled",
    cloudNote: monitorBuild
      ? "Local read-only view"
      : license.readOnly
        ? "Licence expired — read-only"
        : "",
  };

  return (
    <MonitorContext.Provider value={monitorValue}>
      <AuthProvider>
        <HashRouter>
          <Boot>
            <LicenseGate>
              {monitorBuild ? (
                <Routes>
                  <Route element={<MonitorLayout />}>{monitorRoutes}</Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : (
                <Routes>
                  <Route element={<Layout />}>
                    {sharedRoutes}
                    {terminalRoutes}
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </LicenseGate>
          </Boot>
        </HashRouter>
      </AuthProvider>
    </MonitorContext.Provider>
  );
}
