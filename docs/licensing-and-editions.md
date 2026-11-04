# Licensing, editions and activation

Last updated: 4 November 2026<br>
Database schema: `18`

## Commercial model

MediCore is one product codebase with purchasable editions. The installed application exposes:

```text
effective modules = modules allowed by the signed licence
                    ∩ modules enabled by the clinic in Settings
```

Dashboard and Settings are administrator-only. A module that is not licensed is shown as **Not licensed**
in Settings and cannot be enabled. A licensed module can still be hidden by the clinic for day-to-day
operational simplicity. Operators work from Expenses and do not see Settings or Compliance.

| Edition | Licensed module set |
| --- | --- |
| Diagnostics | Patients, New bill, Invoices, Dues, Samples, Reports, Tests & Packages, Doctors, Expenses, Compliance |
| Pharmacy | Patients, Pharmacy, Expenses, Compliance |
| Hospital | Patients, Admissions plus generic hospital service/IPD billing, Expenses, Compliance |
| Complete | All current modules |
| Custom | A vendor-selected subset of the modules above |

Hospital's generic billing is a service sheet attached to an admission: hospital-defined room, nursing,
procedure, consultation or consumable services; quantity; GST; payments; balance; and A4 print. It is not
a full HIS, insurance/TPA claim workflow, package engine, advance/deposit ledger, bed board or nursing
record.

## Licence technology

- Licence files are signed with ECDSA P-256/SHA-256 by the vendor portal.
- The desktop application contains only the public verification key.
- The private signing key belongs to the vendor portal and must never ship with the app.
- A licence is bound to one or more `tenantIds` **and** one or more hardware `deviceIds`. Both must
  match the current installation.
- The payload includes edition, module list, terminal cap, issue time, expiry, grace days, status and
  support reference. The signature covers canonical JSON.
- Offline verification uses WebCrypto. No network call is required to start the app.
- The Windows desktop app binds the licence to a hardware fingerprint and stores the signed file with
  Windows DPAPI. Raw licence JSON is never written to browser `localStorage` in the packaged app.

### Hardware Device ID (`True_Device_ID`)

The desktop app calls the native `GetMachineFingerprint` command. On Windows it reads:

1. the motherboard serial number (`Win32_BaseBoard.SerialNumber`);
2. the CPU Processor ID (`Win32_Processor.ProcessorId`).

Whitespace is stripped from both values, they are concatenated, and SHA-256 is returned as a 64-character
lowercase hexadecimal `True_Device_ID`. That value, not the logical SQLite `device_id` UUID, is the
licence's `Device ID`.

If WMI/CIM access is restricted or either component is a placeholder, the app falls back to the primary
drive volume serial number and returns a `volume-serial` fingerprint. If no stable identifier can be read,
activation fails closed with a supportable error instead of crashing or silently accepting a random ID.

### DPAPI licence storage

The signed licence is encrypted with Windows Data Protection API (DPAPI) at `CurrentUser` scope, with an
application-specific entropy value, and written atomically to:

```text
%APPDATA%\in.medicore.desktop\license.dpapi
```

A copied `license.dpapi` does not decrypt on another Windows account or machine, which revokes the local
entitlement until a valid licence is imported on the correct device. The legacy
`medicore.license.v1` localStorage entry is read once for migration and then removed; failed legacy
licences are not retained in plaintext.

### Clock-rollback high-water mark

`UpdateExecutionTimestamp()` records the current time at app startup, before expiry is evaluated, and
from critical actions (invoice/report printing and report creation). It writes both:

- a DPAPI-protected local state file (`license-state.dpapi`), and
- the encrypted SQLCipher `meta` table key `last_known_execution_time`.

Validation uses the later of the two values. If the machine clock is strictly earlier, the app fails
closed with **System Clock Manipulation Detected** and leaves the active licence state. A 60-second
in-session check also catches rollback while the app remains open.

The high-water mark is local evidence only. It cannot detect tampering that removes both the DPAPI state
file and the encrypted database, and it does not replace Windows account security or physical control of
the terminal.

Current licence file shape:

```json
{
  "payload": {
    "v": 1,
    "licenseId": "MED-2026-XXXXXXXX",
    "customerName": "Buyer name",
    "tenantIds": ["tenant-default"],
    "deviceIds": ["64-character-lowercase-sha256-hardware-fingerprint"],
    "edition": "hospital",
    "modules": ["patients", "admissions", "expenses", "compliance"],
    "maxTerminals": 1,
    "issuedAt": 1790000000000,
    "expiresAt": 1820000000000,
    "graceDays": 30,
    "status": "active",
    "supportReference": "SUP-..."
  },
  "signature": "base64 ECDSA P-256 signature"
}
```

## Activation and renewal

1. Open **Settings → Licence** (or the activation screen when unlicensed) and copy the Tenant ID and
   **Hardware Device ID**.
2. Send both IDs to the vendor with the purchase/edition details.
3. Import the signed `.medicore-license.json` file. The desktop app writes it through DPAPI and removes
   any legacy plaintext copy.
4. Verify the edition, licensed modules and expiry. Unlicensed sections disappear immediately.
5. For a replacement terminal, issue a licence containing the new hardware Device ID. Hardware
   replacement is not automatically a licence transfer.

If a licence is for the wrong tenant or device, activation fails without replacing the current licence.
A hardware mismatch reports **Hardware mismatch**; tampered payloads fail signature verification. On an
encrypted database, the boot unlock happens first; the licence check is retried automatically once
tenant/device identity is readable. If `license.dpapi` was copied from another machine or cannot be
decrypted, the app treats the local licence as invalid and requires re-import on this device.

### Upgrading licences issued before hardware binding

