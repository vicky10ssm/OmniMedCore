# OmniMed Core licensing process

Last updated: 4 November 2026<br>
Database schema: `23`<br>
Audience: sales, support, finance and vendor licence administrators

## 1. Purpose and scope

This is the operating procedure for selling, issuing, activating, renewing and revoking OmniMed Core
licences. It complements the product rules in [licensing-and-editions.md](licensing-and-editions.md) and
the portal instructions in [license-portal/README.md](../license-portal/README.md).

Current scope:

- One application codebase with Diagnostics, Pharmacy, Hospital, Complete and Custom editions.
- Signed offline licence files bound to tenant and a Windows hardware fingerprint.
- Vendor-operated licence administration portal.
- 30-day grace, then read-only access to existing data, print and export.
- Windows DPAPI licence storage and a local execution-time high-water mark in the packaged desktop app.
- No public customer self-service portal, automated payment collection or guaranteed online revocation
  yet.

## 2. Roles and authority

| Role | Responsibility |
| --- | --- |
| Sales | Confirm edition/modules, terminal count, term, customer legal name and support reference |
| Finance | Confirm order/payment status and invoice details before issuance |
| Licence administrator | Collect tenant/device IDs, issue/renew/revoke files in the portal |
| Implementation/support | Import the licence, verify locked/unlocked modules, train the customer |
| Security owner | Controls portal token, private signing key, backups and access list |
| Support lead | Owns renewal reminders, exceptions and customer communication |

Do not issue a licence from an unapproved verbal order. Record the approved edition, term, terminal cap
and support reference first.

## 3. Licence lifecycle

```text
Enquiry / demo
  -> edition and quote
  -> approved order / payment
  -> collect tenant + device IDs
  -> issue signed licence in vendor portal
  -> deliver licence file
  -> import on device
  -> verify edition/modules/expiry
  -> acceptance record
  -> renewal / upgrade / additional terminal / replacement
  -> expiry -> 30-day grace -> read-only
  -> renewal or archived/revoked state
```

## 4. Stage 1 — qualify and quote

1. Identify the buyer type and required workflow:
   - Diagnostics: patients, billing, invoices, dues, samples, reports, tests, doctors, expenses,
     compliance.
   - Pharmacy: patients, pharmacy, expenses, compliance.
   - Hospital: patients, admissions plus generic IPD service billing, expenses, compliance.
   - Complete: all current modules.
   - Custom: a written subset approved by the vendor.
2. Record the exact module list. Do not quote “all features” or imply full HIS/LIS/pharmacy ERP scope.
3. Record:
   - customer legal name
   - billing entity and GSTIN, if applicable
   - edition/modules
   - licence term and expiry date
   - allowed terminals (`maxTerminals`)
   - support reference
   - implementation owner and site
4. Explain commercial terms, renewal reminders, 30-day grace and post-grace read-only behavior.
5. Explain that the current portal is vendor-operated; the buyer does not get a public self-service
   portal.

## 5. Stage 2 — approval and payment

Before issuing:

- Order/PO or written approval is on file.
- Payment or credit terms are approved by finance.
- Edition, modules, term and terminal count match the order.
- Any pilot credit, discount or custom term is written down.
- The customer understands device-bound activation and what happens if hardware changes.

Do not use the development licence as a free production licence.

## 6. Stage 3 — collect tenant and device IDs

On the customer machine:

1. Open OmniMed Core.
2. Go to **Settings → Licence**.
3. Copy:
   - **Tenant ID** (usually `tenant-default` for a single-centre installation)
   - **Hardware Device ID** (one per terminal; a 64-character SHA-256 fingerprint)
4. For multiple terminals, collect every hardware device ID in the initial order.
5. Verify the customer did not copy an ID from a different browser/profile or test machine. A hardware
   Device ID changes if the motherboard/CPU identity changes, or if the volume-serial fallback changes.

IDs are hardware/installation identifiers, not patient data. They can be sent by email or support ticket.
Do not advise the customer to edit, shorten or reuse a Device ID.

## 7. Stage 4 — issue the licence

On the vendor machine:

1. Open PowerShell in the project folder.

   ```powershell
   cd "C:\dev\medicore"
   ```

2. Set a strong portal token for this session.

   ```powershell
   $env:MEDICORE_PORTAL_ADMIN_TOKEN = "use-a-long-random-secret"
   ```

3. Start the portal.

   ```powershell
   npm run license:portal
   ```

4. Open `http://127.0.0.1:8787` and enter the same token.
5. In **Issue licence**, enter:
   - customer name
   - edition
   - tenant ID(s), comma separated
   - hardware device ID(s), comma separated (64-character lowercase SHA-256 values)
   - max terminals
   - expiry date
   - grace days (`30` by default)
   - support reference
   - custom modules only if edition is **Custom**
