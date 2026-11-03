// Settings: lab profile (letterhead + GSTIN), pathologist signature, invoice
// numbering, user accounts and device identity.
//
// Only admins may change anything; operators see a read-only view. Everything
// here is local-first — these values live in the settings table and sync like
// any other row.

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { formatDateTime, getDeviceId, now, uuid } from "../db/helpers";
import { getSetting, getSettings, setSetting } from "../db/settings";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import { hashPassword, passwordPolicyOk } from "../auth/crypto";
import {
  ALL_MODULE_IDS,
  ENABLED_MODULES_KEY,
  MODULE_DEFINITIONS,
  notifyModulesChanged,
  parseEnabledModules,
  type ModuleId,
} from "../app/modules";
import { readLogoFile, validateLogoFile } from "../ui/logo";
import { useLicense } from "../licensing/LicenseContext";
import { LicenseSettingsPanel } from "./License";
import { databaseInfo, isTauriRuntime, type DatabaseInfo } from "../db/tauriStorage";
import type { UserRow } from "../db/types";
import {
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCodes,
  otpauthUri,
  qrCodeUrl,
  verifyTotp,
} from "../auth/totp";
import {
  Btn,
  Card,
  ErrorNote,
  Icon,
  Labeled,
  Modal,
  PageHeader,
  Select,
  TextInput,
} from "../ui/kit";

interface ProfileForm {
  lab_name: string;
  lab_address: string;
  lab_phone: string;
  lab_gstin: string;
  pathologist_name: string;
  pathologist_qualification: string;
  invoice_prefix: string;
  device_code: string;
  invoice_device_code: string;
  facility_hfr_id: string;
  facility_hip_id: string;
  abdm_environment: string;
  accreditation_body: string;
  accreditation_number: string;
  accreditation_valid_until: string;
}

const PROFILE_KEYS: (keyof ProfileForm)[] = [
  "lab_name",
  "lab_address",
  "lab_phone",
  "lab_gstin",
  "pathologist_name",
  "pathologist_qualification",
  "invoice_prefix",
  "device_code",
  "invoice_device_code",
  "facility_hfr_id",
  "facility_hip_id",
  "abdm_environment",
  "accreditation_body",
  "accreditation_number",
  "accreditation_valid_until",
];

const EMPTY: ProfileForm = {
  lab_name: "",
  lab_address: "",
  lab_phone: "",
  lab_gstin: "",
  pathologist_name: "",
  pathologist_qualification: "",
  invoice_prefix: "INV-",
  device_code: "A",
  invoice_device_code: "1",
  facility_hfr_id: "",
  facility_hip_id: "",
  abdm_environment: "disabled",
  accreditation_body: "",
  accreditation_number: "",
  accreditation_valid_until: "",
};

