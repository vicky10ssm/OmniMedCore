import { useEffect, useState, type FormEvent } from "react";
import { getDb } from "../db";
import {
  formatINR,
  getDeviceId,
  now,
  rupeesToPaise,
  uuid,
} from "../db/helpers";
import type { PackageItemRow, PackageRow, TestParameterRow, TestRow } from "../db/types";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import {
  Btn,
  Card,
  EmptyState,
  ErrorNote,
  Icon,
  Labeled,
  Modal,
  PageHeader,
  Select,
  TextInput,
} from "../ui/kit";

interface TestForm {
  code: string;
  name: string;
  category: string;
  price: string;
  gst: string;
  sac_code: string;
  unit: string;
  ref_range: string;
  ref_min: string;
  ref_max: string;
  report_type: "text" | "numeric";
  is_active: boolean;
  specimen_type: string;
  container_type: string;
  department: string;
  method: string;
  loinc_code: string;
}

const EMPTY_TEST: TestForm = {
  code: "",
  name: "",
  category: "Pathology",
  price: "",
  gst: "0",
  sac_code: "999316",
  unit: "",
  ref_range: "",
  ref_min: "",
  ref_max: "",
  report_type: "text",
  is_active: true,
  specimen_type: "",
  container_type: "",
  department: "",
  method: "",
  loinc_code: "",
};

interface ParameterForm {
  name: string;
  section_name: string;
  unit: string;
  ref_range: string;
  ref_min: string;
  ref_max: string;
  report_type: "text" | "numeric";
  loinc_code: string;
}

const EMPTY_PARAMETER: ParameterForm = {
  name: "",
  section_name: "",
  unit: "",
  ref_range: "",
  ref_min: "",
  ref_max: "",
  report_type: "numeric",
  loinc_code: "",
};

