// Desktop database diagnostics, encryption status and pre-migration backup
// commands. The native SQLCipher connection itself is owned by Rust.

import { invoke } from "@tauri-apps/api/core";

export interface DatabaseInfo {
  dataDir: string;
  databasePath: string;
  backupDir: string;
  databaseExists: boolean;
  databaseBytes: number;
  writable: boolean;
}

export interface DatabaseEncryptionInfo {
  keyPresent: boolean;
  keyBackend: string;
  fileEncrypted: boolean;
  cipherVersion: string;
  databasePath: string;
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

export async function databaseEncryptionInfo(): Promise<DatabaseEncryptionInfo> {
  const info = await invoke<{
    key_present: boolean;
    key_backend: string;
    file_encrypted: boolean;
    cipher_version: string;
    database_path: string;
  }>("db_encryption_info");
  return {
    keyPresent: info.key_present,
    keyBackend: info.key_backend,
    fileEncrypted: info.file_encrypted,
    cipherVersion: info.cipher_version,
    databasePath: info.database_path,
  };
}

export async function backupDatabase(label: string): Promise<string> {
  return invoke<string>("backup_database", { label });
}
