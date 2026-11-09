# Feature Decisions — Diagnostic Centre Billing Software (India)

> **Scope update (27 Oct 2026):** The product is now branded **OmniMed Core** and sold as configurable
> verticals for diagnostic centres, standalone pharmacies and small hospitals. Added hospital admission
> (ward/bed/discharge) and pharmacy batch/expiry inventory + dispensing modules. The earlier diagnostic
> working decisions below remain the baseline for the diagnostics vertical.
>
> **Scope update (4 Nov 2026):** The hosted cloud sync and read-only cloud dashboard were removed.
> The current integration path is the local Google Drive CSV outbox. Cloud/monitor statements below are
> historical unless they explicitly refer to the local monitor or local CSV export.

Scope for now: **offline billing software**, diagnostics, pharmacy and small-hospital operations, with
an optional local Google Drive CSV outbox.
Reference: https://labquick.in/features

## Decision principles

1. Billing core first, with basic reports inside v1 (confirmed) — richer reporting later.
2. ~~Web app for “monitor from anywhere”~~ — superseded: monitoring is local/read-only; there is no hosted monitor.
3. Zero per-message costs in v1 — WhatsApp Business API and SMS OTP charge per message and need Meta approval. Defer them.
4. Target running cost: **₹0 – ₹500/month**.
5. **Offline-first:** the centre must keep billing when the internet drops; the optional outbox is a local Google Drive CSV export, not an online copy.

Legend: ✅ build now (v1) · ⏳ build later (cheap, worth keeping on roadmap) · ❌ cut for now

## Confirmed decisions (from owner)

- **v1 scope:** Billing **+ basic reports** (result entry + printed report on your letterhead).
- **GST:** Centre is GST-registered → full GST invoice (GSTIN, CGST/SGST split, SAC, tax summary), rate configurable per test (confirm rates with your CA).
- **Ownership:** Multiple partners → **co-owner settlement moved from ❌ to ⏳ Phase 3** (not permanently cut).
- **Desktop + local export (revised):** desktop terminals are required; multiple terminals may bill offline. All data entry happens on desktop terminals. The optional integration is a local Google Drive CSV outbox, not an online monitoring copy.
- **Doctors catalog (new):** added to **v1** — doctor master with attributes + commission tracking (moved from Phase 2).
- **Expenses section (new):** added to **v1** — expense categories + entry + monthly report, so profit is real, not a guess.

---

## 1. Front desk

| LabQuick feature | Decision | Rationale |
|---|---|---|
| Bookings & appointments | ✅ Basic | A booking is just an order with a date — part of billing. Full calendar/schedule view later. |
| Phone-first patient lookup | ✅ | Phone number as the patient key = no duplicate records, 1 search finds history. Cheap to build, huge daily value. |
| Dues that chase themselves | ✅ Basic | Pending-payment register with search + ageing (7/30/60 days). Labs run on credit; this is core billing. "Auto-blocking" of defaulters later. |
| Per-customer discounts | ⏳ | v1: free-form discount per invoice. Standing per-customer discount rules in Phase 2. |
| Patient broadcasts (WhatsApp) | ❌ | WhatsApp Business API = per-message fee + template approval + Meta business verification. Not "cheap". Revisit only if marketing justifies it. |

## 2. Testing (tests, results, analyzers)

| LabQuick feature | Decision | Rationale |
|---|---|---|
| Test catalog & packages | ✅ | The rate list is the backbone of billing. Indian test names, categories, packages, per-test price + GST rate. |
| Auto-calculated parameters | ⏳ later | Formula-derived values with age/gender reference ranges — useful once report volume grows; not v1. |
| Analyzer integration (LQ-Bridge) | ❌ | Hardware/driver integration (Mindray, Sysmex) — the most expensive module in any LIS. Only worth it if you type up thousands of results daily. |
| Abnormal-value warnings | ✅ basic | Since basic reports are in v1: flag out-of-range values as they're typed (simple min/max per test). |

## 3. Veterinary

| Animal & veterinary testing (all sub-features) | ❌ | You run a human diagnostic centre. Pure scope creep — cut entirely. |

## 4. Reports

| LabQuick feature | Decision | Rationale |
|---|---|---|
| QR + barcode verification | ⏳ | Free libraries make it cheap, but it needs hosted report URLs. Add when reports go live. |
| Clinical interpretation | ❌ | Auto-text engine — costly, not billing. |
| Letterhead & pre-printed stationery | ⏳ | v1 prints a clean invoice (A4 + 80mm thermal). Fancy report templates later. |
| Every field customizable | ⏳ | v1: fixed, branded invoice layout with your lab name/addr/GSTIN. |
| Straight to WhatsApp (reports/invoices) | ❌ now, ⏳ later | API costs money. Workaround at ₹0: staff share the generated PDF via WhatsApp Web/phone manually. |

## 5. Money (this is your core)

| LabQuick feature | Decision | Rationale |
|---|---|---|
| Customizable GST invoices | ✅ **core** | GST-registered: invoice with lab branding, **your GSTIN, per-item GST rate with CGST/SGST split, SAC code, taxable value + tax summary**, discount, round-off, A4 + 80mm thermal print, PDF download. Rates stay configurable per test (confirm with your CA). |
| Income, expenses & salaries | ✅ **expenses in v1** / ⏳ salaries | **Expenses section (new, v1):** see detail below. Salary payroll + advances stay Phase 2 (salary can still be logged as a manual expense). |
| Outsourced test management | ⏳ Phase 2 | Important if you send samples to another lab — but not needed to start billing. |
| Doctor referral commissions | ✅ **in v1** (catalog + accrual) | **Doctors catalog (new):** see detail below. Moved from Phase 2 at owner's request. |
| Co-owner settlement | ⏳ Phase 3 | Multiple partners confirmed — add partner accounts with cash-on-hand and % -of-profit settlement once billing is stable. |
| Dashboards & insights | ✅ | Today's revenue, collection mode split, unpaid dues, patient count, **today/month expense + profit tile** — this **is** your "monitor from anywhere" requirement. |

### 5a. Doctors catalog (new — v1)

