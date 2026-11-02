// React bindings for the read-only monitoring mode.

import { createContext, useContext } from "react";

export interface MonitorContextValue {
  /** True when the read-only monitoring app is running. */
  monitor: boolean;
  /**
   * Cloud sync status shown in the monitor header. Null in local-monitor mode
   * (there is nothing to sync — we are reading the terminal's own database).
   */
  cloudState: "disabled" | "connecting" | "live" | "error";
  /** Human-readable line for the header, e.g. "Synced 2 min ago". */
  cloudNote: string;
}

export const MonitorContext = createContext<MonitorContextValue>({
  monitor: false,
  cloudState: "disabled",
  cloudNote: "",
});

export function useMonitor(): MonitorContextValue {
  return useContext(MonitorContext);
}
