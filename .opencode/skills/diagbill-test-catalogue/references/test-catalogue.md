# OmniMed Core starter test catalogue

Generated: 2026-11-12

> This is a generated snapshot. If it disagrees with the database/code, fix the source and regenerate.
> Source of truth: `src/db/starterTests.ts`, `src/db/starterParameters.ts` and
> `src/db/starterPackages.ts`.

## Counts

- Tests: **228**
- Pathology: **185**
- X-ray: **43**
- Other: **0**
- Active parameters: **378**
- Packages with at least one item: **29**

Every pathology test has at least one parameter. X-ray tests intentionally have none and use the
radiology findings/impression form. A package is a price/name wrapper; its component tests keep their
own parameters.

## Pathology

### Blood Gas

#### `ABG` — Arterial Blood Gas (ABG)

- Category: Pathology
- Specimen: Arterial Blood | Container: Heparinized arterial syringe
- Method: Blood gas analyser | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (13):
  - [Acid-Base & Oxygenation] pH; ref Adult arterial: 7.35-7.45; numeric
  - [Acid-Base & Oxygenation] pCO2 mmHg; ref Adult arterial: 35-45 mmHg; numeric
  - [Acid-Base & Oxygenation] pO2 mmHg; ref Adult arterial: 80-100 mmHg; numeric
  - [Acid-Base & Oxygenation] HCO3 mmol/L; ref Adult arterial: 22-26 mmol/L; numeric
  - [Acid-Base & Oxygenation] Base Excess mmol/L; ref Adult arterial: -2 to +2 mmol/L; numeric
  - [Acid-Base & Oxygenation] O2 Saturation %; ref Adult arterial: 95-100%; numeric
  - [Metabolites] Lactate mmol/L; ref Adult: 0.5-2.2 mmol/L; numeric
  - [Electrolytes] Sodium mmol/L; ref Adult: 135-145 mmol/L; numeric
  - [Electrolytes] Potassium mmol/L; ref Adult: 3.5-5.1 mmol/L; numeric
  - [Electrolytes] Ionised Calcium mmol/L; ref Adult: 1.15-1.30 mmol/L; numeric
  - [Metabolites] Glucose mg/dL; ref Adult fasting: 70-100 mg/dL; numeric
  - [Oxygenation] FiO2 %; ref Room air: 21%; numeric
  - [Interpretation] Interpretation; ref Not applicable (clinical interpretation); text

### Clinical Biochemistry

#### `U24CREAT` — 24 Hour Urine Creatinine

- Category: Pathology
- Specimen: 24 Hour Urine | Container: Sterile urine container
- Method: Jaffe | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - 24 Hour Urine Creatinine mg/24h; ref Adult male: 1.0-2.0 g/24h; adult female: 0.8-1.8 g/24h; numeric

#### `U24PROT` — 24 Hour Urine Protein

- Category: Pathology
- Specimen: 24 Hour Urine | Container: Sterile urine container
- Method: Spectrophotometry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - 24 Hour Urine Protein mg/24h; ref Adult: <150 mg/24h; numeric

#### `ALB` — Albumin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: BCG | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Albumin g/dL; ref Adult: 3.5-5.2 g/dL; numeric

#### `AGRATIO` — Albumin / Globulin Ratio

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Albumin / Globulin Ratio ratio; ref Adult: 1.0-2.2; numeric

#### `ALP` — Alkaline Phosphatase (ALP)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Alkaline Phosphatase (ALP) U/L; ref Adult: 40-130 U/L; children 1-12y: 100-400 U/L; adolescents: higher; numeric

#### `AMMONIA` — Ammonia

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Ammonia umol/L; ref Adult: 15-45 umol/L; numeric

#### `APOA1` — Apolipoprotein A1

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Apolipoprotein A1 mg/dL; ref Adult male: 110-180 mg/dL; adult female: 120-220 mg/dL; numeric

#### `APOB` — Apolipoprotein B

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Apolipoprotein B mg/dL; ref Adult: <90 mg/dL (desirable); numeric

#### `HCO3` — Bicarbonate

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated / enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Bicarbonate mmol/L; ref Adult: 22-29 mmol/L; numeric

#### `FBS` — Blood Sugar Fasting

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: numeric
- Price: ₹100.00 | GST: 0%
- Parameters (1):
  - Blood Sugar Fasting mg/dL; ref Adult: 70-100 mg/dL; numeric

#### `PPBS` — Blood Sugar Post Prandial

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Spectrophotometry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Blood Sugar Post Prandial mg/dL; ref Adult: <140 mg/dL (2 hours after meal); numeric

#### `RBS` — Blood Sugar Random

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: numeric
- Price: ₹100.00 | GST: 0%
- Parameters (1):
  - Blood Sugar Random mg/dL; ref Adult: 70-140 mg/dL; numeric

#### `UREA` — Blood Urea

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Urease / spectrophotometry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Blood Urea mg/dL; ref Adult: 15-40 mg/dL; numeric

#### `BUN` — Blood Urea Nitrogen (BUN)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Urease / spectrophotometry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Blood Urea Nitrogen (BUN) mg/dL; ref Adult: 7-20 mg/dL; numeric

#### `BNP` — BNP

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - BNP pg/mL; ref Adult: <100 pg/mL; numeric

#### `CA` — Calcium

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Arsenazo III | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Calcium mg/dL; ref Adult: 8.6-10.2 mg/dL; children: 8.8-10.8 mg/dL; numeric

#### `CL` — Chloride

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ISE | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Chloride mmol/L; ref Adult: 98-107 mmol/L; numeric

#### `CK` — Creatine Kinase (CK)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Creatine Kinase (CK) U/L; ref Adult male: 39-308 U/L; adult female: 26-192 U/L; numeric

#### `CKMB` — Creatine Kinase MB (CK-MB)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoinhibition | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Creatine Kinase MB (CK-MB) U/L; ref Adult: <25 U/L; numeric

#### `CREATCLEAR` — Creatinine Clearance

- Category: Pathology
- Specimen: 24 Hour Urine | Container: Sterile urine container
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Creatinine Clearance mL/min; ref Adult: 90-120 mL/min; numeric

#### `DBIL` — Direct Bilirubin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Diazo | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Direct Bilirubin mg/dL; ref Adult: 0.0-0.3 mg/dL; numeric

#### `EGFR` — Estimated GFR (eGFR)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Estimated GFR (eGFR) mL/min/1.73m2; ref Adult: >90 mL/min/1.73m2; numeric

