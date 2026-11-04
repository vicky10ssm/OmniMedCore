---
name: DiagBill Licensing
description: Use when changing MediCore editions, signed licence activation, hardware fingerprinting, DPAPI storage, tenant/device entitlement, clock high-water checks, grace/read-only behavior, the vendor licence portal, or licence QA.
---

# MediCore licensing and editions

Use this skill for commercial entitlement work. A licence is a **commercial control**, not a clinical
authorization or a replacement for user roles, tenant isolation, monitor write refusal or backend access
control.

## Product model

- One codebase/installer; editions: Diagnostics, Pharmacy, Hospital, Complete, Custom.
- Effective modules = licensed modules ∩ clinic-enabled modules.
- Dashboard and Settings always remain available.
- Hospital includes admissions and generic IPD service billing; it is not a full HIS.
- Development builds use a complete development licence only when no real licence is stored. Never turn
  that fallback into a production bypass.
- A signed licence is bound to both one or more `tenantIds` and one or more hardware fingerprint
  `deviceIds` (SHA-256 of motherboard serial + CPU Processor ID; volume-serial fallback).
- The desktop app stores the signed licence with Windows DPAPI and keeps an execution-time high-water
  mark in both a DPAPI state file and the encrypted SQLCipher `meta` table.

## Read first

- `../../../src/licensing/types.ts` — editions, module maps, read-only module set
- `../../../src/licensing/verify.ts` — canonical JSON, ECDSA validation, status/grace calculation
- `../../../src/licensing/LicenseContext.tsx` — load/import, hardware binding, DPAPI migration, read-only state
- `../../../src/licensing/deviceIdentity.ts` — `GetMachineFingerprint`, hardware-match validation
- `../../../src/licensing/secureLicenseStore.ts` — Tauri DPAPI storage and legacy migration
- `../../../src/licensing/executionClock.ts` — `UpdateExecutionTimestamp` and clock-tamper event
- `../../../src-tauri/src/license_security.rs` — WMI/CIM fingerprint, DPAPI, time-state native commands
- `../../../src/licensing/publicKey.ts` — public verification key only
- `../../../src/pages/License.tsx` — activation screen and Settings → Licence panel
- `../../../src/App.tsx`, `../../../src/ui/guards.tsx`, `../../../src/ui/Layout.tsx` — entitlement gating
- `../../../license-portal/server.mjs`, `public/index.html` — vendor signing/admin portal
- `../../../docs/licensing-and-editions.md`, `../../../docs/licensing-process.md`
- `../../../license-portal/README.md`

## Cryptographic invariants

1. Sign/verify canonical JSON (recursively sorted object keys); never sign a browser-specific
   `JSON.stringify` ordering.
2. ECDSA P-256/SHA-256 signatures use raw `r||s` (`ieee-p1363`) in both Node and WebCrypto.
3. The private key stays only in the vendor portal. Never commit it, ship it in the app/installer, expose
   it to browser code, or place it in environment values logged by the portal.
4. The app imports only the public SPKI. Signature failure, tenant mismatch, hardware mismatch, revoked
   status or malformed shape must fail closed and must not overwrite a valid stored licence.
5. The licence `Device ID` is the native `True_Device_ID` fingerprint, not the SQLite `device_id` UUID.
   Never fall back to a UUID for licence matching; a copied database must not carry entitlement.
6. DPAPI storage is mandatory in Tauri. Never write raw signed licence JSON to `localStorage`; migrate
   legacy entries once, then delete them. A DPAPI decrypt failure means revoked/invalid on that machine.
7. The clock high-water mark must be checked before expiry/grace calculation and updated at startup,
   invoice/report printing and report creation. Use the later of the DPAPI state and SQLCipher `meta`
   values; throw **System Clock Manipulation Detected** on rollback.
8. Do not change the signing payload fields or module IDs without a version strategy and migration plan.
9. Production builds must reject the special `"development"` signature; test a hand-written dev-licence JSON against the production bundle.
10. Rotating the vendor key requires updating `publicKey.ts`, rebuilding both bundles and re-issuing
    licences signed by the retired key.
11. Licence loading depends on the database for tenant identity and the encrypted DB `meta` high-water
    value. On an encrypted database the first attempt fails while locked; `LicenseGate` must retry after
    unlock. Never permanently mark a licence invalid merely because the database was not open yet.

## Grace and read-only rules

- Active: licensed modules usable.
- Expired within grace (default 30 days): usable, with warning.
- Beyond grace: read-only. Existing records must remain viewable, printable and exportable.
- Read-only must block new billing, dispensing, admission changes, sample/report work and other writes.
- Do not delete/encrypt/deny access to the local database merely because the licence expired.
- UI gating is not a security boundary. The packaged backend must enforce entitlements and write refusal.

## Portal operations

```sh
npm run license:keygen   # deliberate one-time rotation only
npm run license:portal   # 127.0.0.1:8787, token from MEDICORE_PORTAL_ADMIN_TOKEN
```

Issue a licence using the Tenant ID + Hardware Device ID shown in Settings → Licence. The device ID is a
64-character SHA-256 fingerprint; do not substitute the database UUID. Download and import the file.
Renewals/revocations require the new file to be delivered; offline devices cannot learn about a
revocation they never receive. Public hosting, TLS, per-user admin auth/MFA, rate limits, backups and
audit are production gates and must not be claimed as delivered.

Follow `docs/licensing-process.md` for approved-order checks, tenant/device collection, delivery,
activation evidence, renewal reminders, upgrades, device replacement, revocation and the licence register.

## Change workflow

1. If adding a module, update `MODULE_DEFINITIONS`, `EDITION_MODULES` in the app and portal, nav/routes,
   Settings lock UI, docs, and the demo/QA scripts together.
2. If adding a licence field, update shape validation, canonical signer/verifier, activation display,
   portal issuance/renewal and licence-file compatibility.
3. Keep the current stored licence on failed import. Show a clear tenant/hardware/signature/storage error.
4. Update `LicenseSettingsPanel` for new status or renewal information, including the Hardware Device ID.
5. Keep read-only pages useful: print/export must not be hidden behind write-only controls.
6. Treat any change to licence payload fields, device matching, secure storage or clock checks as a
   release-gating security change; update the portal, docs, release checklist and existing licences.
7. Plan reissue for existing UUID `deviceIds`; hardware-bound builds intentionally reject them.

## Verification

1. `npm run check`, `npm run build`, `npm run build:monitor`, `cargo test --lib`.
2. Import Hospital, Diagnostics and Pharmacy licences; assert nav/routes and Settings locks.
3. Try wrong tenant, wrong hardware fingerprint, tampered payload and revoked status.
4. Confirm `license.dpapi` is not plain JSON; copy it to another profile/machine and verify it fails.
5. Set the clock forward, exercise startup/print/report, set it back and verify
   **System Clock Manipulation Detected** on the next check and after restart.
6. Restrict WMI/PowerShell access and verify the volume-serial fallback; remove both and verify a clean
   error instead of a crash.
7. Test active, grace and beyond-grace dates; verify banner, write controls and print access.
8. Renew and re-import; verify expiry/modules.
9. Remove the test licence in DEV and verify the development complete fallback returns.
10. Search production bundles for `DEV-LICENSE`, demo seed hooks, portal token and private-key material.

## Boundaries

Do not claim a hosted subscription service, public customer self-service purchase portal, impossible-to-
clone or tamper-proof DRM, guaranteed online revocation, or backend entitlement enforcement until
implemented and tested. Hardware fingerprinting, DPAPI storage and the local clock high-water mark are
implemented local controls with documented limitations; they are not a hosted DRM service.
