// Starter reference intervals for the pathology catalogue.
//
// Reference intervals are clinical starter values, not a substitute for local
// method/age/sex validation. Multi-variant intervals are stored as one compact
// text string, e.g. "Adult male: 13.0-17.0 g/dL; adult female: 12.0-15.0 g/dL".
//
// The seeding is versioned per tenant in `meta`, so it runs once per catalogue
// reference release. It updates only starter-owned parameter rows (`tp-*` and
// `param-seed-*`), never custom parameters.

import { now } from "./helpers";

export interface StarterReferenceStore {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

interface TestForReference {
  id: string;
  code: string;
  name: string;
  category: string;
  department: string;
}

interface ParameterForReference {
  id: string;
  test_id: string;
  name: string;
  unit: string;
  report_type: string;
}

export const STARTER_REFERENCE_VERSION = 3;

/** Shared parameter-name rules. Test-specific overrides take precedence. */
const COMMON: Record<string, string> = {
  "24 hour urine creatinine":
    "Adult male: 1.0-2.0 g/24h; adult female: 0.8-1.8 g/24h",
  "24 hour urine protein": "Adult: <150 mg/24h",
  "abo blood group": "Not applicable (report ABO group)",
  "acth": "Adult morning: 7-63 pg/mL",
  "ada": "Fluid-specific; typical <10 U/L (validate locally)",
  "afb result": "Negative (no AFB seen)",
  "ana pattern": "Negative / no significant pattern",
  "ana titre": "Negative (<1:40); report titre if positive",
  "activated partial thromboplastin time (aptt)": "Adult: 25-35 seconds",
  "albumin": "Adult: 3.5-5.2 g/dL",
  "albumin / globulin ratio": "Adult: 1.0-2.2",
  "aldosterone": "Adult upright: 3-16 ng/dL (lab-specific)",
  "alkaline phosphatase": "Adult: 40-130 U/L; children 1-12y: 100-400 U/L; adolescents: higher",
  "alkaline phosphatase (alp)": "Adult: 40-130 U/L; children 1-12y: 100-400 U/L; adolescents: higher",
  "ammonia": "Adult: 15-45 umol/L",
  "anti-streptolysin o (aso)": "Adult: <200 IU/mL",
  "anti-thyroglobulin antibody": "Adult: <40 IU/mL",
  "anti-thyroid peroxidase antibody": "Adult: <35 IU/mL",
  "anti-dsdna": "Adult: <30 IU/mL (negative)",
  "antibiotic sensitivity": "Reported as susceptible / intermediate / resistant",
  "apolipoprotein a1": "Adult male: 110-180 mg/dL; adult female: 120-220 mg/dL",
  "apolipoprotein b": "Adult: <90 mg/dL (desirable)",
  "appearance": "Clear / normal (fluid-specific)",
  "bacteria": "Not seen",
  "base excess": "Adult arterial: -2 to +2 mmol/L",
  "basophils": "Adult: 0-2%",
  "beta human chorionic gonadotropin":
    "Non-pregnant adult: <5 mIU/mL; pregnancy interpreted by gestational age",
  "bethesda interpretation": "Negative for intraepithelial lesion or malignancy",
  "bicarbonate": "Adult: 22-29 mmol/L",
  "bilirubin direct": "Adult: 0.0-0.3 mg/dL",
  "bilirubin indirect": "Adult: 0.1-1.0 mg/dL",
  "bilirubin total": "Adult: 0.2-1.2 mg/dL",
  "direct bilirubin": "Adult: 0.0-0.3 mg/dL",
  "indirect bilirubin": "Adult: 0.1-1.0 mg/dL",
  "total bilirubin": "Adult: 0.2-1.2 mg/dL",
  "blood sugar fasting": "Adult: 70-100 mg/dL",
  "blood sugar random": "Adult: 70-140 mg/dL",
  "blood sugar post prandial": "Adult: <140 mg/dL (2 hours after meal)",
  "glycated haemoglobin (hba1c)": "Adult: <5.7% (non-diabetic)",
  "thyroid stimulating hormone": "Adult: 0.4-4.0 mIU/L",
  "g6pd enzyme activity": "Adult: 8-18 U/g Hb",
  "bnp": "Adult: <100 pg/mL",
  "blood urea": "Adult: 15-40 mg/dL",
  "blood urea nitrogen (bun)": "Adult: 7-20 mg/dL",
  "brucella agglutination": "Negative (<1:80)",
  "c-peptide": "Adult: 0.5-2.0 ng/mL",
  "c-reactive protein (crp)": "Adult: <5 mg/L",
  "cmv dna": "Not detected",
  "calcium": "Adult: 8.6-10.2 mg/dL; children: 8.8-10.8 mg/dL",
  "casts": "None / occasional hyaline",
  "cell count": "CSF: 0-5 /cmm; fluid-specific (validate locally)",
  "cellularity": "Normocellular marrow for age",
  "chloride": "Adult: 98-107 mmol/L",
  "colony count": "No significant growth",
  "colour": "Brown / normal",
  "comment": "Not applicable (descriptive report)",
  "complement c3": "Adult: 90-180 mg/dL",
  "complement c4": "Adult: 10-40 mg/dL",
  "consistency": "Formed",
  "cortisol": "Adult morning: 5-25 ug/dL; evening lower",
  "creatine kinase (ck)":
    "Adult male: 39-308 U/L; adult female: 26-192 U/L",
  "creatine kinase mb (ck-mb)": "Adult: <25 U/L",
  "creatinine clearance": "Adult: 90-120 mL/min",
  "crossmatch": "Compatible",
  "crystals": "None seen",
  "cyst": "Not seen",
  "cytology findings": "No diagnostic abnormality / descriptive report",
  "d-dimer": "Adult: <500 ng/mL FEU",
  "dengue igg antibody": "Negative",
  "dengue igm antibody": "Negative",
  "dengue ns1 antigen": "Negative",
  "diagnosis": "Not applicable (descriptive report)",
  "direct coombs test (dat)": "Negative",
  "ebv dna": "Not detected",
  "eosinophils": "Adult: 1-6%",
  "epithelial cells": "0-5 /hpf (urine)",
  "erythrocyte sedimentation rate (esr)":
    "Adult male: 0-15 mm/hr; adult female: 0-20 mm/hr; age-related increase possible",
  "estimated gfr (egfr)": "Adult: >90 mL/min/1.73m2",
  "estradiol": "Adult male: 10-40 pg/mL; adult female cycle/age-specific",
  "fecal calprotectin": "Adult: <50 ug/g",
  "fio2": "Room air: 21%",
  "fibrinogen": "Adult: 200-400 mg/dL",
  "folate": "Adult: 3-17 ng/mL",
  "follicle stimulating hormone (fsh)":
    "Adult male: 1.4-12.4 mIU/mL; adult female cycle/age-specific",
  "free t3": "Adult: 2.3-4.2 pg/mL",
  "free t4": "Adult: 0.8-1.8 ng/dL",
  "fungal elements": "Not seen",
  "gamma gt (ggt)": "Adult male: 0-55 U/L; adult female: 0-38 U/L",
  "gamma glutamyl transferase (ggt)":
    "Adult male: 0-55 U/L; adult female: 0-38 U/L",
  "globulin": "Adult: 2.0-3.5 g/dL",
  "glucose": "Fasting adult: 70-100 mg/dL; urine: negative",
  "grading": "Negative / grading reported if positive",
  "gram stain result": "No organisms seen",
  "gross examination": "Not applicable (descriptive report)",
  "growth hormone": "Adult random: <5 ng/mL (dynamic testing lab-specific)",
  "haemoglobin": "Adult male: 13.0-17.0 g/dL; adult female: 12.0-15.0 g/dL; children 1-5y: 11.0-14.0 g/dL; children 6-12y: 11.5-15.5 g/dL",
  "total leukocyte count": "Adult: 4,000-11,000 /cmm",
  "hco3": "Adult arterial: 22-26 mmol/L",
  "hdl cholesterol": "Adult male: >40 mg/dL; adult female: >50 mg/dL",
  "hiv 1 and 2 antibodies": "Non-reactive",
  "hpv dna": "Not detected",
  "haemoglobin pattern": "Normal: HbA >95%, HbA2 2-3%, HbF <1% (age-specific in infants)",
  "helicobacter pylori igg": "Negative",
  "helicobacter pylori stool antigen": "Negative",
  "hepatitis b surface antigen (hbsag)": "Non-reactive",
  "hepatitis b viral load (hbv dna)": "Not detected / below limit of quantification",
  "hepatitis c antibody": "Non-reactive",
  "hepatitis c viral load (hcv rna)": "Not detected / below limit of quantification",
  "high sensitivity crp (hs-crp)": "Adult: <1 low risk; 1-3 average; >3 higher risk",
  "homocysteine": "Adult: 5-15 umol/L",
  "inr": "Adult untreated: 0.8-1.2",
  "impression": "Not applicable (descriptive report)",
  "indirect coombs test (iat)": "Negative",
  "insulin": "Adult fasting: 2-25 uIU/mL",
  "insulin-like growth factor 1 (igf-1)": "Age/sex-specific; report against reference chart",
  "interpretation": "Not applicable (clinical interpretation)",
  "ionised calcium": "Adult: 1.15-1.30 mmol/L",
  "koh result": "No fungal elements seen",
  "ldh": "Adult: 140-280 U/L",
  "lactate dehydrogenase (ldh)": "Adult: 140-280 U/L",
  "ldl cholesterol": "Adult: <100 mg/dL (desirable)",
  "lactate": "Adult: 0.5-2.2 mmol/L",
  "leptospira igm": "Negative",
  "leucocyte count": "Adult: 4,000-11,000 /cmm",
  "leucocytes": "Semen: <1 million/mL",
  "lipoprotein(a)": "Adult: <30 mg/dL",
  "liquefaction time": "Semen: <=60 minutes",
  "luteinising hormone (lh)":
    "Adult male: 1.5-9.3 mIU/mL; adult female cycle/age-specific",
  "lymphocytes": "Adult blood: 20-40%",
  "mrsa screen result": "Not detected",
  "magnesium": "Adult: 1.7-2.2 mg/dL",
  "marker(s)": "Not applicable (descriptive report)",
  "mean corpuscular haemoglobin (mch)": "Adult: 27-32 pg",
  "mean corpuscular haemoglobin concentration (mchc)": "Adult: 32-36 g/dL",
  "mean corpuscular hb concentration (mchc)": "Adult: 32-36 g/dL",
  "mean corpuscular volume (mcv)": "Adult: 80-100 fL",
  "microscopic examination": "Not applicable (descriptive report)",
  "monocytes": "Adult: 2-10%",
  "morphology": "Normal / descriptive",
  "nt-probnp": "Adult: <125 pg/mL (<75 years); age-adjusted",
  "neutrophils": "Adult: 40-70%",
  "non-hdl cholesterol": "Adult: <130 mg/dL",
  "normal morphology": "Semen: >=4% normal forms",
  "o2 saturation": "Adult arterial: 95-100%",
  "occult blood": "Negative",
  "organism isolated": "No growth / no pathogen isolated",
  "organism seen": "None seen",
  "ova": "Not seen",
  "ova / cyst": "Not seen",
  "packed cell volume (pcv)": "Adult male: 40-52%; adult female: 36-48%; children 1-5y: 33-42%; children 6-12y: 35-45%",
  "packed cell volume (pcv/hct)": "Adult male: 40-52%; adult female: 36-48%; children 1-5y: 33-42%; children 6-12y: 35-45%",
  "pan antigen": "Negative",
  "parasite density": "No parasites seen (0/uL)",
  "parasite species": "No parasites seen",
  "parasite stage": "Not applicable (no parasites seen)",
  "parathyroid hormone (pth)": "Adult: 15-65 pg/mL",
  "pf antigen": "Negative",
  "phosphorus": "Adult: 2.5-4.5 mg/dL; children 1-12y: 4.0-7.0 mg/dL",
  "platelet count": "Adult: 1,50,000-4,50,000 /cmm",
  "platelet morphology": "Normal / no significant abnormality",
  "polymorphs": "CSF: 0-5%; fluid-specific",
  "potassium": "Adult: 3.5-5.1 mmol/L",
  "progesterone":
    "Adult male: <1 ng/mL; adult female follicular <1, luteal 5-20 ng/mL",
  "progressive motility": "Semen: >=32%",
  "prolactin": "Adult male: 4-15 ng/mL; adult female: 5-25 ng/mL",
  "protein": "Serum: 6.0-8.3 g/dL; fluid-specific",
  "prothrombin time": "Adult: 11-13.5 seconds",
  "pus cells": "Urine: 0-5 /hpf; fluid-specific",
  "rbc count": "Adult male: 4.5-5.9 million/cmm; adult female: 4.1-5.1 million/cmm; children 1-5y: 4.0-5.5; children 6-12y: 4.0-5.2 million/cmm",
  "rbc morphology": "Normocytic, normochromic; no significant abnormality",
  "rbc parasitised": "0% (no parasitised RBCs)",
  "recommendation": "Not applicable (descriptive report)",
  "red blood cells": "Adult male: 4.5-5.9 million/cmm; adult female: 4.1-5.1 million/cmm; children 1-5y: 4.0-5.5; children 6-12y: 4.0-5.2 million/cmm",
  "red cell distribution width (rdw)": "Adult: 11.5-14.5%",
  "renin": "Adult upright: 0.2-2.8 ng/mL/hr (lab-specific)",
  "result": "Negative / not detected (qualitative)",
  "reticulocyte count": "Adult: 0.5-2.5%",
  "rh factor": "Not applicable (report positive/negative)",
  "rheumatoid factor (rf)": "Adult: <20 IU/mL",
  "s. paratyphi ah": "Negative (<1:80)",
  "s. paratyphi ao": "Negative (<1:80)",
  "s. paratyphi bh": "Negative (<1:80)",
  "s. paratyphi bo": "Negative (<1:80)",
  "s. typhi h": "Negative (<1:80)",
  "s. typhi o": "Negative (<1:80)",
  "s. typhi vi": "Negative (<1:80)",
  "sgot (ast)": "Adult: 5-40 U/L",
  "sgpt (alt)": "Adult: 5-41 U/L",
  "serum amylase": "Adult: 30-110 U/L",
  "serum creatinine": "Adult male: 0.7-1.3 mg/dL; adult female: 0.6-1.1 mg/dL; children 1-5y: 0.3-0.7; children 6-12y: 0.4-0.9 mg/dL",
  "serum ferritin": "Adult male: 30-400 ng/mL; adult female: 15-150 ng/mL",
  "serum iron": "Adult male: 65-175 ug/dL; adult female: 50-170 ug/dL",
  "serum lipase": "Adult: 0-160 U/L",
  "serum uric acid": "Adult male: 3.5-7.2 mg/dL; adult female: 2.6-6.0 mg/dL; children: 2.0-5.5 mg/dL",
  "serum-ascites albumin gradient": ">=1.1 g/dL suggests portal hypertension; <1.1 non-portal",
  "sickling test": "Negative",
  "site": "Not applicable (descriptive report)",
  "sodium": "Adult: 135-145 mmol/L",
  "specific gravity": "Urine: 1.005-1.030",
  "specimen": "Not applicable (descriptive report)",
  "specimen adequacy": "Satisfactory for evaluation",
  "sperm count": "Semen: >=15 million/mL",
  "stain": "Not applicable (descriptive report)",
  "stool occult blood": "Negative",
  "stool reducing substances": "Negative",
  "tb interferon gamma release assay": "Negative",
  "tpha result": "Non-reactive",
  "tpha titre": "Non-reactive",
  "testosterone": "Adult male: 300-1000 ng/dL; adult female: 15-70 ng/dL",
  "total cholesterol": "Adult: <200 mg/dL (desirable)",
  "total cholesterol / hdl ratio": "Adult: <4.5 (lab-specific)",
  "total iron binding capacity (tibc)": "Adult: 250-450 ug/dL",
  "total leucocyte count": "Adult: 4,000-11,000 /cmm",
  "total leucocyte count (tlc)": "Adult: 4,000-11,000 /cmm",
  "total motility": "Semen: >=40%",
  "total protein": "Adult: 6.0-8.3 g/dL",
  "total t3": "Adult: 80-200 ng/dL",
  "total t4": "Adult: 5-12 ug/dL",
  "triglycerides": "Adult: <150 mg/dL",
  "troponin i": "Adult: <0.04 ng/mL",
  "troponin t": "Adult: <14 ng/L",
  "tuberculosis pcr": "Not detected",
  "typhoid igm": "Negative",
  "urine albumin / creatinine ratio": "Adult: <30 mg/g",
  "urine bilirubin": "Negative",
  "urine glucose": "Negative",
  "urine ketones": "Negative",
  "urine leukocyte esterase": "Negative",
  "urine microalbumin": "Adult: <30 mg/L",
  "urine nitrite": "Negative",
  "urine pregnancy test (hcg)": "Negative",
  "urine protein": "Negative / trace",
  "urine urobilinogen": "Normal",
  "uric acid": "Adult male: 3.5-7.2 mg/dL; adult female: 2.6-6.0 mg/dL; children: 2.0-5.5 mg/dL",
  "vdrl result": "Non-reactive",
  "vdrl titre": "Non-reactive",
  "vldl cholesterol": "Adult: 5-40 mg/dL",
  "vre screen result": "Not detected",
  "vitamin b12": "Adult: 200-900 pg/mL",
  "vitamin d (25-oh)": "Adult: 30-100 ng/mL (sufficiency; lab-specific)",
  "volume": "Semen: >=1.5 mL",
  "wbc morphology": "Normal / no significant abnormality",
  "pco2": "Adult arterial: 35-45 mmHg",
  "ph": "Arterial: 7.35-7.45; urine: 4.6-8.0",
  "po2": "Adult arterial: 80-100 mmHg",
  "ldl / hdl ratio": "Adult: <3.0 (lab-specific)",
};

const TEST_OVERRIDES: Record<string, Record<string, string>> = {
  ABG: {
    "ph": "Adult arterial: 7.35-7.45",
    "pco2": "Adult arterial: 35-45 mmHg",
    "po2": "Adult arterial: 80-100 mmHg",
    "hco3": "Adult arterial: 22-26 mmol/L",
    "base excess": "Adult arterial: -2 to +2 mmol/L",
    "o2 saturation": "Adult arterial: 95-100%",
    "lactate": "Adult: 0.5-2.2 mmol/L",
    "sodium": "Adult: 135-145 mmol/L",
    "potassium": "Adult: 3.5-5.1 mmol/L",
    "ionised calcium": "Adult: 1.15-1.30 mmol/L",
    "glucose": "Adult fasting: 70-100 mg/dL",
    "fio2": "Room air: 21%",
    "interpretation": "Not applicable (clinical interpretation)",
  },
  URINE: {
    "colour": "Pale yellow to amber",
    "appearance": "Clear",
    "ph": "Urine: 4.6-8.0",
    "specific gravity": "1.005-1.030",
    "protein": "Negative / trace",
    "glucose": "Negative",
    "ketones": "Negative",
    "blood": "Negative",
    "bilirubin": "Negative",
    "urobilinogen": "Normal",
    "nitrite": "Negative",
    "leucocyte esterase": "Negative",
    "pus cells": "0-5 /hpf",
    "red blood cells": "0-2 /hpf",
    "epithelial cells": "0-5 /hpf",
    "casts": "None / occasional hyaline",
    "crystals": "None seen",
    "bacteria": "Not seen",
  },
  UMICRO: {
    "pus cells": "0-5 /hpf",
    "red blood cells": "0-2 /hpf",
    "epithelial cells": "0-5 /hpf",
    "casts": "None / occasional hyaline",
    "crystals": "None seen",
    "bacteria": "Not seen",
  },
  STOOL: {
    "colour": "Brown",
    "consistency": "Formed",
    "ova / cyst": "Not seen",
    "occult blood": "Negative",
    "pus cells": "0-5 /hpf",
    "epithelial cells": "0-5 /hpf",
  },
  SEMEN: {
    "volume": ">=1.5 mL",
    "ph": ">=7.2",
    "sperm count": ">=15 million/mL",
    "total motility": ">=40%",
    "progressive motility": ">=32%",
    "normal morphology": ">=4% normal forms",
    "leucocytes": "<1 million/mL",
    "liquefaction time": "<=60 minutes",
  },
  CSFA: {
    "appearance": "Clear, colourless",
    "protein": "15-45 mg/dL",
    "glucose": "40-70 mg/dL",
    "cell count": "0-5 /cmm",
    "polymorphs": "0-5%",
    "lymphocytes": "0-5% (normal CSF)",
    "chloride": "118-132 mmol/L",
    "ada": "<10 U/L (lab-specific)",
    "specimen": "Not applicable (descriptive report)",
  },
  PLEURA: {
    "appearance": "Clear / straw-coloured",
    "protein": "Transudate <3.0 g/dL; exudate >=3.0 g/dL",
    "glucose": "60-100 mg/dL",
    "cell count": "Fluid-specific; report differential",
    "polymorphs": "Fluid-specific; report differential",
    "lymphocytes": "Fluid-specific; report differential",
    "ldh": "Fluid-specific; compare with serum",
    "ada": "<10 U/L (lab-specific)",
  },
  ASCITES: {
    "appearance": "Clear / straw-coloured",
    "protein": "Transudate <2.5 g/dL; exudate >=2.5 g/dL",
    "glucose": "70-100 mg/dL",
    "cell count": "Fluid-specific; report differential",
    "polymorphs": "Fluid-specific; report differential",
    "lymphocytes": "Fluid-specific; report differential",
    "serum-ascites albumin gradient": ">=1.1 g/dL suggests portal hypertension",
  },
  SYNOVIAL: {
    "appearance": "Clear, viscous",
    "leucocyte count": "<200 /cmm",
    "polymorphs": "<25%",
    "protein": "<3.5 g/dL",
    "glucose": "70-100 mg/dL",
    "crystals": "None seen",
  },
  WIDAL: {
    "s. typhi o": "Negative (<1:80)",
    "s. typhi h": "Negative (<1:80)",
    "s. paratyphi ah": "Negative (<1:80)",
    "s. paratyphi bh": "Negative (<1:80)",
    "s. paratyphi ao": "Negative (<1:80)",
    "s. paratyphi bo": "Negative (<1:80)",
    "s. typhi vi": "Negative (<1:80)",
    "interpretation": "Negative / no significant agglutination",
  },
  MPS: {
    "parasite species": "No parasites seen",
    "parasite stage": "Not applicable (no parasites seen)",
    "parasite density": "0/uL (no parasites seen)",
    "rbc parasitised": "0%",
    "interpretation": "Negative for malaria parasites",
  },
  MPAG: {
    "pf antigen": "Negative",
    "pan antigen": "Negative",
    "interpretation": "Negative",
  },
  HBELEC: {
    "haemoglobin pattern": "Normal: HbA >95%, HbA2 2-3%, HbF <1% (age-specific in infants)",
    "interpretation": "Normal haemoglobin pattern",
  },
  VDRL: {
    "vdrl result": "Non-reactive",
    "vdrl titre": "Non-reactive",
  },
  TPHA: {
    "tpha result": "Non-reactive",
    "tpha titre": "Non-reactive",
  },
  PSMEAR: {
    "rbc morphology": "Normocytic, normochromic",
    "wbc morphology": "Normal / no significant abnormality",
    "platelet morphology": "Normal / no significant abnormality",
    "impression": "No significant haematological abnormality",
  },
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function fallbackReference(test: TestForReference, parameter: ParameterForReference): string {
  if (test.category === "X-Ray") return "Not applicable (radiology report)";
  if (parameter.report_type === "text") {
    return "Negative / not detected / descriptive result (validate locally)";
  }
  return "Adult method-specific interval; validate locally";
}

function referenceFor(
  test: TestForReference,
  parameter: ParameterForReference
): string {
  const key = normalize(parameter.name);
  const testKey = test.code.trim().toUpperCase();
  return (
    TEST_OVERRIDES[testKey]?.[key] ??
    COMMON[key] ??
    fallbackReference(test, parameter)
  );
}

export async function ensureStarterReferences(
  store: StarterReferenceStore
): Promise<void> {
  const tenants = await store.all<{ id: string }>(
    "SELECT id FROM tenants WHERE deleted = 0"
  );
  const ts = now();

  for (const tenant of tenants) {
    const versionKey = `starter_reference_version:${tenant.id}`;
    const version = await store.all<{ value: string }>(
      "SELECT value FROM meta WHERE key = ?",
      [versionKey]
    );
    if (version[0]?.value === String(STARTER_REFERENCE_VERSION)) continue;

    const tests = await store.all<TestForReference>(
      `SELECT id, code, name, category, department
       FROM tests
       WHERE tenant_id = ? AND deleted = 0`,
      [tenant.id]
    );
    const testById = new Map(tests.map((test) => [test.id, test]));

    const parameters = await store.all<ParameterForReference>(
      `SELECT id, test_id, name, unit, report_type
       FROM test_parameters
       WHERE tenant_id = ? AND deleted = 0
         AND (id LIKE 'tp-%' OR id LIKE 'param-seed-%')`,
      [tenant.id]
    );

    let failed = false;
    for (const parameter of parameters) {
      const test = testById.get(parameter.test_id);
      if (!test) continue;
      const reference = referenceFor(test, parameter);
      try {
        await store.run(
          `UPDATE test_parameters
           SET ref_range = ?, updated_at = ?, dirty = 1
           WHERE id = ? AND tenant_id = ?`,
          [reference, ts, parameter.id, tenant.id]
        );
      } catch (error) {
        failed = true;
        console.warn(
          `Could not update reference for ${test.code} / ${parameter.name}`,
          error
        );
      }
    }

    if (!failed) {
      await store.run(
        `INSERT INTO meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [versionKey, String(STARTER_REFERENCE_VERSION)]
      );
    }
    console.info(
      `Starter references: updated ${parameters.length} parameter(s) for tenant ${tenant.id}`
    );
  }
}