#### `FOLATE` — Folate

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Folate ng/mL; ref Adult: 3-17 ng/mL; numeric

#### `GGT` — Gamma Glutamyl Transferase (GGT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Gamma Glutamyl Transferase (GGT) U/L; ref Adult male: 0-55 U/L; adult female: 0-38 U/L; numeric

#### `GLOB` — Globulin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Globulin g/dL; ref Adult: 2.0-3.5 g/dL; numeric

#### `HBA1C` — Glycated Haemoglobin (HbA1c)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: numeric
- Price: ₹550.00 | GST: 0%
- Parameters (1):
  - Glycated Haemoglobin (HbA1c) %; ref Adult: <5.7% (non-diabetic); numeric

#### `HDL` — HDL Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Direct / precipitation | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - HDL Cholesterol mg/dL; ref Adult male: >40 mg/dL; adult female: >50 mg/dL; numeric

#### `HSCRP` — High Sensitivity CRP (hs-CRP)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - High Sensitivity CRP (hs-CRP) mg/L; ref Adult: <1 low risk; 1-3 average; >3 higher risk; numeric

#### `HOMOCYS` — Homocysteine

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Homocysteine umol/L; ref Adult: 5-15 umol/L; numeric

#### `IBIL` — Indirect Bilirubin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Indirect Bilirubin mg/dL; ref Adult: 0.1-1.0 mg/dL; numeric

#### `KFT` — Kidney Function Test (KFT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: text
- Price: ₹500.00 | GST: 0%
- Parameters (9):
  - [Renal Profile] Blood Urea mg/dL; ref Adult: 15-40 mg/dL; numeric
  - [Renal Profile] Blood Urea Nitrogen (BUN) mg/dL; ref Adult: 7-20 mg/dL; numeric
  - [Renal Profile] Serum Creatinine mg/dL; ref Adult male: 0.7-1.3 mg/dL; adult female: 0.6-1.1 mg/dL; children 1-5y: 0.3-0.7; children 6-12y: 0.4-0.9 mg/dL; numeric
  - [Renal Profile] Uric Acid mg/dL; ref Adult male: 3.5-7.2 mg/dL; adult female: 2.6-6.0 mg/dL; children: 2.0-5.5 mg/dL; numeric
  - [Electrolytes] Sodium mmol/L; ref Adult: 135-145 mmol/L; numeric
  - [Electrolytes] Potassium mmol/L; ref Adult: 3.5-5.1 mmol/L; numeric
  - [Electrolytes] Chloride mmol/L; ref Adult: 98-107 mmol/L; numeric
  - [Minerals] Calcium mg/dL; ref Adult: 8.6-10.2 mg/dL; children: 8.8-10.8 mg/dL; numeric
  - [Minerals] Phosphorus mg/dL; ref Adult: 2.5-4.5 mg/dL; children 1-12y: 4.0-7.0 mg/dL; numeric

#### `LACTATE` — Lactate

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Lactate mmol/L; ref Adult: 0.5-2.2 mmol/L; numeric

#### `LDH` — Lactate Dehydrogenase (LDH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Lactate Dehydrogenase (LDH) U/L; ref Adult: 140-280 U/L; numeric

#### `LDL` — LDL Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated / direct | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - LDL Cholesterol mg/dL; ref Adult: <100 mg/dL (desirable); numeric

#### `LIPID` — Lipid Profile

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: text
- Price: ₹400.00 | GST: 0%
- Parameters (8):
  - [Lipid Profile] Total Cholesterol mg/dL; ref Adult: <200 mg/dL (desirable); numeric
  - [Lipid Profile] Triglycerides mg/dL; ref Adult: <150 mg/dL; numeric
  - [Lipid Profile] HDL Cholesterol mg/dL; ref Adult male: >40 mg/dL; adult female: >50 mg/dL; numeric
  - [Lipid Profile] LDL Cholesterol mg/dL; ref Adult: <100 mg/dL (desirable); numeric
  - [Lipid Profile] VLDL Cholesterol mg/dL; ref Adult: 5-40 mg/dL; numeric
  - [Lipid Profile] Non-HDL Cholesterol mg/dL; ref Adult: <130 mg/dL; numeric
  - [Lipid Profile] Total Cholesterol / HDL Ratio ratio; ref Adult: <4.5 (lab-specific); numeric
  - [Lipid Profile] LDL / HDL Ratio ratio; ref Adult: <3.0 (lab-specific); numeric

#### `LPA` — Lipoprotein(a)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Lipoprotein(a) mg/dL; ref Adult: <30 mg/dL; numeric

#### `LFT` — Liver Function Test (LFT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: text
- Price: ₹500.00 | GST: 0%
- Parameters (11):
  - [Bilirubin] Bilirubin Total mg/dL; ref Adult: 0.2-1.2 mg/dL; numeric
  - [Bilirubin] Bilirubin Direct mg/dL; ref Adult: 0.0-0.3 mg/dL; numeric
  - [Bilirubin] Bilirubin Indirect mg/dL; ref Adult: 0.1-1.0 mg/dL; numeric
  - [Liver Enzymes] SGOT (AST) U/L; ref Adult: 5-40 U/L; numeric
  - [Liver Enzymes] SGPT (ALT) U/L; ref Adult: 5-41 U/L; numeric
  - [Liver Enzymes] Alkaline Phosphatase U/L; ref Adult: 40-130 U/L; children 1-12y: 100-400 U/L; adolescents: higher; numeric
  - [Liver Enzymes] Gamma GT (GGT) U/L; ref Adult male: 0-55 U/L; adult female: 0-38 U/L; numeric
  - [Proteins] Total Protein g/dL; ref Adult: 6.0-8.3 g/dL; numeric
  - [Proteins] Albumin g/dL; ref Adult: 3.5-5.2 g/dL; numeric
  - [Proteins] Globulin g/dL; ref Adult: 2.0-3.5 g/dL; numeric
  - [Proteins] Albumin / Globulin Ratio ratio; ref Adult: 1.0-2.2; numeric

#### `MG` — Magnesium

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Xylidyl blue | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Magnesium mg/dL; ref Adult: 1.7-2.2 mg/dL; numeric

#### `NONHDL` — Non-HDL Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Non-HDL Cholesterol mg/dL; ref Adult: <130 mg/dL; numeric

#### `NTPROBNP` — NT-proBNP

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - NT-proBNP pg/mL; ref Adult: <125 pg/mL (<75 years); age-adjusted; numeric

