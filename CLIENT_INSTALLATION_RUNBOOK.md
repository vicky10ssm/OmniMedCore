# Client installation runbook

Last updated: 4 November 2026  
Applies to: MediCore `0.3.0` Windows desktop app  
Status: supervised pilot only; not a general-availability hosted service

This runbook covers two installation modes:

1. **Offline-only terminal** — the normal, recommended pilot installation. The terminal works without
   internet access and stores all data locally in SQLCipher.
2. **Offline terminals plus online monitoring** — optional, pilot-only. The terminals still write
   locally; a vendor-hosted Next.js/PostgreSQL service receives append-only sync events and exposes a
   read-only dashboard.

The online tier is **not yet production-ready**. Do not install it at a client unless the vendor has
deployed and accepted the hosted service, TLS, backups, uptime and token handling first. See
[cloud-dashboard/README.md](cloud-dashboard/README.md) and
[docs/deployment-and-readiness.md](docs/deployment-and-readiness.md).

## 1. Before travelling to the site

Collect and confirm:

- [ ] Buyer champion, clinical approver and IT contact named
- [ ] Tenant ID and device ID for each terminal (shown on the licence activation screen)
- [ ] Signed licence JSON for the correct tenant/device and edition
- [ ] Signed installer and public root certificate
- [ ] Windows 10/11 64-bit, WebView2 available, 4 GB RAM recommended, at least 2 GB free disk
- [ ] A4 and/or 80 mm printer installed and test page working
- [ ] One Windows account per terminal; local administrator or per-user certificate install approved
- [ ] Backup target: external drive, NAS or approved OneDrive folder
- [ ] Migration workbook, opening balances and user/role list approved
- [ ] Written acceptance criteria, rollback owner and support contact
- [ ] For online monitoring only: HTTPS endpoint, `SYNC_INGEST_TOKEN`, dashboard credentials and a
      vendor-deployed PostgreSQL service

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
MediCore_0.3.0_x64-setup.exe        NSIS per-user installer
MediCore_0.3.0_x64_en-US.msi        MSI installer (may require administrator)
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
Get-AuthenticodeSignature .\MediCore_0.3.0_x64-setup.exe
```

Expected:

```text
Status: Valid
```

Also check the SHA-256 hash against the release notes or `DESKTOP_BUILD.md`:

```powershell
Get-FileHash .\MediCore_0.3.0_x64-setup.exe -Algorithm SHA256
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

- NSIS (`MediCore_0.3.0_x64-setup.exe`) installs for the current Windows user.
- MSI (`MediCore_0.3.0_x64_en-US.msi`) may require administrator rights.
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

1. The activation screen shows the **Tenant ID** and **Device ID**.
2. Confirm these match the licence issued for this client.
3. Choose the signed licence `.json` file or paste its JSON.
4. Select **Activate licence**.
5. Confirm the edition, modules, expiry and status.

Licence verification is offline and checks the vendor signature plus tenant/device binding. An expired
licence enters a 30-day grace period and then read-only mode; it does not delete data.

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

Do not claim ABDM exchange, NABL certification or public hosted monitoring from configuration alone.

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

## 5. Optional online monitoring installation — pilot only

The online tier is a **central read-only monitoring service**, not an online billing path. All billing
remains on the desktop terminal. Do not attempt this section without a vendor-deployed service.

### 5.1 Server prerequisites

The vendor or IT owner must provide:

- Node.js 24+ runtime
- PostgreSQL database
- HTTPS reverse proxy/domain
- Private database networking and least-privilege credentials
- Server backup, monitoring and an owner for incidents
- Dashboard Basic-auth credentials and a strong `SYNC_INGEST_TOKEN`

Set the values from `cloud-dashboard/.env.example`:

```text
DATABASE_URL
DATABASE_SSL
SYNC_INGEST_TOKEN
SYNC_ALLOWED_ORIGIN
DASHBOARD_USER
DASHBOARD_PASSWORD
DEFAULT_TENANT_ID
```

Apply the central schema from the `cloud-dashboard` folder:

```powershell
cd cloud-dashboard
psql $env:DATABASE_URL -f sql/central-schema.sql
```

Build and run the service according to `cloud-dashboard/README.md`, then put HTTPS in front of it.

Current limitations: the token is a shared fleet secret; per-device tokens, rotation/revocation,
owner SSO/MFA, uptime monitoring and server backups are not complete. Do not expose the PostgreSQL
database publicly.

### 5.2 Configure each terminal

Open **Settings → Device & sync → Cloud sync**:

```text
Endpoint: https://<vendor-hosted-domain>/api
Token:    the value of SYNC_INGEST_TOKEN
```

Select **Save and sync**. Verify:

- health check passes;
- pending events eventually reach `0`;
- last successful sync updates;
- errors are recorded and investigated.

The terminal keeps billing offline. Events queue locally and push every 30 seconds while the desktop
app is open. Sync does not run while the app is closed.

### 5.3 Verify the read-only dashboard

Open:

```text
https://<vendor-hosted-domain>/dashboard?tenant=tenant-default
```

Sign in with the configured Basic-auth credentials. Confirm the dashboard shows the latest synced
invoices/reports/admissions and does not offer any write controls.

The monitor is strictly read-only. It is not a backup of the terminal, not a real-time clinical system
and not a substitute for local backups.

### 5.4 Online acceptance tests

- [ ] Create an invoice offline; confirm it appears on the dashboard after reconnecting
- [ ] Queue records while disconnected; confirm they drain on reconnect
- [ ] Confirm monitor write controls are absent and direct write attempts fail
- [ ] Confirm tenant isolation with a second tenant before broad rollout
- [ ] Confirm HTTPS, strong dashboard password and token handling
- [ ] Confirm terminal backup still works independently of cloud sync

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
- [ ] Online sync configured and tested, if in scope
- [ ] Read-only dashboard verified, if in scope
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
- The online dashboard is pilot-only, not a hosted SaaS; per-device tokens/revocation, SSO/MFA and
  operational hardening are incomplete.
- Browser/IndexedDB storage is not the supported primary data store.
- Clean-machine install/upgrade/restore acceptance and public-CA signing remain release gates.
- MediCore is not NABL-certified, ISO-certified, ABDM-live or a complete HIS/LIS by installing it.

## 9. Related documents

- [DESKTOP_BUILD.md](DESKTOP_BUILD.md) — build, install/upgrade testing and local signing
- [code-signing/README.md](code-signing/README.md) — root-certificate installation
- [ENCRYPTION.md](ENCRYPTION.md) — SQLCipher and Windows Credential Manager details
- [BACKUP_RESTORE.md](BACKUP_RESTORE.md) — backup/restore behavior and retention
- [cloud-dashboard/README.md](cloud-dashboard/README.md) — optional online service
- [docs/deployment-and-readiness.md](docs/deployment-and-readiness.md) — IT requirements and release gates
- [docs/onboarding-migration-support.md](docs/onboarding-migration-support.md) — discovery, migration,
  training and support
- [HOTFIX_ROLLBACK_PROCESS.md](HOTFIX_ROLLBACK_PROCESS.md) — upgrade rollback procedure
