// Broad starter catalogue for pathology and radiography.
//
// This is intentionally a *starter* library, not a claim that every possible
// esoteric test is present. It covers the common routine, biochemistry,
// haematology, serology, microbiology, cytology, fluid, hormone and X-ray
// examinations used by small and mid-sized Indian diagnostic centres.
//
// New entries ship with price 0 and blank reference intervals. The laboratory
// must set its own rates and validate reference intervals before clinical use.
//
// Seeding is idempotent and additive:
// - missing tests are inserted per tenant on boot
// - existing tests are matched by id, code or case-insensitive name
// - deleted/renamed tests are not resurrected
// - later catalogue releases can add new tests without touching custom entries

import { getDeviceId, now } from "./helpers";

export interface StarterTestStore {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

interface StarterTest {
  code: string;
  name: string;
  department: string;
  specimenType: string;
  containerType: string;
  unit?: string;
  reportType?: "text" | "numeric";
  method?: string;
  category?: "Pathology" | "X-Ray";
}

const path = (
  code: string,
  name: string,
  department: string,
  specimenType: string,
  containerType: string,
  unit = "",
  reportType: "text" | "numeric" = "numeric",
  method = ""
): StarterTest => ({
  code,
  name,
  department,
  specimenType,
  containerType,
  unit,
  reportType,
  method,
  category: "Pathology",
});

const xray = (code: string, name: string, method = "Radiography"): StarterTest => ({
  code,
  name,
  department: "Radiology",
  specimenType: "",
  containerType: "",
  unit: "",
  reportType: "text",
  method,
  category: "X-Ray",
});

const SERUM = ["Serum", "Clot activator / gel (gold top)"] as const;
const PLASMA = ["Plasma", "Sodium citrate (light blue top)"] as const;
const EDTA = ["Whole Blood", "EDTA (lavender top)"] as const;
const URINE = ["Urine", "Sterile urine container"] as const;
const STOOL = ["Stool", "Sterile stool container"] as const;

export const STARTER_TESTS: StarterTest[] = [
  // ---- Haematology ----
  path("CBC", "Complete Blood Count (CBC)", "Haematology", ...EDTA, "cells/cmm", "numeric", "Automated analyser"),
  path("HB", "Haemoglobin", "Haematology", ...EDTA, "g/dL", "numeric", "Automated analyser"),
  path("TC", "Total Leucocyte Count (TLC)", "Haematology", ...EDTA, "cells/cmm", "numeric", "Automated analyser"),
  path("DC", "Differential Leucocyte Count (DLC)", "Haematology", ...EDTA, "%", "text", "Microscopy"),
  path("AEC", "Absolute Eosinophil Count (AEC)", "Haematology", ...EDTA, "cells/cmm", "numeric", "Automated analyser / microscopy"),
  path("ESR", "Erythrocyte Sedimentation Rate (ESR)", "Haematology", ...EDTA, "mm/hr", "numeric", "Westergren"),
  path("PLT", "Platelet Count", "Haematology", ...EDTA, "cells/cmm", "numeric", "Automated analyser"),
  path("PCV", "Packed Cell Volume (PCV/HCT)", "Haematology", ...EDTA, "%", "numeric", "Automated analyser"),
  path("MCV", "Mean Corpuscular Volume (MCV)", "Haematology", ...EDTA, "fL", "numeric", "Automated analyser"),
  path("MCH", "Mean Corpuscular Haemoglobin (MCH)", "Haematology", ...EDTA, "pg", "numeric", "Automated analyser"),
  path("MCHC", "Mean Corpuscular Haemoglobin Concentration (MCHC)", "Haematology", ...EDTA, "g/dL", "numeric", "Automated analyser"),
  path("RDW", "Red Cell Distribution Width (RDW)", "Haematology", ...EDTA, "%", "numeric", "Automated analyser"),
  path("RETIC", "Reticulocyte Count", "Haematology", ...EDTA, "%", "numeric", "Supravital stain"),
  path("PSMEAR", "Peripheral Blood Smear", "Haematology", ...EDTA, "", "text", "Microscopy"),
  path("PTINR", "Prothrombin Time / INR (PT/INR)", "Haematology", ...PLASMA, "seconds", "numeric", "Coagulometer"),
  path("APTT", "Activated Partial Thromboplastin Time (APTT)", "Haematology", ...PLASMA, "seconds", "numeric", "Coagulometer"),
  path("FIB", "Fibrinogen", "Haematology", ...PLASMA, "mg/dL", "numeric", "Clauss method"),
  path("DDIMER", "D-Dimer", "Haematology", ...PLASMA, "ng/mL", "numeric", "Immunoturbidimetry"),
  path("BGRH", "Blood Group and Rh Factor", "Haematology", ...EDTA, "", "text", "Slide agglutination"),
  path("CROSS", "Crossmatch", "Haematology", ...EDTA, "", "text", "Tube method"),
  path("DCT", "Direct Coombs Test (DAT)", "Haematology", ...EDTA, "", "text", "Agglutination"),
  path("ICT", "Indirect Coombs Test (IAT)", "Haematology", ...SERUM, "", "text", "Agglutination"),
  path("HBA1C", "Glycated Haemoglobin (HbA1c)", "Clinical Biochemistry", ...EDTA, "%", "numeric", "HPLC / immunoturbidimetry"),
  path("HBELEC", "Haemoglobin Electrophoresis", "Haematology", ...EDTA, "", "text", "Electrophoresis"),
  path("G6PD", "G6PD Enzyme Activity", "Haematology", ...EDTA, "U/g Hb", "numeric", "Enzymatic"),
  path("SICKLE", "Sickling Test", "Haematology", ...EDTA, "", "text", "Sodium metabisulphite"),
  path("MPS", "Malaria Parasite Smear", "Haematology", ...EDTA, "", "text", "Thick and thin smear"),
  path("MPAG", "Malaria Antigen (Pf/Pan)", "Serology", ...EDTA, "", "text", "Rapid immunochromatography"),
  path(
    "ABG",
    "Arterial Blood Gas (ABG)",
    "Blood Gas",
    "Arterial Blood",
    "Heparinized arterial syringe",
    "",
    "text",
    "Blood gas analyser"
  ),

  // ---- Routine biochemistry ----
  path("FBS", "Blood Sugar Fasting", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Spectrophotometry"),
  path("RBS", "Blood Sugar Random", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Spectrophotometry"),
  path("PPBS", "Blood Sugar Post Prandial", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Spectrophotometry"),
  path("UREA", "Blood Urea", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Urease / spectrophotometry"),
  path("BUN", "Blood Urea Nitrogen (BUN)", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Urease / spectrophotometry"),
  path("CREAT", "Serum Creatinine", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Jaffe / enzymatic"),
  path("URIC", "Serum Uric Acid", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Uricase"),
  path("NA", "Sodium", "Clinical Biochemistry", ...SERUM, "mmol/L", "numeric", "ISE"),
  path("K", "Potassium", "Clinical Biochemistry", ...SERUM, "mmol/L", "numeric", "ISE"),
  path("CL", "Chloride", "Clinical Biochemistry", ...SERUM, "mmol/L", "numeric", "ISE"),
  path("HCO3", "Bicarbonate", "Clinical Biochemistry", ...SERUM, "mmol/L", "numeric", "Calculated / enzymatic"),
  path("CA", "Calcium", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Arsenazo III"),
  path("PHOS", "Phosphorus", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Molybdate"),
  path("MG", "Magnesium", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Xylidyl blue"),
  path("TP", "Total Protein", "Clinical Biochemistry", ...SERUM, "g/dL", "numeric", "Biuret"),
  path("ALB", "Albumin", "Clinical Biochemistry", ...SERUM, "g/dL", "numeric", "BCG"),
  path("GLOB", "Globulin", "Clinical Biochemistry", ...SERUM, "g/dL", "numeric", "Calculated"),
  path("AGRATIO", "Albumin / Globulin Ratio", "Clinical Biochemistry", ...SERUM, "ratio", "numeric", "Calculated"),
  path("TBIL", "Total Bilirubin", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Diazo"),
  path("DBIL", "Direct Bilirubin", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Diazo"),
  path("IBIL", "Indirect Bilirubin", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Calculated"),
  path("SGOT", "SGOT (AST)", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "IFCC"),
  path("SGPT", "SGPT (ALT)", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "IFCC"),
  path("ALP", "Alkaline Phosphatase (ALP)", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "IFCC"),
  path("GGT", "Gamma Glutamyl Transferase (GGT)", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "IFCC"),
  path("LDH", "Lactate Dehydrogenase (LDH)", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "IFCC"),
  path("AMYLASE", "Serum Amylase", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "Enzymatic"),
  path("LIPASE", "Serum Lipase", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "Enzymatic"),
  path("CK", "Creatine Kinase (CK)", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "IFCC"),
  path("CKMB", "Creatine Kinase MB (CK-MB)", "Clinical Biochemistry", ...SERUM, "U/L", "numeric", "Immunoinhibition"),
  path("TROPI", "Troponin I", "Clinical Biochemistry", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),
  path("TROPT", "Troponin T", "Clinical Biochemistry", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),
  path("BNP", "BNP", "Clinical Biochemistry", ...SERUM, "pg/mL", "numeric", "Chemiluminescence"),
  path("NTPROBNP", "NT-proBNP", "Clinical Biochemistry", ...SERUM, "pg/mL", "numeric", "Chemiluminescence"),
  path("LACTATE", "Lactate", "Clinical Biochemistry", ...PLASMA, "mmol/L", "numeric", "Enzymatic"),
  path("AMMONIA", "Ammonia", "Clinical Biochemistry", ...PLASMA, "umol/L", "numeric", "Enzymatic"),
  path("IRON", "Serum Iron", "Clinical Biochemistry", ...SERUM, "ug/dL", "numeric", "Ferrozine"),
  path("TIBC", "Total Iron Binding Capacity (TIBC)", "Clinical Biochemistry", ...SERUM, "ug/dL", "numeric", "Saturation / calculated"),
  path("FERRITIN", "Serum Ferritin", "Clinical Biochemistry", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),
  path("B12", "Vitamin B12", "Clinical Biochemistry", ...SERUM, "pg/mL", "numeric", "Chemiluminescence"),
  path("FOLATE", "Folate", "Clinical Biochemistry", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),
  path("VITD", "Vitamin D (25-OH)", "Clinical Biochemistry", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),

  // ---- Lipids and cardiac risk ----
  path("LIPID", "Lipid Profile", "Clinical Biochemistry", ...SERUM, "", "text", "Calculated panel"),
  path("CHOL", "Total Cholesterol", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Enzymatic"),
  path("TG", "Triglycerides", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Enzymatic"),
  path("HDL", "HDL Cholesterol", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Direct / precipitation"),
  path("LDL", "LDL Cholesterol", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Calculated / direct"),
  path("VLDL", "VLDL Cholesterol", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Calculated"),
  path("NONHDL", "Non-HDL Cholesterol", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Calculated"),
  path("APOA1", "Apolipoprotein A1", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Immunoturbidimetry"),
  path("APOB", "Apolipoprotein B", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Immunoturbidimetry"),
  path("LPA", "Lipoprotein(a)", "Clinical Biochemistry", ...SERUM, "mg/dL", "numeric", "Immunoturbidimetry"),
  path("HOMOCYS", "Homocysteine", "Clinical Biochemistry", ...SERUM, "umol/L", "numeric", "Chemiluminescence"),
  path("HSCRP", "High Sensitivity CRP (hs-CRP)", "Clinical Biochemistry", ...SERUM, "mg/L", "numeric", "Immunoturbidimetry"),

  // ---- Renal and urine chemistry ----
  path("MICROALB", "Urine Microalbumin", "Clinical Biochemistry", ...URINE, "mg/L", "numeric", "Immunoturbidimetry"),
  path("UACR", "Urine Albumin / Creatinine Ratio", "Clinical Biochemistry", ...URINE, "mg/g", "numeric", "Calculated"),
  path("U24PROT", "24 Hour Urine Protein", "Clinical Biochemistry", "24 Hour Urine", "Sterile urine container", "mg/24h", "numeric", "Spectrophotometry"),
  path("U24CREAT", "24 Hour Urine Creatinine", "Clinical Biochemistry", "24 Hour Urine", "Sterile urine container", "mg/24h", "numeric", "Jaffe"),
  path("CREATCLEAR", "Creatinine Clearance", "Clinical Biochemistry", "24 Hour Urine", "Sterile urine container", "mL/min", "numeric", "Calculated"),
  path("EGFR", "Estimated GFR (eGFR)", "Clinical Biochemistry", ...SERUM, "mL/min/1.73m2", "numeric", "Calculated"),

  // ---- Endocrinology ----
  path("TSH", "Thyroid Stimulating Hormone", "Endocrinology", ...SERUM, "mIU/L", "numeric", "Chemiluminescence"),
  path("T3", "Total T3", "Endocrinology", ...SERUM, "ng/dL", "numeric", "Chemiluminescence"),
  path("T4", "Total T4", "Endocrinology", ...SERUM, "ug/dL", "numeric", "Chemiluminescence"),
  path("FT3", "Free T3", "Endocrinology", ...SERUM, "pg/mL", "numeric", "Chemiluminescence"),
  path("FT4", "Free T4", "Endocrinology", ...SERUM, "ng/dL", "numeric", "Chemiluminescence"),
  path("ATPO", "Anti-Thyroid Peroxidase Antibody", "Endocrinology", ...SERUM, "IU/mL", "numeric", "Chemiluminescence"),
  path("ATG", "Anti-Thyroglobulin Antibody", "Endocrinology", ...SERUM, "IU/mL", "numeric", "Chemiluminescence"),
  path("LH", "Luteinising Hormone (LH)", "Endocrinology", ...SERUM, "mIU/mL", "numeric", "Chemiluminescence"),
  path("FSH", "Follicle Stimulating Hormone (FSH)", "Endocrinology", ...SERUM, "mIU/mL", "numeric", "Chemiluminescence"),
  path("PRL", "Prolactin", "Endocrinology", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),
  path("E2", "Estradiol", "Endocrinology", ...SERUM, "pg/mL", "numeric", "Chemiluminescence"),
  path("PROG", "Progesterone", "Endocrinology", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),
  path("TESTO", "Testosterone", "Endocrinology", ...SERUM, "ng/dL", "numeric", "Chemiluminescence"),
  path("CORT", "Cortisol", "Endocrinology", ...SERUM, "ug/dL", "numeric", "Chemiluminescence"),
  path("ACTH", "ACTH", "Endocrinology", ...PLASMA, "pg/mL", "numeric", "Chemiluminescence"),
  path("BHCG", "Beta Human Chorionic Gonadotropin", "Endocrinology", ...SERUM, "mIU/mL", "numeric", "Chemiluminescence"),
  path("INSULIN", "Insulin", "Endocrinology", ...SERUM, "uIU/mL", "numeric", "Chemiluminescence"),
  path("CPEP", "C-Peptide", "Endocrinology", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),
  path("PTH", "Parathyroid Hormone (PTH)", "Endocrinology", ...SERUM, "pg/mL", "numeric", "Chemiluminescence"),
  path("ALDO", "Aldosterone", "Endocrinology", ...SERUM, "ng/dL", "numeric", "Chemiluminescence"),
  path("RENIN", "Renin", "Endocrinology", ...PLASMA, "ng/mL/hr", "numeric", "Chemiluminescence"),
  path("GH", "Growth Hormone", "Endocrinology", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),
  path("IGF1", "Insulin-like Growth Factor 1 (IGF-1)", "Endocrinology", ...SERUM, "ng/mL", "numeric", "Chemiluminescence"),

  // ---- Serology and immunology ----
  path("CRP", "C-Reactive Protein (CRP)", "Serology", ...SERUM, "mg/L", "numeric", "Immunoturbidimetry"),
  path("ASO", "Anti-Streptolysin O (ASO)", "Serology", ...SERUM, "IU/mL", "numeric", "Immunoturbidimetry"),
  path("RF", "Rheumatoid Factor (RF)", "Serology", ...SERUM, "IU/mL", "numeric", "Immunoturbidimetry"),
  path("ANA", "Antinuclear Antibody (ANA)", "Serology", ...SERUM, "", "text", "Immunofluorescence / ELISA"),
  path("DSDNA", "Anti-dsDNA", "Serology", ...SERUM, "IU/mL", "numeric", "ELISA"),
  path("C3", "Complement C3", "Serology", ...SERUM, "mg/dL", "numeric", "Immunoturbidimetry"),
  path("C4", "Complement C4", "Serology", ...SERUM, "mg/dL", "numeric", "Immunoturbidimetry"),
  path("HIV", "HIV 1 and 2 Antibodies", "Serology", ...SERUM, "", "text", "ELISA / rapid"),
  path("HBSAG", "Hepatitis B Surface Antigen (HBsAg)", "Serology", ...SERUM, "", "text", "ELISA / rapid"),
  path("HCV", "Hepatitis C Antibody", "Serology", ...SERUM, "", "text", "ELISA / rapid"),
  path("VDRL", "VDRL", "Serology", ...SERUM, "", "text", "Flocculation"),
  path("TPHA", "TPHA", "Serology", ...SERUM, "", "text", "Agglutination"),
  path("HPYL", "Helicobacter pylori IgG", "Serology", ...SERUM, "", "text", "ELISA"),
  path("HPSA", "Helicobacter pylori Stool Antigen", "Microbiology", ...STOOL, "", "text", "Immunochromatography"),
  path("DENGUE", "Dengue NS1 / IgM / IgG", "Serology", ...SERUM, "", "text", "ELISA / rapid"),
  path("TYPHI", "Typhoid IgM", "Serology", ...SERUM, "", "text", "ELISA / rapid"),
  path("WIDAL", "Widal Test", "Serology", ...SERUM, "", "text", "Agglutination"),
  path("LEPTO", "Leptospira IgM", "Serology", ...SERUM, "", "text", "ELISA / rapid"),
  path("BRUCELLA", "Brucella Agglutination", "Serology", ...SERUM, "", "text", "Agglutination"),
  path("IGRA", "TB Interferon Gamma Release Assay", "Serology", ...EDTA, "", "text", "IGRA"),

  // ---- Microbiology ----
  path("BLOODC", "Blood Culture", "Microbiology", "Blood", "Blood culture bottle", "", "text", "Automated culture"),
  path("URINEC", "Urine Culture", "Microbiology", ...URINE, "", "text", "Culture and sensitivity"),
  path("PUSC", "Pus Culture", "Microbiology", "Pus", "Sterile container", "", "text", "Culture and sensitivity"),
  path("SPUTUMC", "Sputum Culture", "Microbiology", "Sputum", "Sterile container", "", "text", "Culture and sensitivity"),
  path("THROATC", "Throat Swab Culture", "Microbiology", "Throat Swab", "Amies transport swab", "", "text", "Culture and sensitivity"),
  path("CSFC", "CSF Culture", "Microbiology", "CSF", "Sterile container", "", "text", "Culture and sensitivity"),
  path("WOUNDC", "Wound Swab Culture", "Microbiology", "Wound Swab", "Amies transport swab", "", "text", "Culture and sensitivity"),
  path("STOOLC", "Stool Culture", "Microbiology", ...STOOL, "", "text", "Culture and sensitivity"),
  path("AFB", "Acid Fast Bacilli (AFB) Smear", "Microbiology", "Sputum", "Sterile container", "", "text", "Ziehl-Neelsen"),
  path("GRAM", "Gram Stain", "Microbiology", "Specimen", "Sterile container", "", "text", "Microscopy"),
  path("KOH", "KOH Mount", "Microbiology", "Skin / Nail / Hair", "Sterile container", "", "text", "Microscopy"),
  path("FUNGC", "Fungal Culture", "Microbiology", "Specimen", "Sterile container", "", "text", "Culture"),
  path("CULTUREAS", "Antibiotic Sensitivity", "Microbiology", "Isolate", "Culture plate", "", "text", "Disc diffusion / MIC"),
  path("MRSA", "MRSA Screen", "Microbiology", "Nasal Swab", "Amies transport swab", "", "text", "Culture"),
  path("VRE", "VRE Screen", "Microbiology", "Rectal Swab", "Amies transport swab", "", "text", "Culture"),

  // ---- Molecular ----
  path("TBPCR", "Tuberculosis PCR", "Molecular Diagnostics", "Sputum / Tissue", "Sterile container", "", "text", "PCR"),
  path("HBVDNA", "Hepatitis B Viral Load (HBV DNA)", "Molecular Diagnostics", ...PLASMA, "IU/mL", "numeric", "Real-time PCR"),
  path("HCVRNA", "Hepatitis C Viral Load (HCV RNA)", "Molecular Diagnostics", ...PLASMA, "IU/mL", "numeric", "Real-time PCR"),
  path("CMVDNA", "CMV DNA", "Molecular Diagnostics", ...PLASMA, "copies/mL", "numeric", "Real-time PCR"),
  path("HPVDNA", "HPV DNA", "Molecular Diagnostics", "Cervical Swab", "HPV collection kit", "", "text", "PCR"),
  path("EBVDNA", "EBV DNA", "Molecular Diagnostics", ...PLASMA, "copies/mL", "numeric", "Real-time PCR"),

  // ---- Urine and stool routine ----
  path("URINE", "Urine Routine Examination", "Clinical Pathology", ...URINE, "", "text", "Dipstick and microscopy"),
  path("UMICRO", "Urine Microscopy", "Clinical Pathology", ...URINE, "", "text", "Microscopy"),
  path("UPROT", "Urine Protein", "Clinical Pathology", ...URINE, "", "text", "Dipstick"),
  path("UGLUC", "Urine Glucose", "Clinical Pathology", ...URINE, "", "text", "Dipstick"),
  path("UKET", "Urine Ketones", "Clinical Pathology", ...URINE, "", "text", "Dipstick"),
  path("UBIL", "Urine Bilirubin", "Clinical Pathology", ...URINE, "", "text", "Dipstick"),
  path("UURO", "Urine Urobilinogen", "Clinical Pathology", ...URINE, "", "text", "Dipstick"),
  path("UNIT", "Urine Nitrite", "Clinical Pathology", ...URINE, "", "text", "Dipstick"),
  path("ULE", "Urine Leukocyte Esterase", "Clinical Pathology", ...URINE, "", "text", "Dipstick"),
  path("UPREG", "Urine Pregnancy Test (hCG)", "Clinical Pathology", ...URINE, "", "text", "Immunochromatography"),
  path("STOOL", "Stool Routine Examination", "Clinical Pathology", ...STOOL, "", "text", "Macroscopy and microscopy"),
  path("SOB", "Stool Occult Blood", "Clinical Pathology", ...STOOL, "", "text", "Immunochromatography"),
  path("OVA", "Stool Ova and Cyst", "Clinical Pathology", ...STOOL, "", "text", "Microscopy"),
  path("SRED", "Stool Reducing Substances", "Clinical Pathology", ...STOOL, "", "text", "Benedict method"),
  path("CALPRO", "Fecal Calprotectin", "Clinical Pathology", ...STOOL, "ug/g", "numeric", "ELISA"),
  path("SEMEN", "Semen Analysis", "Clinical Pathology", "Semen", "Sterile container", "", "text", "Macroscopy and microscopy"),

  // ---- Fluid, cytology and histopathology ----
  path("CSFA", "CSF Analysis", "Clinical Pathology", "CSF", "Sterile container", "", "text", "Biochemistry, cytology and microbiology"),
  path("PLEURA", "Pleural Fluid Analysis", "Clinical Pathology", "Pleural Fluid", "Sterile container", "", "text", "Biochemistry and cytology"),
  path("ASCITES", "Ascitic Fluid Analysis", "Clinical Pathology", "Ascitic Fluid", "Sterile container", "", "text", "Biochemistry and cytology"),
  path("SYNOVIAL", "Synovial Fluid Analysis", "Clinical Pathology", "Synovial Fluid", "Sterile container", "", "text", "Biochemistry and microscopy"),
  path("URINECYT", "Urine Cytology", "Cytology", ...URINE, "", "text", "Cytology"),
  path("SPUTUMCYT", "Sputum Cytology", "Cytology", "Sputum", "Sterile container", "", "text", "Cytology"),
  path("PAP", "Pap Smear", "Cytology", "Cervical Smear", "Pap smear collection kit", "", "text", "Cytology"),
  path("FNAC", "Fine Needle Aspiration Cytology (FNAC)", "Cytology", "Aspirate", "Sterile container", "", "text", "Cytology"),
  path("FLUIDCYT", "Fluid Cytology", "Cytology", "Body Fluid", "Sterile container", "", "text", "Cytology"),
  path("BIOPSY", "Biopsy - Small", "Histopathology", "Tissue", "Formalin container", "", "text", "Histopathology"),
  path("BIOPSYL", "Biopsy - Large", "Histopathology", "Tissue", "Formalin container", "", "text", "Histopathology"),
  path("BMA", "Bone Marrow Aspiration", "Histopathology", "Bone Marrow", "Sterile container", "", "text", "Haematology / histopathology"),
  path("IHC", "Immunohistochemistry (IHC)", "Histopathology", "Tissue", "Formalin container", "", "text", "IHC"),
  path("SPECIAL", "Special Stain", "Histopathology", "Tissue", "Formalin container", "", "text", "Histochemistry"),

  // ---- X-ray and radiography ----
  xray("CXP", "Chest X-Ray PA View"),
  xray("CXL", "Chest X-Ray Lateral View"),
  xray("CXRPA", "Chest X-Ray PA and Lateral View"),
  xray("ABXP", "X-Ray Abdomen PA View"),
  xray("ABDE", "X-Ray Abdomen Erect"),
  xray("ABDS", "X-Ray Abdomen Supine"),
  xray("KUB", "X-Ray KUB"),
  xray("CSPINEAP", "X-Ray Cervical Spine AP"),
  xray("CSPINELAT", "X-Ray Cervical Spine Lateral"),
  xray("DSPINE", "X-Ray Dorsal Spine AP / Lateral"),
  xray("LSPINE", "X-Ray Lumbar Spine AP / Lateral"),
  xray("PELVIS", "X-Ray Pelvis AP"),
  xray("HIP", "X-Ray Hip AP / Lateral"),
  xray("KNEE", "X-Ray Knee AP & Lateral"),
  xray("ANKLE", "X-Ray Ankle AP / Lateral"),
  xray("FOOT", "X-Ray Foot AP / Oblique"),
  xray("SHOULDER", "X-Ray Shoulder AP"),
  xray("ELBOW", "X-Ray Elbow AP / Lateral"),
  xray("WRIST", "X-Ray Wrist AP / Lateral"),
  xray("HAND", "X-Ray Hand AP / Oblique"),
  xray("FOREARM", "X-Ray Forearm AP / Lateral"),
  xray("HUMERUS", "X-Ray Humerus AP / Lateral"),
  xray("FEMUR", "X-Ray Femur AP / Lateral"),
  xray("TIBFIB", "X-Ray Tibia / Fibula AP / Lateral"),
  xray("SKULL", "X-Ray Skull AP / Lateral"),
  xray("PNS", "X-Ray Paranasal Sinuses"),
  xray("MANDIBLE", "X-Ray Mandible AP / Lateral"),
  xray("OPG", "Orthopantomogram (OPG)"),
  xray("TMJ", "X-Ray Temporomandibular Joint"),
  xray("CLAVICLE", "X-Ray Clavicle"),
  xray("RIBS", "X-Ray Ribs"),
  xray("STERNUM", "X-Ray Sternum"),
  xray("SACRUM", "X-Ray Sacrum / Coccyx"),
  xray("SIJOINT", "X-Ray Sacroiliac Joints"),
  xray("BARIUM", "Barium Swallow / Meal / Enema"),
  xray("IVP", "Intravenous Pyelogram (IVP)"),
  xray("MCU", "Micturating Cystourethrogram (MCU)"),
  xray("HSG", "Hysterosalpingography (HSG)"),
  xray("MAMMO", "Mammography - Both Breasts"),
  xray("DEXA", "DEXA Bone Density Scan"),
  xray("FOREIGN", "X-Ray Foreign Body Localisation"),
  xray("BONEAGE", "X-Ray Bone Age"),
  xray("SKELSURV", "X-Ray Skeletal Survey"),
];

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function seedId(tenantId: string, code: string): string {
  return `test-seed-${slug(tenantId)}-${slug(code)}`;
}

/**
 * Adds missing starter tests to every active tenant.
 *
 * Matching by id, code and case-insensitive name means custom labs can rename
 * or delete a starter without it being recreated on every boot.
 */
export async function ensureStarterTests(store: StarterTestStore): Promise<void> {
  const tenants = await store.all<{ id: string }>(
    "SELECT id FROM tenants WHERE deleted = 0"
  );
  const ts = now();
  const deviceId = getDeviceId();

  for (const tenant of tenants) {
    const existing = await store.all<{
      id: string;
      code: string;
      name: string;
    }>("SELECT id, code, name FROM tests WHERE tenant_id = ?", [tenant.id]);
    const ids = new Set(existing.map((row) => row.id));
    const codes = new Set(
      existing.map((row) => row.code.trim().toLowerCase()).filter(Boolean)
    );
    const names = new Set(
      existing.map((row) => row.name.trim().toLowerCase()).filter(Boolean)
    );

    let inserted = 0;
    for (const test of STARTER_TESTS) {
      const code = test.code.trim().toLowerCase();
      const name = test.name.trim().toLowerCase();
      if (ids.has(seedId(tenant.id, test.code)) || codes.has(code) || names.has(name)) {
        continue;
      }
      try {
        await store.run(
          `INSERT OR IGNORE INTO tests
             (id, code, name, category, price_paise, gst_rate_bp, sac_code, unit,
              ref_range, ref_min, ref_max, report_type, is_active, method,
              specimen_type, container_type, equipment_id, loinc_code,
              turnaround_time_hours, department, accreditation_status,
              created_at, updated_at, device_id, dirty, deleted, tenant_id)
           VALUES (?,?,?,?,0,0,'999316',?,'',NULL,NULL,?,1,?,?,?,'','',NULL,?,'',?,?,?,1,0,?)`,
          [
            seedId(tenant.id, test.code),
            test.code,
            test.name,
            test.category ?? "Pathology",
            test.unit ?? "",
            test.reportType ?? "text",
            test.method ?? "",
            test.specimenType,
            test.containerType,
            test.department,
            ts,
            ts,
            deviceId,
            tenant.id,
          ]
        );
        ids.add(seedId(tenant.id, test.code));
        codes.add(code);
        names.add(name);
        inserted += 1;
      } catch (error) {
        console.warn(
          `Could not add starter test ${test.name} (${test.code}) for tenant ${tenant.id}`,
          error
        );
      }
    }
    if (inserted > 0) {
      console.info(
        `Starter test catalogue: added ${inserted} test(s) for tenant ${tenant.id}`
      );
    }
  }
}