export default function Tests() {
  const [tab, setTab] = useState<"tests" | "packages">("tests");
  const [tests, setTests] = useState<TestRow[]>([]);
  const [packages, setPackages] = useState<(PackageRow & { test_count: number })[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const [testForm, setTestForm] = useState<TestForm>(EMPTY_TEST);
  const [editingTest, setEditingTest] = useState<TestRow | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testError, setTestError] = useState("");
  const [busy, setBusy] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [paramTest, setParamTest] = useState<TestRow | null>(null);
  const [testParams, setTestParams] = useState<TestParameterRow[]>([]);
  const [paramForm, setParamForm] = useState<ParameterForm>(EMPTY_PARAMETER);
  const [editingParam, setEditingParam] = useState<TestParameterRow | null>(null);
  const [paramError, setParamError] = useState("");

  const [pkgForm, setPkgForm] = useState({
    name: "",
    price: "",
    gst: "0",
    is_active: true,
    testIds: [] as string[],
  });
  const [editingPkg, setEditingPkg] = useState<PackageRow | null>(null);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [pkgError, setPkgError] = useState("");
  const [pkgQuery, setPkgQuery] = useState("");

  const load = async () => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    setTests(
      await db.all<TestRow>(
        `SELECT * FROM tests WHERE deleted = 0 ${tenantClause} ORDER BY category, name`,
        tenantParams
      )
    );
    setPackages(
      await db.all<PackageRow & { test_count: number }>(
        `SELECT p.*, (SELECT COUNT(*) FROM package_items pi WHERE pi.package_id = p.id AND pi.deleted = 0) AS test_count
         FROM packages p WHERE p.deleted = 0 ${tenantClause} ORDER BY p.name`,
        tenantParams
      )
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = tests.filter((t) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
    const matchC = category === "all" || t.category === category;
    return matchQ && matchC;
  });

  // ---- Test save ----
  const openNewTest = () => {
    setEditingTest(null);
    setTestForm(EMPTY_TEST);
    setTestError("");
    setTestOpen(true);
  };

  const openEditTest = (t: TestRow) => {
    setEditingTest(t);
    setTestForm({
      code: t.code,
      name: t.name,
      category: t.category,
      price: String(t.price_paise / 100),
      gst: String(t.gst_rate_bp / 100),
      sac_code: t.sac_code,
      unit: t.unit,
      ref_range: t.ref_range,
      ref_min: t.ref_min == null ? "" : String(t.ref_min),
      ref_max: t.ref_max == null ? "" : String(t.ref_max),
      report_type: t.report_type,
      is_active: t.is_active === 1,
      specimen_type: t.specimen_type,
      container_type: t.container_type,
      department: t.department,
      method: t.method,
      loinc_code: t.loinc_code,
    });
    setTestError("");
    setTestOpen(true);
  };

  const submitTest = async (e: FormEvent) => {
    e.preventDefault();
    if (!testForm.name.trim()) return setTestError("Test name is required");
    const price = Number(testForm.price || 0);
    if (price < 0 || Number.isNaN(price)) return setTestError("Invalid price");
    setBusy(true);
    setTestError("");
    try {
      const db = await getDb();
      const values = [
        testForm.code.trim(),
        testForm.name.trim(),
        testForm.category,
        rupeesToPaise(price),
        Math.round(Number(testForm.gst || 0) * 100),
        testForm.sac_code.trim(),
        testForm.unit.trim(),
        testForm.ref_range.trim(),
        testForm.ref_min.trim() === "" ? null : Number(testForm.ref_min),
        testForm.ref_max.trim() === "" ? null : Number(testForm.ref_max),
        testForm.report_type,
        testForm.is_active ? 1 : 0,
        testForm.specimen_type.trim(),
        testForm.container_type.trim(),
        testForm.department.trim(),
        testForm.method.trim(),
        testForm.loinc_code.trim(),
      ];
      if (editingTest) {
        const [tenantClause, tenantParams] = tenantAnd();
        await db.run(
          `UPDATE tests SET code=?, name=?, category=?, price_paise=?, gst_rate_bp=?, sac_code=?, unit=?,
             ref_range=?, ref_min=?, ref_max=?, report_type=?, is_active=?,
             specimen_type=?, container_type=?, department=?, method=?, loinc_code=?,
             updated_at=?, dirty=1
           WHERE id=? ${tenantClause}`,
          [...values, now(), editingTest.id, ...tenantParams]
        );
      } else {
        await db.run(
          `INSERT INTO tests (id, code, name, category, price_paise, gst_rate_bp, sac_code, unit,
             ref_range, ref_min, ref_max, report_type, is_active, specimen_type, container_type,
             department, method, loinc_code, created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,?)`,
          [
            uuid(),
            ...values,
            now(),
            now(),
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
      }
      setTestOpen(false);
      await load();
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Could not save test");
    } finally {
      setBusy(false);
    }
  };

  // ---- Report parameter templates ----
  const loadParams = async (testId = paramTest?.id) => {
    if (!testId) return;
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    setTestParams(
      await db.all<TestParameterRow>(
        `SELECT * FROM test_parameters
         WHERE test_id = ? AND deleted = 0 ${tenantClause}
         ORDER BY sort_order, name`,
        [testId, ...tenantParams]
      )
    );
  };

  const openParams = async (t: TestRow) => {
    setParamTest(t);
    setEditingParam(null);
    setParamForm(EMPTY_PARAMETER);
    setParamError("");
    setTestParams([]);
    setParamsOpen(true);
    try {
      await loadParams(t.id);
    } catch (err) {
      setParamError(err instanceof Error ? err.message : "Could not load parameters");
    }
  };

  const saveParam = async (e: FormEvent) => {
    e.preventDefault();
    if (!paramTest) return;
    if (!paramForm.name.trim()) return setParamError("Parameter name is required");
    const refMin = paramForm.ref_min.trim() === "" ? null : Number(paramForm.ref_min);
    const refMax = paramForm.ref_max.trim() === "" ? null : Number(paramForm.ref_max);
    if ((refMin !== null && !Number.isFinite(refMin)) || (refMax !== null && !Number.isFinite(refMax))) {
      return setParamError("Normal minimum and maximum must be valid numbers");
    }
    if (refMin !== null && refMax !== null && refMin > refMax) {
      return setParamError("Normal minimum cannot be greater than normal maximum");
    }

    setBusy(true);
    setParamError("");
    try {
      const db = await getDb();
      const ts = now();
      const values = [
        paramForm.name.trim(),
        paramForm.section_name.trim(),
        paramForm.unit.trim(),
        paramForm.ref_range.trim(),
        refMin,
        refMax,
        paramForm.report_type,
        paramForm.loinc_code.trim(),
      ];
      if (editingParam) {
        const [tenantClause, tenantParams] = tenantAnd();
        await db.run(
          `UPDATE test_parameters
           SET name = ?, section_name = ?, unit = ?, ref_range = ?, ref_min = ?,
               ref_max = ?, report_type = ?, loinc_code = ?, updated_at = ?, dirty = 1
           WHERE id = ? ${tenantClause}`,
          [...values, ts, editingParam.id, ...tenantParams]
        );
      } else {
        const sortOrder = testParams.reduce((max, p) => Math.max(max, p.sort_order), -1) + 1;
        await db.run(
          `INSERT INTO test_parameters
             (id, test_id, name, section_name, sort_order, unit, ref_range, ref_min,
              ref_max, report_type, loinc_code, options, is_active, created_at,
              updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,'[]',1,?,?,?,1,0,?)`,
          [
            uuid(),
            paramTest.id,
            paramForm.name.trim(),
            paramForm.section_name.trim(),
            sortOrder,
            paramForm.unit.trim(),
            paramForm.ref_range.trim(),
            refMin,
            refMax,
            paramForm.report_type,
            paramForm.loinc_code.trim(),
            ts,
            ts,
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
      }
      setEditingParam(null);
      setParamForm(EMPTY_PARAMETER);
      await loadParams(paramTest.id);
    } catch (err) {
      setParamError(err instanceof Error ? err.message : "Could not save parameter");
    } finally {
      setBusy(false);
    }
  };

  const editParam = (p: TestParameterRow) => {
    setEditingParam(p);
    setParamForm({
      name: p.name,
      section_name: p.section_name,
      unit: p.unit,
      ref_range: p.ref_range,
      ref_min: p.ref_min == null ? "" : String(p.ref_min),
      ref_max: p.ref_max == null ? "" : String(p.ref_max),
      report_type: p.report_type === "numeric" ? "numeric" : "text",
      loinc_code: p.loinc_code,
    });
    setParamError("");
  };

  const deleteParam = async (p: TestParameterRow) => {
    if (!window.confirm(`Remove “${p.name}” from this test? Existing reports will keep their results.`)) return;
    setBusy(true);
    setParamError("");
    try {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      await db.run(
        `UPDATE test_parameters SET deleted = 1, updated_at = ?, dirty = 1
         WHERE id = ? ${tenantClause}`,
        [now(), p.id, ...tenantParams]
      );
      if (editingParam?.id === p.id) {
        setEditingParam(null);
        setParamForm(EMPTY_PARAMETER);
      }
      await loadParams(p.test_id);
    } catch (err) {
      setParamError(err instanceof Error ? err.message : "Could not remove parameter");
    } finally {
      setBusy(false);
    }
  };

  // ---- Package save ----
  const openNewPkg = () => {
    setEditingPkg(null);
    setPkgForm({ name: "", price: "", gst: "0", is_active: true, testIds: [] });
    setPkgError("");
    setPkgQuery("");
    setPkgOpen(true);
  };

  const openEditPkg = async (p: PackageRow) => {
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    const items = await db.all<PackageItemRow>(
      `SELECT * FROM package_items WHERE package_id = ? AND deleted = 0 ${tenantClause}`,
      [p.id, ...tenantParams]
    );
    setEditingPkg(p);
    setPkgForm({
      name: p.name,
      price: String(p.price_paise / 100),
      gst: String(p.gst_rate_bp / 100),
      is_active: p.is_active === 1,
      testIds: items.map((i) => i.test_id),
    });
    setPkgError("");
    setPkgQuery("");
    setPkgOpen(true);
  };

  const togglePkgTest = (id: string) => {
    setPkgForm((f) => ({
      ...f,
      testIds: f.testIds.includes(id)
        ? f.testIds.filter((x) => x !== id)
        : [...f.testIds, id],
    }));
  };

  const submitPkg = async (e: FormEvent) => {
    e.preventDefault();
    if (!pkgForm.name.trim()) return setPkgError("Package name is required");
    if (pkgForm.testIds.length === 0)
      return setPkgError("Select at least one test for the package");
    setBusy(true);
    setPkgError("");
    try {
      const db = await getDb();
      const pkgId = editingPkg?.id ?? uuid();
      const price = rupeesToPaise(Number(pkgForm.price || 0));
      const gstBp = Math.round(Number(pkgForm.gst || 0) * 100);
      if (editingPkg) {
        const [tenantClause, tenantParams] = tenantAnd();
        await db.run(
          `UPDATE packages SET name=?, price_paise=?, gst_rate_bp=?, is_active=?, updated_at=?, dirty=1
           WHERE id=? ${tenantClause}`,
          [pkgForm.name.trim(), price, gstBp, pkgForm.is_active ? 1 : 0, now(), pkgId, ...tenantParams]
        );
        await db.run(
          `UPDATE package_items SET deleted=1, updated_at=?, dirty=1
           WHERE package_id=? AND deleted=0 ${tenantClause}`,
          [now(), pkgId, ...tenantParams]
        );
      } else {
        await db.run(
          `INSERT INTO packages (id, name, price_paise, gst_rate_bp, is_active, created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,?,?,1,0,?)`,
          [
            pkgId,
            pkgForm.name.trim(),
            price,
            gstBp,
            pkgForm.is_active ? 1 : 0,
            now(),
            now(),
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
      }
      for (const testId of pkgForm.testIds) {
        await db.run(
          `INSERT INTO package_items (id, package_id, test_id, created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,?,?,1,0,?)`,
          [
            uuid(),
            pkgId,
            testId,
            now(),
            now(),
            getDeviceId(),
            getCurrentTenantId(),
          ]
        );
      }
      setPkgOpen(false);
      await load();
    } catch (err) {
      setPkgError(err instanceof Error ? err.message : "Could not save package");
    } finally {
      setBusy(false);
    }
  };

  const categories = ["all", ...new Set(tests.map((t) => t.category))];
  const pkgTests = tests.filter(
    (t) =>
      t.is_active === 1 &&
      (!pkgQuery.trim() ||
        t.name.toLowerCase().includes(pkgQuery.trim().toLowerCase()))
  );

  return (
    <>
      <PageHeader
        title="Tests & Packages"
        subtitle="Your rate list — prices and GST are used on every invoice"
        actions={
          tab === "tests" ? (
            <Btn variant="primary" onClick={openNewTest}>
              <Icon name="plus" className="h-4 w-4" /> New test
            </Btn>
          ) : (
            <Btn variant="primary" onClick={openNewPkg}>
              <Icon name="plus" className="h-4 w-4" /> New package
            </Btn>
          )
        }
      />

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-200/60 p-1 text-sm sm:inline-flex">
        {(["tests", "packages"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-1.5 font-medium capitalize transition-colors sm:flex-none ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t} ({t === "tests" ? tests.length : packages.length})
          </button>
        ))}
      </div>

      {tab === "tests" ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tests…"
              className="max-w-xs"
            />
            <div className="flex gap-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    category === c
                      ? "bg-teal-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              message="No tests yet"
              hint="Add your pathology & X-ray tests with prices — the billing screen uses this list."
              action={
                <Btn variant="primary" onClick={openNewTest}>
                  <Icon name="plus" className="h-4 w-4" /> Add first test
                </Btn>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Test</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-right">GST</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="num px-4 py-2.5 text-slate-500">{t.code || "—"}</td>
                      <td className="px-4 py-2.5 font-medium">{t.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{t.category}</td>
                      <td className="num px-4 py-2.5 text-right">
                        {t.price_paise === 0 ? (
                          <span className="text-amber-700">Set price</span>
                        ) : (
                          formatINR(t.price_paise)
                        )}
                      </td>
                      <td className="num px-4 py-2.5 text-right text-slate-600">
                        {t.gst_rate_bp / 100}%
                      </td>
                      <td className="px-4 py-2.5">
                        {t.is_active ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Btn variant="ghost" onClick={() => void openParams(t)}>
                          Parameters
                        </Btn>
                        <Btn variant="ghost" onClick={() => openEditTest(t)}>
                          <Icon name="edit" className="h-4 w-4" /> Edit
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          {packages.length === 0 ? (
            <EmptyState
              message="No packages yet"
              hint="Bundle tests at a single price — e.g. Full Body Checkup."
              action={
                <Btn variant="primary" onClick={openNewPkg}>
                  <Icon name="plus" className="h-4 w-4" /> Create package
                </Btn>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {packages.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.test_count} test{p.test_count === 1 ? "" : "s"} · GST{" "}
                      {p.gst_rate_bp / 100}% ·{" "}
                      {p.is_active ? "Active" : "Hidden"}
                    </p>
                  </div>
                  <p className="num font-semibold">
                    {p.price_paise === 0 ? (
                      <span className="text-amber-700">Set price</span>
                    ) : (
                      formatINR(p.price_paise)
                    )}
                  </p>
                  <Btn variant="ghost" onClick={() => void openEditPkg(p)}>
                    <Icon name="edit" className="h-4 w-4" /> Edit
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Test modal */}
      <Modal
        open={testOpen}
        title={editingTest ? "Edit test" : "New test"}
        onClose={() => setTestOpen(false)}
        wide
      >
        <form onSubmit={submitTest} className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Test name *" className="sm:col-span-2">
            <TextInput
              value={testForm.name}
              onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
              autoFocus
              placeholder="e.g. Complete Blood Count (CBC)"
            />
          </Labeled>
          <Labeled label="Code">
            <TextInput
              value={testForm.code}
              onChange={(e) => setTestForm({ ...testForm, code: e.target.value })}
              placeholder="e.g. CBC"
            />
          </Labeled>
          <Labeled label="Category">
            <Select
              value={testForm.category}
              onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
            >
              <option>Pathology</option>
              <option>X-Ray</option>
              <option>Other</option>
            </Select>
          </Labeled>
          <Labeled label="Price (₹) *" hint="Per test, before tax">
            <TextInput
              value={testForm.price}
              onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
              inputMode="decimal"
              placeholder="0.00"
            />
          </Labeled>
          <Labeled label="GST %">
            <Select
              value={testForm.gst}
              onChange={(e) => setTestForm({ ...testForm, gst: e.target.value })}
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
            </Select>
          </Labeled>
          <Labeled label="SAC / HSN code" hint="999316 is common for lab services">
            <TextInput
              value={testForm.sac_code}
              onChange={(e) => setTestForm({ ...testForm, sac_code: e.target.value })}
            />
          </Labeled>
          <Labeled label="Department" hint="Used in reports and quality review">
            <TextInput
              value={testForm.department}
              onChange={(e) => setTestForm({ ...testForm, department: e.target.value })}
              placeholder="e.g. Haematology"
            />
          </Labeled>
          <Labeled label="Specimen type">
            <TextInput
              value={testForm.specimen_type}
              onChange={(e) => setTestForm({ ...testForm, specimen_type: e.target.value })}
              placeholder="e.g. Whole Blood, Serum, Urine"
            />
          </Labeled>
          <Labeled label="Container">
            <TextInput
              value={testForm.container_type}
              onChange={(e) => setTestForm({ ...testForm, container_type: e.target.value })}
              placeholder="e.g. EDTA lavender top"
            />
          </Labeled>
          <Labeled label="Method">
            <TextInput
              value={testForm.method}
              onChange={(e) => setTestForm({ ...testForm, method: e.target.value })}
              placeholder="e.g. Immunoturbidimetry"
            />
          </Labeled>
          <Labeled label="Test LOINC code" hint="Panel/test-level CLCI or LOINC mapping">
            <TextInput
              value={testForm.loinc_code}
              onChange={(e) => setTestForm({ ...testForm, loinc_code: e.target.value })}
              placeholder="e.g. 24331-1"
              className="num"
            />
          </Labeled>
          <Labeled label="Unit">
            <TextInput
              value={testForm.unit}
              onChange={(e) => setTestForm({ ...testForm, unit: e.target.value })}
              placeholder="e.g. mg/dL, cells/cmm"
            />
          </Labeled>
          <Labeled label="Reference range" className="sm:col-span-2">
            <TextInput
              value={testForm.ref_range}
              onChange={(e) =>
                setTestForm({ ...testForm, ref_range: e.target.value })
              }
              placeholder="e.g. 4.0 – 11.0 (age dependent)"
            />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Normal min" hint="For abnormal flagging">
              <TextInput
                value={testForm.ref_min}
                onChange={(e) => setTestForm({ ...testForm, ref_min: e.target.value })}
                inputMode="decimal"
              />
            </Labeled>
            <Labeled label="Normal max">
              <TextInput
                value={testForm.ref_max}
                onChange={(e) => setTestForm({ ...testForm, ref_max: e.target.value })}
                inputMode="decimal"
              />
            </Labeled>
          </div>
          <Labeled label="Report type">
            <Select
              value={testForm.report_type}
              onChange={(e) =>
                setTestForm({
                  ...testForm,
                  report_type: e.target.value as "text" | "numeric",
                })
              }
            >
              <option value="text">Text / descriptive (X-ray etc.)</option>
              <option value="numeric">Numeric value</option>
            </Select>
          </Labeled>
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={testForm.is_active}
              onChange={(e) =>
                setTestForm({ ...testForm, is_active: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 accent-teal-700"
            />
            Active (available for billing)
          </label>
          <div className="sm:col-span-2">
            <ErrorNote message={testError} />
          </div>
          <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
            <Btn onClick={() => setTestOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : editingTest ? "Save changes" : "Add test"}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* Report parameter template modal */}
      <Modal
        open={paramsOpen}
        title={paramTest ? `Report parameters — ${paramTest.name}` : "Report parameters"}
        onClose={() => setParamsOpen(false)}
        wide
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">
              Define the parameters available when reporting this test. The pathologist
              can select which ones to include and adjust their units or reference ranges
              for each patient.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Review starter reference intervals against your analyser, method, and local
              population before clinical use.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-3 py-2">Parameter</th>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Reference range</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {testParams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      No parameters yet. Add the first one below, or leave this test
                      without parameters for a single free-text result.
                    </td>
                  </tr>
                ) : (
                  testParams.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {p.section_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{p.unit || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{p.ref_range || "—"}</td>
                      <td className="px-3 py-2 capitalize text-slate-600">{p.report_type}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Btn variant="ghost" onClick={() => editParam(p)}>Edit</Btn>
                        <Btn variant="ghost" onClick={() => void deleteParam(p)} disabled={busy}>
                          Remove
                        </Btn>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={saveParam} className="space-y-3 rounded-lg bg-slate-50 p-3">
            <h3 className="text-sm font-semibold">
              {editingParam ? `Edit ${editingParam.name}` : "Add parameter"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Parameter name *">
                <TextInput
                  value={paramForm.name}
                  onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
                  placeholder="e.g. Haemoglobin"
                />
              </Labeled>
              <Labeled
                label="Report section"
                hint="Optional heading, e.g. Differential Leucocyte Count"
              >
                <TextInput
                  value={paramForm.section_name}
                  onChange={(e) =>
                    setParamForm({ ...paramForm, section_name: e.target.value })
                  }
                  placeholder="e.g. Complete Blood Count"
                />
              </Labeled>
              <Labeled label="Result type">
                <Select
                  value={paramForm.report_type}
                  onChange={(e) =>
                    setParamForm({
                      ...paramForm,
                      report_type: e.target.value as "text" | "numeric",
                    })
                  }
                >
                  <option value="numeric">Numeric</option>
                  <option value="text">Text / descriptive</option>
                </Select>
              </Labeled>
              <Labeled label="Default unit">
                <TextInput
                  value={paramForm.unit}
                  onChange={(e) => setParamForm({ ...paramForm, unit: e.target.value })}
                  placeholder="e.g. g/dL"
                />
              </Labeled>
              <Labeled label="Default reference range">
                <TextInput
                  value={paramForm.ref_range}
                  onChange={(e) => setParamForm({ ...paramForm, ref_range: e.target.value })}
                  placeholder="e.g. 12.0 – 16.0"
                />
              </Labeled>
              <Labeled label="LOINC code" hint="From CLCI/LOINC where available">
                <TextInput
                  value={paramForm.loinc_code}
                  onChange={(e) => setParamForm({ ...paramForm, loinc_code: e.target.value })}
                  placeholder="e.g. 718-7"
                  className="num"
                />
              </Labeled>
              <Labeled label="Normal minimum" hint="Optional abnormal flag">
                <TextInput
                  value={paramForm.ref_min}
                  onChange={(e) => setParamForm({ ...paramForm, ref_min: e.target.value })}
                  inputMode="decimal"
                />
              </Labeled>
              <Labeled label="Normal maximum" hint="Optional abnormal flag">
                <TextInput
                  value={paramForm.ref_max}
                  onChange={(e) => setParamForm({ ...paramForm, ref_max: e.target.value })}
                  inputMode="decimal"
                />
              </Labeled>
            </div>
            <ErrorNote message={paramError} />
            <div className="flex justify-end gap-2">
              {editingParam && (
                <Btn
                  onClick={() => {
                    setEditingParam(null);
                    setParamForm(EMPTY_PARAMETER);
                    setParamError("");
                  }}
                >
                  Cancel edit
                </Btn>
              )}
              <Btn type="submit" variant="primary" disabled={busy}>
                {busy ? "Saving…" : editingParam ? "Save parameter" : "Add parameter"}
              </Btn>
            </div>
          </form>
        </div>
      </Modal>

      {/* Package modal */}
      <Modal
        open={pkgOpen}
        title={editingPkg ? "Edit package" : "New package"}
        onClose={() => setPkgOpen(false)}
        wide
      >
        <form onSubmit={submitPkg} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Labeled label="Package name *" className="sm:col-span-2">
              <TextInput
                value={pkgForm.name}
                onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                autoFocus
                placeholder="e.g. Full Body Checkup"
              />
            </Labeled>
            <Labeled label="Price (₹) *">
              <TextInput
                value={pkgForm.price}
                onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })}
                inputMode="decimal"
              />
            </Labeled>
            <Labeled label="GST %">
              <Select
                value={pkgForm.gst}
                onChange={(e) => setPkgForm({ ...pkgForm, gst: e.target.value })}
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
              </Select>
            </Labeled>
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={pkgForm.is_active}
                onChange={(e) =>
                  setPkgForm({ ...pkgForm, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 accent-teal-700"
              />
              Active
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">
              Tests in this package ({pkgForm.testIds.length} selected)
            </p>
            <TextInput
              value={pkgQuery}
              onChange={(e) => setPkgQuery(e.target.value)}
              placeholder="Filter tests…"
              className="mb-2"
            />
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
              {pkgTests.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-slate-400">
                  No tests to add — create tests first.
                </p>
              )}
              {pkgTests.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={pkgForm.testIds.includes(t.id)}
                    onChange={() => togglePkgTest(t.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                  />
                  <span className="flex-1">{t.name}</span>
                  <span className="num text-xs text-slate-400">
                    {formatINR(t.price_paise)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <ErrorNote message={pkgError} />
          <div className="flex justify-end gap-2 pt-1">
            <Btn onClick={() => setPkgOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : editingPkg ? "Save changes" : "Create package"}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