#### `PHOS` — Phosphorus

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Molybdate | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Phosphorus mg/dL; ref Adult: 2.5-4.5 mg/dL; children 1-12y: 4.0-7.0 mg/dL; numeric

#### `K` — Potassium

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ISE | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Potassium mmol/L; ref Adult: 3.5-5.1 mmol/L; numeric

#### `AMYLASE` — Serum Amylase

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Amylase U/L; ref Adult: 30-110 U/L; numeric

#### `CREAT` — Serum Creatinine

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Jaffe / enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Creatinine mg/dL; ref Adult male: 0.7-1.3 mg/dL; adult female: 0.6-1.1 mg/dL; children 1-5y: 0.3-0.7; children 6-12y: 0.4-0.9 mg/dL; numeric

#### `FERRITIN` — Serum Ferritin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Ferritin ng/mL; ref Adult male: 30-400 ng/mL; adult female: 15-150 ng/mL; numeric

#### `IRON` — Serum Iron

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Ferrozine | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Iron ug/dL; ref Adult male: 65-175 ug/dL; adult female: 50-170 ug/dL; numeric

#### `LIPASE` — Serum Lipase

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Lipase U/L; ref Adult: 0-160 U/L; numeric

#### `URIC` — Serum Uric Acid

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Uricase | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Uric Acid mg/dL; ref Adult male: 3.5-7.2 mg/dL; adult female: 2.6-6.0 mg/dL; children: 2.0-5.5 mg/dL; numeric

#### `SGOT` — SGOT (AST)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - SGOT (AST) U/L; ref Adult: 5-40 U/L; numeric

#### `SGPT` — SGPT (ALT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - SGPT (ALT) U/L; ref Adult: 5-41 U/L; numeric

#### `NA` — Sodium

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ISE | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Sodium mmol/L; ref Adult: 135-145 mmol/L; numeric

#### `TSH` — Thyroid Stimulating Hormone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: numeric
- Price: ₹250.00 | GST: 0%
- Parameters (1):
  - Thyroid Stimulating Hormone mIU/L; ref Adult: 0.4-4.0 mIU/L; numeric

#### `TBIL` — Total Bilirubin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Diazo | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Bilirubin mg/dL; ref Adult: 0.2-1.2 mg/dL; numeric

#### `CHOL` — Total Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Cholesterol mg/dL; ref Adult: <200 mg/dL (desirable); numeric

#### `TIBC` — Total Iron Binding Capacity (TIBC)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Saturation / calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Iron Binding Capacity (TIBC) ug/dL; ref Adult: 250-450 ug/dL; numeric

#### `TP` — Total Protein

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Biuret | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Protein g/dL; ref Adult: 6.0-8.3 g/dL; numeric

#### `TG` — Triglycerides

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Triglycerides mg/dL; ref Adult: <150 mg/dL; numeric

#### `TROPI` — Troponin I

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Troponin I ng/mL; ref Adult: <0.04 ng/mL; numeric

#### `TROPT` — Troponin T

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Troponin T ng/mL; ref Adult: <14 ng/L; numeric

#### `UACR` — Urine Albumin / Creatinine Ratio

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Albumin / Creatinine Ratio mg/g; ref Adult: <30 mg/g; numeric

#### `MICROALB` — Urine Microalbumin

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Microalbumin mg/L; ref Adult: <30 mg/L; numeric

#### `B12` — Vitamin B12

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Vitamin B12 pg/mL; ref Adult: 200-900 pg/mL; numeric

#### `VITD` — Vitamin D (25-OH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Vitamin D (25-OH) ng/mL; ref Adult: 30-100 ng/mL (sufficiency; lab-specific); numeric

#### `VLDL` — VLDL Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - VLDL Cholesterol mg/dL; ref Adult: 5-40 mg/dL; numeric

### Clinical Pathology

#### `ASCITES` — Ascitic Fluid Analysis

- Category: Pathology
- Specimen: Ascitic Fluid | Container: Sterile container
- Method: Biochemistry and cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (7):
  - [Physical & Chemical] Appearance; ref Clear / straw-coloured; text
  - [Physical & Chemical] Protein g/dL; ref Transudate <2.5 g/dL; exudate >=2.5 g/dL; numeric
  - [Physical & Chemical] Glucose mg/dL; ref 70-100 mg/dL; numeric
  - [Microscopy] Cell Count /cmm; ref Fluid-specific; report differential; numeric
  - [Microscopy] Polymorphs %; ref Fluid-specific; report differential; numeric
  - [Microscopy] Lymphocytes %; ref Fluid-specific; report differential; numeric
  - [Special Tests] Serum-Ascites Albumin Gradient g/dL; ref >=1.1 g/dL suggests portal hypertension; numeric

#### `CSFA` — CSF Analysis

- Category: Pathology
- Specimen: CSF | Container: Sterile container
- Method: Biochemistry, cytology and microbiology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (8):
  - [Physical & Chemical] Appearance; ref Clear, colourless; text
  - [Physical & Chemical] Protein mg/dL; ref 15-45 mg/dL; numeric
  - [Physical & Chemical] Glucose mg/dL; ref 40-70 mg/dL; numeric
  - [Microscopy] Cell Count /cmm; ref 0-5 /cmm; numeric
  - [Microscopy] Polymorphs %; ref 0-5%; numeric
  - [Microscopy] Lymphocytes %; ref 0-5% (normal CSF); numeric
  - [Special Tests] Chloride mmol/L; ref 118-132 mmol/L; numeric
  - [Special Tests] ADA U/L; ref <10 U/L (lab-specific); numeric

#### `CALPRO` — Fecal Calprotectin

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: ELISA | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Fecal Calprotectin ug/g; ref Adult: <50 ug/g; numeric

#### `PLEURA` — Pleural Fluid Analysis

- Category: Pathology
- Specimen: Pleural Fluid | Container: Sterile container
- Method: Biochemistry and cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (8):
  - [Physical & Chemical] Appearance; ref Clear / straw-coloured; text
  - [Physical & Chemical] Protein g/dL; ref Transudate <3.0 g/dL; exudate >=3.0 g/dL; numeric
  - [Physical & Chemical] Glucose mg/dL; ref 60-100 mg/dL; numeric
  - [Microscopy] Cell Count /cmm; ref Fluid-specific; report differential; numeric
  - [Microscopy] Polymorphs %; ref Fluid-specific; report differential; numeric
  - [Microscopy] Lymphocytes %; ref Fluid-specific; report differential; numeric
  - [Special Tests] LDH U/L; ref Fluid-specific; compare with serum; numeric
  - [Special Tests] ADA U/L; ref <10 U/L (lab-specific); numeric

