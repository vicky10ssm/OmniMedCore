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

/**
 * Multi-parameter panel templates keyed by test code.
 * Tests not listed here receive one parameter named after the test.
 */
export const STARTER_PARAMETERS: Record<string, StarterParameter[]> = {
  DC: [
    n("Neutrophils", "%"),
    n("Lymphocytes", "%"),
    n("Eosinophils", "%"),
    n("Monocytes", "%"),
    n("Basophils", "%"),
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
