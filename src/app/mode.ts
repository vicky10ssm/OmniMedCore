// Application mode.
//
// One codebase ships as two products:
//
//   • "terminal"  — the desktop .exe. This is where ALL data entry happens.
//   • "monitor"   — the read-only web version, hosted on a cheap cloud host so
//                   the owner can look at the day's numbers from anywhere.
//
// The mode is decided at BUILD time (`VITE_APP_MODE=monitor npm run build`) and
// baked in, so a hosted monitor bundle cannot be flipped into an editing app by
// a URL parameter. A localStorage override exists for development only, because
// otherwise verifying the read-only path would need a second production build
// on every change.
//
// Why read-only is enforced in the UI *and* asserted here: the cloud is an
// accumulator, not a writer. If the monitor bundle could write, then web and
// terminal writes would have to be merged, and that merge is the single most
// expensive part of this whole system. Keeping monitors unable to write removes
// that entire conflict class.

export type AppMode = "terminal" | "monitor";

const OVERRIDE_KEY = "diagbill.modeOverride";

/** True when this bundle was built as the read-only monitoring app. */
export const IS_MONITOR_BUILD =
  import.meta.env.VITE_APP_MODE === "monitor" || import.meta.env.MODE === "monitor";

/**
 * The active mode. In a production build the override is ignored entirely so a
 * shipped monitor bundle can never be talked into editing.
 */
export function appMode(): AppMode {
  if (!import.meta.env.DEV) return IS_MONITOR_BUILD ? "monitor" : "terminal";
  const override = localStorage.getItem(OVERRIDE_KEY);
  if (override === "monitor" || override === "terminal") return override;
  return IS_MONITOR_BUILD ? "monitor" : "terminal";
}

export function isMonitor(): boolean {
  return appMode() === "monitor";
}

/** Dev-only switch; a no-op in production builds. */
export function setModeOverride(mode: AppMode | null): void {
  if (!import.meta.env.DEV) return;
  if (mode) localStorage.setItem(OVERRIDE_KEY, mode);
  else localStorage.removeItem(OVERRIDE_KEY);
}
