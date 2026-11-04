// Hardware identity for licence binding.
//
// The signed licence's device IDs are compared against a SHA-256 fingerprint of
// the motherboard serial and CPU Processor ID. The logical SQLite device ID is
// intentionally not used here: it is a random UUID and can be copied with the
// database, while the hardware fingerprint cannot.

import { invoke } from "@tauri-apps/api/core";
import { getDeviceId } from "../db/helpers";
import { isTauriRuntime } from "../db/tauriStorage";

export interface MachineIdentity {
  fingerprint: string;
  source: "wmi" | "volume-serial" | "logical-device-id";
}

let cached: Promise<MachineIdentity> | null = null;

export function getMachineIdentity(): Promise<MachineIdentity> {
  if (!isTauriRuntime()) {
    // Browser development has no Windows hardware API. Production Tauri builds
    // always use the native fingerprint command.
    return Promise.resolve({
      fingerprint: getDeviceId(),
      source: "logical-device-id",
    });
  }
  if (cached) return cached;
  const pending = invoke<{ fingerprint: string; source: string }>(
    "get_machine_fingerprint"
  )
    .then((value): MachineIdentity => {
      const source: MachineIdentity["source"] =
        value.source === "volume-serial" ? "volume-serial" : "wmi";
      return { fingerprint: value.fingerprint, source };
    })
    .catch((error) => {
      // Do not cache a transient WMI/permission failure for the session.
      cached = null;
      throw error;
    });
  cached = pending;
  return pending;
}

/** Explicitly named entry point requested by the security design. */
export function GetMachineFingerprint(): Promise<string> {
  return getMachineIdentity().then((identity) => identity.fingerprint);
}

export function resetMachineIdentityCache(): void {
  cached = null;
}

function normalizedDeviceId(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Compare the signed device IDs with the calculated True_Device_ID.
 * Returns true only when the hardware fingerprint is explicitly present.
 */
export function licenseBindsToDevice(
  deviceIds: string[],
  trueDeviceId: string
): boolean {
  const expected = normalizedDeviceId(trueDeviceId);
  if (!expected) return false;
  return deviceIds.some((id) => normalizedDeviceId(id) === expected);
}