#### `SEMEN` — Semen Analysis

- Category: Pathology
- Specimen: Semen | Container: Sterile container
- Method: Macroscopy and microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (8):
  - [Physical Examination] Volume mL; ref >=1.5 mL; numeric
  - [Physical Examination] pH; ref >=7.2; numeric
  - [Sperm Analysis] Sperm Count million/mL; ref >=15 million/mL; numeric
  - [Sperm Analysis] Total Motility %; ref >=40%; numeric
  - [Sperm Analysis] Progressive Motility %; ref >=32%; numeric
  - [Sperm Analysis] Normal Morphology %; ref >=4% normal forms; numeric
  - [Sperm Analysis] Leucocytes million/mL; ref <1 million/mL; numeric
  - [Physical Examination] Liquefaction Time minutes; ref <=60 minutes; numeric

#### `SOB` — Stool Occult Blood

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Immunochromatography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Stool Occult Blood; ref Negative; text

#### `OVA` — Stool Ova and Cyst

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [Stool Ova and Cyst] Ova; ref Not seen; text
  - [Stool Ova and Cyst] Cyst; ref Not seen; text

#### `SRED` — Stool Reducing Substances

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Benedict method | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Stool Reducing Substances; ref Negative; text

#### `STOOL` — Stool Routine Examination

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Macroscopy and microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (6):
  - [Physical Examination] Colour; ref Brown; text
  - [Physical Examination] Consistency; ref Formed; text
  - [Microscopy] Ova / Cyst; ref Not seen; text
  - [Occult Blood] Occult Blood; ref Negative; text
  - [Microscopy] Pus Cells /hpf; ref 0-5 /hpf; numeric
  - [Microscopy] Epithelial Cells /hpf; ref 0-5 /hpf; numeric

#### `SYNOVIAL` — Synovial Fluid Analysis

- Category: Pathology
- Specimen: Synovial Fluid | Container: Sterile container
- Method: Biochemistry and microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (6):
  - [Physical & Chemical] Appearance; ref Clear, viscous; text
  - [Microscopy] Leucocyte Count /cmm; ref <200 /cmm; numeric
  - [Microscopy] Polymorphs %; ref <25%; numeric
  - [Physical & Chemical] Protein g/dL; ref <3.5 g/dL; numeric
  - [Physical & Chemical] Glucose mg/dL; ref 70-100 mg/dL; numeric
  - [Microscopy] Crystals; ref None seen; text

#### `UBIL` — Urine Bilirubin

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Bilirubin; ref Negative; text

#### `UGLUC` — Urine Glucose

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Glucose; ref Negative; text

#### `UKET` — Urine Ketones

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Ketones; ref Negative; text

#### `ULE` — Urine Leukocyte Esterase

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Leukocyte Esterase; ref Negative; text

#### `UMICRO` — Urine Microscopy

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (6):
  - [Urine Microscopy] Pus Cells /hpf; ref 0-5 /hpf; numeric
  - [Urine Microscopy] Red Blood Cells /hpf; ref 0-2 /hpf; numeric
  - [Urine Microscopy] Epithelial Cells /hpf; ref 0-5 /hpf; numeric
  - [Urine Microscopy] Casts; ref None / occasional hyaline; text
  - [Urine Microscopy] Crystals; ref None seen; text
  - [Urine Microscopy] Bacteria; ref Not seen; text

#### `UNIT` — Urine Nitrite

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Nitrite; ref Negative; text

#### `UPREG` — Urine Pregnancy Test (hCG)

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Immunochromatography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Pregnancy Test (hCG); ref Negative; text

#### `UPROT` — Urine Protein

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Protein; ref Negative / trace; text

#### `URINE` — Urine Routine Examination

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick and microscopy | Report type: text
- Price: ₹150.00 | GST: 0%
- Parameters (18):
  - [Physical Examination] Colour; ref Pale yellow to amber; text
  - [Physical Examination] Appearance; ref Clear; text
  - [Chemical Examination] pH; ref Urine: 4.6-8.0; numeric
  - [Physical Examination] Specific Gravity; ref 1.005-1.030; numeric
  - [Chemical Examination] Protein; ref Negative / trace; text
  - [Chemical Examination] Glucose; ref Negative; text
  - [Chemical Examination] Ketones; ref Negative; text
  - [Chemical Examination] Blood; ref Negative; text
  - [Chemical Examination] Bilirubin; ref Negative; text
  - [Chemical Examination] Urobilinogen; ref Normal; text
  - [Chemical Examination] Nitrite; ref Negative; text
  - [Chemical Examination] Leucocyte Esterase; ref Negative; text
  - [Microscopy] Pus Cells /hpf; ref 0-5 /hpf; numeric
  - [Microscopy] Red Blood Cells /hpf; ref 0-2 /hpf; numeric
  - [Microscopy] Epithelial Cells /hpf; ref 0-5 /hpf; text
  - [Microscopy] Casts /lpf; ref None / occasional hyaline; text
  - [Microscopy] Crystals /hpf; ref None seen; text
  - [Microscopy] Bacteria /hpf; ref Not seen; text

#### `UURO` — Urine Urobilinogen

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Urobilinogen; ref Normal; text

### Cytology

#### `FNAC` — Fine Needle Aspiration Cytology (FNAC)

- Category: Pathology
- Specimen: Aspirate | Container: Sterile container
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Fine Needle Aspiration Cytology (FNAC)] Site; ref Not applicable (descriptive report); text
  - [Fine Needle Aspiration Cytology (FNAC)] Cytology Findings; ref No diagnostic abnormality / descriptive report; text
  - [Fine Needle Aspiration Cytology (FNAC)] Diagnosis; ref Not applicable (descriptive report); text

#### `FLUIDCYT` — Fluid Cytology

- Category: Pathology
- Specimen: Body Fluid | Container: Sterile container
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Fluid Cytology] Specimen; ref Not applicable (descriptive report); text
  - [Fluid Cytology] Cytology Findings; ref No diagnostic abnormality / descriptive report; text
  - [Fluid Cytology] Diagnosis; ref Not applicable (descriptive report); text

#### `PAP` — Pap Smear

- Category: Pathology
- Specimen: Cervical Smear | Container: Pap smear collection kit
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Pap Smear] Specimen Adequacy; ref Satisfactory for evaluation; text
  - [Pap Smear] Bethesda Interpretation; ref Negative for intraepithelial lesion or malignancy; text
  - [Pap Smear] Recommendation; ref Not applicable (descriptive report); text

