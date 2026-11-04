# Client installation runbook

Last updated: 4 November 2026  
Applies to: MediCore `0.4.1` Windows desktop app  
Status: supervised pilot only; offline-first terminal with local CSV export

This runbook covers the offline desktop terminal and its optional local Google Drive outbox:

1. **Offline terminal** — the normal, recommended installation. All billing and clinical operations
   work without internet access and store data locally in SQLCipher.
2. **Local Google Drive CSV export** — optional. The terminal writes unique CSV files into a local
   Google Drive sync folder; the Google Drive desktop client uploads them independently. There is no
   API, endpoint, token or hosted dashboard in the export path.

The CSV export is a one-way summary outbox, not a live sync service. It does not import data, merge
terminals or provide a remote monitor. See [LOCAL_CSV_EXPORT.md](LOCAL_CSV_EXPORT.md) and
[docs/deployment-and-readiness.md](docs/deployment-and-readiness.md).

## 1. Before travelling to the site

Collect and confirm:

- [ ] Buyer champion, clinical approver and IT contact named
- [ ] Tenant ID and Hardware Device ID for each terminal (shown on the licence activation screen)
- [ ] Signed licence JSON for the correct tenant/hardware fingerprint and edition; reissue old UUID-based
      licences before upgrading
- [ ] Signed installer and public root certificate
- [ ] Windows 10/11 64-bit, WebView2 available, 4 GB RAM recommended, at least 2 GB free disk
- [ ] A4 and/or 80 mm printer installed and test page working
- [ ] One Windows account per terminal; local administrator or per-user certificate install approved
- [ ] Backup target: external drive, NAS or approved OneDrive folder
- [ ] Google Drive desktop client installed/signed in, with a chosen local sync folder, if CSV export
      is in scope
- [ ] Migration workbook, opening balances and user/role list approved
- [ ] Written acceptance criteria, rollback owner and support contact

Do not load real patient data before the backup/restore test and the buyer's written acceptance.

## 2. Files and local paths

Typical installed layout:

```text
Application:
  %LOCALAPPDATA%\MediCore\medicore.exe

Database and local backups:
  %APPDATA%\in.medicore.desktop\medicore.db
  %APPDATA%\in.medicore.desktop\Backups\

Optional second backup folder:
  <selected folder>\MediCore Backups\
```

Release files:

```text
MediCore_0.4.1_x64-setup.exe        NSIS per-user installer
MediCore_0.4.1_x64_en-US.msi        MSI installer (may require administrator)
MediCore-CodeSigning.cer            Public local root certificate
<licence>.json                      Signed tenant/device licence
```

The SQLCipher database key is stored by the app in **Windows Credential Manager**, not in a
configuration file. The local key target is:

```text
sqlcipher-database-key-v1.in.medicore.desktop
```

## 3. Verify the signed build

Do this on every client machine before installing.

### 3.1 Install the local root certificate

Windows trusts the locally signed build only after the MediCore root certificate is installed.

Administrator PowerShell:

```powershell
certutil -addstore -f Root .\MediCore-CodeSigning.cer
certutil -addstore -f TrustedPublisher .\MediCore-CodeSigning.cer
```

Per-user alternative without administrator rights:

```powershell
certutil -user -addstore -f Root .\MediCore-CodeSigning.cer
certutil -user -addstore -f TrustedPublisher .\MediCore-CodeSigning.cer
```

Expected local certificate:

```text
Subject:    CN=MediCore Local Code Signing, O=MediCore, C=IN
Thumbprint: 1180CA1A9509C9E968DED5E4274C89410AC52584
Valid to:   2031-11-03
```

### 3.2 Verify the installer signature

```powershell
Get-AuthenticodeSignature .\MediCore_0.4.1_x64-setup.exe
```

Expected:

```text
Status: Valid
```

Also check the SHA-256 hash against the release notes or `DESKTOP_BUILD.md`:

```powershell
Get-FileHash .\MediCore_0.4.1_x64-setup.exe -Algorithm SHA256
```

Stop if the signature is not `Valid` or the hash does not match the published release. Do not install
an untrusted file.

This is a self-signed local certificate, not a public-CA certificate. SmartScreen reputation may still
be limited, and a client without the root certificate will not trust the signature.

## 4. Offline-only terminal installation

### 4.1 Protect existing data before an upgrade

If MediCore is already installed:

1. Close the application normally and wait for it to exit.
2. Copy the current `%APPDATA%\in.medicore.desktop\medicore.db` and the `Backups` folder to a protected
   location.
3. Retain the previous installer and its checksum.
4. Confirm the application has no unsaved data.

For a new installation, no database exists yet.

### 4.2 Run the installer

- NSIS (`MediCore_0.4.1_x64-setup.exe`) installs for the current Windows user.
- MSI (`MediCore_0.4.1_x64_en-US.msi`) may require administrator rights.
- Run the installer interactively. Do not use silent switches for a production upgrade until the
  clean-machine upgrade path has been accepted.