6. Click **Issue & download licence**.
7. Check the downloaded file’s edition, modules, tenant IDs, device IDs and expiry before sending it.
8. Record the licence ID, customer, edition, devices, expiry and support reference in the licence register.

### Issue-time checks

- Every tenant and device ID is correct.
- Device count does not exceed `maxTerminals`.
- The expiry is end-of-day in the customer’s intended timezone or clearly documented.
- The customer name matches the order/invoice.
- Custom module lists are approved and contain no unknown module IDs.

Current limitation: `maxTerminals` is recorded and checked during portal issuance. Runtime terminal-count
enforcement and online device registration are release gates.

## 8. Stage 5 — deliver and activate

1. Deliver the `.medicore-license.json` file through the agreed support channel.
2. On the customer machine, open **Settings → Licence**.
3. Choose the file or paste the JSON and click **Import licence**.
4. Verify:
   - edition and customer
   - licence ID and expiry
   - tenant/device IDs
   - licensed module list
   - unlicensed modules show **Not licensed** and are absent from navigation
5. Open the licensed workflows the buyer purchased and confirm they load.
6. Record activation evidence (date, user, screenshot or signed acceptance note).

If activation fails:

| Error | Action |
| --- | --- |
| Signature could not be verified | Re-download the original file; do not edit it |
| Not issued for tenant | Check the actual tenant ID and reissue if needed |
| Hardware mismatch | Confirm the current Hardware Device ID; issue a replacement for that fingerprint |
| Licence storage could not be decrypted | The protected file was copied to another machine/account or damaged; re-import on this device |
| System Clock Manipulation Detected | Check the Windows clock/date and timezone; correct it, restart, and investigate as a security event |
| Licence expired | Check date/clock and issue a renewal if commercially approved |
| Unknown/malformed file | Re-download; never hand-edit a signed payload |

### Upgrading a pre-hardware-binding licence

Licences issued before hardware fingerprinting contain a random database UUID in `deviceIds`. The
hardware-bound desktop build rejects those files with a hardware mismatch. Before rolling the release to
an existing customer:

1. Collect the current **Hardware Device ID** for every terminal.
2. Reissue the same edition, modules, expiry and support reference with the new hardware Device ID.
3. Import the replacement on each terminal before or immediately after the upgrade.
4. Keep the old licence ID in the register as superseded.
5. Do not hand-edit the signed JSON, and do not ask the customer to copy a database UUID into the new
   field.

## 9. Stage 6 — renewal

Recommended reminder schedule:

| When | Action |
| --- | --- |
| 60 days before expiry | Sales/support renewal notice and quote |
| 30 days before expiry | Confirm purchase order/payment and device list |
| 7 days before expiry | Final reminder; prepare renewal file |
| Expiry date | Licence enters 30-day grace; full licensed use remains |
| Day 30 after expiry | Read-only mode: view/print/export only |
| After read-only | Renewal or formal offboarding/archive decision |

Renewal steps:

1. Confirm the customer, edition, modules, terminals and new expiry.
2. Open the portal and locate the licence.
3. Use **Renew** and enter the new expiry date.
4. Download the renewed file.
5. Import it on each licensed device.
6. Confirm the new expiry in Settings → Licence.
7. Update the licence register and renewal record.

The portal renewal action re-signs the licence. A renewed file must be imported; merely changing the
portal record does not update an offline device.

## 10. Stage 7 — upgrade, add-on or additional terminal

1. Confirm the new edition/modules and commercial approval.
2. Collect any new device IDs.
3. Issue a replacement licence containing the full tenant/device list and new module set.
4. Import the replacement on all affected devices.
5. Confirm the new modules appear and old modules remain as intended.
6. Record whether the previous file is superseded.

Do not tell the customer that adding a terminal “automatically activates” it. Each device must be in the
signed licence or use a future online registration service.

## 11. Stage 8 — replacement, transfer and revocation

### Replace a failed/replaced computer

1. Collect the new **Hardware Device ID**.
2. Confirm commercial/device-transfer approval.
3. Issue a replacement licence including the new hardware Device ID.
4. Import it on the replacement device.
5. Mark the old device ID as retired in the register.
6. If only a hard disk was replaced, the volume-serial fallback may also change the fingerprint; treat it
   as a new device and reissue.

### Revoke a licence

1. Confirm the commercial/security reason and approver.
2. Use **Revoke** in the portal.
3. Download the revoked file.
4. Deliver/import it on the device.
5. Record the revocation date and reason.

Offline limitation: a device that never receives the revoked file cannot learn about the revocation. Do
not promise guaranteed online revocation until an online validation service exists.

## 12. Stage 9 — expiry, grace and read-only

- **Active:** licensed modules available.
- **Grace (default 30 days):** licensed modules available with a renewal warning.
- **After grace:** read-only. Existing records can be viewed, printed and exported; new billing,
  dispensing, admission changes, sample/report work and other writes are blocked.