#### `SPUTUMCYT` — Sputum Cytology

- Category: Pathology
- Specimen: Sputum | Container: Sterile container
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Sputum Cytology] Specimen; ref Not applicable (descriptive report); text
  - [Sputum Cytology] Cytology Findings; ref No diagnostic abnormality / descriptive report; text
  - [Sputum Cytology] Diagnosis; ref Not applicable (descriptive report); text

#### `URINECYT` — Urine Cytology

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Urine Cytology] Specimen; ref Not applicable (descriptive report); text
  - [Urine Cytology] Cytology Findings; ref No diagnostic abnormality / descriptive report; text
  - [Urine Cytology] Diagnosis; ref Not applicable (descriptive report); text

### Endocrinology

#### `ACTH` — ACTH

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - ACTH pg/mL; ref Adult morning: 7-63 pg/mL; numeric

#### `ALDO` — Aldosterone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Aldosterone ng/dL; ref Adult upright: 3-16 ng/dL (lab-specific); numeric

#### `ATG` — Anti-Thyroglobulin Antibody

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Anti-Thyroglobulin Antibody IU/mL; ref Adult: <40 IU/mL; numeric

#### `ATPO` — Anti-Thyroid Peroxidase Antibody

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Anti-Thyroid Peroxidase Antibody IU/mL; ref Adult: <35 IU/mL; numeric

#### `BHCG` — Beta Human Chorionic Gonadotropin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Beta Human Chorionic Gonadotropin mIU/mL; ref Non-pregnant adult: <5 mIU/mL; pregnancy interpreted by gestational age; numeric

#### `CPEP` — C-Peptide

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - C-Peptide ng/mL; ref Adult: 0.5-2.0 ng/mL; numeric

#### `CORT` — Cortisol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Cortisol ug/dL; ref Adult morning: 5-25 ug/dL; evening lower; numeric

#### `E2` — Estradiol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Estradiol pg/mL; ref Adult male: 10-40 pg/mL; adult female cycle/age-specific; numeric

#### `FSH` — Follicle Stimulating Hormone (FSH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Follicle Stimulating Hormone (FSH) mIU/mL; ref Adult male: 1.4-12.4 mIU/mL; adult female cycle/age-specific; numeric

#### `FT3` — Free T3

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Free T3 pg/mL; ref Adult: 2.3-4.2 pg/mL; numeric

#### `FT4` — Free T4

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Free T4 ng/dL; ref Adult: 0.8-1.8 ng/dL; numeric

#### `GH` — Growth Hormone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Growth Hormone ng/mL; ref Adult random: <5 ng/mL (dynamic testing lab-specific); numeric

#### `INSULIN` — Insulin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Insulin uIU/mL; ref Adult fasting: 2-25 uIU/mL; numeric

#### `IGF1` — Insulin-like Growth Factor 1 (IGF-1)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Insulin-like Growth Factor 1 (IGF-1) ng/mL; ref Age/sex-specific; report against reference chart; numeric

#### `LH` — Luteinising Hormone (LH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Luteinising Hormone (LH) mIU/mL; ref Adult male: 1.5-9.3 mIU/mL; adult female cycle/age-specific; numeric

#### `PTH` — Parathyroid Hormone (PTH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Parathyroid Hormone (PTH) pg/mL; ref Adult: 15-65 pg/mL; numeric

#### `PROG` — Progesterone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Progesterone ng/mL; ref Adult male: <1 ng/mL; adult female follicular <1, luteal 5-20 ng/mL; numeric

#### `PRL` — Prolactin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Prolactin ng/mL; ref Adult male: 4-15 ng/mL; adult female: 5-25 ng/mL; numeric

#### `RENIN` — Renin

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Renin ng/mL/hr; ref Adult upright: 0.2-2.8 ng/mL/hr (lab-specific); numeric

#### `TESTO` — Testosterone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Testosterone ng/dL; ref Adult male: 300-1000 ng/dL; adult female: 15-70 ng/dL; numeric

#### `T3` — Total T3

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total T3 ng/dL; ref Adult: 80-200 ng/dL; numeric

#### `T4` — Total T4

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total T4 ug/dL; ref Adult: 5-12 ug/dL; numeric

### Haematology

#### `AEC` — Absolute Eosinophil Count (AEC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser / microscopy | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Absolute Eosinophil Count cells/cmm; ref Adult: 40-440 cells/cmm; numeric

#### `APTT` — Activated Partial Thromboplastin Time (APTT)

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Coagulometer | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Activated Partial Thromboplastin Time (APTT) seconds; ref Adult: 25-35 seconds; numeric

#### `BGRH` — Blood Group and Rh Factor

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Slide agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [Blood Group & Rh] ABO Blood Group; ref Not applicable (report ABO group); text
  - [Blood Group & Rh] Rh Factor; ref Not applicable (report positive/negative); text

#### `CBC` — Complete Blood Count (CBC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹300.00 | GST: 0%
- Parameters (20):
  - [Complete Blood Count] Haemoglobin g/dL; ref Adult male: 13.0-17.0 g/dL; adult female: 12.0-15.0 g/dL; children 1-5y: 11.0-14.0 g/dL; children 6-12y: 11.5-15.5 g/dL; numeric
  - [Complete Blood Count] Total Leukocyte Count cells/cmm; ref Adult: 4,000-11,000 /cmm; numeric
  - [Complete Blood Count] Platelet Count cells/cmm; ref Adult: 1,50,000-4,50,000 /cmm; numeric
  - [Complete Blood Count] RBC Count million/cmm; ref Adult male: 4.5-5.9 million/cmm; adult female: 4.1-5.1 million/cmm; children 1-5y: 4.0-5.5; children 6-12y: 4.0-5.2 million/cmm; numeric
  - [Complete Blood Count] Haematocrit (HCT) %; ref Adult male: 40-52%; adult female: 36-48%; children 1-5y: 33-42%; children 6-12y: 35-45%; numeric
  - [Complete Blood Count] Mean Corpuscular Volume (MCV) fL; ref Adult: 80-100 fL; numeric
  - [Complete Blood Count] Mean Corpuscular Haemoglobin (MCH) pg; ref Adult: 27-32 pg; numeric
  - [Complete Blood Count] Mean Corpuscular Hb Concentration (MCHC) g/dL; ref Adult: 32-36 g/dL; numeric
  - [Complete Blood Count] RDW-CV %; ref Adult: 11.5-14.5%; numeric
  - [Complete Blood Count] RDW-SD fL; ref Adult: 35-56 fL (analyser-specific); numeric
  - [Complete Blood Count] Mean Platelet Volume (MPV) fL; ref Adult: 7.5-11.5 fL; numeric
  - [Complete Blood Count] Platelet Distribution Width (PDW) %; ref Adult: 9-17% (analyser-specific); numeric
  - [Complete Blood Count] Plateletcrit (PCT) %; ref Adult: 0.19-0.39%; numeric
  - [Complete Blood Count] Platelet Large Cell Ratio (P-LCR) %; ref Adult: 13-43%; numeric
  - [Complete Blood Count] Platelet Large Cell Count (P-LCC) 10^3/uL; ref Adult: 30-90 x10^3/uL; numeric
  - [Differential Leucocyte Count] Neutrophils %; ref Adult: 40-70%; numeric
  - [Differential Leucocyte Count] Lymphocytes %; ref Adult blood: 20-40%; numeric
  - [Differential Leucocyte Count] Eosinophils %; ref Adult: 1-6%; numeric
  - [Differential Leucocyte Count] Monocytes %; ref Adult: 2-10%; numeric
  - [Differential Leucocyte Count] Basophils %; ref Adult: 0-2%; numeric

