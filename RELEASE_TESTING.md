# Release testing and database-safety gate

Last updated: 10 November 2026  
Applies to: every OmniMed Core Windows release  
Related: [PRE_RELEASE_CHECKLIST.md](PRE_RELEASE_CHECKLIST.md), [BACKUP_RESTORE.md](BACKUP_RESTORE.md), [ENCRYPTION.md](ENCRYPTION.md)

This document records the automated and manual checks used to protect the core SQLCipher database
across releases. Tick the release checklist only after these checks have run on the merged release
commit.

## 1. Automated release gate

Run from the repository root on the merged `main` commit:

```powershell
npm run check
npm run build
npm run build:monitor
cargo test --lib --locked --manifest-path src-tauri/Cargo.toml
```

After the release notes and checksum file are written, run the release-time documentation check:

```powershell
npm run check:docs:release
```

What each command covers:

| Command | Scope |
| --- | --- |
| `npm run check` | TypeScript typecheck, migration harness, tenant-scope lint, documentation consistency |
| `npm run check:docs` | Version/schema references, changelog entry, required documents and doc links |
| `npm run check:docs:release` | Release notes and checksum file for the current version |
| `npm run build` | Production terminal bundle |
| `npm run build:monitor` | Read-only monitor bundle |
| `cargo test --lib` | SQLCipher, backup validation, snapshot retention, export safety, pre-upgrade backup |

CI (`.github/workflows/ci.yml`) runs `npm run check`, `cargo test --lib --locked`, `npm run build`
and `npm run build:monitor` on every pull request and push to `main`.

A red gate blocks the release. Do not sign or publish around a failure.

## 1a. Documentation gate

`npm run check:docs` runs as part of `npm run check` and fails when:

- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json` disagree on the
  version.
- The latest migration version in `src/db/schema.ts` does not match the documented schema version.
- `docs/README.md`, `docs/architecture.md`, `docs/productionization-plan.md`,
  `docs/deployment-and-readiness.md`, `PRODUCTION_COMMERCIAL_READINESS.md`, `LOCAL_CSV_EXPORT.md` or the
  test-catalogue skill carry stale version/schema references.
- The top `CHANGELOG.md` release heading does not match the current version.
- Required documents or documentation links are missing.

`npm run check:docs:release` additionally requires `release/v<version>/RELEASE_NOTES.md` and
`SHA256SUMS.txt`, and checks that the notes mention the version, schema/upgrade guidance and backup
instructions.

## 2. Migration harness

Command: `npm run check:migrations`

It runs migrations against synthetic databases in `sql.js` and verifies:

| Scenario | Database risk covered |
| --- | --- |
| Migration versions strictly increasing | Duplicate or out-of-order migrations cannot ship |
| Fresh database: migrate + seed | New installations reach the current schema and seed data |
| Existing v2 database: upgrade in place | Old databases upgrade through every historical migration |
| Idempotent: migrate twice | Re-running migrations does not fail or duplicate data |
| Self-heal: partially applied migration | A half-applied upgrade is repaired on the next boot |
| Legacy rows adopted by the default tenant | Old unscoped rows remain visible after upgrade |
| Adoption uses `DEFAULT_TENANT_ID` | The repair migration uses the application's real tenant ID |
| No semicolons inside SQL comments | The statement splitter cannot cut SQL at the wrong point |
| Tolerant migration applies every statement | One failing `ALTER` does not silently skip later statements |
| Migration 25 pathologist seed | Legacy settings become catalogue rows exactly once |
| Migration 21 GST reset | Historical GST corrections remain deterministic |

The harness also checks that fresh databases have the expected starter test catalogue and that tenant
columns exist on every tenant-owned table.

## 3. Rust database and encryption tests

Command: `cargo test --lib --locked --manifest-path src-tauri/Cargo.toml`

Relevant tests:

| Test | Database risk covered |
| --- | --- |
| `sqlcipher_round_trip_and_plain_export` | A plaintext database can be exported to SQLCipher, reopened with the key and read back |
| `validation_rejects_missing_core_tables` | A backup missing required tables is rejected |
| `snapshot_retention_keeps_daily_weekly_monthly_sets` | Daily/weekly/monthly retention does not delete the wrong snapshots |
| `full_snapshot_is_tenant_scoped_and_omits_auth_secrets` | Full exports stay tenant-scoped and exclude password/TOTP data |
| `writes_a_new_unique_csv_and_never_overwrites` | Export files cannot overwrite earlier output |
| `rejects_path_traversal_and_malformed_filenames` | Export filenames cannot escape the target folder |
| `pre_upgrade_backup_copies_database_and_sidecars` | A version change copies the database plus WAL/SHM sidecars before opening |
| `pre_upgrade_backup_is_skipped_for_the_same_version` | Restarting the same version does not create duplicate backups |
| `first_run_with_an_existing_database_creates_an_unknown_backup` | The first release with the version marker also protects an existing file |
| `first_run_without_a_database_records_the_version` | A fresh install records the version without creating an empty backup |
| `version_change_without_a_database_records_the_version` | A version change with no database file does not fail startup |
| `dpapi_round_trip_protects_payload` / tamper test | Licence and runtime state remain DPAPI-protected |
| `clock_rollback_is_rejected` | Clock rollback protection still works |
| `machine_identity_smoke` | Hardware identity smoke test; hardware-dependent and marked ignored by default |

## 4. Automatic database backups

The desktop app now has four independent protection layers.

### 4.1 Pre-upgrade backup

Location:

```text
%APPDATA%\in.medicore.desktop\Backups\
pre-upgrade-<from>-to-<to>-<epoch>.db
```

- Runs in Rust before the database is opened or encrypted/migrated.
- Copies the main database and its `-wal` / `-shm` sidecars.
- Triggers when the stored last-run version differs from the running app version.
- A missing version marker on an existing database is treated as `unknown` and still creates a backup,
  so the first release that introduces the marker is protected.
- If the copy fails, the database open fails with an error. The app does not continue into an
  unprotected upgrade.
- The last-run version marker is `last-run-version.txt` in the same application-data directory.

### 4.2 Pre-migration backup

- The TypeScript data layer checkpoints WAL and calls `backup_database` before applying a schema
  migration when the database schema is older than the current build.
- File pattern: `pre-migration-v<schema>-<epoch>.db`.
- This is a second safety net focused on schema changes.

### 4.3 Daily snapshots

- 7 daily, 4 weekly and 12 monthly encrypted snapshots while the app is open.
- Optional second copy to a user-selected USB/OneDrive folder.
- Retention applies only to `MediCore-daily-*`, `MediCore-weekly-*` and `MediCore-monthly-*`.
- Pre-upgrade, pre-migration and pre-restore copies are never deleted by that retention policy.

### 4.4 Pre-restore safety copy

- Before replacing the active database, restore writes `pre-restore-<epoch>.db`.
- Restore validates the selected file first: open check, `PRAGMA quick_check`, schema version and
  required core tables.
- A failure to copy the safety file now aborts the restore instead of being ignored.

## 5. Manual release verification

Run after the automated gate passes.

### 5.1 Documentation and release notes

1. Update `CHANGELOG.md` with the new version.
2. Update README, capability docs, architecture, backup/upgrade guidance and the relevant skills.
3. Write `release/v<version>/RELEASE_NOTES.md` with the version, schema/migration notes and backup
   instructions.
4. After the installers and `SHA256SUMS.txt` exist, run `npm run check:docs:release`.
5. Confirm the release notes describe how to roll back and where the pre-upgrade backup is written.

### 5.2 Build and signing

1. Build from the merged `main` commit, not a dirty worktree.
2. Confirm `package.json`, `tauri.conf.json` and the tag version match.
3. Build the NSIS and MSI installers.
4. Sign the app, NSIS installer and MSI.
5. Verify all signatures return `Valid` with thumbprint `1180CA1A9509C9E968DED5E4274C89410AC52584`.
6. Extract the MSI and verify the embedded `medicore.exe` signature and file version.

### 5.3 Install-over smoke test

1. Install the new build over the previous release.
2. Confirm the installed `ProductVersion` matches the release.
3. Launch the app and confirm it responds.
4. Confirm the database opens without a boot error.
5. Open the core screens and confirm data is present: Dashboard, Patients, Invoices, Samples, Reports,
   Tests & Packages, Pharmacy, Admissions, Expenses and Settings.
6. Confirm the current schema version is recorded in `meta.schema_version`.

### 5.4 Backup verification

1. Confirm the new `pre-upgrade-*.db` file exists in the backup folder after a version-changing launch.
2. On a test profile or disposable copy, validate the backup through **Settings → Device & sync →
   Backup & restore**.
3. Confirm the restored copy passes `PRAGMA quick_check` and retains invoice, patient and report counts.
4. Confirm a same-version restart does not create another pre-upgrade backup.
5. Delete disposable test backups after verification.

### 5.5 Release evidence

Record in the release notes or internal release record:

```text
Version:
Schema:
Commit:
Tag:
npm run check:
cargo test --lib:
Terminal build:
Monitor build:
Signatures:
Pre-upgrade backup filename:
Install-over version:
Smoke-test result:
```

## 6. Known limits

- CI uses synthetic databases, not a copy of a real production database.
- There is no automated table-by-table row-count diff between the previous and new release.
- The pre-upgrade backup protects the database file, not the Windows Credential Manager key. The key
  must remain available on the same Windows user profile.
- Daily snapshots and the pre-upgrade backup run only while the application is installed and started;
  they are not an OS-level scheduled service.
- The automatic backup is not a substitute for the customer's documented backup policy. Release notes
  still tell customers to take a backup before every upgrade.

## 7. Future hardening

1. Keep a fixture database from the previous release and upgrade a copy in CI with SQLCipher, then
   assert `quick_check`, schema version and core-table row counts.
2. Add a release command such as `npm run db:rehearse -- <backup-file>` to run the new build against a
   copy without touching the live database.
3. Add a table-by-table row-count and checksum comparison report to the release evidence.