- Do not uninstall the old version as part of a normal upgrade.

After installation, verify the installed executable:

```powershell
Get-AuthenticodeSignature "$env:LOCALAPPDATA\MediCore\medicore.exe"
```

Expected `Status: Valid`.

### 4.3 First launch and encryption

Launch MediCore from the Start menu.

On first launch of a new version:

- The app opens the existing database or creates a new one.
- An existing plaintext database is automatically migrated to SQLCipher.
- A random database key is created and stored in Windows Credential Manager.
- An encrypted `pre-encryption-<epoch>.db` safety copy is written before plaintext replacement.
- There is no encryption passphrase prompt in this release.

Open **Settings → Device & sync** and verify:

```text
Encryption:       SQLCipher (AES-256)
Key storage:      Windows Credential Manager
Cipher engine:    4.20.0 community
Database file:    encrypted SQLCipher file
File writable:    Yes
```

If the app reports an encrypted database with a missing key, do not delete the database and do not reset
the Windows profile. Escalate to support with the exact error.

### 4.4 Activate the licence

1. The activation screen shows the **Tenant ID** and **Hardware Device ID**.
2. Confirm these match the licence issued for this client. The Hardware Device ID is a 64-character
   SHA-256 fingerprint, not a database UUID.
3. Choose the signed licence `.json` file or paste its JSON.
4. Select **Activate licence**.
5. Confirm the edition, modules, expiry and status. The signed file is stored through Windows DPAPI.

Licence verification is offline and checks the vendor signature plus tenant/hardware binding. Clock
rollback fails with **System Clock Manipulation Detected**; correct the Windows clock and restart. An
expired licence enters a 30-day grace period and then read-only mode; it does not delete data.

### 4.5 First login and users

1. First-run bootstrap login is `admin / admin123`.
2. Change the admin password immediately when prompted.
3. Create named users; do not share the admin account.
4. Assign Admin or Operator roles.
5. Enable 2FA for administrative users where practical.
6. Store recovery codes offline in a controlled location.
7. Enable report-release authority only for authorised pathologists/users.

### 4.6 Configure the centre

Use **Settings** to configure:

- Centre name, address, phone, GSTIN, logo and letterhead
- Enabled modules
- Invoice prefix, device code and numbering
- Users and roles
- Tests, packages, parameters, reference intervals, units, specimen/container types
- Doctors and reporting pathologists
- Printing and report headers/footers
- Accreditation labels only where the buyer is authorised to use them

Do not claim ABDM exchange or NABL certification from configuration alone. The supported data-sharing
path is the local Google Drive CSV outbox, not a hosted monitor.

### 4.7 Configure local backup

1. Open **Settings → Device & sync → Backup & restore**.
2. Confirm the local backup path is writable.
3. Choose an optional second folder on a USB drive, NAS or approved OneDrive folder.
4. Select **Backup Now**.
5. Verify that daily, weekly and monthly files were created locally and, if configured, in the second
   folder.
6. Confirm the “Last backup” time updates.

Backups are encrypted with the same Windows Credential Manager key as the live database. The daily
schedule runs only while the application is open. There is no unattended Windows service yet.

### 4.8 Test restore before go-live

Use test data or an approved dry-run time. Restore replaces the active database.

1. Create a manual backup containing known test data.
2. Record the invoice/patient counts and a totals screenshot.
3. Open **Restore from backup** and select the backup.
4. Confirm validation succeeds and approve the replacement.
5. Verify that a `pre-restore-<epoch>.db` safety copy appears in the local `Backups` folder.
6. Confirm the app reloads, counts and totals match, and the database still opens.
7. Record the restore evidence: date, operator, backup file, counts and result.

Do not proceed to live patient data until a restore has been demonstrated on a non-production copy or
with the buyer's explicit approval.

### 4.9 Windows profile and key recovery

The SQLCipher key is bound to the Windows user profile. Encrypted backups cannot be opened without the
matching key, and this release does **not** yet provide key export/import.

Before go-live:

- protect the Windows account and keep an approved Windows profile/credential backup;
- enable BitLocker or another full-disk protection where available;
- never reset or delete the Windows profile as a troubleshooting step;
- keep the pre-encryption backup and at least one controlled backup copy;
- record that cross-machine encrypted restore is not yet supported.

Key export/import, rotation and clean-machine restore remain release gates.

## 5. Optional local Google Drive CSV export

The export path is entirely local. Google Drive performs the upload after the file is written.

### 5.1 Choose the sync folder

1. Install and sign in to the Google Drive desktop client on the terminal.
2. Create a dedicated folder under the synced Google Drive location, for example:
   `C:\Users\<user>\My Drive\MediCore\outbox`.
3. Open **Settings → Device & sync → Local CSV export**.
4. Set the export folder to that path, or keep the default:
   `C:\Users\Public\MedicalApp_Sync`.
5. Select **Save folder and export**.
6. Keep the Google Drive desktop client running.