#### `CROSS` — Crossmatch

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Tube method | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Crossmatch; ref Compatible; text

#### `DDIMER` — D-Dimer

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - D-Dimer ng/mL; ref Adult: <500 ng/mL FEU; numeric

#### `DC` — Differential Leucocyte Count (DLC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (5):
  - [Differential Leucocyte Count] Neutrophils %; ref Adult: 40-70%; numeric
  - [Differential Leucocyte Count] Lymphocytes %; ref Adult blood: 20-40%; numeric
  - [Differential Leucocyte Count] Eosinophils %; ref Adult: 1-6%; numeric
  - [Differential Leucocyte Count] Monocytes %; ref Adult: 2-10%; numeric
  - [Differential Leucocyte Count] Basophils %; ref Adult: 0-2%; numeric

#### `DCT` — Direct Coombs Test (DAT)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Direct Coombs Test (DAT); ref Negative; text

#### `ESR` — Erythrocyte Sedimentation Rate (ESR)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Westergren | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Erythrocyte Sedimentation Rate (ESR) mm/hr; ref Adult male: 0-15 mm/hr; adult female: 0-20 mm/hr; age-related increase possible; numeric

#### `FIB` — Fibrinogen

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Clauss method | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Fibrinogen mg/dL; ref Adult: 200-400 mg/dL; numeric

#### `G6PD` — G6PD Enzyme Activity

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - G6PD Enzyme Activity U/g Hb; ref Adult: 8-18 U/g Hb; numeric

#### `HB` — Haemoglobin

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹100.00 | GST: 0%
- Parameters (1):
  - Haemoglobin g/dL; ref Adult male: 13.0-17.0 g/dL; adult female: 12.0-15.0 g/dL; children 1-5y: 11.0-14.0 g/dL; children 6-12y: 11.5-15.5 g/dL; numeric

#### `HBELEC` — Haemoglobin Electrophoresis

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Electrophoresis | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [Haemoglobin Electrophoresis] Haemoglobin Pattern; ref Normal: HbA >95%, HbA2 2-3%, HbF <1% (age-specific in infants); text
  - [Haemoglobin Electrophoresis] Interpretation; ref Normal haemoglobin pattern; text

#### `ICT` — Indirect Coombs Test (IAT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Indirect Coombs Test (IAT); ref Negative; text

#### `MPS` — Malaria Parasite Smear

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Thick and thin smear | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (5):
  - [Malaria Parasite Smear] Parasite Species; ref No parasites seen; text
  - [Malaria Parasite Smear] Parasite Stage; ref Not applicable (no parasites seen); text
  - [Malaria Parasite Smear] Parasite Density /uL; ref 0/uL (no parasites seen); numeric
  - [Malaria Parasite Smear] RBC Parasitised %; ref 0%; numeric
  - [Malaria Parasite Smear] Interpretation; ref Negative for malaria parasites; text

#### `MCH` — Mean Corpuscular Haemoglobin (MCH)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Mean Corpuscular Haemoglobin (MCH) pg; ref Adult: 27-32 pg; numeric

#### `MCHC` — Mean Corpuscular Haemoglobin Concentration (MCHC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Mean Corpuscular Haemoglobin Concentration (MCHC) g/dL; ref Adult: 32-36 g/dL; numeric

#### `MCV` — Mean Corpuscular Volume (MCV)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Mean Corpuscular Volume (MCV) fL; ref Adult: 80-100 fL; numeric

#### `PCV` — Packed Cell Volume (PCV/HCT)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Packed Cell Volume (PCV/HCT) %; ref Adult male: 40-52%; adult female: 36-48%; children 1-5y: 33-42%; children 6-12y: 35-45%; numeric

#### `PSMEAR` — Peripheral Blood Smear

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (4):
  - [Peripheral Blood Smear] RBC Morphology; ref Normocytic, normochromic; text
  - [Peripheral Blood Smear] WBC Morphology; ref Normal / no significant abnormality; text
  - [Peripheral Blood Smear] Platelet Morphology; ref Normal / no significant abnormality; text
  - [Peripheral Blood Smear] Impression; ref No significant haematological abnormality; text

#### `PLT` — Platelet Count

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Platelet Count cells/cmm; ref Adult: 1,50,000-4,50,000 /cmm; numeric

#### `PTINR` — Prothrombin Time / INR (PT/INR)

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Coagulometer | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [Coagulation Profile] Prothrombin Time seconds; ref Adult: 11-13.5 seconds; numeric
  - [Coagulation Profile] INR ratio; ref Adult untreated: 0.8-1.2; numeric

#### `RDW` — Red Cell Distribution Width (RDW)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Red Cell Distribution Width (RDW) %; ref Adult: 11.5-14.5%; numeric

#### `RETIC` — Reticulocyte Count

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Supravital stain | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Reticulocyte Count %; ref Adult: 0.5-2.5%; numeric

#### `SICKLE` — Sickling Test

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Sodium metabisulphite | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Sickling Test; ref Negative; text

#### `TC` — Total Leucocyte Count (TLC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Leucocyte Count (TLC) cells/cmm; ref Adult: 4,000-11,000 /cmm; numeric

### Histopathology

#### `BIOPSYL` — Biopsy - Large

