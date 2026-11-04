import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauriRuntime } from "../db/tauriStorage";
import {
  DEFAULT_GOOGLE_DRIVE_SYNC_PATH,
  getGoogleDriveSyncPath,
  resetGoogleDriveSyncPath,
  setGoogleDriveSyncPath,
} from "../sync/syncConfig";
import {
  exportNow,
  getSyncStatus,
  pendingSyncCount,
  subscribeSyncStatus,
  type SyncStatus,
} from "../sync/syncEngine";
import { formatDateTime } from "../db/helpers";
import { Btn, Card, ErrorNote, Labeled, TextInput } from "../ui/kit";

export default function SyncSettings({ isAdmin }: { isAdmin: boolean }) {
  const [path, setPath] = useState(getGoogleDriveSyncPath());
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pendingSyncCount()
      .then((pending) => setStatus((current) => ({ ...current, pending })))
      .catch(() => undefined);
    return subscribeSyncStatus(setStatus);
  }, []);

  const chooseFolder = async () => {
    setError("");
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Choose the Google Drive sync folder",
      });
      if (typeof selected === "string") {
        setPath(selected);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not choose a folder");
    }
  };

  const savePath = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (!path.trim()) throw new Error("Choose a local export folder.");
      setGoogleDriveSyncPath(path);
      setMessage("Local export folder saved. New CSV files will be written there.");
      const next = await exportNow();
      setStatus(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the export folder");
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await exportNow();
      setStatus(next);
      setMessage(
        next.phase === "error"
          ? next.lastError
          : next.pending > 0
            ? `${next.pending} transaction(s) are still pending.`
            : "Local CSV export completed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Local CSV export</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Writes a brand-new CSV into a local Google Drive sync folder. No API, endpoint or
            network request is used; Google Drive uploads the file independently.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">
          {status.phase}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <Labeled
          label="Google Drive sync folder"
          hint={`Default: ${DEFAULT_GOOGLE_DRIVE_SYNC_PATH}. The folder is created automatically if missing.`}
        >
          <TextInput
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder={DEFAULT_GOOGLE_DRIVE_SYNC_PATH}
            disabled={!isAdmin}
          />
        </Labeled>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={() => void savePath()} disabled={busy}>
              Save folder and export
            </Btn>
            <Btn onClick={() => void runNow()} disabled={busy}>
              Export now
            </Btn>
            {isTauriRuntime() && (
              <Btn variant="ghost" onClick={() => void chooseFolder()} disabled={busy}>
                Choose folder
              </Btn>
            )}
            <Btn
              variant="ghost"
              onClick={() => {
                resetGoogleDriveSyncPath();
                setPath(DEFAULT_GOOGLE_DRIVE_SYNC_PATH);
                setMessage("Default export folder restored.");
              }}
              disabled={busy}
            >
              Use default
            </Btn>
          </div>
        )}
      </div>

      <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
        <div>
          <dt className="text-slate-400">Pending transactions</dt>
          <dd className="font-semibold">{status.pending}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Last export</dt>
          <dd>{status.lastExportAt ? formatDateTime(status.lastExportAt) : "Never"}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Last error</dt>
          <dd className={status.lastError ? "text-rose-600" : "text-slate-400"}>
            {status.lastError || "None"}
          </dd>
        </div>
      </dl>

      {status.lastFile && (
        <p className="num mt-3 break-all text-[11px] text-slate-400">
          Last file: {status.lastFile}
        </p>
      )}

      <ErrorNote message={error} />
      {message && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</p>
      )}
      <p className="mt-3 text-[11px] text-slate-400">
        Files are named tx_YYYYMMDD_HHMMSS_XXXXXX.csv. A failed write leaves the batch pending in
        the local queue and retries on the next interval. Keep the Google Drive desktop client
        running so it can upload completed files.
      </p>
    </Card>
  );
}