- **Data retention:** expiry never deletes or encrypts the local database. Backups remain the customer’s
  responsibility under the agreed support/backup process.

The customer must be told about grace/read-only before purchase and again in the renewal reminder.

## 13. Licence register

Keep a controlled register with at least:

| Field | Example |
| --- | --- |
| Licence ID | `MED-2026-EB0CE57B` |
| Customer legal name | Example Diagnostics Pvt Ltd |
| Edition/modules | `hospital` / listed module IDs |
| Tenant IDs | `tenant-default` |
| Hardware Device IDs | one SHA-256 fingerprint row per terminal |
| Max terminals | `2` |
| Issued at | ISO date/time |
| Expiry | ISO date |
| Grace days | `30` |
| Status | `active` / `revoked` |
| Support reference | `SUP-2026-0042` |
| Order/invoice reference | `INV-2026-0188` |
| Replacement/superseded ID | `MED-2026-...` |
| Activation evidence | date, device, verifier |
| Renewal reminders | 60/30/7-day dates |

Do not store portal tokens or private keys in the customer register.

## 14. Security and key management

- The signing private key is `license-portal/keys/private-key.pem`; it is gitignored and must never be
  committed, shipped in the installer or sent to a customer.
- Back up the private key offline in at least two controlled locations.
- The portal token is an environment variable, not a file in the repository. Use a long random value and
  do not reuse the old test token.
- Keep the portal bound to localhost or a private admin network. Public hosting requires TLS, per-user
  authentication/MFA, rate limiting, audit, backups and monitoring.
- Back up `license-portal/data/licenses.json`.
- If the private key leaks, treat all licences signed by it as compromised and rotate the signing key,
  public key and affected licences.
- If the private key is lost, existing files verify until expiry but no renewal can be signed with that
  key.

## 15. Customer communication templates

### Issuance

> Your OmniMed Core [Edition] licence is attached. It is activated for tenant [ID] and device [ID].
> Please import it in Settings → Licence, then confirm the edition, module list and expiry. Keep the file
> with your software records. Contact [support] before changing the computer.

### Renewal reminder

> Your OmniMed Core licence expires on [date]. A 30-day grace period follows expiry; after that OmniMed Core
> becomes read-only but existing records remain available to view, print and export. Please confirm
> renewal and return the current device IDs.

### Replacement device

> We have issued a replacement licence for the new device ID. Import it on the replacement computer and
> confirm the edition/modules. The previous device ID is recorded as retired.

## 16. Exceptions and escalation

| Situation | Action |
| --- | --- |
| Wrong customer/device ID | Reissue; do not hand-edit the signed file |
| Customer moved to a new computer | Verify approval, issue replacement with the new hardware Device ID, record transfer |
| Clock appears wrong | Correct system time; investigate clock tampering as a security issue |
| Clock rollback detected after correction | Restart OmniMed Core; if the high-water time is ahead of a corrected clock, escalate rather than deleting state files |
| DPAPI licence cannot be decrypted | Re-import the signed file on the current Windows user/machine; confirm whether the profile or hardware changed |
| WMI restricted / fingerprint fallback used | Confirm the displayed Hardware Device ID is stable; document the volume-serial source in support notes |
| Lost licence file | Re-download from the portal by licence ID |
| Lost private key | Escalate to security owner; existing licences remain valid until expiry |
| Suspected leaked portal token | Rotate the token, restrict network access, review portal records |
| Suspected leaked private key | Rotate signing identity and reissue affected licences |
| Customer refuses renewal | Enter read-only after grace; follow offboarding/archive policy |
| Disputed invoice | Finance resolves before renewal file delivery |

## 17. Acceptance checklist

- [ ] Approved order, edition, modules, term, terminal count and support reference
- [ ] Tenant ID(s) verified
- [ ] Hardware Device ID(s) verified
- [ ] Licence issued and downloaded from the portal
- [ ] File imported successfully on the target device
- [ ] Edition/modules/expiry verified in Settings → Licence
- [ ] Unlicensed modules locked and absent from navigation
- [ ] Activation evidence recorded
- [ ] Licence register updated
- [ ] Renewal reminders scheduled
- [ ] Customer knows grace/read-only and device-transfer rules

## 18. Current release boundaries

Do not claim the following until implemented and tested in the packaged release:

- public hosted licence self-service or payment portal
- backend entitlement enforcement outside the UI
- guaranteed online revocation
- runtime terminal-count enforcement
- impossible-to-clone or tamper-proof DRM
- Tauri installer, automated backup/restore or local CSV export

Windows DPAPI storage, hardware fingerprinting and the local clock high-water mark are implemented in the
packaged desktop code, but they are local controls, not a hosted DRM service. They must still be tested on
clean Windows installs and covered by the release checklist.

For product rules, see [licensing-and-editions.md](licensing-and-editions.md). For portal setup and API,
see [license-portal/README.md](../license-portal/README.md).
