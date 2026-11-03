import { useEffect, useState } from "react";
import {
  clearSyncConfig,
  readSyncConfig,
  saveSyncConfig,
} from "../sync/syncConfig";
import {
  getSyncStatus,
  pendingSyncCount,
  subscribeSyncStatus,
  syncNow,
  type SyncStatus,
} from "../sync/syncEngine";
import { formatDateTime } from "../db/helpers";
import { Btn, Card, ErrorNote, Labeled, TextInput } from "../ui/kit";

export default function SyncSettings({ isAdmin }: { isAdmin: boolean }) {
  const existing = readSyncConfig();
  const [endpoint, setEndpoint] = useState(existing?.endpoint ?? "");
  const [token, setToken] = useState(existing?.token ?? "");
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pendingSyncCount()
      .then((pending) => setStatus((s) => ({ ...s, pending })))
      .catch(() => undefined);
    return subscribeSyncStatus(setStatus);
  }, []);

  const save = async () => {
    setError("");
    setMessage("");
    try {
      const parsed = new URL(endpoint.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Use an http:// or https:// endpoint");
      }
      if (!token.trim()) throw new Error("Sync token is required");
      saveSyncConfig({ endpoint: endpoint.trim(), token: token.trim() });
      setMessage("Sync configuration saved on this terminal.");
      const next = await syncNow();
      setStatus(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save sync configuration");
    }
  };

  const runNow = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await syncNow();
      setStatus(next);
      setMessage(
        next.phase === "error"
          ? next.lastError
          : next.phase === "offline"
            ? "Cloud endpoint is not reachable."
            : "Sync completed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Cloud sync</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Background push every 30 seconds while the desktop app is open. Sales, reports and admissions
            are queued locally when offline.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">
          {status.phase}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Labeled label="Cloud API endpoint" hint="Example: https://sync.example.com/api">
          <TextInput
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://sync.example.com/api"
            disabled={!isAdmin}
          />
        </Labeled>
        <Labeled label="Terminal sync token" hint="Stored locally for this pilot terminal.">
          <TextInput
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer token"
            disabled={!isAdmin}
          />
        </Labeled>
      </div>

      {isAdmin && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant="primary" onClick={() => void save()} disabled={busy}>
            Save and sync
          </Btn>
          <Btn onClick={() => void runNow()} disabled={busy}>
            Sync now
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              clearSyncConfig();
              setEndpoint("");
              setToken("");
              setStatus((s) => ({ ...s, phase: "unconfigured", lastError: "" }));
              setMessage("Sync configuration removed from this terminal.");
            }}
          >
            Remove configuration
          </Btn>
        </div>
      )}

      <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
        <div>
          <dt className="text-slate-400">Pending events</dt>
          <dd className="font-semibold">{status.pending}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Last successful sync</dt>
          <dd>{status.lastSyncAt ? formatDateTime(status.lastSyncAt) : "Never"}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Last error</dt>
          <dd className={status.lastError ? "text-rose-600" : "text-slate-400"}>
            {status.lastError || "None"}
          </dd>
        </div>
      </dl>

      <ErrorNote message={error} />
      {message && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</p>
      )}
      <p className="mt-3 text-[11px] text-slate-400">
        The token is device-local for this first sync module. Move it to OS-protected storage before
        production distribution.
      </p>
    </Card>
  );
}
