import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { setModeOverride } from "./app/mode";
import { installDesktopLifecycle } from "./app/desktopLifecycle";
import { isTauriRuntime } from "./db/tauriStorage";
import { startBackgroundSync } from "./sync/syncEngine";
import { startBackupScheduler } from "./backup/backupEngine";

installDesktopLifecycle();
if (isTauriRuntime()) {
  startBackgroundSync();
  startBackupScheduler();
}

// Dev-only: switch between the editing terminal and the read-only monitoring
// view without rebuilding.
//   __diagbillMode("monitor")  → reloads into the monitoring app
//   __diagbillMode("terminal") → back to normal
//   __diagbillMode(null)       → follow the build default
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__diagbillMode = (
    mode: "monitor" | "terminal" | null
  ) => {
    setModeOverride(mode);
    location.reload();
  };

  // Dev-only, idempotent synthetic dataset for demos and regression testing.
  // Never available in a production bundle.
  (window as unknown as Record<string, unknown>).__diagbillSeedDemo = async () => {
    const [{ getDb }, { seedDemoData }] = await Promise.all([
      import("./db"),
      import("./db/demoSeed"),
    ]);
    return seedDemoData(await getDb());
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
