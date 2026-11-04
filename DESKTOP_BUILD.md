# Windows desktop build and WS2 verification

Last updated: 2 November 2026

This is the manual follow-through for WS2. The repository now contains the Tauri shell and a native
SQLCipher data source.

On 3 November 2026 the local Windows build succeeded with Rust 1.99.1 and Visual Studio 2026 MSVC:
NSIS and MSI installers were produced. The app was launched, the plaintext database was migrated to
SQLCipher, a second instance was rejected/focused, close-flush completed, and a simulated schema upgrade
created a pre-migration backup. See "Local build evidence" below.

## What is already implemented

- Tauri v2 shell (`src-tauri/`)
- Single-instance plugin: a second launch focuses the existing window
- Native Rust SQLCipher 4.20 connection using bundled SQLCipher + libtomcrypt
- 256-bit database key generated once and stored in Windows Credential Manager
- Plaintext-to-SQLCipher migration with a verified encrypted pre-encryption copy
- Encrypted database file under the Windows app-config/app-data directory
- WAL mode, foreign keys and busy timeout
- Pre-migration `wal_checkpoint(FULL)` plus timestamped encrypted backup into `Backups/`
- `quick_check` before migrations
- Flush-before-window-close handler
- Encryption status, key backend and storage path in **Settings → Device & sync**
- NSIS + MSI bundle configuration
- Generated Windows application icons
- Manual-update strategy for the pilot; no auto-updater is configured yet

Current storage note: the browser build keeps using sql.js/IndexedDB. The Tauri build uses native
SQLCipher with the key in Windows Credential Manager and the same migrations and DataSource interface.
SQLCipher is compiled from the bundled `sqlcipher-src` crate with libtomcrypt; no OpenSSL, Perl or
NASM installation is needed.

## Local build evidence

Verified on 4 November 2026:

| Check | Result |
| --- | --- |
| `npx tauri info` | WebView2, MSVC, Rust, Cargo detected |
| `npm run check` | Passed |
| `npm run build` | Passed |
| `npm run build:monitor` | Passed |
| `npm run tauri build` | Passed |
| NSIS installer | `MediCore_0.4.1_x64-setup.exe` - 3.23 MiB, signed |
| MSI installer | `MediCore_0.4.1_x64_en-US.msi` - 4.41 MiB, signed |
| Runtime database | `%APPDATA%\in.medicore.desktop\medicore.db` |
| Schema/integrity | `schema_version=18`, `PRAGMA quick_check=ok` |
| Single instance | Second process exited; original stayed running |
| Close flush | WAL checkpointed; database readable after close |
| Pre-migration backup | `pre-migration-v15-<timestamp>.db` and `pre-migration-v16-<timestamp>.db` created |
| Scheduled backup | Encrypted `MediCore-daily-2026-11-03.db`, `MediCore-weekly-2026-W45.db`, `MediCore-monthly-2026-11.db` |
| Manual/secondary backup | Encrypted local and selected-folder copies created; 3 files each |
| Restore | Pre-restore safety copy created; app reloaded with schema 18 and matching invoice counts |
| Encryption | SQLCipher 4.20; `PRAGMA quick_check=ok`; invoice counts preserved |
| Key storage | Windows Credential Manager target `sqlcipher-database-key-v1.in.medicore.desktop` present |
| Plaintext migration | Existing 585,728-byte plaintext database encrypted; `pre-encryption-<epoch>.db` created |
| Legacy backup restore | Plaintext backup accepted, re-encrypted and activated |
| Local export | Migration 18 created `local_export_queue`; unique masked CSV written to `C:\Users\Public\MedicalApp_Sync` |
| Export retry | Invalid folder left batch pending with error; restoring folder cleared pending on next interval |

Checksums from that build:

```text
NSIS SHA256: 114DE90156895A50A78C4F73B0D82890DF713652183A3182E44009BD88B1F312
MSI  SHA256: B6F4CB6DE56BF3047DB7C0B2F7D2CD38CDD048A0810DFD45779608515990BA98
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
- Encryption: `SQLCipher (AES-256)`
- Key storage: `Windows Credential Manager`
- Cipher engine: `4.20.0 community`
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
MediCore_0.4.1_x64-setup.exe
MediCore_0.4.1_x64_en-US.msi
```