- Category: Pathology
- Specimen: Tissue | Container: Formalin container
- Method: Histopathology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (5):
  - [Biopsy - Large] Specimen; ref Not applicable (descriptive report); text
  - [Biopsy - Large] Gross Examination; ref Not applicable (descriptive report); text
  - [Biopsy - Large] Microscopic Examination; ref Not applicable (descriptive report); text
  - [Biopsy - Large] Diagnosis; ref Not applicable (descriptive report); text
  - [Biopsy - Large] Comment; ref Not applicable (descriptive report); text

#### `BIOPSY` — Biopsy - Small

- Category: Pathology
- Specimen: Tissue | Container: Formalin container
- Method: Histopathology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (5):
  - [Biopsy - Small] Specimen; ref Not applicable (descriptive report); text
  - [Biopsy - Small] Gross Examination; ref Not applicable (descriptive report); text
  - [Biopsy - Small] Microscopic Examination; ref Not applicable (descriptive report); text
  - [Biopsy - Small] Diagnosis; ref Not applicable (descriptive report); text
  - [Biopsy - Small] Comment; ref Not applicable (descriptive report); text

#### `BMA` — Bone Marrow Aspiration

- Category: Pathology
- Specimen: Bone Marrow | Container: Sterile container
- Method: Haematology / histopathology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (4):
  - [Bone Marrow Aspiration] Specimen; ref Not applicable (descriptive report); text
  - [Bone Marrow Aspiration] Cellularity; ref Normocellular marrow for age; text
  - [Bone Marrow Aspiration] Morphology; ref Normal / descriptive; text
  - [Bone Marrow Aspiration] Impression; ref Not applicable (descriptive report); text

#### `IHC` — Immunohistochemistry (IHC)

- Category: Pathology
- Specimen: Tissue | Container: Formalin container
- Method: IHC | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Immunohistochemistry (IHC)] Marker(s); ref Not applicable (descriptive report); text
  - [Immunohistochemistry (IHC)] Result; ref Negative / not detected (qualitative); text
  - [Immunohistochemistry (IHC)] Interpretation; ref Not applicable (clinical interpretation); text

#### `SPECIAL` — Special Stain

- Category: Pathology
- Specimen: Tissue | Container: Formalin container
- Method: Histochemistry | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Special Stain] Stain; ref Not applicable (descriptive report); text
  - [Special Stain] Result; ref Negative / not detected (qualitative); text
  - [Special Stain] Interpretation; ref Not applicable (clinical interpretation); text

### Microbiology

#### `AFB` — Acid Fast Bacilli (AFB) Smear

- Category: Pathology
- Specimen: Sputum | Container: Sterile container
- Method: Ziehl-Neelsen | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [Acid Fast Bacilli (AFB) Smear] AFB Result; ref Negative (no AFB seen); text
  - [Acid Fast Bacilli (AFB) Smear] Grading; ref Negative / grading reported if positive; text

#### `CULTUREAS` — Antibiotic Sensitivity

- Category: Pathology
- Specimen: Isolate | Container: Culture plate
- Method: Disc diffusion / MIC | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `BLOODC` — Blood Culture

- Category: Pathology
- Specimen: Blood | Container: Blood culture bottle
- Method: Automated culture | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `CSFC` — CSF Culture

- Category: Pathology
- Specimen: CSF | Container: Sterile container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `FUNGC` — Fungal Culture

- Category: Pathology
- Specimen: Specimen | Container: Sterile container
- Method: Culture | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `GRAM` — Gram Stain

- Category: Pathology
- Specimen: Specimen | Container: Sterile container
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [Gram Stain] Gram Stain Result; ref No organisms seen; text
  - [Gram Stain] Organism Seen; ref None seen; text

#### `HPSA` — Helicobacter pylori Stool Antigen

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Immunochromatography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Helicobacter pylori Stool Antigen; ref Negative; text

#### `KOH` — KOH Mount

- Category: Pathology
- Specimen: Skin / Nail / Hair | Container: Sterile container
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [KOH Mount] KOH Result; ref No fungal elements seen; text
  - [KOH Mount] Fungal Elements; ref Not seen; text

#### `MRSA` — MRSA Screen

- Category: Pathology
- Specimen: Nasal Swab | Container: Amies transport swab
- Method: Culture | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [MRSA Screen] MRSA Screen Result; ref Not detected; text
  - [MRSA Screen] Organism Isolated; ref No growth / no pathogen isolated; text

#### `PUSC` — Pus Culture

- Category: Pathology
- Specimen: Pus | Container: Sterile container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `SPUTUMC` — Sputum Culture

- Category: Pathology
- Specimen: Sputum | Container: Sterile container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `STOOLC` — Stool Culture

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `THROATC` — Throat Swab Culture

- Category: Pathology
- Specimen: Throat Swab | Container: Amies transport swab
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `URINEC` — Urine Culture

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

#### `VRE` — VRE Screen

- Category: Pathology
- Specimen: Rectal Swab | Container: Amies transport swab
- Method: Culture | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [VRE Screen] VRE Screen Result; ref Not detected; text
  - [VRE Screen] Organism Isolated; ref No growth / no pathogen isolated; text

#### `WOUNDC` — Wound Swab Culture

- Category: Pathology
- Specimen: Wound Swab | Container: Amies transport swab
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Culture & Sensitivity] Organism Isolated; ref No growth / no pathogen isolated; text
  - [Culture & Sensitivity] Colony Count; ref No significant growth; text
  - [Culture & Sensitivity] Antibiotic Sensitivity; ref Reported as susceptible / intermediate / resistant; text

### Molecular Diagnostics

#### `CMVDNA` — CMV DNA

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Real-time PCR | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - CMV DNA copies/mL; ref Not detected; numeric

#### `EBVDNA` — EBV DNA

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Real-time PCR | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - EBV DNA copies/mL; ref Not detected; numeric

#### `HBVDNA` — Hepatitis B Viral Load (HBV DNA)

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Real-time PCR | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Hepatitis B Viral Load (HBV DNA) IU/mL; ref Not detected / below limit of quantification; numeric

#### `HCVRNA` — Hepatitis C Viral Load (HCV RNA)

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Real-time PCR | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Hepatitis C Viral Load (HCV RNA) IU/mL; ref Not detected / below limit of quantification; numeric

#### `HPVDNA` — HPV DNA

- Category: Pathology
- Specimen: Cervical Swab | Container: HPV collection kit
- Method: PCR | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - HPV DNA; ref Not detected; text

#### `TBPCR` — Tuberculosis PCR

