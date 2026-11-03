# Windows desktop build and WS2 verification

Last updated: 2 November 2026

This is the manual follow-through for WS2. The repository now contains the Tauri shell and a native
SQLite data source.

On 3 November 2026 the local Windows build succeeded with Rust 1.99.1 and Visual Studio 2026 MSVC:
NSIS and MSI installers were produced. The app was launched, the plugin-sql database was created, a
second instance was rejected/focused, close-flush completed, and a simulated schema upgrade created a
pre-migration backup. See “Local build evidence” below.

## What is already implemented

- Tauri v2 shell (`src-tauri/`)
- Single-instance plugin: a second launch focuses the existing window
- `@tauri-apps/plugin-sql` native SQLite connection
- Vendored plugin-sql build configured with a single SQLite connection so the existing
  BEGIN/COMMIT transactions stay on one connection
- SQLite database file under the Windows app-config/app-data directory
- WAL mode, foreign keys and busy timeout
- Pre-migration `wal_checkpoint(FULL)` plus timestamped backup into `backups/`
- SQLite `quick_check` before migrations
- Flush-before-window-close handler
- Desktop storage path/writability in **Settings → Device & sync**
- NSIS + MSI bundle configuration
- Generated Windows application icons
- Manual-update strategy for the pilot; no auto-updater is configured yet

Current storage note: the browser build keeps using sql.js/IndexedDB. The Tauri build uses
`@tauri-apps/plugin-sql` with a real SQLite file and the same migrations and DataSource interface.

## Local build evidence

Verified on 3 November 2026:

| Check | Result |
| --- | --- |
| `npx tauri info` | WebView2, MSVC, Rust, Cargo detected |
| `npm run check` | Passed |
| `npm run build` | Passed |
| `npm run build:monitor` | Passed |
| `npm run tauri build` | Passed |
| NSIS installer | `MediCore_0.2.1_x64-setup.exe` — 3.31 MiB, unsigned |
| MSI installer | `MediCore_0.2.1_x64_en-US.msi` — 4.57 MiB, unsigned |
| Runtime database | `%APPDATA%\in.medicore.desktop\medicore.db` |
| Schema/integrity | `schema_version=17`, `PRAGMA quick_check=ok` |
| Single instance | Second process exited; original stayed running |
| Close flush | WAL checkpointed; database readable after close |
| Pre-migration backup | `pre-migration-v15-<timestamp>.db` and `pre-migration-v16-<timestamp>.db` created |
| Sync schema | Migration 17 created `sync_queue`, `sync_ack` and six entity triggers |

Checksums from that build:

```text
NSIS SHA256: A845C5E147AC4ED8B7311891CCD650CC5CE162328AE517E3DA26F26815D5CC09
MSI  SHA256: 0FE8285E95FC99F1F8A25186566726386F4F1238859A704AED5FBF27BC601E51
```

These hashes change on every rebuild. Recompute them before publishing.

Still not verified: clean-machine install, upgrade over a prior installed build, uninstall data
preservation, read-only disk, disk-full, power loss, printer acceptance and code signing.

## 1. Install the Windows build prerequisites

These prerequisites are already installed on the current build machine. Use this section when setting up
another Windows build machine.

Open **PowerShell as Administrator**.

### Visual Studio Build Tools with the C++ workload

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e `
  --accept-source-agreements --accept-package-agreements `
  --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

This installs the MSVC compiler and Windows SDK. It is large and may take several minutes.

### Rust

```powershell
winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements
```

Close PowerShell, open a new PowerShell window, then install the MSVC toolchain:

```powershell
rustup default stable-msvc
```

### Verify

```powershell
node --version
npm --version
rustc --version
cargo --version
npx tauri info
```

Expected:

- Node `24.22.0`
- Rust/Cargo available
- `npx tauri info` detects WebView2 and MSVC
- No red environment errors

If `npx tauri info` still reports missing MSVC or Windows SDK, repair the Visual Studio Build Tools
installation from the Visual Studio Installer.

## 2. Update dependencies and verify the web build

```powershell
cd C:\dev\medicore
npm ci
npm run check
npm run build
npm run build:monitor
```

Do not continue until all four commands pass.

## 3. Start the desktop development app

```powershell
npm run desktop:dev
```

First launch should:

- create the app-data folder
- create `medicore.db`
- open the Tauri window
- show the first-run login

The app-data location should be:

```text
%APPDATA%\in.medicore.desktop\medicore.db
%APPDATA%\in.medicore.desktop\backups\
```

Confirm the exact path in **Settings → Device & sync**. The card should show:

- Storage: `SQLite file (desktop app-data)`
- Database file path
- File writable: `Yes`
- Pre-migration backups path

## 4. Verify desktop data behavior

### Persistence

1. Complete first-run password setup.
2. Add a synthetic patient or expense.
3. Close the window.
4. Run `npm run desktop:dev` again.
5. Sign in and confirm the record is still present.
6. Confirm no `IndexedDB`-only dependency prevents startup.

### Single instance

1. Leave the desktop app running.
2. Launch the app a second time.
3. The second process should exit and focus the existing window, not open a second writable database.

### Close flush

1. Add a small record.
2. Close immediately.
3. Reopen and confirm the record persisted.

### Read-only disk diagnostics

Use a test VM or temporary test user, not a real production profile.

1. Close MediCore.
2. Remove write permission from the app-data folder for the test user.
3. Launch MediCore.
4. Confirm a clear database/writability error instead of silent data loss.
5. Restore write permission.

### Corrupt database diagnostics

Use a disposable test database only.

