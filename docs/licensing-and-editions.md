# Licensing, editions and activation

Last updated: 28 October 2026  
Database schema: `16`

## Commercial model

MediCore is one product codebase with purchasable editions. The installed application exposes:

```text
effective modules = modules allowed by the signed licence
                    ∩ modules enabled by the clinic in Settings
```

Dashboard and Settings remain available. A module that is not licensed is shown as **Not licensed** in
Settings and cannot be enabled. A licensed module can still be hidden by the clinic for day-to-day
operational simplicity.

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
- A licence is bound to one or more `tenantIds` **and** one or more `deviceIds`. Both must match the
  current installation.
- The payload includes edition, module list, terminal cap, issue time, expiry, grace days, status and
  support reference. The signature covers canonical JSON.
- Offline verification uses WebCrypto. No network call is required to start the app.
- Licences are stored in `localStorage` in the current development build. The packaged Tauri release must
  move this to an OS-protected configuration/secure store and enforce entitlements in the backend as well
  as the UI.

Current licence file shape:

```json
{
  "payload": {
    "v": 1,
    "licenseId": "MED-2026-XXXXXXXX",
    "customerName": "Buyer name",
    "tenantIds": ["tenant-default"],
    "deviceIds": ["terminal-device-id"],
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
   Device ID.
2. Send both IDs to the vendor with the purchase/edition details.
3. Import the signed `.medicore-license.json` file.
4. Verify the edition, licensed modules and expiry. Unlicensed sections disappear immediately.
5. For a replacement terminal, issue a licence containing the new device ID. Hardware replacement is not
   automatically a licence transfer.

If a licence is for the wrong tenant or device, activation fails without replacing the current licence.
Tampered payloads fail signature verification. On an encrypted database, the boot unlock happens first;
the licence check is retried automatically once tenant/device identity is readable.

Development builds receive a complete development licence when no real licence has been imported. This is
for demos and automated checks only; it must not be used as a production entitlement bypass. Production
builds require a valid signed licence.

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
3. Issue a Hospital licence for the current tenant/device and import it.
4. Confirm Diagnostics and Pharmacy are absent/locked; Patients, Admissions, Expenses, Compliance,
   Settings and Dashboard remain.
5. Open Admissions, add a service charge and a payment, verify totals/balance/audit and print.
6. Issue a Diagnostics licence and confirm admissions/pharmacy lock in the same installation.
7. Import a licence for a different device and tenant; both attempts must fail clearly.
8. Tamper with a payload field; the signature must be rejected.
9. Issue an expired licence with 30-day grace and confirm the grace banner, then a beyond-grace licence
   and confirm read-only behavior/print access.
10. Renew and re-import; confirm the new expiry and modules.
11. Remove the test licence in DEV and confirm the complete development licence returns.
12. Search production bundles for `DEV-LICENSE`, seed hooks, portal tokens and private-key material.

## Boundaries and release gates

Do not claim that this is a hosted subscription service, a public activation portal, tamper-proof
device licensing, online revocation, or secure OS-level licence storage yet. Those require deployment and
packaged-runtime work. The signed offline entitlement layer and vendor portal are implemented; the
commercial promise should stay within the tested local/portal workflow until the production release
gates are complete.

For the sales-to-support operating procedure, reminder schedule, licence register and exception handling,
see [licensing-process.md](licensing-process.md).