export default function Settings() {
  const { user } = useAuth();
  const license = useLicense();
  const isAdmin = user?.role === "admin";

  const [tab, setTab] = useState<"lab" | "modules" | "license" | "users" | "device">("lab");
  const [desktopInfo, setDesktopInfo] = useState<DatabaseInfo | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [enabledModules, setEnabledModules] = useState<Set<ModuleId>>(
    () => new Set(ALL_MODULE_IDS)
  );
  const [logoData, setLogoData] = useState("");
  const [brandError, setBrandError] = useState("");
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandBusy, setBrandBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");
  const [demoError, setDemoError] = useState("");

  const [users, setUsers] = useState<UserRow[]>([]);

  // user modal
  const [userOpen, setUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [userForm, setUserForm] = useState({
    username: "",
    full_name: "",
    role: "operator" as "admin" | "operator",
    password: "",
    is_active: true,
    can_authorize_reports: false,
  });
  const [userError, setUserError] = useState("");
  /** The block's next sequence number, from the DB — the prefix part is live. */
  const [nextSeq, setNextSeq] = useState<number>(1);

  // Two-factor enrolment for one user at a time.
  const [twoFaUser, setTwoFaUser] = useState<UserRow | null>(null);
  const [twoFaSecret, setTwoFaSecret] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  /** Shown once, immediately after a successful enrolment. */
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const load = async () => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    const values = await getSettings(db, PROFILE_KEYS);
    setForm({
      ...EMPTY,
      ...Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "")
      ),
    } as ProfileForm);
    setEnabledModules(parseEnabledModules(await getSetting(db, ENABLED_MODULES_KEY)));
    setLogoData(await getSetting(db, "logo_data"));
    setUsers(
      await db.all<UserRow>(
        `SELECT * FROM users WHERE deleted = 0 ${tenantClause} ORDER BY role, username`,
        tenantParams
      )
    );

    const block = await db.get<{ next_no: number }>(
      `SELECT next_no FROM invoice_blocks
       WHERE purpose = 'invoice' AND deleted = 0 ${tenantClause} ORDER BY end_no DESC LIMIT 1`,
      tenantParams
    );
    setNextSeq(block?.next_no ?? 1);
  };

  // Built from the form, not the saved values, so the preview updates as you type.
  const nextNumber = `${form.invoice_prefix || "INV-"}${
    form.invoice_device_code === "1" ? `${form.device_code || "A"}-` : ""
  }${String(nextSeq).padStart(5, "0")}`;

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void databaseInfo()
      .then(setDesktopInfo)
      .catch((e) => console.warn("Could not read desktop database diagnostics", e));
  }, []);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.lab_name.trim()) return setError("Lab name is required");
    if (!form.invoice_prefix.trim())
      return setError("Invoice prefix can't be empty");
    if (form.lab_gstin.trim() && form.lab_gstin.trim().length !== 15) {
      return setError("GSTIN should be 15 characters (leave blank if not registered)");
    }
    if (
      form.accreditation_valid_until.trim() &&
      !/^\d{4}-\d{2}-\d{2}$/.test(form.accreditation_valid_until.trim())
    ) {
      return setError("Accreditation valid-until date should be YYYY-MM-DD");
    }
    setBusy(true);
    setError("");
    try {
      const db = await getDb();
      for (const key of PROFILE_KEYS) {
        await setSetting(db, key, form[key].trim());
      }
      await writeAudit(db, {
        userId: user?.id ?? "",
        action: "settings.update",
        entity: "settings",
        entityId: "lab-profile",
        detail: `Updated keys: ${PROFILE_KEYS.join(", ")}`,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  };

  const toggleModule = (id: ModuleId) => {
    if (!license.modules.has(id)) return;
    setEnabledModules((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveModulesAndBranding = async () => {
    if (!isAdmin) return;
    setBrandBusy(true);
    setBrandError("");
    try {
      const db = await getDb();
      const ordered = ALL_MODULE_IDS.filter(
        (id) => enabledModules.has(id) && license.modules.has(id)
      );
      await setSetting(db, ENABLED_MODULES_KEY, JSON.stringify(ordered));
      await setSetting(db, "logo_data", logoData);
      await writeAudit(db, {
        userId: user?.id ?? "",
        action: "settings.modules",
        entity: "settings",
        entityId: "clinic-setup",
        detail: `Enabled modules: ${ordered.join(", ") || "none"} · logo ${
          logoData ? "set" : "removed"
        }`,
      });
      notifyModulesChanged();
      window.dispatchEvent(new Event("diagbill:branding-changed"));
      setBrandSaved(true);
      window.setTimeout(() => setBrandSaved(false), 2500);
      await load();
    } catch (err) {
      setBrandError(
        err instanceof Error ? err.message : "Could not save clinic setup"
      );
    } finally {
      setBrandBusy(false);
    }
  };

  const handleLogoFile = async (file: File | null) => {
    if (!file) return;
    const validation = validateLogoFile(file);
    if (validation) return setBrandError(validation);
    try {
      setBrandError("");
      setLogoData(await readLogoFile(file));
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : "Could not read the logo");
    }
  };

  const loadDemoData = async () => {
    setDemoBusy(true);
    setDemoError("");
    setDemoMessage("");
    try {
      const db = await getDb();
      const { seedDemoData } = await import("../db/demoSeed");
      const result = await seedDemoData(db);
      if (result.created) {
        const s = result.summary;
        setDemoMessage(
          s
            ? `Demo data loaded: ${s.patients} patients, ${s.invoices} invoices, ${s.completedReports} completed reports, ${s.pendingSamples} samples awaiting workflow.`
            : "Demo data loaded."
        );
      } else {
        setDemoMessage(
          "Demo data is already present in this browser profile. You can open the Dashboard to view it."
        );
      }
      await load();
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Could not load demo data");
    } finally {
      setDemoBusy(false);
    }
  };

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm({
      username: "",
      full_name: "",
      role: "operator",
      password: "",
      is_active: true,
      can_authorize_reports: false,
    });
    setUserError("");
    setUserOpen(true);
  };

  const openEditUser = (u: UserRow) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      password: "",
      is_active: u.is_active === 1,
      can_authorize_reports: u.can_authorize_reports === 1,
    });
    setUserError("");
    setUserOpen(true);
  };

  const submitUser = async (e: FormEvent) => {
    e.preventDefault();
    const username = userForm.username.trim().toLowerCase();
    if (!username) return setUserError("Username is required");
    if (!/^[a-z0-9._-]{3,}$/.test(username)) {
      return setUserError("Username: at least 3 chars, letters/numbers/._- only");
    }
    if (!editingUser && !userForm.password) {
      return setUserError("Set a password for the new user");
    }
    if (userForm.password && !passwordPolicyOk(userForm.password)) {
      return setUserError("Password must be at least 6 characters");
    }

    setBusy(true);
    setUserError("");
    try {
      const db = await getDb();
      const ts = now();
      const [tenantClause, tenantParams] = tenantAnd();
      if (editingUser) {
        await db.run(
          `UPDATE users SET username = ?, full_name = ?, role = ?, is_active = ?,
             can_authorize_reports = ?, updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [
            username,
            userForm.full_name.trim(),
            userForm.role,
            userForm.is_active ? 1 : 0,
            userForm.can_authorize_reports ? 1 : 0,
            ts,
            editingUser.id,
            ...tenantParams,
          ]
        );
        if (userForm.password) {
          await db.run(
            `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ?, dirty = 1
             WHERE id = ? ${tenantClause}`,
            [await hashPassword(userForm.password), ts, editingUser.id, ...tenantParams]
          );
        }
      } else {
        await db.run(
          `INSERT INTO users (id, username, full_name, role, password_hash,
             must_change_password, is_active, can_authorize_reports, created_at,
             updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,1,?,?,?,?,?,1,0,?)`,
          [
            uuid(),
            username,
            userForm.full_name.trim(),
            userForm.role,
            await hashPassword(userForm.password),
            userForm.is_active ? 1 : 0,
            userForm.can_authorize_reports ? 1 : 0,
            ts,
            ts,
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
      }
      setUserOpen(false);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save user";
      setUserError(
        /UNIQUE|unique/i.test(msg) ? "That username is already taken" : msg
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleUserActive = async (u: UserRow) => {
    if (u.id === user?.id) {
      window.alert("You can't deactivate the account you're signed in with.");
      return;
    }
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    await db.run(
      `UPDATE users SET is_active = ?, updated_at = ?, dirty = 1 WHERE id = ? ${tenantClause}`,
      [u.is_active === 1 ? 0 : 1, now(), u.id, ...tenantParams]
    );
    await load();
  };

  /** Opens the 2FA dialog with a fresh secret — nothing is saved until confirmed. */
  const startTwoFa = (u: UserRow) => {
    setTwoFaUser(u);
    setTwoFaSecret(generateSecret());
    setTwoFaCode("");
    setTwoFaError("");
    setRecoveryCodes([]);
  };

  const confirmTwoFa = async (e: FormEvent) => {
    e.preventDefault();
    if (!twoFaUser) return;
    setTwoFaBusy(true);
    setTwoFaError("");
    try {
      // The code proves the phone really has the secret before we arm the account.
      const check = await verifyTotp(twoFaSecret, twoFaCode);
      if (!check.ok) {
        setTwoFaError("That code didn't match. Check the app clock and try the next code.");
        return;
      }
      const codes = generateRecoveryCodes();
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      await db.run(
        `UPDATE users SET totp_secret = ?, totp_enabled = 1, totp_last_step = -1,
           recovery_codes = ?, updated_at = ?, dirty = 1 WHERE id = ? ${tenantClause}`,
        [twoFaSecret, await hashRecoveryCodes(codes), now(), twoFaUser.id, ...tenantParams]
      );
      setRecoveryCodes(codes);
      await load();
    } catch (err) {
      setTwoFaError(err instanceof Error ? err.message : "Could not enable two-factor");
    } finally {
      setTwoFaBusy(false);
    }
  };

  const disableTwoFa = async (u: UserRow) => {
    if (!window.confirm(`Turn off two-factor sign-in for ${u.username}?`)) return;
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    await db.run(
      `UPDATE users SET totp_enabled = 0, totp_secret = '', totp_last_step = -1,
         recovery_codes = '', updated_at = ?, dirty = 1 WHERE id = ? ${tenantClause}`,
      [now(), u.id, ...tenantParams]
    );
    await load();
  };

  const tabs: [typeof tab, string][] = [
    ["lab", "Centre profile"],
    ["modules", "Modules & logo"],
    ["license", "Licence"],
    ["users", "Users"],
    ["device", "Device & sync"],
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={
          isAdmin
            ? "Lab identity, invoice numbering, users and this terminal"
            : "Read-only — ask an administrator to change these"
        }
      />

      <div className="mb-4 flex gap-1">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === t
                ? "bg-teal-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "lab" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <h2 className="mb-3 text-sm font-semibold">Letterhead</h2>
                <div className="space-y-3">
                  <Labeled label="Lab / centre name *">
                    <TextInput
                      value={form.lab_name}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, lab_name: e.target.value })
                      }
                    />
                  </Labeled>
                  <Labeled label="Address">
                    <textarea
                      value={form.lab_address}
                      disabled={!isAdmin}
                      rows={3}
                      onChange={(e) =>
                        setForm({ ...form, lab_address: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:bg-slate-50"
                      placeholder={"12, MG Road\nBengaluru 560001"}
                    />
                  </Labeled>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Labeled label="Phone">
                      <TextInput
                        value={form.lab_phone}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setForm({ ...form, lab_phone: e.target.value })
                        }
                      />
                    </Labeled>
                    <Labeled
                      label="GSTIN"
                      hint="15 characters. Appears on every tax invoice."
                    >
                      <TextInput
                        value={form.lab_gstin}
                        disabled={!isAdmin}
                        maxLength={15}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            lab_gstin: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="29ABCDE1234F1Z5"
                      />
                    </Labeled>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h2 className="mb-3 text-sm font-semibold">
                  Pathologist signature
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Labeled label="Name">
                    <TextInput
                      value={form.pathologist_name}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, pathologist_name: e.target.value })
                      }
                      placeholder="Dr. S. Rao"
                    />
                  </Labeled>
                  <Labeled label="Qualification">
                    <TextInput
                      value={form.pathologist_qualification}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          pathologist_qualification: e.target.value,
                        })
                      }
                      placeholder="MD (Pathology)"
                    />
                  </Labeled>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h2 className="mb-3 text-sm font-semibold">Invoice numbering</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Labeled label="Prefix">
                    <TextInput
                      value={form.invoice_prefix}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, invoice_prefix: e.target.value })
                      }
                      placeholder="INV-"
                    />
                  </Labeled>
                  <Labeled
                    label="Device code"
                    hint="Printed in the number so two terminals offline can't collide."
                  >
                    <TextInput
                      value={form.device_code}
                      disabled={!isAdmin}
                      maxLength={3}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          device_code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="A"
                    />
                  </Labeled>
                </div>
                <Labeled
                  label="Include device code in invoice numbers"
                  hint={
                    form.invoice_device_code === "1"
                      ? "Next invoice will look like INV-A-00004"
                      : "Next invoice will look like INV-00004 (server-assigned blocks later)"
                  }
                  className="mt-3"
                >
                  <Select
                    value={form.invoice_device_code}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm({ ...form, invoice_device_code: e.target.value })
                    }
                  >
                    <option value="1">Yes — include (recommended while offline)</option>
                    <option value="0">No — plain running numbers</option>
                  </Select>
                </Labeled>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h2 className="mb-1 text-sm font-semibold">
                  Accreditation & interoperability
                </h2>
                <p className="mb-3 text-xs text-slate-500">
                  These identifiers label local artefacts and prepare ABDM exports.
                  Configuring them does not connect to ABDM or grant NABL accreditation.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Labeled label="Accreditation body">
                    <TextInput
                      value={form.accreditation_body}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, accreditation_body: e.target.value })
                      }
                      placeholder="e.g. NABL"
                    />
                  </Labeled>
                  <Labeled label="Accreditation / certificate number">
                    <TextInput
                      value={form.accreditation_number}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, accreditation_number: e.target.value })
                      }
                    />
                  </Labeled>
                  <Labeled label="Valid until">
                    <TextInput
                      value={form.accreditation_valid_until}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, accreditation_valid_until: e.target.value })
                      }
                      placeholder="YYYY-MM-DD"
                    />
                  </Labeled>
                  <Labeled label="ABDM environment" hint="Local label only until API transport is implemented">
                    <Select
                      value={form.abdm_environment}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, abdm_environment: e.target.value })
                      }
                    >
                      <option value="disabled">Disabled</option>
                      <option value="sandbox">Sandbox preparation</option>
                      <option value="production">Production (not connected)</option>
                    </Select>
                  </Labeled>
                  <Labeled label="Facility HFR ID">
                    <TextInput
                      value={form.facility_hfr_id}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, facility_hfr_id: e.target.value })
                      }
                      placeholder="From ABDM HFR"
                    />
                  </Labeled>
                  <Labeled label="HIP ID">
                    <TextInput
                      value={form.facility_hip_id}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setForm({ ...form, facility_hip_id: e.target.value })
                      }
                      placeholder="From ABDM sandbox/production registry"
                    />
                  </Labeled>
                </div>
              </div>

              <ErrorNote message={error} />
              {saved && (
                <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <Icon name="check" className="h-4 w-4" /> Settings saved
                </p>
              )}

              {isAdmin && (
                <div className="flex justify-end">
                  <Btn type="submit" variant="primary" disabled={busy}>
                    {busy ? "Saving…" : "Save settings"}
                  </Btn>
                </div>
              )}
            </form>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Live preview</h2>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-bold uppercase tracking-wide">
                {form.lab_name || "Diagnostic Centre"}
              </p>
              {form.lab_address && (
                <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
                  {form.lab_address}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-600">
                {form.lab_phone && `Phone: ${form.lab_phone}`}
                {form.lab_gstin && ` · GSTIN: ${form.lab_gstin}`}
              </p>
              <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
                Next invoice number
              </p>
              <p className="num text-sm font-semibold">{nextNumber}</p>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              These details appear on every GST invoice and printed report.
            </p>
          </Card>
        </div>
      )}

      {tab === "modules" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold">Enabled sections</h2>
            <p className="mt-1 text-xs text-slate-500">
              Choose the workflows this clinic uses. Disabled sections disappear from
              navigation and their direct URLs return to the dashboard. Dashboard and
              Settings are always available.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {MODULE_DEFINITIONS.map((module) => {
                const licensed = license.modules.has(module.id);
                const checked = licensed && enabledModules.has(module.id);
                return (
                  <label
                    key={module.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                      licensed
                        ? checked
                          ? "border-teal-200 bg-teal-50/60"
                          : "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-50 opacity-70"
                    } ${!isAdmin || !licensed ? "cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!isAdmin || !licensed}
                      onChange={() => toggleModule(module.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-700"
                    />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 font-medium">
                        {module.label}
                        {!licensed && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            Not licensed
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {!licensed
                          ? `Available with the ${module.id === "pharmacy" ? "Pharmacy" : "Hospital"} edition or add-on.`
                          : module.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Dashboard and Settings cannot be disabled. If all other sections are
              switched off, the centre can still sign in and re-enable them here.
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold">Clinic logo</h2>
            <p className="mt-1 text-xs text-slate-500">
              Used in the app sidebar and printed invoice/report letterheads.
              PNG, JPG or WebP up to 500 KB.
            </p>
            <div className="mt-3 flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              {logoData ? (
                <img
                  src={logoData}
                  alt="Clinic logo preview"
                  className="max-h-24 max-w-full object-contain"
                />
              ) : (
                <p className="text-xs text-slate-400">No logo uploaded</p>
              )}
            </div>
            {isAdmin && (
              <div className="mt-3 space-y-2">
                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      void handleLogoFile(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                  />
                  {logoData ? "Replace logo" : "Upload logo"}
                </label>
                {logoData && (
                  <Btn
                    variant="ghost"
                    className="w-full"
                    onClick={() => setLogoData("")}
                  >
                    Remove logo
                  </Btn>
                )}
              </div>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              The logo is tenant-scoped and included in the local database and backups.
            </p>
          </Card>

          <div className="lg:col-span-3">
            <ErrorNote message={brandError} />
            {brandSaved && (
              <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Icon name="check" className="h-4 w-4" /> Clinic setup saved
              </p>
            )}
            {isAdmin && (
              <div className="flex justify-end">
                <Btn
                  variant="primary"
                  onClick={() => void saveModulesAndBranding()}
                  disabled={brandBusy}
                >
                  {brandBusy ? "Saving…" : "Save modules & logo"}
                </Btn>
              </div>
            )}
          </div>

          {import.meta.env.DEV && (
            <Card className="border-dashed border-amber-300 p-4 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Development demo data</p>
                  <p className="mt-1 max-w-3xl text-xs text-slate-500">
                    Loads a synthetic dataset into <b>this browser profile only</b>: patients,
                    GST bills, dues, samples, completed/amended reports, expenses, consent and
                    an ABDM draft. This is not production data and is hidden in
                    production builds.
                  </p>
                  {demoMessage && (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {demoMessage}
                    </p>
                  )}
                  <ErrorNote message={demoError} />
                </div>
                <div className="flex shrink-0 gap-2">
                  {demoMessage && (
                    <Btn onClick={() => { window.location.hash = "#/"; }}>
                      Open Dashboard
                    </Btn>
                  )}
                  {isAdmin && (
                    <Btn
                      variant="primary"
                      onClick={() => void loadDemoData()}
                      disabled={demoBusy}
                    >
                      {demoBusy ? "Loading demo data…" : "Load demo data"}
                    </Btn>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "license" && <LicenseSettingsPanel />}

      {tab === "users" && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200 p-3">
            <p className="text-sm text-slate-500">
              Two roles: <b>Admin</b> (everything) and <b>Operator</b> (front desk —
              billing and patients, no settings or deletions).
            </p>
            {isAdmin && (
              <Btn variant="primary" onClick={openNewUser}>
                <Icon name="plus" className="h-4 w-4" /> Add user
              </Btn>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Username</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">2FA</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="num px-4 py-2.5 font-medium">
                      {u.username}
                      {u.id === user?.id && (
                        <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{u.full_name || "—"}</td>
                    <td className="px-4 py-2.5 capitalize text-slate-500">
                      {u.role}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.totp_enabled === 1
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.totp_enabled === 1 ? "on" : "off"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.is_active === 1
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.is_active === 1 ? "active" : "disabled"}
                      </span>
                      {u.must_change_password === 1 && (
                        <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          must change password
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {isAdmin ? (
                        <>
                          <Btn variant="ghost" onClick={() => openEditUser(u)}>
                            Edit
                          </Btn>
                          <Btn
                            variant="ghost"
                            onClick={() =>
                              u.totp_enabled === 1
                                ? void disableTwoFa(u)
                                : startTwoFa(u)
                            }
                          >
                            {u.totp_enabled === 1 ? "2FA off" : "Set up 2FA"}
                          </Btn>
                          <Btn
                            variant="ghost"
                            onClick={() => void toggleUserActive(u)}
                          >
                            {u.is_active === 1 ? "Disable" : "Enable"}
                          </Btn>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 2FA enrolment. The secret is generated up front but only armed once a
          code from the authenticator app has been confirmed. */}
      <Modal
        open={!!twoFaUser}
        title={
          recoveryCodes.length > 0
            ? "Save your recovery codes"
            : `Two-factor sign-in for ${twoFaUser?.username ?? ""}`
        }
        onClose={() => {
          setTwoFaUser(null);
          setRecoveryCodes([]);
        }}
      >
        {recoveryCodes.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Two-factor sign-in is now on. These codes are shown{" "}
              <b>only once</b> — each one signs you in a single time if you lose
              your phone. Print or write them down and keep them somewhere safe.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              {recoveryCodes.map((c) => (
                <p key={c} className="num text-sm font-medium tracking-wide">
                  {c}
                </p>
              ))}
            </div>
            <p className="text-xs text-rose-600">
              Anyone with these codes can sign in. Treat them like passwords.
            </p>
            <div className="flex justify-end">
              <Btn variant="primary" onClick={() => setTwoFaUser(null)}>
                I've saved them
              </Btn>
            </div>
          </div>
        ) : (
          <form onSubmit={confirmTwoFa} className="space-y-3">
            <p className="text-sm text-slate-600">
              Scan this QR code with Google Authenticator, Authy or any other
              authenticator app, then enter the 6-digit code it shows.
            </p>
            {twoFaSecret && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <img
                  src={qrCodeUrl(
                    otpauthUri(
                      twoFaSecret,
                      twoFaUser?.username ?? "user",
                      form.lab_name || "DiagBill"
                    )
                  )}
                  alt="Two-factor QR code"
                  width={180}
                  height={180}
                  className="h-[180px] w-[180px]"
                />
                <p className="text-center text-xs text-slate-500">
                  Can't scan? Type this key into the app instead:
                </p>
                <code className="num select-all rounded bg-slate-100 px-2 py-1 text-xs tracking-wider">
                  {twoFaSecret}
                </code>
              </div>
            )}
            <Labeled label="Code from your authenticator app">
              <TextInput
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="num tracking-widest"
              />
            </Labeled>
            <ErrorNote message={twoFaError} />
            <div className="flex justify-end gap-2">
              <Btn type="button" onClick={() => setTwoFaUser(null)}>
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" disabled={twoFaBusy}>
                {twoFaBusy ? "Verifying…" : "Turn on 2FA"}
              </Btn>
            </div>
          </form>
        )}
      </Modal>

      {tab === "device" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">This terminal</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Device code</dt>
                <dd className="num font-medium">{form.device_code || "A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Device ID</dt>
                <dd className="num max-w-[60%] truncate text-xs">
                  {getDeviceId() || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-slate-500">Storage</dt>
                <dd className="text-right">
                  {isTauriRuntime()
                    ? "SQLite file (desktop app-data)"
                    : "SQLite via IndexedDB (browser)"}
                </dd>
              </div>
              {desktopInfo && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-slate-500">Database file</dt>
                    <dd className="num max-w-[65%] break-all text-right text-xs">
                      {desktopInfo.databasePath}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-slate-500">File writable</dt>
                    <dd className={desktopInfo.writable ? "text-emerald-700" : "text-rose-700"}>
                      {desktopInfo.writable ? "Yes" : "No"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-slate-500">Pre-migration backups</dt>
                    <dd className="num max-w-[65%] break-all text-right text-xs">
                      {desktopInfo.backupDir}
                    </dd>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">Sync</dt>
                <dd className="text-slate-400">Not connected yet</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-400">
              Every terminal keeps its own database and its own invoice number block,
              so billing never waits for the internet.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Pending sync queue</h2>
            <SyncQueue />
          </Card>
        </div>
      )}

      <Modal
        open={userOpen}
        title={editingUser ? `Edit ${editingUser.username}` : "Add user"}
        onClose={() => setUserOpen(false)}
      >
        <form onSubmit={submitUser} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Username *">
              <TextInput
                value={userForm.username}
                autoFocus
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
                placeholder="reception"
              />
            </Labeled>
            <Labeled label="Full name">
              <TextInput
                value={userForm.full_name}
                onChange={(e) =>
                  setUserForm({ ...userForm, full_name: e.target.value })
                }
              />
            </Labeled>
          </div>
          <Labeled label="Role">
            <Select
              value={userForm.role}
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  role: e.target.value as "admin" | "operator",
                })
              }
            >
              <option value="operator">Operator (front desk)</option>
              <option value="admin">Admin (full access)</option>
            </Select>
          </Labeled>
          <Labeled
            label={editingUser ? "Reset password (leave blank to keep)" : "Password *"}
            hint="The user will be asked to change it on first sign-in."
          >
            <TextInput
              type="password"
              value={userForm.password}
              onChange={(e) =>
                setUserForm({ ...userForm, password: e.target.value })
              }
            />
          </Labeled>
          <Labeled label="Status">
            <Select
              value={userForm.is_active ? "1" : "0"}
              onChange={(e) =>
                setUserForm({ ...userForm, is_active: e.target.value === "1" })
              }
            >
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </Select>
          </Labeled>
          <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={userForm.can_authorize_reports}
              onChange={(e) =>
                setUserForm({ ...userForm, can_authorize_reports: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-700"
            />
            <span>
              <span className="block font-medium">Authorised to release clinical reports</span>
              <span className="block text-xs text-slate-500">
                Required for verification and amendment. Entering results alone does not
                grant release authority.
              </span>
            </span>
          </label>
          <ErrorNote message={userError} />
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setUserOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : editingUser ? "Save changes" : "Add user"}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Counts rows waiting to be pushed, per table — a preview of the sync engine. */
function SyncQueue() {
  const [rows, setRows] = useState<{ table: string; count: number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const db = await getDb();
      const tables = [
        "patients",
        "tests",
        "packages",
        "doctors",
        "invoices",
        "invoice_items",
        "payments",
        "commission_entries",
        "report_orders",
        "expenses",
        "payouts",
        "users",
        "samples",
        "report_result_revisions",
        "abdm_consents",
        "abdm_outbox",
      ];
      const out: { table: string; count: number }[] = [];
      const [tenantClause, tenantParams] = tenantAnd();
      for (const t of tables) {
        const r = await db.get<{ n: number }>(
          `SELECT COUNT(*) AS n FROM ${t} WHERE dirty = 1 ${tenantClause}`,
          tenantParams
        );
        if ((r?.n ?? 0) > 0) out.push({ table: t, count: r?.n ?? 0 });
      }
      setRows(out.sort((a, b) => b.count - a.count));
      setLoaded(true);
    })();
  }, []);

  if (!loaded) return <p className="text-sm text-slate-400">Checking…</p>;
  if (rows.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-emerald-700">
        <Icon name="check" className="h-4 w-4" /> Nothing waiting
      </p>
    );
  }
  return (
    <>
      <ul className="divide-y divide-slate-100 text-sm">
        {rows.map((r) => (
          <li key={r.table} className="flex justify-between py-2">
            <span className="text-slate-600">{r.table.replace(/_/g, " ")}</span>
            <span className="num font-medium">{r.count}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        These rows carry <span className="num">dirty = 1</span> and will be pushed the
        first time the cloud connection is configured. Last checked{" "}
        {formatDateTime(Date.now())}.
      </p>
    </>
  );
}
