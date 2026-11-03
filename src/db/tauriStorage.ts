// Desktop database diagnostics and pre-migration backup commands.
//
// The SQLite connection itself is handled by @tauri-apps/plugin-sql. These
// commands only expose the resolved app-data path, writability and backup
// location, and copy the live SQLite file before an existing schema migrates.

import { invoke } from "@tauri-apps/api/core";

export const NATIVE_DB_URL = "sqlite:medicore.db";

export interface DatabaseInfo {
  dataDir: string;
  databasePath: string;
  backupDir: string;
  databaseExists: boolean;
  databaseBytes: number;
  writable: boolean;
}

export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>)
  );
}

export async function databaseInfo(): Promise<DatabaseInfo> {
  const info = await invoke<{
    data_dir: string;
    database_path: string;
    backup_dir: string;
    database_exists: boolean;
    database_bytes: number;
    writable: boolean;
  }>("database_info");
  return {
    dataDir: info.data_dir,
    databasePath: info.database_path,
    backupDir: info.backup_dir,
    databaseExists: info.database_exists,
    databaseBytes: info.database_bytes,
    writable: info.writable,
  };
}

export async function backupDatabase(label: string): Promise<string> {
  return invoke<string>("backup_database", { label });
}
