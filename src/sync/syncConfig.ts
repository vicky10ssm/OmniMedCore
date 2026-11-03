// Device-local cloud sync configuration.
//
// This is deliberately a small first module. The token is stored in local
// storage for the desktop pilot; WS3 must move it to OS-protected storage.

const ENDPOINT_KEY = "medicore.sync.endpoint";
const TOKEN_KEY = "medicore.sync.token";

export interface SyncConfig {
  endpoint: string;
  token: string;
}

export function readSyncConfig(): SyncConfig | null {
  try {
    const endpoint = (localStorage.getItem(ENDPOINT_KEY) || "").trim().replace(/\/+$/, "");
    const token = (localStorage.getItem(TOKEN_KEY) || "").trim();
    if (!endpoint || !token) return null;
    return { endpoint, token };
  } catch {
    return null;
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  localStorage.setItem(ENDPOINT_KEY, config.endpoint.trim().replace(/\/+$/, ""));
  localStorage.setItem(TOKEN_KEY, config.token.trim());
}

export function clearSyncConfig(): void {
  localStorage.removeItem(ENDPOINT_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