- Category: Pathology
- Specimen: Sputum / Tissue | Container: Sterile container
- Method: PCR | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Tuberculosis PCR; ref Not detected; text

### Serology

#### `DSDNA` — Anti-dsDNA

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Anti-dsDNA IU/mL; ref Adult: <30 IU/mL (negative); numeric

#### `ASO` — Anti-Streptolysin O (ASO)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Anti-Streptolysin O (ASO) IU/mL; ref Adult: <200 IU/mL; numeric

#### `ANA` — Antinuclear Antibody (ANA)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunofluorescence / ELISA | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [Antinuclear Antibody (ANA)] ANA Pattern; ref Negative / no significant pattern; text
  - [Antinuclear Antibody (ANA)] ANA Titre; ref Negative (<1:40); report titre if positive; text

#### `BRUCELLA` — Brucella Agglutination

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Brucella Agglutination; ref Negative (<1:80); text

#### `CRP` — C-Reactive Protein (CRP)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - C-Reactive Protein (CRP) mg/L; ref Adult: <5 mg/L; numeric

#### `C3` — Complement C3

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Complement C3 mg/dL; ref Adult: 90-180 mg/dL; numeric

#### `C4` — Complement C4

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Complement C4 mg/dL; ref Adult: 10-40 mg/dL; numeric

#### `DENGUE` — Dengue NS1 / IgM / IgG

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Dengue Serology] Dengue NS1 Antigen; ref Negative; text
  - [Dengue Serology] Dengue IgM Antibody; ref Negative; text
  - [Dengue Serology] Dengue IgG Antibody; ref Negative; text

#### `HPYL` — Helicobacter pylori IgG

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Helicobacter pylori IgG; ref Negative; text

#### `HBSAG` — Hepatitis B Surface Antigen (HBsAg)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Hepatitis B Surface Antigen (HBsAg); ref Non-reactive; text

#### `HCV` — Hepatitis C Antibody

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Hepatitis C Antibody; ref Non-reactive; text

#### `HIV` — HIV 1 and 2 Antibodies

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - HIV 1 and 2 Antibodies; ref Non-reactive; text

#### `LEPTO` — Leptospira IgM

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Leptospira IgM; ref Negative; text

#### `MPAG` — Malaria Antigen (Pf/Pan)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Rapid immunochromatography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - [Malaria Antigen (Pf/Pan)] Pf Antigen; ref Negative; text
  - [Malaria Antigen (Pf/Pan)] Pan Antigen; ref Negative; text
  - [Malaria Antigen (Pf/Pan)] Interpretation; ref Negative; text

#### `RF` — Rheumatoid Factor (RF)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Rheumatoid Factor (RF) IU/mL; ref Adult: <20 IU/mL; numeric

#### `IGRA` — TB Interferon Gamma Release Assay

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: IGRA | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - TB Interferon Gamma Release Assay; ref Negative; text

#### `TPHA` — TPHA

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [TPHA] TPHA Result; ref Non-reactive; text
  - [TPHA] TPHA Titre; ref Non-reactive; text

#### `TYPHI` — Typhoid IgM

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Typhoid IgM; ref Negative; text

#### `VDRL` — VDRL

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Flocculation | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - [VDRL] VDRL Result; ref Non-reactive; text
  - [VDRL] VDRL Titre; ref Non-reactive; text

#### `WIDAL` — Widal Test

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (8):
  - [Widal Agglutination] S. typhi O; ref Negative (<1:80); text
  - [Widal Agglutination] S. typhi H; ref Negative (<1:80); text
  - [Widal Agglutination] S. paratyphi AH; ref Negative (<1:80); text
  - [Widal Agglutination] S. paratyphi BH; ref Negative (<1:80); text
  - [Widal Agglutination] S. paratyphi AO; ref Negative (<1:80); text
  - [Widal Agglutination] S. paratyphi BO; ref Negative (<1:80); text
  - [Widal Agglutination] S. typhi Vi; ref Negative (<1:80); text
  - [Interpretation] Interpretation; ref Negative / no significant agglutination; text

## X-ray / Radiography

### Radiology

#### `BARIUM` — Barium Swallow / Meal / Enema

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `CXL` — Chest X-Ray Lateral View

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹300.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `CXRPA` — Chest X-Ray PA and Lateral View

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `CXP` — Chest X-Ray PA View

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹300.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `DEXA` — DEXA Bone Density Scan

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `HSG` — Hysterosalpingography (HSG)

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `IVP` — Intravenous Pyelogram (IVP)

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `MAMMO` — Mammography - Both Breasts

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `MCU` — Micturating Cystourethrogram (MCU)

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `OPG` — Orthopantomogram (OPG)

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `ABDE` — X-Ray Abdomen Erect

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `ABXP` — X-Ray Abdomen PA View

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹350.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `ABDS` — X-Ray Abdomen Supine

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `ANKLE` — X-Ray Ankle AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `BONEAGE` — X-Ray Bone Age

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `CSPINEAP` — X-Ray Cervical Spine AP

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `CSPINELAT` — X-Ray Cervical Spine Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `CLAVICLE` — X-Ray Clavicle

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `DSPINE` — X-Ray Dorsal Spine AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `ELBOW` — X-Ray Elbow AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `FEMUR` — X-Ray Femur AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `FOOT` — X-Ray Foot AP / Oblique

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `FOREARM` — X-Ray Forearm AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `FOREIGN` — X-Ray Foreign Body Localisation

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `HAND` — X-Ray Hand AP / Oblique

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `HIP` — X-Ray Hip AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `HUMERUS` — X-Ray Humerus AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `KNEE` — X-Ray Knee AP & Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹400.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `KUB` — X-Ray KUB

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `LSPINE` — X-Ray Lumbar Spine AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `MANDIBLE` — X-Ray Mandible AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `PNS` — X-Ray Paranasal Sinuses

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `PELVIS` — X-Ray Pelvis AP

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `RIBS` — X-Ray Ribs

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `SIJOINT` — X-Ray Sacroiliac Joints

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `SACRUM` — X-Ray Sacrum / Coccyx

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `SHOULDER` — X-Ray Shoulder AP

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `SKELSURV` — X-Ray Skeletal Survey

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `SKULL` — X-Ray Skull AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `STERNUM` — X-Ray Sternum

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `TMJ` — X-Ray Temporomandibular Joint

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `TIBFIB` — X-Ray Tibia / Fibula AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)

#### `WRIST` — X-Ray Wrist AP / Lateral

- Category: X-Ray
- Specimen: — | Container: —
- Method: Radiography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters: **none** (text-only/radiology report)
