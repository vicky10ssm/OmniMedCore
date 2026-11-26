// Starter parameters for pathology tests.
//
// Panels get their component parameters. Single-analyte tests get one
// parameter named after the test, preserving the normal result/unit/range
// workflow. Reference intervals are blank for newly seeded panels; the
// laboratory must validate them locally before clinical use.
//
// Seeding is additive and idempotent. Existing parameter names are never
// overwritten or resurrected, and tests with recorded results are not reshaped.

import { getDeviceId, now } from "./helpers";
import { deriveReferenceLimits } from "./referenceLimits";

export interface StarterParameterStore {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

interface StarterParameter {
  name: string;
  unit?: string;
  refRange?: string;
  refMin?: number | null;
  refMax?: number | null;
  reportType?: "text" | "numeric" | "select";
}

interface TestForParameters {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  ref_range: string;
  ref_min: number | null;
  ref_max: number | null;
  report_type: "text" | "numeric";
}

const p = (
  name: string,
  unit = "",
  reportType: "text" | "numeric" | "select" = "text"
): StarterParameter => ({ name, unit, reportType });

const n = (name: string, unit = ""): StarterParameter => p(name, unit, "numeric");

const nr = (
  name: string,
  unit: string,
  refRange: string,
  refMin: number,
  refMax: number
): StarterParameter => ({
  name,
  unit,
  refRange,
  refMin,
  refMax,
  reportType: "numeric",
});

/**
 * Multi-parameter panel templates keyed by test code.
 * Tests not listed here receive one parameter named after the test.
 */
export const STARTER_PARAMETERS: Record<string, StarterParameter[]> = {
  CBC: [
    nr(
      "Haemoglobin",
      "g/dL",
      "Adult male: 13.0-17.0 g/dL; adult female: 12.0-15.0 g/dL; children 1-5y: 11.0-14.0 g/dL; children 6-12y: 11.5-15.5 g/dL",
      11,
      17
    ),
    nr("Total Leukocyte Count", "cells/cmm", "Adult: 4,000-11,000 /cmm", 4000, 11000),
    nr("Platelet Count", "cells/cmm", "Adult: 1,50,000-4,50,000 /cmm", 150000, 450000),
    nr(
      "RBC Count",
      "million/cmm",
      "Adult male: 4.5-5.9 million/cmm; adult female: 4.1-5.1 million/cmm; children 1-5y: 4.0-5.5; children 6-12y: 4.0-5.2 million/cmm",
      4.0,
      5.9
    ),
    nr(
      "Haematocrit (HCT)",
      "%",
      "Adult male: 40-52%; adult female: 36-48%; children 1-5y: 33-42%; children 6-12y: 35-45%",
      33,
      52
    ),
    nr("Mean Corpuscular Volume (MCV)", "fL", "Adult: 80-100 fL", 80, 100),
    nr("Mean Corpuscular Haemoglobin (MCH)", "pg", "Adult: 27-32 pg", 27, 32),
    nr("Mean Corpuscular Hb Concentration (MCHC)", "g/dL", "Adult: 32-36 g/dL", 32, 36),
    nr("RDW-CV", "%", "Adult: 11.5-14.5%", 11.5, 14.5),
    nr("RDW-SD", "fL", "Adult: 35-56 fL (analyser-specific)", 35, 56),
    nr("Mean Platelet Volume (MPV)", "fL", "Adult: 7.5-11.5 fL", 7.5, 11.5),
    nr("Platelet Distribution Width (PDW)", "%", "Adult: 9-17% (analyser-specific)", 9, 17),
    nr("Plateletcrit (PCT)", "%", "Adult: 0.19-0.39%", 0.19, 0.39),
    nr("Platelet Large Cell Ratio (P-LCR)", "%", "Adult: 13-43%", 13, 43),
    nr("Platelet Large Cell Count (P-LCC)", "10^3/uL", "Adult: 30-90 x10^3/uL", 30, 90),
    nr("Neutrophils", "%", "Adult: 40-70%", 40, 70),
    nr("Lymphocytes", "%", "Adult: 20-40%", 20, 40),
    nr("Eosinophils", "%", "Adult: 1-6%", 1, 6),
    nr("Monocytes", "%", "Adult: 2-10%", 2, 10),
    nr("Basophils", "%", "Adult: 0-2%", 0, 2),
  ],
  PLT: [
    nr(
      "Platelet Count",
      "cells/cmm",
      "Adult: 1,50,000-4,50,000 /cmm",
      150000,
      450000
    ),
  ],
  DC: [
    n("Neutrophils", "%"),
    n("Lymphocytes", "%"),
    n("Eosinophils", "%"),
    n("Monocytes", "%"),
    n("Basophils", "%"),
  ],
  AEC: [
    nr(
      "Absolute Eosinophil Count",
      "cells/cmm",
      "Adult: 40-440 cells/cmm",
      40,
      440
    ),
  ],
  PTINR: [n("Prothrombin Time", "seconds"), n("INR", "ratio")],
  BGRH: [p("ABO Blood Group"), p("Rh Factor")],
  DENGUE: [
    p("Dengue NS1 Antigen"),
    p("Dengue IgM Antibody"),
    p("Dengue IgG Antibody"),
  ],
  WIDAL: [
    p("S. typhi O"),
    p("S. typhi H"),
    p("S. paratyphi AH"),
    p("S. paratyphi BH"),
    p("S. paratyphi AO"),
    p("S. paratyphi BO"),
    p("S. typhi Vi"),
    p("Interpretation"),
  ],
  UMICRO: [
    n("Pus Cells", "/hpf"),
    n("Red Blood Cells", "/hpf"),
    n("Epithelial Cells", "/hpf"),
    p("Casts"),
    p("Crystals"),
    p("Bacteria"),
  ],
  STOOL: [
    p("Colour"),
    p("Consistency"),
    p("Ova / Cyst"),
    p("Occult Blood"),
    n("Pus Cells", "/hpf"),
    n("Epithelial Cells", "/hpf"),
  ],
  SEMEN: [
    n("Volume", "mL"),
    n("pH"),
    n("Sperm Count", "million/mL"),
    n("Total Motility", "%"),
    n("Progressive Motility", "%"),
    n("Normal Morphology", "%"),
    n("Leucocytes", "million/mL"),
    n("Liquefaction Time", "minutes"),
  ],
  CSFA: [
    p("Appearance"),
    n("Protein", "mg/dL"),
    n("Glucose", "mg/dL"),
    n("Cell Count", "/cmm"),
    n("Polymorphs", "%"),
    n("Lymphocytes", "%"),
    n("Chloride", "mmol/L"),
    n("ADA", "U/L"),
  ],
  PLEURA: [
    p("Appearance"),
    n("Protein", "g/dL"),
    n("Glucose", "mg/dL"),
    n("Cell Count", "/cmm"),
    n("Polymorphs", "%"),
    n("Lymphocytes", "%"),
    n("LDH", "U/L"),
    n("ADA", "U/L"),
  ],
  ASCITES: [
    p("Appearance"),
    n("Protein", "g/dL"),
    n("Glucose", "mg/dL"),
    n("Cell Count", "/cmm"),
    n("Polymorphs", "%"),
    n("Lymphocytes", "%"),
    n("Serum-Ascites Albumin Gradient", "g/dL"),
  ],
  SYNOVIAL: [
    p("Appearance"),
    n("Leucocyte Count", "/cmm"),
    n("Polymorphs", "%"),
    n("Protein", "g/dL"),
    n("Glucose", "mg/dL"),
    p("Crystals"),
  ],
  ABG: [
    n("pH"),
    n("pCO2", "mmHg"),
    n("pO2", "mmHg"),
    n("HCO3", "mmol/L"),
    n("Base Excess", "mmol/L"),
    n("O2 Saturation", "%"),
    n("Lactate", "mmol/L"),
    n("Sodium", "mmol/L"),
    n("Potassium", "mmol/L"),
    n("Ionised Calcium", "mmol/L"),
    n("Glucose", "mg/dL"),
    n("FiO2", "%"),
    p("Interpretation"),
  ],
  HBELEC: [p("Haemoglobin Pattern"), p("Interpretation")],
  ANA: [p("ANA Pattern"), p("ANA Titre")],
  AFB: [p("AFB Result"), p("Grading")],
  GRAM: [p("Gram Stain Result"), p("Organism Seen")],
  KOH: [p("KOH Result"), p("Fungal Elements")],
  CULTUREAS: [p("Organism Isolated"), p("Antibiotic Sensitivity")],
  MPS: [
    p("Parasite Species"),
    p("Parasite Stage"),
    n("Parasite Density", "/uL"),
    n("RBC Parasitised", "%"),
    p("Interpretation"),
  ],
  QBC: [
    p("Parasite Species"),
    p("Parasite Stage"),
    n("Parasite Density", "/uL"),
    n("RBC Parasitised", "%"),
    p("Interpretation"),
  ],
  MANTOUX: [
    nr(
      "Induration",
      "mm",
      "0-4 mm (non-reactive); >=5 mm interpret by risk group",
      0,
      4
    ),
    p("Interpretation"),
  ],
  MPAG: [p("Pf Antigen"), p("Pan Antigen"), p("Interpretation")],
  VDRL: [p("VDRL Result"), p("VDRL Titre")],
  TPHA: [p("TPHA Result"), p("TPHA Titre")],
  PSMEAR: [
    p("RBC Morphology"),
    p("WBC Morphology"),
    p("Platelet Morphology"),
    p("Impression"),
  ],
  BIOPSY: histopathologyParameters(),
  BIOPSYL: histopathologyParameters(),
  BMA: [
    p("Specimen"),
    p("Cellularity"),
    p("Morphology"),
    p("Impression"),
  ],
  FNAC: [p("Site"), p("Cytology Findings"), p("Diagnosis")],
  PAP: [
    p("Specimen Adequacy"),
    p("Bethesda Interpretation"),
    p("Recommendation"),
  ],
  FLUIDCYT: [p("Specimen"), p("Cytology Findings"), p("Diagnosis")],
  URINECYT: [p("Specimen"), p("Cytology Findings"), p("Diagnosis")],
  SPUTUMCYT: [p("Specimen"), p("Cytology Findings"), p("Diagnosis")],
  IHC: [p("Marker(s)"), p("Result"), p("Interpretation")],
  SPECIAL: [p("Stain"), p("Result"), p("Interpretation")],
  MRSA: [p("MRSA Screen Result"), p("Organism Isolated")],
  VRE: [p("VRE Screen Result"), p("Organism Isolated")],
  OVA: [p("Ova"), p("Cyst")],
  BLOODC: cultureParameters(),
  URINEC: cultureParameters(),
  PUSC: cultureParameters(),
  SPUTUMC: cultureParameters(),
  THROATC: cultureParameters(),
  CSFC: cultureParameters(),
  WOUNDC: cultureParameters(),
  STOOLC: cultureParameters(),
  FUNGC: cultureParameters(),
};

function cultureParameters(): StarterParameter[] {
  return [
    p("Organism Isolated"),
    p("Colony Count"),
    p("Antibiotic Sensitivity"),
  ];
}

function histopathologyParameters(): StarterParameter[] {
  return [
    p("Specimen"),
    p("Gross Examination"),
    p("Microscopic Examination"),
    p("Diagnosis"),
    p("Comment"),
  ];
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parameterId(tenantId: string, testCode: string, name: string): string {
  return `param-seed-${slug(tenantId)}-${slug(testCode)}-${slug(name)}`;
}

/**
 * Adds missing starter parameters to every active tenant.
 *
 * - Tests with existing parameters and recorded results are left unchanged.
 * - Tests with existing parameters but no results can receive newly added
 *   panel components.
 * - Single-result tests with no parameters receive one parameter.
 */
export async function ensureStarterParameters(
  store: StarterParameterStore
): Promise<void> {
  const tenants = await store.all<{ id: string }>(
    "SELECT id FROM tenants WHERE deleted = 0"
  );
  const ts = now();
  const deviceId = getDeviceId();

  for (const tenant of tenants) {
    const tests = await store.all<TestForParameters>(
      `SELECT id, code, name, category, unit, ref_range, ref_min, ref_max,
              report_type
       FROM tests
       WHERE tenant_id = ? AND deleted = 0`,
      [tenant.id]
    );
    if (tests.length === 0) continue;

    // Fresh databases get the CBC test row from SEED_SQL after migrations, so
    // migration 23 cannot rename the legacy PCV/RDW rows there. Normalise the
    // names here before the additive CBC map runs.
    const cbcTest = tests.find((test) => test.code === "CBC");
    if (cbcTest) {
      await store.run(
        `UPDATE test_parameters
         SET name = 'Haematocrit (HCT)',
             ref_range = 'Adult male: 40-52%; adult female: 36-48%; children 1-5y: 33-42%; children 6-12y: 35-45%',
             ref_min = 36,
             ref_max = 52,
             updated_at = ?,
             dirty = 1
         WHERE test_id = ? AND tenant_id = ? AND deleted = 0
           AND lower(name) = 'packed cell volume (pcv)'
           AND NOT EXISTS (
             SELECT 1 FROM test_parameters p2
             WHERE p2.test_id = ? AND p2.tenant_id = ? AND p2.deleted = 0
               AND lower(p2.name) = 'haematocrit (hct)'
           )`,
        [ts, cbcTest.id, tenant.id, cbcTest.id, tenant.id]
      );
      await store.run(
        `UPDATE test_parameters
         SET name = 'RDW-CV', updated_at = ?, dirty = 1
         WHERE test_id = ? AND tenant_id = ? AND deleted = 0
           AND lower(name) = 'red cell distribution width (rdw)'
           AND NOT EXISTS (
             SELECT 1 FROM test_parameters p2
             WHERE p2.test_id = ? AND p2.tenant_id = ? AND p2.deleted = 0
               AND lower(p2.name) = 'rdw-cv'
           )`,
        [ts, cbcTest.id, tenant.id, cbcTest.id, tenant.id]
      );
    }

    // Older standalone Platelet Count rows received the reference text but
    // null numeric limits, so Low/High flags never fired. Fill only missing
    // limits; keep any locally edited reference text.
    const pltTest = tests.find((test) => test.code === "PLT");
    if (pltTest) {
      await store.run(
        `UPDATE test_parameters
         SET ref_min = COALESCE(ref_min, 150000),
             ref_max = COALESCE(ref_max, 450000),
             ref_range = CASE
               WHEN trim(ref_range) = ''
               THEN 'Adult: 1,50,000-4,50,000 /cmm'
               ELSE ref_range
             END,
             updated_at = ?,
             dirty = 1
         WHERE test_id = ? AND tenant_id = ? AND deleted = 0
           AND lower(name) = 'platelet count'`,
        [ts, pltTest.id, tenant.id]
      );
    }

    const existingRows = await store.all<{
      id: string;
      test_id: string;
      name: string;
    }>(
      "SELECT id, test_id, name FROM test_parameters WHERE tenant_id = ?",
      [tenant.id]
    );
    const existingByTest = new Map<string, Map<string, string>>();
    for (const row of existingRows) {
      const names = existingByTest.get(row.test_id) ?? new Map<string, string>();
      names.set(row.name.trim().toLowerCase(), row.id);
      existingByTest.set(row.test_id, names);
    }

    const resultRows = await store.all<{ test_id: string }>(
      `SELECT DISTINCT test_id
       FROM report_orders
       WHERE tenant_id = ? AND deleted = 0
         AND (status IN ('done','verified')
              OR trim(result_text) <> ''
              OR result_value IS NOT NULL)`,
      [tenant.id]
    );
    const hasRecordedResult = new Set(resultRows.map((row) => row.test_id));

    let inserted = 0;
    for (const test of tests) {
      if (test.category === "X-Ray") continue;

      const mapped = STARTER_PARAMETERS[test.code];
      const namesById =
        existingByTest.get(test.id) ?? new Map<string, string>();
      const existingNames = new Set(namesById.keys());

      // Do not add a generic single parameter to a test that already has a
      // panel template. Only known panel maps may extend existing templates.
      if (!mapped && existingNames.size > 0) continue;

      const definitions: StarterParameter[] = mapped ?? [
        {
          name: test.name,
          unit: test.unit,
          refRange: test.ref_range,
          refMin: test.ref_min,
          refMax: test.ref_max,
          reportType: test.report_type,
        },
      ];

      // Preserve the shape of reports that already contain results.
      if (hasRecordedResult.has(test.id)) {
        if (existingNames.size > 0) continue;
        // A historical single-result test can be safely mapped to one parameter.
        if (definitions.length !== 1) continue;
      }

      // A previously seeded generic parameter may be replaced safely by a
      // richer panel when no report has stored a value against it.
      if (mapped && !hasRecordedResult.has(test.id)) {
        const genericName = test.name.trim().toLowerCase();
        const genericId = namesById.get(genericName);
        if (genericId && genericId.startsWith("param-seed-")) {
          const references = await store.all<{ n: number }>(
            `SELECT COUNT(*) AS n FROM report_parameters
             WHERE parameter_id = ? AND deleted = 0 AND tenant_id = ?`,
            [genericId, tenant.id]
          );
          if ((references[0]?.n ?? 0) === 0) {
            await store.run(
              "DELETE FROM test_parameters WHERE id = ? AND tenant_id = ?",
              [genericId, tenant.id]
            );
            namesById.delete(genericName);
            existingNames.delete(genericName);
          }
        }
      }

      for (let index = 0; index < definitions.length; index += 1) {
        const definition = definitions[index];
        const normalizedName = definition.name.trim().toLowerCase();
        if (existingNames.has(normalizedName)) continue;
        try {
          await store.run(
            `INSERT OR IGNORE INTO test_parameters
               (id, test_id, name, sort_order, unit, ref_range, ref_min, ref_max,
                report_type, options, is_active, created_at, updated_at, device_id,
                dirty, deleted, tenant_id)
             VALUES (?,?,?,?,?,?,?,?,?,'[]',1,?,?,?,1,0,?)`,
            [
              parameterId(tenant.id, test.code, definition.name),
              test.id,
              definition.name,
              index,
              definition.unit ?? "",
              definition.refRange ?? "",
              definition.refMin ?? null,
              definition.refMax ?? null,
              definition.reportType ?? "text",
              ts,
              ts,
              deviceId,
              tenant.id,
            ]
          );
          namesById.set(
            normalizedName,
            parameterId(tenant.id, test.code, definition.name)
          );
          existingNames.add(normalizedName);
          inserted += 1;
        } catch (error) {
          console.warn(
            `Could not add starter parameter ${definition.name} for ${test.code}`,
            error
          );
        }
      }
    }

    if (inserted > 0) {
      console.info(
        `Starter pathology parameters: added ${inserted} parameter(s) for tenant ${tenant.id}`
      );
    }
  }
}

/**
 * Known legacy seed pairs whose stored limits predate the printable reference
 * text. Each repair only applies when the row still holds the exact old seeded
 * pair, so a locally edited reference is never overwritten.
 */
const STARTER_LIMIT_REPAIRS = [
  {
    code: "CBC",
    name: "haemoglobin",
    fromMin: 12,
    fromMax: 16,
    toMin: 11,
    toMax: 17,
  },
  {
    code: "CBC",
    name: "rbc count",
    fromMin: 4.2,
    fromMax: 5.9,
    toMin: 4.0,
    toMax: 5.9,
  },
  {
    code: "CBC",
    name: "haematocrit (hct)",
    fromMin: 36,
    fromMax: 52,
    toMin: 33,
    toMax: 52,
  },
  {
    code: "HB",
    name: "haemoglobin",
    fromMin: 12,
    fromMax: 16,
    toMin: 11,
    toMax: 17,
  },
  {
    code: "KFT",
    name: "blood urea",
    fromMin: 17,
    fromMax: 43,
    toMin: 15,
    toMax: 40,
  },
  {
    code: "KFT",
    name: "blood urea nitrogen (bun)",
    fromMin: 8,
    fromMax: 20,
    toMin: 7,
    toMax: 20,
  },
  {
    code: "KFT",
    name: "serum creatinine",
    fromMin: 0.6,
    fromMax: 1.3,
    toMin: 0.3,
    toMax: 1.3,
  },
  {
    code: "KFT",
    name: "uric acid",
    fromMin: 3.5,
    fromMax: 7.2,
    toMin: 2.0,
    toMax: 7.2,
  },
  {
    code: "KFT",
    name: "calcium",
    fromMin: 8.5,
    fromMax: 10.5,
    toMin: 8.6,
    toMax: 10.8,
  },
  {
    code: "KFT",
    name: "phosphorus",
    fromMin: 2.5,
    fromMax: 4.5,
    toMin: 2.5,
    toMax: 7.0,
  },
  {
    code: "LIPID",
    name: "vldl cholesterol",
    fromMin: 10,
    fromMax: 40,
    toMin: 5,
    toMax: 40,
  },
  {
    code: "LFT",
    name: "alkaline phosphatase",
    fromMin: 40,
    fromMax: 130,
    toMin: 40,
    toMax: 400,
  },
  {
    code: "LFT",
    name: "gamma gt (ggt)",
    fromMin: 0,
    fromMax: 50,
    toMin: 0,
    toMax: 55,
  },
] as const;

/**
 * Fills missing numeric limits from the printable reference text.
 *
 * Runs after reference seeding so a fresh database also gets limits. It only
 * touches rows where both limits are null and never overwrites an explicit
 * local limit.
 */
export async function ensureReferenceLimits(
  store: StarterParameterStore
): Promise<void> {
  const tenants = await store.all<{ id: string }>(
    "SELECT id FROM tenants WHERE deleted = 0"
  );
  const ts = now();
  for (const tenant of tenants) {
    const tests = await store.all<{ id: string; code: string }>(
      `SELECT id, code FROM tests
       WHERE tenant_id = ? AND deleted = 0`,
      [tenant.id]
    );
    const testByCode = new Map(tests.map((test) => [test.code, test.id]));

    // Align known legacy seed limits with the displayed reference text. Only
    // the exact old seeded pair is updated, so local edits are preserved.
    for (const repair of STARTER_LIMIT_REPAIRS) {
      const testId = testByCode.get(repair.code);
      if (!testId) continue;
      await store.run(
        `UPDATE test_parameters
         SET ref_min = ?, ref_max = ?, updated_at = ?, dirty = 1
         WHERE test_id = ? AND tenant_id = ? AND deleted = 0
           AND lower(name) = ? AND ref_min = ? AND ref_max = ?`,
        [
          repair.toMin,
          repair.toMax,
          ts,
          testId,
          tenant.id,
          repair.name,
          repair.fromMin,
          repair.fromMax,
        ]
      );
    }

    const missingLimits = await store.all<{ id: string; ref_range: string }>(
      `SELECT id, ref_range FROM test_parameters
       WHERE tenant_id = ? AND deleted = 0 AND report_type = 'numeric'
         AND ref_min IS NULL AND ref_max IS NULL AND trim(ref_range) <> ''`,
      [tenant.id]
    );
    let fixedLimits = 0;
    for (const row of missingLimits) {
      const limits = deriveReferenceLimits(row.ref_range);
      if (!limits) continue;
      await store.run(
        `UPDATE test_parameters
         SET ref_min = ?, ref_max = ?, updated_at = ?, dirty = 1
         WHERE id = ? AND tenant_id = ? AND ref_min IS NULL AND ref_max IS NULL`,
        [limits.refMin, limits.refMax, ts, row.id, tenant.id]
      );
      fixedLimits += 1;
    }
    if (fixedLimits > 0) {
      console.info(
        `Starter reference limits: filled ${fixedLimits} parameter(s) for tenant ${tenant.id}`
      );
    }
  }
}