The app creates the directory automatically if it is missing. If the path is not a directory, cannot
be written, or the drive is locked/full, the batch remains pending and the UI records the error.

### 5.2 Verify the first export

1. Create a test invoice, pharmacy sale or hospital charge.
2. Select **Export now** in Settings, or wait for the 30-second interval.
3. Confirm a new file appears in the chosen folder with this pattern:

```text
tx_YYYYMMDD_HHMMSS_XXXXXX.csv
```

4. Open the CSV and confirm the header:

```csv
Sync_Timestamp,Transaction_ID,Module_Type,Masked_Patient_ID,Total_Amount
```

5. Confirm the row has no patient name or raw patient ID, and that the module is `Diagnostics`,
   `Pharmacy` or `Hospital`.
6. Confirm **Pending transactions** returns to `0` after the export.
7. Confirm Google Drive uploads the file (the app does not wait for or receive an upload ACK).

### 5.3 Local export acceptance tests

- [ ] Google Drive client is running and the folder is writable
- [ ] A new uniquely named CSV is created for each batch
- [ ] Existing CSV files are not modified or overwritten
- [ ] CSV header and five flat columns are correct
- [ ] Patient ID is masked
- [ ] Pending count returns to zero after success
- [ ] Making the folder temporarily unavailable leaves the batch pending and records an error
- [ ] Restoring the folder causes the next interval to retry successfully
- [ ] Terminal backup/restore still works independently of the CSV export

## 6. Go-live acceptance checklist

- [ ] Root certificate installed and installer/app signatures `Valid`
- [ ] SQLCipher encryption and Credential Manager key present
- [ ] Licence activated for the correct tenant/device/edition
- [ ] Admin password changed; named users and roles created; 2FA considered
- [ ] Centre profile, modules, numbering, printing and letterhead configured
- [ ] Test patient, invoice, payment, print and report workflow passed
- [ ] Local backup and optional second folder verified
- [ ] Restore test completed with recorded evidence
- [ ] Windows profile/key backup and BitLocker decision recorded
- [ ] Local Google Drive CSV export configured and tested, if in scope
- [ ] CSV filename, columns, masking and retry failure path verified
- [ ] Rollback owner, previous installer and support contact recorded
- [ ] Buyer acceptance signed with known limitations and open defects

## 7. Upgrade and rollback

### Upgrade

1. Announce the maintenance window.
2. Close the app and take a verified backup.
3. Verify the new installer signature and checksum.
4. Install interactively over the existing version.
5. Let the app migrate and verify the pre-migration backup path.
6. Check schema/integrity, licence, invoice/payment counts and one print.
7. If critical failure occurs, stop writes, restore the previous backup and reinstall the previous
   signed installer. See [HOTFIX_ROLLBACK_PROCESS.md](HOTFIX_ROLLBACK_PROCESS.md).

Do not overwrite the only backup during an upgrade and do not uninstall data as part of a routine
upgrade.

### Uninstall

Uninstall behavior on a clean machine is not yet formally accepted. Before any uninstall:

1. Take a backup and copy the `Backups` folder.
2. Record the database and key location.
3. Confirm the buyer has approved the action.
4. Preserve the Windows profile/credential and database unless the buyer explicitly requests deletion.

## 8. Do not claim at handover

State these limitations plainly:

- The local certificate is self-signed; clients must install the root certificate. It is not a public
  CA/SmartScreen reputation service.
- Encrypted backups require the Windows Credential Manager key; key export/import and cross-machine
  restore are not implemented.
- Daily backups run only while the app is open; there is no unattended Windows service.
- The CSV export is a one-way summary outbox, not a live sync service, import path, remote monitor or
  terminal-to-terminal merge.
- CSV success means the file was written locally, not that Google Drive has uploaded or a downstream
  consumer has processed it.
- Browser/IndexedDB storage is not the supported primary data store.
- Clean-machine install/upgrade/restore acceptance and public-CA signing remain release gates.
- MediCore is not NABL-certified, ISO-certified, ABDM-live or a complete HIS/LIS by installing it.

## 9. Related documents

- [DESKTOP_BUILD.md](DESKTOP_BUILD.md) — build, install/upgrade testing and local signing
- [code-signing/README.md](code-signing/README.md) — root-certificate installation
- [ENCRYPTION.md](ENCRYPTION.md) — SQLCipher and Windows Credential Manager details
- [BACKUP_RESTORE.md](BACKUP_RESTORE.md) — backup/restore behavior and retention
- [LOCAL_CSV_EXPORT.md](LOCAL_CSV_EXPORT.md) — Google Drive outbox contract and retry behavior
- [docs/deployment-and-readiness.md](docs/deployment-and-readiness.md) — IT requirements and release gates
- [docs/onboarding-migration-support.md](docs/onboarding-migration-support.md) — discovery, migration,
  training and support
- [HOTFIX_ROLLBACK_PROCESS.md](HOTFIX_ROLLBACK_PROCESS.md) — upgrade rollback procedure
