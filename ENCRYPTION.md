# Encryption at rest

Last updated: 3 November 2026  
Applies to: Tauri Windows desktop app (`0.3.0+`; schema `20` from `0.7.0`)

## What is implemented

- The desktop database is a **SQLCipher 4.20** database using AES-256 page encryption.
- The random 256-bit database key is generated on first use and stored in **Windows Credential Manager**.
- The key is never written to `.env` files, JSON configuration, localStorage, logs or source control.
- Existing plaintext `medicore.db` files are migrated to SQLCipher automatically on first launch.
- A pre-encryption encrypted copy is written before the plaintext file is replaced.
- Backups created from the encrypted database are themselves encrypted.
- Restoring a legacy plaintext backup re-encrypts it before it becomes the active database.
- Settings → Device & sync shows the encryption status, key backend and SQLCipher version.

## Key location

The native keyring entry is a Windows Generic Credential:

```text
Target: sqlcipher-database-key-v1.in.medicore.desktop
User:   sqlcipher-database-key-v1
Type:   Generic
```

The Rust backend uses the `keyring` crate's `windows-native` provider, which calls the Windows
Credential Manager APIs (`CredWriteW` / `CredReadW`).

The key is bound to the Windows user profile. It is not part of `medicore.db`.

## First-launch migration

When the new build starts and finds a plaintext SQLite file:

1. Generate a 256-bit key and save it in Windows Credential Manager.
2. Open the plaintext database and checkpoint its WAL.
3. Export it into a temporary SQLCipher database with `sqlcipher_export`.
4. Verify `PRAGMA quick_check` and schema version on the encrypted copy.
5. Copy the encrypted result to `Backups/pre-encryption-<epoch>.db`.
6. Atomically replace `medicore.db` and remove old plaintext WAL/SHM files.

If the key cannot be saved or the encrypted copy cannot be verified, the plaintext file is left
untouched and the boot fails rather than silently falling back to plaintext.

## Backups and off-device recovery

Because the database is encrypted, scheduled/manual backups are encrypted too. They are only readable
with the same Credential Manager key.

This release does **not** yet provide an exportable key-recovery file or an import-key screen. Before
relying on encrypted backups for disaster recovery:

- back up the Windows user profile/credential material using an approved Windows backup process; or
- retain the original plaintext/pre-encryption backup in a physically controlled location until key
  export is implemented.

Key export/import and a clean-machine encrypted-restore runbook are remaining production gates.

## Verification performed

The encryption verification below was captured on the `0.3.0` build with schema 17; `0.4.0` keeps the
same SQLCipher key/migration path and adds schema 18 for the local export queue.

- Existing database migrated from plaintext to SQLCipher; `PRAGMA cipher_version` reported
  `4.20.0 community`.
- `PRAGMA quick_check` returned `ok`; schema version remained `17`; invoice counts were preserved.
- Credential Manager entry `sqlcipher-database-key-v1.in.medicore.desktop` existed after migration.
- Manual backup produced encrypted snapshot files with a random (non-SQLite) header.
- Restore of an encrypted snapshot created `pre-restore-<epoch>.db` and reloaded successfully.
- Restore of an older plaintext backup re-encrypted the file before replacing the active database.
- Rust tests cover SQLCipher export and backup validation.
- `npm run check`, `npm run build`, `npm run build:monitor` and `npm run tauri build` passed.

## Limitations

- The key is bound to one Windows user/profile. Moving or restoring the database to another Windows
  user or machine requires explicit key recovery, which is not yet exposed in the UI.
- The database key is transparently available to the signed-in Windows user while the app is running.
  This protects against stolen disks/copied database files, not a compromised unlocked Windows session.
- Backups are encrypted but not independently versioned/rekeyed.
- Replacing a plaintext database does not guarantee physical erasure of old SSD blocks. Keep BitLocker
  or another full-disk encryption layer enabled, especially during upgrades from an older build.
- SQLCipher reduces database-file exposure; it does not replace disk encryption, OS hardening,
  restricted Windows accounts, malware protection or access controls.
- This is not a claim of NABL/ISO/HIPAA certification by itself.
