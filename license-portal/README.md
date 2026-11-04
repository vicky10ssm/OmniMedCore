# MediCore licence portal

Vendor-only web portal for issuing, downloading, renewing and revoking signed MediCore offline
licences. The application verifies the ECDSA P-256 signature, tenant binding and hardware fingerprint
without network access.

## What is implemented

- Web admin UI and JSON API for licence administration.
- Edition presets: Diagnostics, Pharmacy, Hospital, Complete, Custom.
- Multiple tenant IDs and device IDs per licence, terminal cap, expiry, 30-day grace default.
- Signed licence-file download, renewal and revocation.
- Local JSON persistence in `data/licenses.json`.
- Bearer-token admin authentication, localhost binding, no-store/security headers and basic CSP.

## What is not implemented here

- Public customer self-service, e-commerce/payment collection or automatic device enrolment.
- Hosted deployment, TLS termination, identity provider/SSO, rate limiting, audit export or database
  backup. Those are production operations and must be added before exposing the portal publicly.
- Online validation/revocation enforcement from the offline app. A revoked or renewed file must be
  delivered and imported; an online check is a future hosted-service feature.

## Key setup (once)

The repository already contains a local development signing key at
`license-portal/keys/private-key.pem` (ignored by git). The matching public key is embedded in
`src/licensing/publicKey.ts`.

For a new vendor signing identity, deliberately rotate both sides together:

```sh
npm run license:keygen
```

Then copy the printed SPKI value into `src/licensing/publicKey.ts`, rebuild the terminal and monitor
bundles, and re-issue existing licences if the old signing key is retired. Back up the private key
offline and restrict access. Never commit it, include it in the installer, or expose it in a browser.

If the private key is lost, existing licences still verify until expiry, but no new or renewed licence
can be signed for that key. If it leaks, treat every licence as compromised and rotate.

## Run locally

PowerShell:

```powershell
$env:MEDICORE_PORTAL_ADMIN_TOKEN = "a-long-random-secret"
npm run license:portal
```

Open `http://127.0.0.1:8787` and enter the same admin token.

Environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `MEDICORE_PORTAL_ADMIN_TOKEN` | Required bearer token for all API calls | `change-me` with a warning; never use in production |
| `MEDICORE_PORTAL_PORT` | Listening port | `8787` |

The server intentionally binds to `127.0.0.1`. Put a hardened reverse proxy with TLS and network
controls in front of it for hosted use; do not bind it directly to the public internet.

## Issue and activate a licence

1. In the app, open **Settings → Licence** (or the activation screen) and copy the **Tenant ID** and
   **Hardware Device ID**.
2. In the portal, issue a licence for that tenant/device pair, or add each terminal's hardware Device ID.
   Hardware Device IDs are 64-character lowercase SHA-256 values, not database UUIDs.
3. Download the `.medicore-license.json` file and import it in **Settings → Licence**.
4. Confirm the edition/module list and that unsupported modules disappear from navigation.
5. Store the issued licence record and support reference in the commercial register.

The packaged Windows app stores the signed licence through DPAPI in
`%APPDATA%\in.medicore.desktop\license.dpapi`; a copied protected file fails on another machine/account.
Browser builds use a localStorage fallback because they have no DPAPI. Existing licences that contain UUID device IDs
must be reissued with hardware fingerprints when upgrading to the hardware-bound release.

## Renew, revoke and move a terminal

- **Renew:** open the issued licence and set a new expiry; import the downloaded file on the device.
  Legacy UUID-based licences must be reissued with the current Hardware Device ID before renewal; the
  portal rejects UUID device IDs for new/renewed hardware-bound files.
- **Revoke:** download the revoked file and import it, or use an online validation service when one
  exists. Offline devices that never receive the revocation file cannot know about it.
- **Move/replace:** issue a replacement licence with the new device ID. Removing or replacing hardware
  does not transfer entitlement by itself.

## API summary

All `/api/*` routes require `Authorization: Bearer $MEDICORE_PORTAL_ADMIN_TOKEN`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/licenses` | List issued licence metadata |
| `POST` | `/api/licenses` | Issue and sign a licence |
| `GET` | `/api/licenses/:id` | Download the signed licence file |
| `POST` | `/api/licenses/:id/renew` | New expiry/modules/terminal cap, re-signed |
| `POST` | `/api/licenses/:id/revoke` | Mark revoked and re-signed |

## Production checklist

- Host behind HTTPS with a reverse proxy, firewall and private admin network/VPN.
- Replace the shared bearer token with real admin authentication, individual accounts and MFA.
- Add rate limiting, request logs without licence/private-key material, and an audit trail.
- Move licence storage from JSON to a backed-up database with locking/concurrency controls.
- Back up the private signing key offline in at least two controlled locations.
- Define licence terms, renewal/refund policy, device-transfer policy and support reference format.
- Test issuance, renewal, revocation, clock rollback, grace expiry and tenant/device mismatch with the
  packaged desktop build.

See `../docs/licensing-and-editions.md` for the product and QA model, and
`../docs/licensing-process.md` for the end-to-end issuance, renewal, replacement and record-keeping SOP.
