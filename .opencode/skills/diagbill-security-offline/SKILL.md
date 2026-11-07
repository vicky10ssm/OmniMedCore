---
name: DiagBill Security and Offline
description: Use when changing DiagBill authentication, TOTP/recovery, encryption at rest, unlock/boot behavior, offline persistence, trusted-terminal assumptions, or read-only monitoring.
---

# DiagBill security and offline behavior

Use this skill for security-sensitive and boot/persistence work. Preserve the explicit threat model and never trade offline availability for a security feature without user approval.

## Threat model

- The billing PC/terminal is assumed trusted while in use.
- Encryption at rest is intended to reduce exposure from theft or copying of stored data.
- It is not a defence against a malicious actor already controlling the unlocked trusted PC or application session.
- Patient identifiers, credentials, passphrases, recovery codes, TOTP secrets, and encryption keys must never appear in logs, screenshots, demo fixtures, or committed configuration.

## Read first

- `../../../src/auth/AuthContext.tsx` — login, 2FA, boot flow
- `../../../src/auth/crypto.ts` — PBKDF2 password hashing
- `../../../src/auth/totp.ts` — RFC 6238 TOTP and replay protection
- `../../../src/db/encryption.ts` — envelope/key wrapping and recovery slot
- `../../../src/db/index.ts` — unlock gate, persistence, `reopenAfterUnlock()`
- `../../../src/app/mode.ts` and `../../../src/app/MonitorContext.tsx` — monitor restrictions
- `../../../src/pages/Settings.tsx` — user/security administration
- `../../../src/licensing/` and `../../../license-portal/` — licence verification and vendor signing
- `../../../docs/licensing-and-editions.md` — edition, grace and activation policy

## Implemented security baseline

- The sign-in screen must never display default or demo credentials. Keep the forced first-sign-in
  password change, but direct users to contact an administrator for access.
- Password hashing uses PBKDF2 through WebCrypto.
- TOTP uses SHA-1, six digits, 30-second steps, ±1 drift, and last-step replay protection.
- Recovery codes are single-use and stored as hashes.
- The local database can be encrypted with AES-GCM using a random 256-bit device key.
- The device key is wrapped by a passphrase-derived key and a separate recovery-code slot, and is held unwrapped only in memory for the session.
- Closing/relocking must not leave a plaintext key or silently fall back to opening an encrypted database without unlocking.
- Monitor builds are intended to be read-only, with reduced operator detail and recovery-code refusal. Keep build-time, UI, and data-access enforcement aligned.
- Licence files are ECDSA P-256 signatures over canonical JSON, bound to tenant and device. The app has
  only the public key; the vendor private key belongs only to the portal and must never ship or be logged.
- A licence expiration must never delete data. After the 30-day grace, the UI enters read-only mode but
  retains view/print/export. Current development storage is `localStorage`; packaged Tauri must use
  OS-protected storage and enforce entitlements in the backend, not only in React.
- Offline devices cannot learn about a revocation they never receive. Do not claim guaranteed online
  revocation or tamper-proof device licensing.

## Change rules

1. Trace the complete boot path before editing: encrypted lock detection, unlock, migration, default tenant, admin bootstrap, and database reopen.
2. Never call `getDb()` recursively from inside database creation/boot; pass the current store to avoid deadlock.
3. Never persist the unwrapped device key or weaken encryption merely to make development easier.
4. Do not introduce a plaintext fallback after an encryption envelope exists.
5. Preserve offline authentication and billing. The local monitor and CSV outbox must not become a write path.
6. Test lock/unlock, wrong passphrase, recovery, relock, first boot, password change, TOTP replay, and monitor write refusal as applicable.
7. Test licence signature/tenant/device mismatch, clock rollback, grace and beyond-grace read-only behavior; inspect production bundles for private keys, portal tokens and DEV fallback strings.
8. Keep data-sharing claims accurate: the CSV export is one-way, plain text, and not a cloud monitor or backup. Test a permission-denied export folder and confirm rows remain pending.

## NABL role and audit evidence

NABL 112A §7.6 requires role-based authenticated access, prompt inactivation of users who lose authorization, and an audit trail linking each user's activity to patient data or software changes. Preserve current login/2FA protections while adding:

- explicit authority for releasing clinical reports, separate from front-desk administrative access;
- audit records for patient-data changes, sample acceptance/rejection, report verification/amendment, consent changes and ABDM export/outbox writes;
- no write capability in monitor mode for any new clinical, QMS, consent or integration table;
- no secrets or sensitive consent/FHIR content in audit detail fields or browser logs.

Do not treat a signature image as a digital signature. Use authenticated user identity plus timestamp and immutable revision evidence unless a legally valid digital-signature service is separately implemented.

## Verification

Run `npm run check` and both production builds. Test an encrypted existing database as well as a fresh unencrypted one. Inspect behavior after reload/restart, since in-memory-only key handling and IndexedDB persistence problems are not visible in a single-page test.
