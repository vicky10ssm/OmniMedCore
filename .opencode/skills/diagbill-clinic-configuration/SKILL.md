---
name: DiagBill Clinic Configuration
description: Use when changing clinic module visibility, Settings configuration, logo/branding upload, sidebar navigation, module route guards, or invoice/report letterhead branding.
---

# OmniMed Core clinic configuration and branding

Use this skill when a clinic must enable only the sections it uses or add its own logo. These are
tenant-scoped configuration features, not security permissions.

## Read first

- `../../../src/app/modules.ts` — module IDs, labels, default behavior, parsing and change event
- `../../../src/pages/Settings.tsx` — Modules & logo tab and persistence
- `../../../src/ui/guards.tsx` — `ModuleGate` route enforcement
- `../../../src/ui/Layout.tsx` — terminal navigation and sidebar logo
- `../../../src/ui/MonitorLayout.tsx` — monitor navigation and sidebar logo
- `../../../src/App.tsx` — route wrapping for both terminal and monitor
- `../../../src/ui/logo.ts` — file validation/read helper
- `../../../src/pages/InvoiceView.tsx` and `../../../src/pages/Reports.tsx` — printed letterheads
- `../../../src/licensing/LicenseContext.tsx` and `../../../src/pages/License.tsx` — editions and Licence tab

## Configuration model

- The umbrella brand is **OmniMed Core**, configured in `src/app/brand.ts`; tenant name/logo override it.
- Edition licensing is separate from clinic configuration. A module can be enabled only if the signed
  licence includes it; effective modules are licensed ∩ clinic-enabled.
- Module IDs include `admissions` (Hospital + generic IPD billing) and `pharmacy`, alongside the
  diagnostics and finance modules.
- Modules are stored per tenant in `settings` under `enabled_modules` as a JSON array.
- `MODULE_DEFINITIONS` in `src/app/modules.ts` is the single source of truth.
- Missing/empty/corrupt configuration means **all modules enabled**. This is intentional to avoid
  hiding clinical workflows after an upgrade/read failure.
- Dashboard and Settings are administrator-only and are not represented as toggleable modules. Compliance
  is administrator-only and is also a licensed/clinic-toggleable module.
- A disabled module is removed from both terminal and monitor navigation.
- Its direct routes are wrapped in `ModuleGate`; navigating directly redirects to the dashboard.
- `ModuleGate` combines licence entitlement with clinic visibility. Unlicensed modules show **Not
  licensed** and cannot be toggled. The Licence tab handles activation/renewal and displays tenant/device
  IDs.
- After licence grace, read-only mode hides write-only modules/controls while keeping view/print/export.
- `ModuleGate` fails open on a settings-read error. Module visibility is convenience/configuration, not
  authorization. Keep `AdminOnly`, report-release authority and read-only monitor enforcement separate.
- Saving clinic setup dispatches `diagbill:modules-changed`; both layouts reload branding/modules without
  a full page refresh.

## Adding or renaming a section

1. Add/change the ID and user-facing label in `MODULE_DEFINITIONS`.
2. Add the module ID to the terminal/monitor nav item.
3. Wrap the corresponding route(s) in `ModuleGate`. Include detail routes, not only list pages.
4. Confirm the module does not hide Dashboard or Settings.
5. Confirm a disabled direct URL redirects in **both** terminal and monitor builds.
6. Update product/buyer capability documentation if the section is buyer-visible.

Do not invent a second list of module names in another file or duplicate JSON parsing.

## Logo rules

- Stored per tenant in `settings.logo_data` as a data URL.
- Accepted types: PNG, JPEG, WebP. Maximum file size: 500 KB.
- The Settings preview shows the current logo and supports replace/remove.
- The sidebar uses the logo when configured, otherwise the existing letter mark.
- Printed A4 invoice and diagnostic report letterheads include the logo when configured.
- Logos are part of the local database/backups. Never put a patient image in this field.
- A clinic logo is not proof of NABL/ABDM registration or accreditation; never add a compliance logo
  automatically.
- Keep the printed logo height constrained (`max-h-16`, `max-w-28`) so letterheads and thermal print
  do not break layout.

## Radiologist signatures

- Administrators manage multiple radiologist records under Settings -> Radiologists.
- Each `radiologists` row is tenant-scoped and stores name, qualification, signature data URL, active
  state and sort order. The image limit is the same PNG/JPEG/WebP 500 KB rule as the logo.
- Operators select an active radiologist with a signature when entering/releasing an X-ray report.
- The selected radiologist id/name/qualification/signature is snapshotted onto `report_orders`; print
  uses the snapshot, never the live catalogue.
- Deleting/deactivating a radiologist must not alter or block printing of an already issued report.
- Write audit events for create/update/delete. Never put the signature data URL in audit detail.

## Persistence and audit

- Both `enabled_modules` and `logo_data` are written with `setSetting()`, which is tenant-scoped.
- Saving writes an audit event `settings.modules`; detail lists module IDs and whether a logo is set.
  Do not put the logo data URL in audit detail.
- Only admins can open or edit clinic setup; operators have no Settings or Compliance navigation entry and
  direct URLs are blocked by the route guards.
- The settings key is not a permission: a user who knows a URL must still pass the route and role guards.

## Verification

1. As admin, disable Patients and Reports.
2. Confirm both disappear from the terminal sidebar.
3. Open `#/patients` and `#/reports` directly → redirected to Dashboard.
4. Confirm Settings remains reachable to an administrator and can re-enable them; as an operator, Settings
   and Compliance are absent from navigation and direct URLs.
5. Import a limited licence; confirm unlicensed modules are locked in Settings and absent from nav/routes.
6. Build the monitor bundle and confirm the same licence/visibility filtering/redirect behavior.
6. Upload PNG/JPEG/WebP under 500 KB; verify sidebar, invoice print and report print.
7. Try an unsupported type and a file over 500 KB; both must be rejected.
8. Remove the logo and verify fallback marks on screen and in print.
9. Upload two radiologist signatures, select one on an X-ray report and verify the printed image.
10. Deactivate one radiologist; confirm new reports cannot select it while an issued report still prints.
11. Inspect `settings` and `radiologists` rows to confirm tenant scoping.
12. Run `npm run check`, `npm run build`, and `npm run build:monitor`.

## Limitations

- No per-role module visibility yet; configuration applies to the whole tenant.
- No per-centre module variants under a multi-tenant roll-up.
- Logo has no image cropper/optimiser beyond upload limits.
- Module hiding does not delete data or revoke API access; it only controls navigation/routes in the app.