1. Close MediCore.
2. Copy `medicore.db` to a safe test backup.
3. Replace `medicore.db` with an invalid file.
4. Launch MediCore.
5. Confirm the integrity error is shown.
6. Restore the safe test backup to `medicore.db`.
7. Relaunch and confirm the app opens.

### Migration backup

A pre-migration backup is created automatically when an existing database has a schema older than the
current version.

1. Keep a copy of an older schema database in a test VM.
2. Launch the new app.
3. Confirm `backups\pre-migration-v<number>-<timestamp>.db` exists.
4. Confirm the migrated app opens and has the expected data.
5. Do not use a buyer’s only production copy for this test.

## 5. Build the Windows installers

```powershell
cd C:\dev\medicore
npm run tauri build
```

Find the installers:

```powershell
Get-ChildItem src-tauri\target\release\bundle\nsis
Get-ChildItem src-tauri\target\release\bundle\msi
```

Typical output:

```text
MediCore_0.2.1_x64-setup.exe
MediCore_0.2.1_x64_en-US.msi
```

The installer is **unsigned** until a Windows code-signing certificate is configured. Do not distribute
it as a trusted production installer before signing.

After the first Rust build, commit the generated dependency lockfile:

```powershell
git add src-tauri\Cargo.lock
```

Do not commit:

```text
src-tauri\target\
src-tauri\gen\schemas\
```

## 6. Test install, upgrade and uninstall

Use a clean Windows 10/11 test machine or VM.

### Install

1. Run the NSIS installer.
2. Complete first-run setup.
3. Add synthetic data.
4. Confirm the app opens from the Start menu.

### Upgrade

1. Close the app.
2. Install the next build over the existing installation.
3. Launch it.
4. Confirm data remains.
5. Confirm any migration backup was created.

### Uninstall

1. Uninstall from Windows Settings/Control Panel.
2. Confirm the installer does not silently delete the database.
3. If data must be removed, do it explicitly with a documented backup.

NSIS install mode is configured as **current user**. Do not switch to per-machine until IT
requirements and installer signing are settled.

## 7. Test minimum Windows runtime behavior

On a test machine/VM:

- WebView2 installed or installer bootstrapper successful
- Windows 10/11 64-bit
- read-only app-data directory error path
- disk-full behavior
- abrupt process termination
- power-loss simulation
- Windows sleep/resume
- A4 printer
- optional 80 mm thermal printer
- scale factors 100% and 125%
- non-admin Windows account

Record the Windows version, WebView2 version, printer model, install path, test date and result.

## 8. Manual update policy for the pilot

Do not enable auto-update yet.

For each pilot update:

1. Build from a tagged commit.
2. Sign the installer.
3. Back up the database.
4. Install the new version over the old one.
5. Run smoke tests.
6. Retain the previous signed installer and checksum.
7. Keep the rollback runbook ready.

See [HOTFIX_ROLLBACK_PROCESS.md](HOTFIX_ROLLBACK_PROCESS.md).

## 9. Automated GitHub release

`.github/workflows/release.yml` runs on tags beginning with `v`.

Before pushing a tag:

```powershell
npm version 0.1.1 --no-git-tag-version
git add package.json package-lock.json src-tauri/tauri.conf.json
git commit -m "release: v0.1.1"
git tag -a v0.1.1 -m "MediCore v0.1.1"
git push origin main --tags
```

The workflow:

- checks that the tag matches `package.json` and `src-tauri/tauri.conf.json`
- installs Node, Rust MSVC and cached dependencies
- runs `npm ci` and `npm run check`
- runs `npm run tauri build`
- uploads the NSIS `.exe` and MSI `.msi` as workflow artifacts
- publishes both installers to the GitHub Release for the tag

The installers are unsigned unless code signing is configured. Do not describe an unsigned build as a
trusted production release.

## 10. Code signing

Obtain a Windows code-signing certificate from the organisation’s approved CA. Configure signing in
`src-tauri/tauri.conf.json` or the build environment, depending on the certificate type.

Do not commit:

- `.pfx` files
- certificate passwords
- private signing keys
- timestamp credentials

After signing:

```powershell
Get-AuthenticodeSignature .\src-tauri\target\release\bundle\nsis\MediCore_0.2.1_x64-setup.exe
```

Expected status: `Valid`.

Generate checksums:

```powershell
Get-FileHash .\src-tauri\target\release\bundle\nsis\MediCore_0.2.1_x64-setup.exe `
  -Algorithm SHA256
```

## 11. WS2 exit checklist

- [ ] Rust, MSVC and Windows SDK installed
- [ ] `npx tauri info` has no environment errors
- [ ] `npm run desktop:dev` starts the app
- [ ] Data persists in `%APPDATA%\in.medicore.desktop\medicore.db`
- [ ] Second launch focuses the first instance
- [ ] App-data path and writability appear in Settings
- [ ] Close-flush test passes
- [ ] Corrupt database is detected by `quick_check`
- [ ] Pre-migration backup is created when needed
- [ ] NSIS installer builds
- [ ] Clean install works
- [ ] Upgrade preserves data
- [ ] Uninstall preserves data unless explicitly removed
- [ ] Read-only disk test produces a clear error
- [ ] Disk-full and abrupt-termination tests recorded
- [ ] A4/thermal printing accepted on Windows
- [ ] Installer signing configured and verified
- [ ] Previous installer and checksum retained for rollback
- [ ] WS3 encryption/backup work remains separate

## 12. What remains blocked

- OS-secure licence storage and backend entitlement enforcement
- Encryption-at-rest integration for the desktop file
- Automated backup/restore and scheduled retention
- Auto-updater signing/endpoints
- Public installer distribution and support process
