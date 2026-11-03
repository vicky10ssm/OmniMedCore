import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { formatDateTime } from "../db/helpers";
import { closeDatabaseForRestore } from "../db";
import { MIGRATIONS } from "../db/schema";
import { databaseInfo, isTauriRuntime } from "../db/tauriStorage";
import {
  createSnapshotNow,
  getBackupStatus,
  getSecondaryBackupDir,
  setSecondaryBackupDir,
  subscribeBackupStatus,
  type BackupStatus,
} from "../backup/backupEngine";
import { Btn, Card, ErrorNote } from "../ui/kit";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

interface BackupValidation {
  encrypted: boolean;
  schemaVersion: number;
  tableCount: number;
  integrity: string;
}

async function validateBackup(
  file: File
): Promise<{ bytes: Uint8Array; validation: BackupValidation }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) throw new Error("The selected backup is empty.");

  const raw = await invoke<{
    encrypted: boolean;
    schema_version: number;
    table_count: number;
    integrity: string;
  }>("validate_backup", { bytesBase64: bytesToBase64(bytes) });
  const validation: BackupValidation = {
    encrypted: raw.encrypted,
    schemaVersion: raw.schema_version,
    tableCount: raw.table_count,
    integrity: raw.integrity,
  };
  const latest = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
  if (!Number.isFinite(validation.schemaVersion) || validation.schemaVersion < 1) {
    throw new Error("The backup has no valid MediCore schema version.");
  }
  if (validation.schemaVersion > latest) {
    throw new Error(
      `This backup uses schema ${validation.schemaVersion}; this app supports up to ${latest}. Update MediCore before restoring.`
    );
  }
  return { bytes, validation };
}

export default function BackupSettings() {
  const [status, setStatus] = useState<BackupStatus>(getBackupStatus());
  const [secondaryDir, setSecondaryDir] = useState(getSecondaryBackupDir());
  const [backupDir, setBackupDir] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unlisten = subscribeBackupStatus(setStatus);
    if (isTauriRuntime()) {
      void databaseInfo()
        .then((info) => setBackupDir(info.backupDir))
        .catch(() => undefined);
    }
    return unlisten;
  }, []);

  const chooseFolder = async () => {
    setError("");
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Choose a second folder for MediCore backups",
      });
      if (typeof selected === "string") {
        setSecondaryBackupDir(selected);
        setSecondaryDir(selected);
        setMessage("Second backup folder saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not choose a folder");
    }
  };

  const backupNow = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await createSnapshotNow();
      setMessage(
        `Backup created locally (${result.localFiles.length} files)${
          result.secondaryFiles.length
            ? ` and in the selected folder (${result.secondaryFiles.length} files).`
            : "."
        }${result.secondaryError ? ` Second folder failed: ${result.secondaryError}` : ""}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    if (status.phase === "backing-up") {
      setError("Wait for the current backup to finish before restoring.");
      return;
    }
    setError("");
    setMessage("");
    setRestoring(true);
    let closed = false;
    try {
      const { bytes, validation } = await validateBackup(file);
      const confirmed = window.confirm(
        `Restore this ${validation.encrypted ? "encrypted " : "legacy plaintext "}backup ` +
          `(schema ${validation.schemaVersion}) and replace the current MediCore database?\n\n` +
          "A pre-restore safety copy will be created in the local Backups folder. " +
          "The application will reload. Data created after this backup will no longer be visible."
      );
      if (!confirmed) return;

      await closeDatabaseForRestore();
      closed = true;
      await invoke<string>("restore_database", { bytesBase64: bytesToBase64(bytes) });
      setMessage("Restore completed. Reloading MediCore…");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
      if (closed) window.setTimeout(() => window.location.reload(), 1500);
    } finally {
      setRestoring(false);
    }
  };

  if (!isTauriRuntime()) {
    return (
      <Card className="p-4 lg:col-span-2">
        <h2 className="text-sm font-semibold">Backup & restore</h2>
        <p className="mt-2 text-xs text-slate-500">
          Automatic local snapshots and restore are available in the installed desktop application.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 lg:col-span-2">
      <h2 className="text-sm font-semibold">Backup & restore</h2>
      <p className="mt-1 text-xs text-slate-500">
        Daily automatic snapshots while the desktop app is open. Retention keeps 7 daily, 4 weekly
        and 12 monthly snapshots. A second copy can be written to a USB drive or OneDrive folder.
      </p>

      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="font-medium text-slate-700">Local backups</p>
          <p className="num mt-1 break-all text-slate-500">{backupDir || "—"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="font-medium text-slate-700">Second folder</p>
          <p className="num mt-1 break-all text-slate-500">
            {secondaryDir || "Not configured"}
          </p>
          <div className="mt-2 flex gap-2">
            <Btn variant="ghost" onClick={() => void chooseFolder()}>
              Choose folder
            </Btn>
            {secondaryDir && (
              <Btn
                variant="ghost"
                onClick={() => {
                  setSecondaryBackupDir("");
                  setSecondaryDir("");
                  setMessage("Second backup folder removed.");
                }}
              >
                Remove
              </Btn>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Btn variant="primary" onClick={() => void backupNow()} disabled={busy || restoring}>
          {busy ? "Backing up…" : "Backup Now"}
        </Btn>
        <span className="text-xs text-slate-500">
          Last backup: {status.lastBackupAt ? formatDateTime(status.lastBackupAt) : "Never"}
        </span>
        {status.phase === "error" && (
          <span className="text-xs text-rose-600">{status.error}</span>
        )}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold">Restore from backup</p>
        <p className="mt-1 text-xs text-slate-500">
          A signed-in operator can restore. The backup is integrity-checked and schema-validated
          first, and a pre-restore safety copy is created automatically.
        </p>
        <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <input
            type="file"
            accept=".db,application/octet-stream"
            className="sr-only"
            disabled={restoring || status.phase === "backing-up"}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              void restore(file);
            }}
          />
          {restoring ? "Validating…" : "Choose backup .db file"}
        </label>
      </div>

      <ErrorNote message={error} />
      {message && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>
      )}
    </Card>
  );
}
