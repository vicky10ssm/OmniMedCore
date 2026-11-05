# Backup and restore

Last updated: 3 November 2026  
Applies to: Tauri Windows desktop app (`0.3.0+`; schema `19` from `0.6.0`)

## What is implemented

- Daily local snapshot while the desktop app is open
- Manual **Backup Now** in Settings → Device & sync
- Optional second copy to a user-selected folder, e.g. USB drive or OneDrive folder
- Retention of:
  - 7 daily snapshots
  - 4 weekly snapshots
  - 12 monthly snapshots
- SQLCipher-encrypted snapshot files (the desktop database key is in Windows Credential Manager)
- Schema + integrity validation before restore
- Automatic pre-restore safety copy
- Safe replacement of the active SQLCipher database, followed by app reload
- Legacy plaintext backups are re-encrypted before they become active

## Local backup location

```text
%APPDATA%\in.medicore.desktop\Backups\
```

File pattern:

```text
MediCore-daily-YYYY-MM-DD.db
MediCore-weekly-YYYY-Www.db
MediCore-monthly-YYYY-MM.db
```

The daily scheduler checks once per day while the application is open. It does not run while the app is
closed. For a fully unattended daily backup, a Windows Scheduled Task or service should be added later.

## Optional second folder

Choose a folder in **Settings → Device & sync → Backup & restore**. The app creates:

```text
<selected folder>\MediCore Backups\
```

If the selected drive is unavailable, the local backup still completes and the UI reports the secondary
folder error. Retention is applied independently in each folder.

## Restore

1. Open **Settings → Device & sync → Backup & restore**.
2. Select a `.db` backup file.
3. The Rust backend validates the SQLCipher (or legacy plaintext) file:
   - SQLCipher key / SQLite open check
   - `PRAGMA quick_check`
   - OmniMed Core schema version
   - required core tables
4. Confirm replacement.
5. The active database is closed, copied to a safety file, replaced, and the app reloads.

A safety copy is written as:

```text
Backups\pre-restore-<epoch>.db
```

Restore is allowed for a signed-in operator in this release. For larger centres, restrict this action to
an administrator role in a future permission update.

### License/device warning

A backup may come from another device or tenant. Its data can be restored, but the existing signed licence
may no longer match the tenant or hardware fingerprint. Reissue or re-import the correct licence after
restore if needed. A restore does not copy the DPAPI-protected licence or clock state; re-import on the
target machine.

## Retention behavior

The app keeps the newest 7 daily files, newest 4 weekly files and newest 12 monthly files in each backup
folder. Retention only deletes files beginning with `MediCore-daily-`, `MediCore-weekly-` or
`MediCore-monthly-`. Migration backups such as `pre-migration-v16-*.db` and restore safety copies such as
`pre-restore-*.db` are not deleted by this policy.

## Verification performed

The encryption/backup verification below was captured on the `0.3.0` build with schema 17; `0.4.0`
adds schema 18 for the local export queue without changing the backup/restore format.

- Daily scheduler produced `MediCore-daily`, `MediCore-weekly` and `MediCore-monthly` files.
- Encrypted snapshot opened successfully with SQLCipher 4.20, `schema_version=17` and
  `PRAGMA quick_check=ok`.
- Manual **Backup Now** created encrypted local files and files in a selected secondary folder.
- Restore through Settings created `pre-restore-<epoch>.db`, reloaded the application, and left the
  active database encrypted at schema 17 with `PRAGMA quick_check=ok` and matching invoice counts.
- Restoring an older plaintext backup re-encrypted it before activation.
- Rust unit tests confirmed 7 daily / 4 weekly / 12 monthly retention, preservation of pre-migration
  backups, SQLCipher export and backup validation.
- `npm run tauri build` produced NSIS and MSI installers.

## Limitations

- Snapshots are SQLCipher-encrypted with the same Windows Credential Manager key as the database. Key
  export/import and cross-machine recovery are not yet implemented; keep a controlled Windows-profile
  backup until that is added.
- The daily schedule runs only while the desktop app is open.
- The optional folder is not monitored automatically; a disconnected drive is reported on the next backup.
- There is no cloud backup service.
- Restore does not automatically reissue a licence for a different device.
- Restore should not be used as a substitute for controlled migration or reconciliation procedures.
- Before production use, test restore on a separate Windows VM with synthetic data.
