// Assigns printable report sections to starter and custom panel parameters.
//
// Sections are stored on both the reusable template (test_parameters) and the
// per-patient snapshot (report_parameters). Existing non-blank sections are
// never overwritten, so an administrator can rename a section locally.

export interface StarterSectionStore {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

interface SectionTest {
  id: string;
  code: string;
  name: string;
}

interface SectionParameter {
  id: string;
  test_id: string;
  name: string;
  section_name: string;
}

const DIFF = new Set([
  "neutrophils",
  "lymphocytes",
  "eosinophils",
  "monocytes",
  "basophils",
]);

const EXACT: Record<string, Record<string, string>> = {
  CBC: Object.fromEntries(
    [...DIFF].map((name) => [name, "Differential Leucocyte Count"])
  ),
  LFT: {
    "bilirubin total": "Bilirubin",
    "bilirubin direct": "Bilirubin",
    "bilirubin indirect": "Bilirubin",
    "sgot (ast)": "Liver Enzymes",
    "sgpt (alt)": "Liver Enzymes",
    "alkaline phosphatase": "Liver Enzymes",
    "gamma gt (ggt)": "Liver Enzymes",
    "total protein": "Proteins",
    "albumin": "Proteins",
    "globulin": "Proteins",
    "albumin / globulin ratio": "Proteins",
  },
  KFT: {
    "blood urea": "Renal Profile",
    "blood urea nitrogen (bun)": "Renal Profile",
    "serum creatinine": "Renal Profile",
    "uric acid": "Renal Profile",
    "sodium": "Electrolytes",
    "potassium": "Electrolytes",
    "chloride": "Electrolytes",
    "calcium": "Minerals",
    "phosphorus": "Minerals",
  },
  URINE: {
    "colour": "Physical Examination",
    "appearance": "Physical Examination",
    "specific gravity": "Physical Examination",
    "ph": "Chemical Examination",
    "protein": "Chemical Examination",
    "glucose": "Chemical Examination",
    "ketones": "Chemical Examination",
    "blood": "Chemical Examination",
    "bilirubin": "Chemical Examination",
    "urobilinogen": "Chemical Examination",
    "nitrite": "Chemical Examination",
    "leucocyte esterase": "Chemical Examination",
    "pus cells": "Microscopy",
    "red blood cells": "Microscopy",
    "epithelial cells": "Microscopy",
    "casts": "Microscopy",
    "crystals": "Microscopy",
    "bacteria": "Microscopy",
  },
  SEMEN: {
    "volume": "Physical Examination",
    "ph": "Physical Examination",
    "liquefaction time": "Physical Examination",
    "sperm count": "Sperm Analysis",
    "total motility": "Sperm Analysis",
    "progressive motility": "Sperm Analysis",
    "normal morphology": "Sperm Analysis",
    "leucocytes": "Sperm Analysis",
  },
  STOOL: {
    "colour": "Physical Examination",
    "consistency": "Physical Examination",
    "occult blood": "Occult Blood",
    "ova / cyst": "Microscopy",
    "pus cells": "Microscopy",
    "epithelial cells": "Microscopy",
  },
  WIDAL: {
    "interpretation": "Interpretation",
  },
  ABG: {
    "ph": "Acid-Base & Oxygenation",
    "pco2": "Acid-Base & Oxygenation",
    "po2": "Acid-Base & Oxygenation",
    "hco3": "Acid-Base & Oxygenation",
    "base excess": "Acid-Base & Oxygenation",
    "o2 saturation": "Acid-Base & Oxygenation",
    "lactate": "Metabolites",
    "sodium": "Electrolytes",
    "potassium": "Electrolytes",
    "ionised calcium": "Electrolytes",
    "glucose": "Metabolites",
    "fio2": "Oxygenation",
    "interpretation": "Interpretation",
  },
  CSFA: {
    "appearance": "Physical & Chemical",
    "protein": "Physical & Chemical",
    "glucose": "Physical & Chemical",
    "cell count": "Microscopy",
    "polymorphs": "Microscopy",
    "lymphocytes": "Microscopy",
    "chloride": "Special Tests",
    "ada": "Special Tests",
  },
  PLEURA: {
    "appearance": "Physical & Chemical",
    "protein": "Physical & Chemical",
    "glucose": "Physical & Chemical",
    "cell count": "Microscopy",
    "polymorphs": "Microscopy",
    "lymphocytes": "Microscopy",
    "ldh": "Special Tests",
    "ada": "Special Tests",
  },
  ASCITES: {
    "appearance": "Physical & Chemical",
    "protein": "Physical & Chemical",
    "glucose": "Physical & Chemical",
    "cell count": "Microscopy",
    "polymorphs": "Microscopy",
    "lymphocytes": "Microscopy",
    "serum-ascites albumin gradient": "Special Tests",
  },
  SYNOVIAL: {
    "appearance": "Physical & Chemical",
    "protein": "Physical & Chemical",
    "glucose": "Physical & Chemical",
    "leucocyte count": "Microscopy",
    "polymorphs": "Microscopy",
    "crystals": "Microscopy",
  },
};

const DEFAULT_SECTION: Record<string, string> = {
  CBC: "Complete Blood Count",
  DC: "Differential Leucocyte Count",
  LFT: "Liver Function Test",
  KFT: "Kidney Function Test",
  LIPID: "Lipid Profile",
  URINE: "Urine Routine",
  PTINR: "Coagulation Profile",
  BGRH: "Blood Group & Rh",
  DENGUE: "Dengue Serology",
  WIDAL: "Widal Agglutination",
  SEMEN: "Semen Analysis",
  STOOL: "Stool Routine",
  ABG: "Arterial Blood Gas",
  BLOODC: "Culture & Sensitivity",
  URINEC: "Culture & Sensitivity",
  PUSC: "Culture & Sensitivity",
  SPUTUMC: "Culture & Sensitivity",
  THROATC: "Culture & Sensitivity",
  CSFC: "Culture & Sensitivity",
  WOUNDC: "Culture & Sensitivity",
  STOOLC: "Culture & Sensitivity",
  FUNGC: "Culture & Sensitivity",
  CULTUREAS: "Culture & Sensitivity",
};

function sectionFor(
  code: string,
  testName: string,
  parameterName: string,
  isMultiParameter: boolean
): string {
  if (!isMultiParameter) return "";
  const testCode = code.trim().toUpperCase();
  const key = parameterName.trim().toLowerCase();
  return (
    EXACT[testCode]?.[key] ??
    DEFAULT_SECTION[testCode] ??
    testName
  );
}

export async function ensureStarterSections(
  store: StarterSectionStore
): Promise<void> {
  const tenants = await store.all<{ id: string }>(
    "SELECT id FROM tenants WHERE deleted = 0"
  );
  const ts = Date.now();

  for (const tenant of tenants) {
    const tests = await store.all<SectionTest>(
      `SELECT id, code, name FROM tests
       WHERE tenant_id = ? AND deleted = 0`,
      [tenant.id]
    );
    if (tests.length === 0) continue;
    const testById = new Map(tests.map((test) => [test.id, test]));

    const parameters = await store.all<SectionParameter>(
      `SELECT id, test_id, name, section_name
       FROM test_parameters
       WHERE tenant_id = ? AND deleted = 0`,
      [tenant.id]
    );
    const counts = new Map<string, number>();
    for (const parameter of parameters) {
      counts.set(parameter.test_id, (counts.get(parameter.test_id) ?? 0) + 1);
    }

    for (const parameter of parameters) {
      if (parameter.section_name.trim()) continue;
      const test = testById.get(parameter.test_id);
      if (!test) continue;
      const section = sectionFor(
        test.code,
        test.name,
        parameter.name,
        (counts.get(test.id) ?? 0) > 1
      );
      if (!section) continue;
      await store.run(
        `UPDATE test_parameters
         SET section_name = ?, updated_at = ?, dirty = 1
         WHERE id = ? AND tenant_id = ? AND deleted = 0`,
        [section, ts, parameter.id, tenant.id]
      );
    }

    // Existing report snapshots keep their result values, but may not have a
    // section yet. Fill it from the current template for printable grouping.
    await store.run(
      `UPDATE report_parameters
       SET section_name = COALESCE((
             SELECT tp.section_name
             FROM test_parameters tp
             WHERE tp.id = report_parameters.parameter_id
               AND tp.tenant_id = report_parameters.tenant_id
               AND tp.deleted = 0
           ), ''),
           updated_at = ?,
           dirty = 1
       WHERE tenant_id = ? AND deleted = 0 AND section_name = ''
         AND EXISTS (
           SELECT 1 FROM test_parameters tp
           WHERE tp.id = report_parameters.parameter_id
             AND tp.tenant_id = report_parameters.tenant_id
             AND tp.deleted = 0 AND tp.section_name <> ''
         )`,
      [ts, tenant.id]
    );
  }
}