Doctor master — attributes per doctor:
- Name, qualification, specialization
- Registration number (state medical council), phone, address, email
- **Commission rule:** % of invoice value **or** flat ₹ per test/visit — set as the doctor's default, overridable per invoice
- Active / inactive flag (inactive doctors stay on old invoices but can't be picked on new ones)
- Notes

How it works in billing:
- Doctor is selected on the patient record and stamped on invoice + report (referring doctor)
- **Commission accrues automatically only when the invoice is fully paid** — no commission on dues
- Commission ledger per doctor: accrued vs paid; record payout (cash/UPI) with date
- Doctor-wise view: patients referred, revenue generated, commission payable
- Doctor lookup by name/phone; CSV export

### 5b. Expenses section (new — v1)

- **Editable categories:** rent, electricity, reagents & consumables, equipment maintenance, salaries (manual log), marketing, miscellaneous
- **Entry fields:** date, category, payee/vendor, amount, payment mode (cash/UPI/bank), bill number, note
- Admin can add/edit/delete; operator can add only (kept simple — full audit trail is Phase 2)
- **Reports:** month-wise, category-wise totals, search by payee/note; CSV export
- Dashboard tile: today's expense, month expense, and **profit = collection − expenses** for the period
- Bill photo attachment → Phase 2 (storage)

## 6. Team & safety

| LabQuick feature | Decision | Rationale |
|---|---|---|
| Roles & permissions | ✅ basic | Admin (you) vs Operator/Receptionist. Two roles is enough for v1. |
| 2FA & login OTP | ✅ **TOTP in v1** / ⏳ login OTP | Online monitoring shows financial data → free TOTP 2FA ships in v1. WhatsApp login OTP never (per-message cost). |
| Audit logs | ⏳ minimal | v1: record created/edited-by on invoices. Full audit trail later. |
| Multi-branch | ❌ | Single centre now. Design the schema so branch_id can be added later — that's it. |
| Auto backup | ✅ | Daily automated DB backup to cloud storage. Non-negotiable for trust in cheap software. |
| Data export | ✅ | CSV/PDF export of invoices, payments, patients. Cheap to build, protects you from vendor lock-in (even your own). |

## 7. Growth / marketing

| LabQuick feature | Decision | Rationale |
|---|---|---|
| Promotions & offers | ❌ | Marketing layer — not billing. |
| Refer & Earn | ❌ | LabQuick's own referral program, not a lab feature. |
| WhatsApp daily summary | ✅ via **free email** | You still get "yesterday's revenue, dues, reports" every morning — delivered by email at ₹0 instead of WhatsApp API fees. |

## 8. Desktop + online versions (historical requirement — superseded by local CSV export)

**Requirement:** desktop software at the centre that keeps running if internet is impacted, **and** an online version to monitor from anywhere.

### Decision: one codebase, two deployments

| | Desktop version | Online version |
|---|---|---|
| Form | **.exe installed on each centre PC** (Tauri — free, open-source, ~10 MB installer) | **Web app (PWA)** hosted on cloud (free/cheap tier) |
| Database | **Local SQLite on that PC** | Cloud Postgres |
| Internet needed? | **No — 100% functional offline** | Yes |
| Purpose | **All data entry happens here** (offline-safe): billing, GST invoice print, dues, expenses, commissions, reports, printing | **Read-only monitoring** from your phone/laptop anywhere: dashboard, dues, invoice & report lookup |

- **Same UI and business logic in both** — Tauri wraps the web code as a desktop app, so we build the interface once, not twice. Each terminal writes to its own local SQLite and **pushes to the cloud; browsers only read**. The cloud is an accumulator, not a writer — so nothing a phone does can ever conflict with what a terminal does.

**Two builds, one source:** `npm run build` → the desktop/terminal app (all entry). `npm run build:monitor` → the read-only monitoring app (this is what gets hosted). Read-only is enforced by the database layer, role-gated routes and the UI — see the "Read-only web monitoring version" section in the build log.

### Sync design for multi-terminal offline billing (confirmed requirement)

Five rules keep full multi-writer sync affordable:

1. **Append-only money records.** Invoices, payments, expenses, commission payouts and reports are *never edited in place* — a mistake is fixed by **cancel + re-issue** (which is correct accounting practice anyway). New records can't collide (UUID keys), so the hardest conflict class simply doesn't exist. Invoice **line corrections become credit-note/cancel flows**, not merges.
2. **Collision-free invoice numbers without a coordinator.** Each device draws from its own allocated block of numbers (pulled 100 at a time when online) — two terminals billing offline can never print the same number. Gaps from unused numbers are normal and auditable.
3. **Simple last-write-wins on editable data** (catalog prices, patient details, settings) keyed on `updated_at`, with a visible edit history so you can see what changed.
4. **Derived numbers are never synced — always recomputed.** Dues balance, commission accrued, dashboard totals = computed from merged base records on each device. Nothing to reconcile.
5. **Visible sync status everywhere:** "Last synced 10:42 · 3 records waiting" + manual **Sync now** button. Reconnect → background push/pull with retry; your phone's read-only view shows terminal records as soon as they land, and terminals pull each other's offline sales when back online.

*Known residual risk (accepted to stay cheap):* two devices editing the **same patient/catalog row** while both offline → the later `updated_at` wins on sync; rare, non-destructive to money records, and logged.

### What works when internet is down

| Offline (desktop keeps running) | Degraded until internet returns |
|---|---|
| Login, patients, phone search, test catalog, doctors | Remote monitoring from your phone |
| Create bill, GST invoice, print A4/thermal, PDF | Automatic cloud backup |
| Dues entry, payments, expenses, commission payouts | Daily email summary |
| Report entry + print on letterhead | — |
| Local dashboard (today's numbers) | — |
| Local printing (printer is your hardware) | — |

### Cost & risk notes

- Tauri = ₹0. Local builds now use a self-signed code-signing certificate; client machines must install the local root. Public-CA/HSM signing and SmartScreen reputation remain optional later (~₹2,000–8,000/yr).
- Multi-terminal sync (terminal ↔ cloud ↔ terminal) is the **riskiest and biggest single cost driver** — roughly +30–40% over a cloud-only app. **Much of the earlier risk is now gone with online entry restricted:** browsers can't create records, so there is no online-vs-offline merge class and no billing endpoint on the internet. Mitigations baked into the design: UUID keys + `updated_at` + sync flags on every table from day 1, append-only money records, derived totals. **Revised v1 timeline: ~5 weeks of dev.**
- The online version exposes financial monitoring to the internet → **TOTP 2FA stays in v1** (free, no SMS), plus HTTPS and rate-limited login. Billing itself is never internet-exposed.
- **Backups:** daily local DB backup file on every centre PC **plus** the cloud copy after sync → N+1 copies, survives any single PC failure.

### Alternatives considered

| Option | Verdict |
|---|---|
| PWA-only, no .exe (browser "Install app", offline cache) | Cheapest (₹0) but data sits in browser storage — clearing cache can lose a money system's data. Kept only as a bonus (the online version will also be installable), not the primary. |
| One-way sync, single billing terminal | Partially adopted: **entry is now terminal-only** (web read-only), which kills the online-writer conflict class; **multi-terminal offline billing retained**, so terminals still merge with each other through the cloud. |

---

## Phase plan

**Phase 1 — MVP (billing + reports + doctors + expenses + desktop & online, ~5 weeks)**
1. Login + 2 roles (Admin / Operator) + **TOTP 2FA**
2. Patient record, phone-number search
3. Test catalog + packages (price, GST rate per item)
4. **Doctors catalog:** attributes + commission rule (% or flat ₹), doctor on invoice/report
5. Create invoice: add tests, package, referring doctor, discount, payment mode (cash/UPI/card/credit), **full GST invoice** (GSTIN, CGST/SGST split, SAC, tax summary), print A4 + 80mm thermal, PDF; **cancel/credit-note flow instead of in-place edits**
6. Dues register (unpaid invoices, ageing, record payment)
7. **Commission ledger:** accrues on full payment, doctor-wise payable, record payouts
8. **Expenses section:** categories, entry, month/category reports
9. **Basic reports:** enter/verify results per test, abnormal-flag on entry, print report on your letterhead (patient + doctor copy)
10. Dashboard: today/month revenue, dues, patient count, expense + profit tile — on phone browser
11. **Offline engine (core):** every table sync-ready from day 1 (UUID keys, updated_at, sync flags); local SQLite per terminal; **block-allocated invoice numbers**; background bidirectional sync with last-write-wins + sync-status UI; local daily backup
12. **Desktop packaging (.exe per terminal)** + **read-only web monitoring version** + CSV export

**Phase 2 (cheap, high value)**
- Optional: two **append-only phone entries** (record a payment, log an expense) — safe to merge, only if you miss entering from the road
- Patient **merge-duplicates tool** (two terminals can each create the same patient while offline)
- Outsourced test tracking
- Per-customer discounts, salary payroll book
- QR verification on reports, manual WhatsApp PDF sharing
- Auto-calculated parameters (reference-range formulas), expense bill photo attachment

**Phase 3 (only if justified)**
- Analyzer integration, WhatsApp broadcasts/templates, multi-branch, **co-owner settlement** (partners confirmed)

**Cut for now:** veterinary, clinical interpretation, promotions, Refer & Earn, broadcasts.

---

## Cost to run (cheap path)

| Item | Cost |
|---|---|
| Option A: Supabase free tier (DB + auth) + Vercel free (hosting) | ₹0/month until you exceed free limits |
| Option B: single VPS (DigitalOcean Bangalore / Hetzner / Vultr) with Docker | ~₹400–600/month, everything on one box |
| Domain | ~₹800/year |
| Desktop app (Tauri) + local SQLite | ₹0 (open-source) |
| Windows code-signing cert | Local self-signed for now; public CA optional later (~₹2,000–8,000/yr) |
| WhatsApp API / SMS OTP | ₹0 (excluded from v1) |

## Remaining open question

1. Single branch (assumed yes — multi-branch cut, but schema will allow adding it later)?

---

# Build log

## Billing module — built (Phase 1, items 1–6 partially, 7 groundwork)

Money rules locked in (all amounts stored as integer **paise**, never floats):

| Rule | Decision | Why |
|---|---|---|
| Price basis | Catalog prices are **pre-tax**; GST is added on top | Transparent on the invoice; CA can verify the tax summary line by line |
| GST split | 50/50 **CGST + SGST** (intra-state), per-item rate in **basis points** (1200 = 12%) | Centre is GST-registered and sells locally; rate stays configurable per test |
| Discount | Applied **per line**, and it **reduces that line's taxable value** | Correct GST practice (discount shown before tax, not after) |
| Rounding | Grand total rounded to the nearest ₹1; the difference is stored as `round_off_paise` | Cash drawers don't take paise; the invoice still reconciles to the paise |
| Correction policy | **No in-place edits.** A mistake = cancel + re-issue (the cancelled invoice stays in the books with a reason) | Append-only money records are what makes multi-terminal offline sync safe |
| Commission basis | **%** → % of the invoice's pre-tax taxable value · **Flat** → ₹ per billed line | Simple and verifiable; accrue only when the invoice is **fully paid** |
| Commission on cancel | A **negative reversal entry** is written for any accrual already made | Ledger stays a complete history, nothing is deleted |
| Payment over-collection | Blocked — a payment can never exceed the outstanding balance | Prevents typos from creating negative dues |
| Credit bills | Mode "credit" records no payment → the invoice is `unpaid` and appears in **Dues** | Matches how labs actually run on credit |

Invoice numbering (item 11 groundwork):

- Numbers are drawn from **blocks of 1000** held in `invoice_blocks` (one block per terminal while offline).
- Format `INV-A-00001` — the device letter guarantees two terminals billing offline can never print the same number. The letter can be switched off (`invoice_block`-assigned numbers) once the cloud hands out blocks.
- Gaps from unused numbers are normal and auditable.

Screens live now: **New bill** (patient phone/name lookup + quick-add, doctor, test/package picker, per-line qty/rate/discount, live GST summary, payment mode + amount), **Invoices** (search + All/Due/Paid/Cancelled filters), **Invoice view** (GST tax invoice layout, A4 print via browser print → PDF, collect payment, cancel with reason), **Dues** (oldest first, ageing badge).

Deferred within billing (still Phase 1/2):
- 80mm thermal print layout — A4 print/PDF works today; thermal CSS is a small add-on later.
- SAC code per line — the catalog already carries `sac_code`, but the invoice print doesn't show it yet (add once your CA confirms codes).
- Invoice-level (whole-bill) discount — v1 uses per-line discount; a bulk discount can be applied across lines.
- CSV export of invoices/payments (patients CSV already exists).

## Expenses module — built (Phase 1, item 8)

- **Categories** seeded: Rent, Electricity, Salaries, Reagents & Consumables, Equipment Maintenance, Marketing, Miscellaneous — admin can add more from the category modal (rename/delete waits for the Settings module).
- **Entry:** date, category, amount, mode (cash/UPI/card/bank), payee, bill no., note. Operator can add; **only admin sees edit/delete**.
- **Reports:** month picker, category filter, free-text search over payee/note/bill no., month total vs filtered total, **category-wise breakdown with bars**, CSV export of the filtered list.
- **Profit tile:** "Collected (payments this month) − Expenses = Profit", labelled as **cash-based, not accounting profit** so nobody mistakes it for a P&L.
- Amounts stored in paise; ₹12,000 and ₹3,450.50 both round-trip exactly.

## Commissions ledger — built (Phase 1, item 7)

Accruals are written automatically by billing (only when an invoice is **fully paid**); this screen settles them.

- **By doctor:** rule (% of bill / ₹ per line), patients referred, total billing, accrued, payable, last accrual date, **Pay** button.
- **Ledger:** every entry with invoice link, patient, doctor, date, status (accrued/paid) and a **reversal** tag on cancelled-invoice entries. Negative amounts show in red.
- **Payouts:** payout history with mode and note.
- **Payouts settle oldest-first (FIFO)** and are idempotent-safe: a partial payout **splits an entry** into a settled part (linked to the payout) and an open part, so a doctor paid ₹20 of ₹30 correctly shows ₹10 still payable. Entries are never edited in place.
- Over-payment is blocked with a clear message; commission CSV export available.
- Verified live: ₹30 accrued on a paid ₹336 bill → paid ₹20 → ledger shows one ₹10-`paid` entry linked to the payout + one ₹20-`accrued` entry, doctor payable drops to ₹20, and the payout appears in history.

**Note on cancelled invoices:** a paid invoice that is later cancelled writes a negative reversal entry, but any commission *already paid out* to the doctor is not clawed back automatically — the ledger shows the negative entry so you can see the doctor owes it. Claw-back tracking is deliberately left for later rather than guessed at now.

## Reports module — built (Phase 1, item 9)

Result entry, abnormal flagging and printed reports on the lab letterhead.

- **One report per bill, not per patient.** This was a real bug caught in testing: the first version grouped a patient's tests *across every invoice*, so a report for Ramesh Kumar merged tests from INV-A-00001 and INV-A-00002. Reports are now scoped to `invoice_id` — a printable report exists only when **every test on that bill** is verified.
- Billing already creates one `report_order` per test, and **packages expand into their individual tests**, so a combo billed as one line still queues each test for a separate result.
- **Result entry:** Save draft (stays pending) or Verify result (marks done, stamps `verified_by`/`reported_at`).
- **Automatic abnormal flagging:** if the result parses as a number and falls outside the test's `ref_min`/`ref_max`, it is stored with `abnormal = 1` and shown with a red badge on screen and in print. Free-text results (e.g. "Normal study") are never flagged.
- Filters: Pending / Completed / All, with search across patient, phone, test and invoice number.
- **Printed report** uses the same letterhead as the invoice — lab name, address, phone, GSTIN, referring doctor, reference range per test, the abnormal marker, the pathologist signature block and verification timestamp. Print CSS shares the `.print-area` / `no-print` rules with the invoice.
- Verified live: 4 queued tests → CBC entered as 14500 against a 4,000–11,000 range correctly flagged abnormal → all four verified → two separate reports printed, INV-A-00001 showing only its 3 tests and INV-A-00002 showing the single X-ray with the correct referring doctor.

## Settings module — built (Phase 1, item 10 groundwork)

- **Lab profile:** name, address, phone, GSTIN (validated at 15 characters), pathologist name and qualification. These flow into both the invoice and the report letterhead — verified live: changing the lab name/GSTIN updated the printed invoice immediately.
- **Invoice numbering:** prefix, device code, and a switch for including the device code in the number. The live preview shows the **next** invoice number, computed from the real next block sequence, and updates as you type.
- **Users:** add/edit user, role (admin/operator), reset password, enable/disable with a guard against deactivating your own account. New users are flagged `must_change_password`.
- **Device & sync tab:** device code, device ID, storage type, and a per-table count of rows waiting to sync (`dirty = 1`) — an honest preview of the sync engine rather than a fake "connected" indicator.
- Operators get a genuinely read-only view: verified live that all 8 fields are disabled, no Save button renders, and the Users tab shows no Add or Edit controls.
- Verified live end to end: a new operator `reception` was created, signed in, was forced through the password change, and landed on a restricted view.
- Added two missing settings seeds (`invoice_device_code`, pathologist fields) so a fresh install defaults sensibly.

## Multi-tab data-loss guard (found while testing Settings)

IndexedDB stores the **entire SQLite file under a single key**, and each browser tab keeps its own in-memory copy that it writes back wholesale. Two open tabs therefore overwrite each other's data — this actually destroyed a user row during testing when a stale background tab flushed its old snapshot over a newly created account.

- A second tab is now **refused at boot** with a clear message ("This app is already open in another tab…") instead of silently corrupting data.
- Ownership is a heartbeat in `localStorage` (refreshed every 5s, released on unload) so a crashed tab's lock goes stale after 30 seconds rather than blocking you forever.
- This is a browser/dev concern only: in production each terminal is a separate machine with its own database. It matters because a real user could otherwise open the app twice and lose a day's billing without any warning.

## Migration bug — database could not open at all (found when "localhost won't load")

The symptom was "Can't open the database — UNIQUE constraint failed: meta.key", and behind it were **two** separate problems, one of which was mine.

**1. The dev server had stopped.** That was the literal answer to "why can't the URL be reached": nothing was listening on port 5173, because the background `npm run dev` process had died during a run of production builds. Restarting it restored the URL. Worth knowing because the browser's error page looks identical whether the server is down or the app is broken.

**2. A real boot bug: the seed could run more than once.** `migrate()` decided whether to run the seed with a per-migration check (`if (current === 0)`) using a `current` variable that was read once and **never updated inside the loop**. So on a database with more than one migration to apply, the seed ran once per migration. `SEED_SQL` used plain `INSERT` and `meta` has a primary key, so the second run aborted the whole boot on `UNIQUE constraint failed: meta.key`.

This was latent from the moment migration 2 (2FA) was added, and it only surfaced when a database had to be built from scratch — which is exactly what happens on a **new clinic PC**, and what happened here once the IndexedDB snapshot was lost. It would have hit the real deployment on day one.

**The fix, in three parts:**
- `current` now advances as each migration applies, and the seed is gated on the database's **original** version (`wasFresh`) rather than re-evaluated per migration.
- `schema_version` is now written **only** by the migration runner (with an upsert), not also by the seed. Two writers for one key was the original confusion.
- Every seed insert is `INSERT OR IGNORE`, making the seed **idempotent**. A seed that can only ever be applied once is fragile: a power cut or a crash halfway through leaves the database permanently unable to open. Now re-running it is harmless.

**Self-healing:** `migrate()` also detects the specific half-seeded state left behind by the bug — `bootstrapped_at` missing, which only the seed ever writes — and re-runs the (now idempotent) seed to complete it. Verified by deliberately deleting `bootstrapped_at` plus a test, a category and a package item from a live database: the next boot restored all of them and started normally, instead of failing.

**Cost:** the development data was lost to this bug (the 3 test invoices, 2 users and sample records). The lab profile — name, GSTIN, pathologist — was re-applied. This is a development sandbox, not the centre's real records, so nothing of value was lost; but it is precisely why the fix matters before the app reaches a machine that has real billing on it.

**Also worth noting for later:** `INSERT OR IGNORE` means the seed can no longer overwrite settings a user has changed. That is the desired behaviour (a re-seed must never reset your GSTIN or lab name), and it is a direct response to the earlier incident where a stale tab clobbered saved settings.

## CSV exports — built (Phase 1, item 11)

All exports go through one shared helper (`src/db/csv.ts`) so every file behaves identically.

- **UTF-8 with BOM.** Excel on Indian Windows opens a UTF-8 CSV correctly *only* when a BOM is present; without it the ₹ symbol and accented patient names arrive mangled. Exports now carry `EF BB BF` — verified byte-for-byte.
- **Formula-injection guard.** A payee or note starting with `=`, `+`, `-` or `@` is prefixed with a single quote so Excel treats it as text, not a formula. Verified: `=cmd()` exports as `'=cmd()`.
- **CRLF line endings**, quoted fields, and doubled quotes inside a value — verified with `he said "hi"` round-tripping correctly.
- **Invoices page** gained a period filter (All / This month / Last month / **This financial year**, the Indian 1 Apr–31 Mar window). The filter drives the list, the header totals, *and* the exports, so what you see is what you export.
- **Two exports there**, because GST filing and cash reconciliation need different shapes:
  - *Invoices CSV* — one row per bill with the full tax breakdown (subtotal, discount, taxable, CGST, SGST, round-off, total, paid, balance, cancel reason). This is the GST-return workpaper.
  - *Payments CSV* — one row per payment received, which is the cash-book view. A partially-paid bill correctly produces one row per instalment (verified: ₹336 invoice → ₹100 UPI + ₹236 cash).
- Exports are **disabled when the filtered list is empty** rather than producing a header-only file.
- Expenses and Commissions were refactored onto the same helper; their exports gained the BOM and injection guard.
- Verified live: totals reconcile exactly against the stored invoices (₹750 + ₹45 + ₹45 = ₹840 on INV-A-00001), and the empty-period case shows "No invoices in this period".

## 80mm thermal receipt printing — built (Phase 1, item 12)

The same invoice markup now prints at two paper widths instead of maintaining a second receipt template.

- **Mode is an attribute, not a prop:** the print CSS lives behind `html[data-print="thermal"]` because `@media print` rules cannot see React state. `printThermal()` sets it, prints, then clears it on `afterprint` **and** on a 1s timer (Safari's `afterprint` is unreliable, and a stuck attribute would silently shrink the next Ctrl+P to receipt width). Verified live: attribute set during print, `null` after.
- **Named pages solved the width problem.** CSS only permits `@page` at the top level, so it cannot be made conditional on an element — nesting it inside `html[data-print="thermal"]` is invalid and the optimizer rejected it with a warning. The fix is a top-level `@page thermal` plus `page: thermal` on the `.print-area`, which the invoice sets only in thermal mode.
- **Caught a silent failure during verification:** `size: 80mm auto` was being **dropped by the CSS optimizer** (`auto` is not a valid page height), leaving a margin-only `@page thermal` that would have printed receipts on A4 with no error anywhere. Changed to an explicit `80mm 297mm` and confirmed the declaration now survives into the built stylesheet.
- **Layout is 72mm, not 80mm:** a nominal 80mm roll has roughly 72mm of printable area on a 203dpi head. Laying out at the full 80mm is the usual cause of clipped right-hand totals.
- Receipt adjustments: the two-column header and summary collapse to full width, the signature block is dropped via `.thermal-hide` (a receipt doesn't need one), and the reminder/summary blocks stay intact so the tax breakdown is still legible.
- The invoice page now has separate **Print A4** and **Thermal 80mm** buttons; the `?print=1` deep-link still auto-prints at A4.

## Two-factor sign-in (TOTP) — built (Phase 1, item 13)

Optional per-user second factor, off by default. It exists because the same login also guards the settings that change invoice numbering and GST details — an operator laptop left signed in is otherwise enough to reissue invoices.

- **Hand-rolled TOTP, not a dependency.** The algorithm is ~40 HMAC lines (`src/auth/totp.ts`), and in an offline desktop build every dependency is another thing to audit and ship. Verified against **all six RFC 6238 Appendix B test vectors**, including the year-2603 case that catches 32-bit counter overflow.
- **Interoperable defaults:** SHA-1, 6 digits, 30-second step — what Google Authenticator, Authy, Microsoft Authenticator and 1Password all assume without configuration. The secret is Base32 (RFC 4648), no padding, as authenticator apps expect.
- **±1 step drift tolerated.** Phone and PC clocks routinely disagree by a few seconds; without tolerance a correct code fails and the user concludes 2FA is broken. Codes older than one step are rejected.
- **Replay blocked at the DB layer.** A used code stays mathematically valid for the rest of its 30s window, so the accepted time-step is persisted in `users.totp_last_step` and any code from that step or earlier is refused. Verified through the **real login path**: after a successful sign-in the same code is rejected on the next attempt.
- **Enrolment proves possession before arming.** The secret is generated when the dialog opens but `totp_enabled` is only set once a live code from the app has been confirmed, so a half-finished enrolment cannot lock anyone out. Verified: a wrong code is refused, the correct code arms the account.
- **Password alone no longer creates a session** when 2FA is on: `login()` returns a pending challenge and the auth context issues no session until the second factor passes. Verified: a correct password lands on the verification screen, not the dashboard.
- **Recovery codes are single-use and stored hashed.** Eight codes are shown **exactly once** at enrolment (PBKDF2 hashes persisted; the plaintext is not recoverable from the database — confirmed by querying it). Verified end-to-end: a recovery code signs in and consumes itself (9 → 8 hashes) and the *same* code is then refused. Signed-in-by-recovery writes a `2fa_recovery` audit row, so the weaker path is visible after the fact.
- **QR is drawn by an external image service** (`api.qrserver.com`) rather than bundling a QR encoder for a screen shown once per user. **Tradeoff, flagged for the owner:** the TOTP secret travels to that service over HTTPS. The Base32 key is displayed underneath so it can be typed into the app instead, which avoids the call entirely — if the centre objects, the fix is either a bundled encoder or hiding the QR. Revisit before rollout.
- **Deliberately not built:** SMS OTP (per-message cost, against the cheap-to-run goal), WebAuthn (hardware cost, no benefit for a reception desk), and admin-forced 2FA reset flows — an admin can turn 2FA off for a user from the Users tab, which is the recovery path when a phone is lost.
- Schema **migration v2** added the four columns; verified applied in place to the existing database with both existing users intact and `schema_version` = 2.
- **Operational note:** once enrolment is confirmed the recovery codes cannot be retrieved again, so they must be saved at that moment. If they are lost, an admin turns 2FA off and the user re-enrols.

## Read-only web monitoring version — built (Phase 1, item 12, monitoring half)

The second deployment exists. `npm run build` makes the terminal (editing) app; **`npm run build:monitor`** makes the read-only monitoring app, which is the one that gets hosted for phone access. Both come from the same source.

**What monitoring shows:** Dashboard (today/month revenue, dues, pending reports), Invoices with the period filter and both CSV exports, Dues, Reports with printing, and — for admins only — Expenses and Commissions. Patient search, billing, test catalog, doctors and settings are not part of it; those are where entry happens and they stay on the centre's machine.

**Read-only is enforced in three independent layers**, because hiding a button is not a control:
1. **The database refuses writes.** `ReadOnlySource` opens the existing SQLite snapshot and throws on `run()`/`tx()`. Verified live: a read succeeds, while an attempted `INSERT` and an attempted transaction both throw "This is a read-only monitoring view". A stray write path in a future page fails loudly instead of quietly editing a terminal's records.
2. **The routes are gated by role.** Found during verification: an operator could reach `#/expenses` by typing the URL even though the nav link was hidden. Fixed with an `AdminOnly` route guard in `src/ui/guards.tsx` — verified that an operator typing `#/expenses` or `#/commissions` is redirected to the dashboard, while an admin still reaches both.
3. **The UI hides entry affordances.** Every reused page (`Invoices`, `InvoiceView`, `Dues`, `Reports`, `Expenses`, `Commissions`, `Dashboard`) branches on `useMonitor()` and drops its add/edit/collect/cancel/pay controls. Verified per page: monitoring shows "Collect" as "View", and the invoice screen keeps both print buttons but loses collect and cancel.

**Other decisions in this build:**
- **The mode is compiled in, not switchable by URL.** In a production build `appMode()` ignores any override, so a shipped monitor bundle cannot be talked into editing. A dev-only `__diagbillMode("monitor")` hook exists purely so the read-only path can be tested without rebuilding.
- **Monitoring never takes the single-writer lock.** The terminal's `claimLock` refuses a second tab because two writers would clobber each other's IndexedDB snapshot; a monitoring session is a reader, so it skips the lock entirely and several people can watch at once without blocking the counter.
- **A monitoring session never writes the snapshot back**, so even opening it by mistake cannot corrupt the terminal's database.
- **2FA in monitoring mode:** the authenticator path works normally, but the **recovery-code path is refused** with an explanation. Recovery codes are single-use and proving that requires a write, which the monitor cannot do — accepting one would leave it valid forever. The TOTP replay guard likewise cannot burn its step, so a code can be reused within its own 30-second window on the monitor. This is accepted for now because the monitor is a low-privilege viewer behind HTTPS; when the cloud tier lands the replay step moves server-side, where it belongs.
- **Monitoring sign-ins are not recorded in the audit log** — the log is itself a synced table and cannot be written from a read-only database. The cloud tier will log them server-side.
- **No cloud connection yet.** The header honestly reads "Local read-only view" rather than showing a fake "connected" state. The `MonitorContext` is the seam: when the push/read API exists, it is what starts reporting "Synced 2 min ago". `ReadOnlySource` is the other half of that seam — the cloud version becomes a third `DataSource` implementation, exactly as the Tauri SQLite backend will.
- **Operators keep access.** They can check a bill or a report from their own phone; they do not see the centre's expenses, commissions or profit.
- **Two React Router bugs caught live:** route groups written as wrapper components (`<SharedRoutes />`) throw at runtime — `<Routes>` only accepts `<Route>` and fragments as direct children — and a hash-only navigation does not pick up a changed mode without a real reload. Both are noted here because both produced a **blank white page** with no visible error, which is exactly the failure a user would report as "the app is broken".

## Multi-vertical editions, licensing and generic IPD billing - built

- OmniMed Core remains one codebase/installer. The signed licence activates Diagnostics, Pharmacy, Hospital,
  Complete or Custom modules; clinic Settings can then hide licensed modules. Effective modules are the
  intersection of the two.
- Licences are ECDSA P-256/SHA-256 files over canonical JSON, bound to tenant IDs and Windows hardware
  fingerprints. The app verifies offline with the public key only. The vendor portal (`license-portal/`) issues/renews/revokes
  with the private key and must never be shipped with the app.
- Expiry has a 30-day grace. After grace the app is read-only: existing records remain viewable, printable
  and exportable; new clinical/financial writes are blocked in the UI. Packaged backend enforcement
  outside the UI remains a release gate.
- The Windows build binds licences to a hardware fingerprint and stores the signed file with DPAPI; a
  clock high-water mark rejects rollback. DEV builds use a complete development licence when no real
  licence is stored; production requires signed activation.
- Hospital now includes a generic IPD service sheet: tenant-defined services, admission charges with
  quantity/GST, part payments, computed balance, audit and A4 print. It is not a full HIS; packages,
  advances, nursing charts, doctor orders and insurance/TPA remain out of scope.
- Schema v16 adds `hospital_services`, `hospital_charges` and `hospital_bill_payments`; demo seed adds
  examples. `npm run check`, terminal build and monitor build pass; production bundle scan found no
  DEV licence fallback, demo seed hook, portal token or private-key marker.

## Operator expense access and dashboard separation - built

- Terminal operators can add and view expenses, but Dashboard, Settings and Compliance are admin-only
  and removed from their navigation; `#/` redirects to Expenses. Admins retain the Dashboard, Settings
  and Compliance.
- The Expenses "This month at a glance" card (collected, expenses, profit) and the profit line in the
  page subtitle are admin-only. Operators still see the month expense total, expense list, filters,
  category-wise expense totals and CSV export.
- Operators whose Expenses module is unlicensed/disabled land on a safe `/unavailable` page with a sign-out
  action, avoiding a redirect loop now that Settings is administrator-only.
- Monitor behavior is unchanged: operators retain the read-only monitor dashboard; Expenses/Commissions
  remain admin-only there.
- Verified in the production preview with an operator account: Dashboard nav absent, `#/` redirected to
  Expenses, at-a-glance hidden, expense entry saved, and admin Dashboard/at-a-glance still present.

## Referral commissions removed - compliance decision

- Removed the Commissions navigation tab/module and route from terminal and monitor builds.
- Removed commission rule/value fields and the commission column from the Doctors screen. New doctor rows
  use the database defaults and no commission is configured through the UI.
- Removed commission accrual on paid invoices and commission reversal on cancellation. Existing
  `commission_entries`, `payouts` and doctor commission columns are retained as legacy historical data,
  but are not displayed and are not used for new transactions.
- Licence editions/module lists and the vendor portal no longer include `commissions`; existing signed
  licences containing that legacy module ignore it.
- Referral commission/inducement visibility can itself create compliance and ethics risk in Indian
  healthcare. The `diagbill-india-compliance` skill now records that this must not be reintroduced
  without written legal/compliance review.

## Sample disposal result gate - built

- An accepted sample can no longer be disposed before result entry. The Samples list computes linked
  report count and completes result count, showing `0/1 linked test result entered` and disabling Dispose.
- Completeness means the report is verified (`done`) or every selected report parameter has saved data,
  or a single-result report has a value. Empty drafts and partially entered parameters do not qualify.
- The disposal action handler re-checks sample status and result completeness before writing, so a
  manipulated/disabled-button bypass cannot dispose an incomplete sample.
- Tests with no linked report order are also blocked from disposal rather than silently orphaning the
  sample.
- Verified against seeded data: `INV-A-00011-S01` (0/1) has Dispose disabled; `INV-A-00004-S01` (1/1)
  has Dispose enabled. `npm run check`, terminal build and monitor build pass.

## Tauri desktop shell and file-backed SQLite (WS2 scaffold) - built

- Added Tauri v2 shell with NSIS current-user bundle configuration, generated icons and
  `desktop:dev`/`desktop:build` scripts.
- The desktop persists the SQLite image to `%APPDATA%\in.medicore.desktop\medicore.db` instead of
  IndexedDB. Writes use a temporary file + atomic replacement, keep `medicore.db.bak`, and expose
  pre-migration backups under `backups/`.
- Added single-instance handling, SQLite `quick_check`, app-data writability diagnostics and
  flush-before-window-close behavior. Settings > Device & sync shows the database/backup paths.
- The current file-backed implementation still uses the sql.js/WASM engine; a native SQLite driver and
  encrypted desktop file remain future work.
- Rust/MSVC are not installed on this machine, so native compilation, installer execution and failure
  tests remain manual WS2 steps documented in `DESKTOP_BUILD.md`.

## Native SQLCipher via Rust - supersedes plugin-sql and file-backed desktop persistence

- The Tauri desktop uses a native Rust SQLCipher 4.20 connection. The browser continues to use
  sql.js/IndexedDB without desktop SQLCipher coverage.
- A random 256-bit database key is generated on first use and stored in Windows Credential Manager.
  No plaintext key is written to configuration or source control.
- Existing plaintext databases are exported into SQLCipher on first launch. The plaintext file is
  replaced only after the encrypted copy passes integrity and schema checks.
- Rust owns one connection; the DataSource adapter rewrites the app's existing positional `?`
  placeholders safely and routes queries through custom Tauri commands.
- Existing migrations, seed, tenant repair, compliance column repair, admin bootstrap and device ID
  logic run through the native source.
- A `wal_checkpoint(FULL)` plus timestamped encrypted pre-migration backup is taken before upgrading an
  existing schema. `PRAGMA quick_check` runs before migrations.
- Key export/import for cross-machine recovery remains a production gate.

## Decoupled local Google Drive CSV export - supersedes cloud sync

- The live API/cloud sync path was removed. There is no endpoint, bearer token, health check or central
  dashboard in the app.
- Schema 18 adds `local_export_queue`. Triggers snapshot invoices (Diagnostics), pharmacy sales
  (Pharmacy), admissions (Hospital) and hospital charges.
- A 30-second scheduler writes up to 100 pending rows into a brand-new
  `tx_YYYYMMDD_HHMMSS_XXXXXX.csv` file inside `GOOGLE_DRIVE_SYNC_PATH`.
- Files use `create_new` and are never appended to or overwritten.
- CSV columns are `Sync_Timestamp, Transaction_ID, Module_Type, Masked_Patient_ID, Total_Amount`.
  Patient IDs are SHA-256-masked; no names, results or notes are included.
- The Rust writer runs in `spawn_blocking`. A failed write leaves rows pending with local error
  evidence and retries on the next interval.
- Success means the file was written locally, not that Google Drive uploaded or a consumer processed it.
- A separate full-data export writes one CSV per database table under
  `GOOGLE_DRIVE_SYNC_PATH\full-export\snapshot_...`, once daily and on demand. It includes patients,
  clinical records and all business modules; it excludes authentication secrets and never exports
  TOTP/password/recovery material.
- Full snapshots contain confidential patient data and are not encrypted backups.
- Legacy `sync_queue`/`sync_ack` tables remain historical; migration 18 drops their triggers.

## OmniMed Core rebrand and X-ray reporting - built

- The product is branded **OmniMed Core** across the app, installers, portal and documentation.
- Internal identifiers (`in.medicore.desktop`, `medicore.db`, DPAPI entropy and storage keys) remain
  unchanged intentionally so existing databases, licences and app-data paths survive the rebrand.
- Schema 19 adds `clinical_history`, `findings_text` and `impression_text` to `report_orders`.
- The Reports work list detects `X-Ray`/`Radiology` categories and opens a radiology form instead of the
  pathology parameter table.
- X-ray reports use a dedicated A4 letterhead with clinic logo/header, patient details, clinical history,
  findings, impression, radiologist signature and a configurable disclaimer.
- Admin settings provide radiologist name, qualification and the X-ray disclaimer.
- X-ray release still requires `can_authorize_reports`; report revisions and audit evidence use the same
  append-only workflow as pathology reports.

## Multiple radiologist signatures - built

- Schema 20 adds the tenant-scoped `radiologists` table: name, qualification, signature image data URL,
  active flag, sort order and standard sync/tombstone columns.
- Administrators manage the catalogue under **Settings → Radiologists**. Signatures are PNG/JPG/WebP up
  to 500 KB, matching the clinic-logo ingestion limit.
- The X-ray entry form loads only active radiologists and requires the operator to choose one before
  release. A selected radiologist without a signature image is rejected at release.
- The selected radiologist id, name, qualification and signature image are copied into `report_orders`.
  Printing reads that snapshot, not the live catalogue, so renaming, deactivating or deleting a
  radiologist cannot silently rewrite an issued report.
- An issued report whose radiologist was later deactivated or deleted keeps that radiologist as an
  inactive, read-only choice on amendment and retains the saved signature for printing.
- Existing text-only X-ray reports remain printable through the legacy settings fallback until amended
  with a signature snapshot.

## Broad pathology and X-ray starter catalogue - built

- `src/db/starterTests.ts` contains 184 pathology and 43 X-ray starter entries (227 total).
- Arterial Blood Gas (ABG) is included with pH, pCO2, pO2, HCO3, base excess, O2 saturation,
  lactate, sodium, potassium, ionised calcium, glucose, FiO2 and interpretation parameters.
- Seeding runs after tenant bootstrap in both the SQL.js and Tauri SQLCipher sources.
- It is additive and idempotent per tenant. Matching is by stable seed id, code and case-insensitive name.
- Existing custom tests, renamed seed tests and deleted seed tests are not overwritten or resurrected.
- New entries default to 0% GST and price 0. Labs must set rates and validate reference intervals before
  billing or clinical use.
- This is a broad routine/specialty library, not a claim that every possible esoteric or send-out test
  exists. Custom tests remain the escape hatch for local methods and rare assays.
- No schema migration is required; schema remains 21.

## Parameter templates for the starter catalogue - built

- `src/db/starterParameters.ts` seeds 371 pathology parameters after the starter tests are present.
- Every pathology test gets at least one parameter. Single-analyte tests get one parameter named after
  the test; panels get their component set.
- Explicit panel maps cover differential count, PT/INR, blood group/Rh, dengue, Widal, urine microscopy,
  stool routine, semen analysis, CSF/pleural/ascitic/synovial fluid, Hb electrophoresis, ANA and
  cultures.
- X-ray tests remain parameter-free because they use the radiology report form.
- Seeding is additive and idempotent. Existing custom parameters are preserved, and parameter names are
  matched case-insensitively per test.
- Tests with recorded results are not reshaped. A historical single-result report is mapped into its new
  one-parameter template when reopened, so amendment does not lose the result.
- Complex reports have optional subfields split out: malaria species/stage/density, VDRL/TPHA titre,
  peripheral-smear morphology, histopathology gross/microscopic/diagnosis/comment, cytology findings,
  IHC/special-stain result and MRSA/VRE organism fields.
- A previously seeded generic parameter is removed only when no report stores a value against it.
- Starter reference intervals are now filled, including sex/age variants where applicable. They remain
  editable starter values and the laboratory must validate them for its methods and population.

## Combined starter packages - built

- `src/db/starterPackages.ts` seeds 27 combined health-check packages from existing pathology and X-ray
  tests.
- Packages are pricing/name wrappers only. Component tests retain their own parameters, reference
  intervals and report workflows; X-ray components use the radiology form.
- Seeding is additive and idempotent. Packages match by stable seed id or name; items match by test id,
  including deleted items, so a deliberately removed item is not recreated.
- Existing custom/deleted packages and package items are preserved.
- New packages default to price 0 and 0% GST; the Tests screen shows **Set price** until a package rate
  is configured.
- No package-specific schema change is required.

## Sign-in hygiene - built

- The sign-in screen no longer prints the default `admin / admin123` credentials.
- The username placeholder no longer advertises the default admin username.
- First-run password change remains enforced after the legitimate default-admin sign-in.

## Expense module attribution - built

- Schema 22 adds `expenses.modules TEXT NOT NULL DEFAULT '[]'`.
- Modules are Pathology, X-ray, Pharmacy, Hospital and General/shared.
- An expense may belong to multiple modules; shared expenses are tagged, not split.
- Existing expenses remain visible as Unassigned and can be edited.
- The expenses list, search, module filter and CSV export include the attribution.
- Operators can add and view expenses as before; admin/operator visibility rules are unchanged.

## Pre-printed letterhead printing - built

- Settings -> Centre profile has independent A4 header modes for reports and invoices: built-in
  OmniMed header or pre-printed centre letterhead.
- Pre-printed mode hides the built-in centre name, address, logo, phone, GSTIN and accreditation block
  on the affected A4 documents. Document metadata and patient/clinical content remain.
- Top, bottom, left and right page margins are tenant settings. Defaults are 45 mm / 18 mm / 12 mm /
  12 mm and can be adjusted after a test print.
- A dynamically rendered `@page` rule applies the saved margins only while the print view is mounted.
- Thermal 80 mm receipts are unaffected and keep the centre identity.
- The application cannot force the Windows print dialog to disable browser headers/footers or disable
  printer-driver scaling; the setup guide covers those steps.
- No schema change is required; settings are stored in the existing key/value settings table.

## In-app administrator dashboard - built

- The administrator dashboard is the primary reporting surface and reads the terminal's live, tenant-scoped
  SQLite data. It does not depend on Google Drive, Sheets, BigQuery or Looker Studio.
- Six tabs cover Overview, Billing, Diagnostics, Expenses, Pharmacy and Hospital.
- A date selector supports Today, Last 7 days, Last 30 days and Last 90 days.
- Charts are inline SVG/CSS (`src/ui/charts.tsx`), so no chart dependency is added to the offline bundle.
- CSV exports one daily row with billed, collected, expenses, diagnostics, pharmacy and hospital values.
- Print uses the existing A4 print rules and prints the active tab only; controls are `no-print`.
- Monthly and cross-centre analysis, scheduled email delivery and custom ranges remain out of scope.
- No schema change is required.

## Filled reference intervals - built

- `src/db/starterReferences.ts` fills references for all 371 pathology parameters.
- Sex/age variants are stored in the reference text where applicable: haemoglobin, RBC, PCV, creatinine,
  uric acid, ALP, ferritin, iron, lipids, sex hormones, ESR and others.
- Qualitative/text tests use appropriate qualitative references (negative, non-reactive, no growth,
  not seen, descriptive report).
- Reference seeding is versioned per tenant in `meta` and updates starter-owned parameters only. It runs
  once per reference release, so custom references are not overwritten on every boot.
- Unresolved numeric parameters never remain blank; they show a validation-required fallback.
- Reference text is for report display; numeric abnormal flags still use the report parameter's numeric
  limits. Laboratories must validate sex/age-specific flags and intervals locally.