The local installers are signed with the self-signed MediCore certificate, but they are not publicly
trusted until the client installs `code-signing\MediCore-CodeSigning.cer`. Do not describe the local
certificate as equivalent to a public CA certificate.

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

CI builds are unsigned unless a certificate is configured in the workflow. A local self-signed build is
not a substitute for a publicly trusted CA if the buyer will not install the local root certificate.

## 10. Local self-signed code signing

The local build is signed with a dedicated self-signed code-signing certificate:

```text
Subject:    CN=MediCore Local Code Signing, O=MediCore, C=IN
Thumbprint: 1180CA1A9509C9E968DED5E4274C89410AC52584
Valid to:   2031-11-03
Root file:  code-signing\MediCore-CodeSigning.cer
```

The public `.cer` is committed so client machines can trust the root. The private key and PFX are kept
outside the repository at `%LOCALAPPDATA%\MediCore\CodeSigning\`.

Do not commit:

- `.pfx` or `.p12` files
- certificate passwords
- private signing keys
- timestamp credentials

Client machines must install the local root certificate once, then the signed app/installers are trusted:

```powershell
certutil -addstore -f Root .\MediCore-CodeSigning.cer
certutil -addstore -f TrustedPublisher .\MediCore-CodeSigning.cer
```

For a single Windows user without administrator rights:

```powershell
certutil -user -addstore -f Root .\MediCore-CodeSigning.cer
certutil -user -addstore -f TrustedPublisher .\MediCore-CodeSigning.cer
```

The repeatable local flow is also in `scripts\sign-windows.ps1`. It signs the app, regenerates the
installers with `--no-binary-patching`, signs both installers and verifies all three signatures.

Local signing flow used for `0.4.1`:

```powershell
$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe"
$thumb = "1180CA1A9509C9E968DED5E4274C89410AC52584"

& $signtool sign /fd SHA256 /sha1 $thumb `
  /tr http://timestamp.digicert.com /td SHA256 `
  .\src-tauri\target\release\medicore.exe

# Preserve the signed executable while regenerating installers.
npx tauri bundle --no-binary-patching

& $signtool sign /fd SHA256 /sha1 $thumb `
  /tr http://timestamp.digicert.com /td SHA256 `
  .\src-tauri\target\release\bundle\nsis\MediCore_0.4.1_x64-setup.exe
& $signtool sign /fd SHA256 /sha1 $thumb `
  /tr http://timestamp.digicert.com /td SHA256 `
  .\src-tauri\target\release\bundle\msi\MediCore_0.4.1_x64_en-US.msi
```

Verify the app embedded in the MSI, not only the installer shell:

```powershell
msiexec /a .\src-tauri\target\release\bundle\msi\MediCore_0.4.1_x64_en-US.msi /qn TARGETDIR=$env:TEMP\medicore-msi
Get-AuthenticodeSignature "$env:TEMP\medicore-msi\PFiles\MediCore\medicore.exe"
Get-AuthenticodeSignature .\src-tauri\target\release\bundle\nsis\MediCore_0.4.1_x64-setup.exe
```

Expected status: `Valid` and the same MediCore thumbprint.

Generate checksums:

```powershell
Get-FileHash .\src-tauri\target\release\bundle\nsis\MediCore_0.4.1_x64-setup.exe `
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
- [x] Local self-signed app/installer signing configured and verified
- [ ] Public-CA signing and clean-machine acceptance
- [ ] Previous installer and checksum retained for rollback
- [ ] SQLCipher migration and Credential Manager key verified
- [ ] Encrypted backup and restore verified

## 12. What remains blocked

- Backend entitlement enforcement outside the UI; Windows DPAPI storage and hardware binding are implemented
- SQLCipher key export/import and key rotation for cross-machine recovery
- Unattended Windows scheduled backup and clean-machine restore acceptance
- Auto-updater signing/endpoints
- Public installer distribution and support process
