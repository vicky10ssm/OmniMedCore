# Security policy

## Supported versions

Security fixes are currently provided for the `0.1.x` development/pilot line. This project is not
yet a generally available production product; see `docs/deployment-and-readiness.md`.

## Reporting a vulnerability

Do **not** open a public issue for a suspected security vulnerability or exposed credential.

Report it privately to the repository owner/maintainer with:

- affected version and commit
- affected component or URL
- steps to reproduce
- potential impact
- any suggested remediation
- whether patient or licensing data may have been exposed

Do not include real patient information, database files, private keys or portal tokens in the report.
Use synthetic examples and redact identifiers.

Acknowledging and fixing reports is currently best-effort. No bug bounty or formal response SLA is
offered unless separately agreed in writing.

## High-priority areas

Reports are especially important for:

- Authentication, session handling, TOTP/recovery bypass
- Tenant isolation or cross-tenant data exposure
- Licence signature verification, tenant/device binding, grace/read-only bypass
- Exposure of the vendor signing private key or portal admin token
- Database persistence, encryption, relock or recovery flaws
- Sample/report release or disposal-gate bypass
- Invoice/payment manipulation or missing audit evidence
- Remote monitoring gaining write capability
- Patient-data leakage in logs, exports, screenshots or error messages

## Secret handling

Never commit or share:

- `license-portal/keys/private-key.pem`
- `license-portal/data/licenses.json`
- `.env` files
- `MEDICORE_PORTAL_ADMIN_TOKEN`
- signing certificates or private keys
- real patient data, databases or backups
- screenshots containing patient identifiers

The application contains only the public licence-verification key. The private signing key belongs to the
vendor licence portal and must be backed up offline in controlled storage.

If a private key or portal token is suspected compromised:

1. Stop the portal and restrict access.
2. Rotate the portal token.
3. If the signing key is exposed, treat every licence signed by it as compromised.
4. Generate a new signing identity, update `src/licensing/publicKey.ts`, rebuild both bundles, and
   reissue affected licences.
5. Record the incident and notify affected buyers.

## Development data

Use synthetic demo data only. Do not put real patient, financial or credential data into Git, tests,
screenshots, logs or issue reports. The DEV demo seeder must never be included in production bundles.