Licences issued before this change contain a random database UUID in `deviceIds`. The hardware-bound
release deliberately rejects those files because a UUID can be copied with the database. The vendor must
reissue each existing licence with the terminal's hardware Device ID before or during the upgrade. This is
a one-time issuance step; renewal, module and expiry terms do not change.

### Can a buyer self-create a licence?

A buyer can create a JSON file with the right shape, but **cannot create a valid ECDSA signature without
the vendor private key**. The app verifies the signature over canonical JSON before accepting the file,
and production builds explicitly reject the special `"development"` signature used by DEV builds.

This is a local offline entitlement check with hardware and clock hardening, not tamper-proof DRM:

- A buyer with administrator access can patch the application bundle, instrument the WebView, dump
  process memory or bypass the UI checks.
- A copied `license.dpapi` fails on another machine, and a copied SQLite database does not carry the
  licence. However, an attacker who is already an administrator on the terminal can delete both local
  time stores or patch the native checks.
- Clock rollback is detected while at least one local high-water store survives. Deleting the DPAPI state
  file and the encrypted database together cannot be detected offline.
- `maxTerminals` is checked at portal issuance, not enforced at runtime.
- Revocation is offline: a device that never receives a revoked licence cannot learn about it.
- Windows DPAPI is current-user scoped in this release. Recreating the Windows user profile or restoring
  a licence file under another Windows account requires re-import.
- The browser monitor build has no DPAPI or Windows hardware API. It uses its browser logical device ID
  and is not the hardware-bound commercial terminal path; the packaged Windows terminal is authoritative.
- Development builds contain a complete development licence; production builds must be checked to
  ensure the development path is not accepted or bundled accidentally.

Do not describe the current licensing as tamper-proof, impossible to clone, or online-revocable. It is
hardware-bound and DPAPI-protected on supported Windows installations, with a detectable local clock
high-water mark.

Development builds receive a complete development licence when no real licence has been imported. This is
for demos and automated checks only; it must not be used as a production entitlement bypass. Production
builds require a valid signed licence and explicitly reject the special `"development"` signature. The
release check must attempt to import a hand-written development licence into the production build and
confirm it is refused.

## Grace and read-only behavior

- **Active:** all licensed modules are available.
- **Grace:** 30 days after expiry by default. Licensed modules remain available and the UI shows a renewal
  warning.
- **After grace:** MediCore enters read-only mode. Existing records can be viewed, printed and exported.
  New financial/clinical writes are blocked, including billing, sample/report work, admissions and
  pharmacy dispensing.

The current implementation enforces the read-only mode through the licence-aware monitoring context,
navigation, route gates and page controls. Transactional pages that share monitor behavior hide write
actions. Production packaging must also enforce this at the data-access/backend boundary; UI hiding alone
is not a security boundary.

Nothing in this model is a guarantee of data durability or a substitute for backup/restore. Billing data
must remain accessible even when the licence has expired, so expiry never deletes or encrypts the local
database.

## Vendor portal

The portal is in `license-portal/`:

```sh
$env:MEDICORE_PORTAL_ADMIN_TOKEN = "a-long-random-secret"
npm run license:portal
```

Open `http://127.0.0.1:8787`. It supports listing, issuing, downloading, renewing and revoking licences,
with local JSON persistence. It is a vendor admin portal, not a public customer/self-service commerce
site. Hosting, TLS, real per-user authentication, MFA, rate limiting, backups and monitoring remain
deployment tasks.

See [license-portal/README.md](../license-portal/README.md) for key management, API and hardening.

## QA checklist

1. Build the terminal and monitor bundles; `npm run check` must be green.
2. With no stored real licence in DEV, confirm the development complete licence is used.
3. Issue a Hospital licence for the current tenant/Hardware Device ID and import it.
4. As an administrator, confirm Diagnostics and Pharmacy are absent/locked; Patients, Admissions,
   Expenses, Compliance, Settings and Dashboard remain. As an operator, confirm Settings and Compliance
   are absent and direct URLs do not open them.
5. Open Admissions, add a service charge and a payment, verify totals/balance/audit and print.
6. Issue a Diagnostics licence and confirm admissions/pharmacy lock in the same installation.
7. Import a licence for a different tenant and a licence with a different hardware Device ID; both must
   fail clearly with tenant/hardware mismatch.
8. Tamper with a payload field; the signature must be rejected.
9. Confirm the licence file on disk is a DPAPI blob, not plain JSON. Copy `license.dpapi` to another
   Windows account/machine (or modify one byte) and confirm the app fails closed and asks for re-import.
10. Confirm the old `medicore.license.v1` localStorage value is removed after a successful migration.
11. Set the clock forward, start the app/print/report, set it back, and confirm **System Clock
    Manipulation Detected**. Re-check after restart, after an in-session minute and after printing.
12. Restrict WMI/PowerShell access and confirm the volume-serial fallback still produces a stable ID;
    remove both sources and confirm a clear activation error rather than a crash.
13. Issue an expired licence with 30-day grace and confirm the grace banner, then a beyond-grace licence
    and confirm read-only behavior/print access.
14. Renew and re-import; confirm the new expiry and modules.
15. Remove the test licence in DEV and confirm the complete development licence returns.
16. Search production bundles for `DEV-LICENSE`, seed hooks, portal tokens and private-key material.

## Boundaries and release gates

Do not claim that this is a hosted subscription service, a public activation portal, impossible-to-clone
DRM or online revocation. Hardware fingerprinting, DPAPI storage and the local clock high-water mark are
implemented and must be tested on clean packaged Windows installs. Backend entitlement enforcement and
guaranteed online revocation remain production gates.

For the sales-to-support operating procedure, reminder schedule, licence register and exception handling,
see [licensing-process.md](licensing-process.md).
