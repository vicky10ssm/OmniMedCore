# OmniMed Core starter test catalogue

Generated: 2026-11-07

> This is a generated snapshot. If it disagrees with the database/code, fix the source and regenerate.
> Source of truth: `src/db/starterTests.ts`, `src/db/starterParameters.ts` and
> `src/db/starterPackages.ts`.

## Counts

- Tests: **227**
- Pathology: **184**
- X-ray: **43**
- Other: **0**
- Active parameters: **371**
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
  - pH; numeric
  - pCO2 mmHg; numeric
  - pO2 mmHg; numeric
  - HCO3 mmol/L; numeric
  - Base Excess mmol/L; numeric
  - O2 Saturation %; numeric
  - Lactate mmol/L; numeric
  - Sodium mmol/L; numeric
  - Potassium mmol/L; numeric
  - Ionised Calcium mmol/L; numeric
  - Glucose mg/dL; numeric
  - FiO2 %; numeric
  - Interpretation; text

### Clinical Biochemistry

#### `U24CREAT` — 24 Hour Urine Creatinine

- Category: Pathology
- Specimen: 24 Hour Urine | Container: Sterile urine container
- Method: Jaffe | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - 24 Hour Urine Creatinine mg/24h; numeric

#### `U24PROT` — 24 Hour Urine Protein

- Category: Pathology
- Specimen: 24 Hour Urine | Container: Sterile urine container
- Method: Spectrophotometry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - 24 Hour Urine Protein mg/24h; numeric

#### `ALB` — Albumin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: BCG | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Albumin g/dL; numeric

#### `AGRATIO` — Albumin / Globulin Ratio

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Albumin / Globulin Ratio ratio; numeric

#### `ALP` — Alkaline Phosphatase (ALP)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Alkaline Phosphatase (ALP) U/L; numeric

#### `AMMONIA` — Ammonia

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Ammonia umol/L; numeric

#### `APOA1` — Apolipoprotein A1

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Apolipoprotein A1 mg/dL; numeric

#### `APOB` — Apolipoprotein B

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Apolipoprotein B mg/dL; numeric

#### `HCO3` — Bicarbonate

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated / enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Bicarbonate mmol/L; numeric

#### `FBS` — Blood Sugar Fasting

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: numeric
- Price: ₹100.00 | GST: 0%
- Parameters (1):
  - Blood Sugar Fasting mg/dL; ref 70 - 100; numeric

#### `PPBS` — Blood Sugar Post Prandial

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Spectrophotometry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Blood Sugar Post Prandial mg/dL; numeric

#### `RBS` — Blood Sugar Random

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: numeric
- Price: ₹100.00 | GST: 0%
- Parameters (1):
  - Blood Sugar Random mg/dL; ref 70 - 140; numeric

#### `UREA` — Blood Urea

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Urease / spectrophotometry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Blood Urea mg/dL; numeric

#### `BUN` — Blood Urea Nitrogen (BUN)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Urease / spectrophotometry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Blood Urea Nitrogen (BUN) mg/dL; numeric

#### `BNP` — BNP

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - BNP pg/mL; numeric

#### `CA` — Calcium

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Arsenazo III | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Calcium mg/dL; numeric

#### `CL` — Chloride

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ISE | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Chloride mmol/L; numeric

#### `CK` — Creatine Kinase (CK)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Creatine Kinase (CK) U/L; numeric

#### `CKMB` — Creatine Kinase MB (CK-MB)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoinhibition | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Creatine Kinase MB (CK-MB) U/L; numeric

#### `CREATCLEAR` — Creatinine Clearance

- Category: Pathology
- Specimen: 24 Hour Urine | Container: Sterile urine container
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Creatinine Clearance mL/min; numeric

#### `DBIL` — Direct Bilirubin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Diazo | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Direct Bilirubin mg/dL; numeric

#### `EGFR` — Estimated GFR (eGFR)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Estimated GFR (eGFR) mL/min/1.73m2; numeric

#### `FOLATE` — Folate

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Folate ng/mL; numeric

#### `GGT` — Gamma Glutamyl Transferase (GGT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Gamma Glutamyl Transferase (GGT) U/L; numeric

#### `GLOB` — Globulin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Globulin g/dL; numeric

#### `HBA1C` — Glycated Haemoglobin (HbA1c)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: numeric
- Price: ₹550.00 | GST: 0%
- Parameters (1):
  - Glycated Haemoglobin (HbA1c) %; ref < 5.7; numeric

#### `HDL` — HDL Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Direct / precipitation | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - HDL Cholesterol mg/dL; numeric

#### `HSCRP` — High Sensitivity CRP (hs-CRP)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - High Sensitivity CRP (hs-CRP) mg/L; numeric

#### `HOMOCYS` — Homocysteine

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Homocysteine umol/L; numeric

#### `IBIL` — Indirect Bilirubin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Indirect Bilirubin mg/dL; numeric

#### `KFT` — Kidney Function Test (KFT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: text
- Price: ₹500.00 | GST: 0%
- Parameters (9):
  - Blood Urea mg/dL; ref 17 - 43; numeric
  - Blood Urea Nitrogen (BUN) mg/dL; ref 8 - 20; numeric
  - Serum Creatinine mg/dL; ref 0.6 - 1.3; numeric
  - Uric Acid mg/dL; ref 3.5 - 7.2; numeric
  - Sodium mmol/L; ref 135 - 145; numeric
  - Potassium mmol/L; ref 3.5 - 5.1; numeric
  - Chloride mmol/L; ref 98 - 107; numeric
  - Calcium mg/dL; ref 8.5 - 10.5; numeric
  - Phosphorus mg/dL; ref 2.5 - 4.5; numeric

#### `LACTATE` — Lactate

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Lactate mmol/L; numeric

#### `LDH` — Lactate Dehydrogenase (LDH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Lactate Dehydrogenase (LDH) U/L; numeric

#### `LDL` — LDL Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated / direct | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - LDL Cholesterol mg/dL; numeric

#### `LIPID` — Lipid Profile

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: text
- Price: ₹400.00 | GST: 0%
- Parameters (8):
  - Total Cholesterol mg/dL; ref < 200; numeric
  - Triglycerides mg/dL; ref < 150; numeric
  - HDL Cholesterol mg/dL; ref > 40; numeric
  - LDL Cholesterol mg/dL; ref < 100; numeric
  - VLDL Cholesterol mg/dL; ref 10 - 40; numeric
  - Non-HDL Cholesterol mg/dL; ref < 130; numeric
  - Total Cholesterol / HDL Ratio ratio; ref < 4.5; numeric
  - LDL / HDL Ratio ratio; ref < 3.0; numeric

#### `LPA` — Lipoprotein(a)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Lipoprotein(a) mg/dL; numeric

#### `LFT` — Liver Function Test (LFT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: text
- Price: ₹500.00 | GST: 0%
- Parameters (11):
  - Bilirubin Total mg/dL; ref 0.2 - 1.2; numeric
  - Bilirubin Direct mg/dL; ref 0.0 - 0.3; numeric
  - Bilirubin Indirect mg/dL; ref 0.1 - 1.0; numeric
  - SGOT (AST) U/L; ref 5 - 40; numeric
  - SGPT (ALT) U/L; ref 5 - 41; numeric
  - Alkaline Phosphatase U/L; ref 40 - 130; numeric
  - Gamma GT (GGT) U/L; ref 0 - 50; numeric
  - Total Protein g/dL; ref 6.0 - 8.3; numeric
  - Albumin g/dL; ref 3.5 - 5.2; numeric
  - Globulin g/dL; ref 2.0 - 3.5; numeric
  - Albumin / Globulin Ratio ratio; ref 1.0 - 2.2; numeric

#### `MG` — Magnesium

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Xylidyl blue | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Magnesium mg/dL; numeric

#### `NONHDL` — Non-HDL Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Non-HDL Cholesterol mg/dL; numeric

#### `NTPROBNP` — NT-proBNP

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - NT-proBNP pg/mL; numeric

#### `PHOS` — Phosphorus

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Molybdate | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Phosphorus mg/dL; numeric

#### `K` — Potassium

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ISE | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Potassium mmol/L; numeric

#### `AMYLASE` — Serum Amylase

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Amylase U/L; numeric

#### `CREAT` — Serum Creatinine

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Jaffe / enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Creatinine mg/dL; numeric

#### `FERRITIN` — Serum Ferritin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Ferritin ng/mL; numeric

#### `IRON` — Serum Iron

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Ferrozine | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Iron ug/dL; numeric

#### `LIPASE` — Serum Lipase

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Lipase U/L; numeric

#### `URIC` — Serum Uric Acid

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Uricase | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Serum Uric Acid mg/dL; numeric

#### `SGOT` — SGOT (AST)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - SGOT (AST) U/L; numeric

#### `SGPT` — SGPT (ALT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: IFCC | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - SGPT (ALT) U/L; numeric

#### `NA` — Sodium

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ISE | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Sodium mmol/L; numeric

#### `TSH` — Thyroid Stimulating Hormone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: — | Report type: numeric
- Price: ₹250.00 | GST: 0%
- Parameters (1):
  - Thyroid Stimulating Hormone mIU/L; ref 0.4 - 4.0; numeric

#### `TBIL` — Total Bilirubin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Diazo | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Bilirubin mg/dL; numeric

#### `CHOL` — Total Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Cholesterol mg/dL; numeric

#### `TIBC` — Total Iron Binding Capacity (TIBC)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Saturation / calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Iron Binding Capacity (TIBC) ug/dL; numeric

#### `TP` — Total Protein

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Biuret | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Protein g/dL; numeric

#### `TG` — Triglycerides

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Triglycerides mg/dL; numeric

#### `TROPI` — Troponin I

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Troponin I ng/mL; numeric

#### `TROPT` — Troponin T

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Troponin T ng/mL; numeric

#### `UACR` — Urine Albumin / Creatinine Ratio

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Albumin / Creatinine Ratio mg/g; numeric

#### `MICROALB` — Urine Microalbumin

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Microalbumin mg/L; numeric

#### `B12` — Vitamin B12

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Vitamin B12 pg/mL; numeric

#### `VITD` — Vitamin D (25-OH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Vitamin D (25-OH) ng/mL; numeric

#### `VLDL` — VLDL Cholesterol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Calculated | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - VLDL Cholesterol mg/dL; numeric

### Clinical Pathology

#### `ASCITES` — Ascitic Fluid Analysis

- Category: Pathology
- Specimen: Ascitic Fluid | Container: Sterile container
- Method: Biochemistry and cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (7):
  - Appearance; text
  - Protein g/dL; numeric
  - Glucose mg/dL; numeric
  - Cell Count /cmm; numeric
  - Polymorphs %; numeric
  - Lymphocytes %; numeric
  - Serum-Ascites Albumin Gradient g/dL; numeric

#### `CSFA` — CSF Analysis

- Category: Pathology
- Specimen: CSF | Container: Sterile container
- Method: Biochemistry, cytology and microbiology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (8):
  - Appearance; text
  - Protein mg/dL; numeric
  - Glucose mg/dL; numeric
  - Cell Count /cmm; numeric
  - Polymorphs %; numeric
  - Lymphocytes %; numeric
  - Chloride mmol/L; numeric
  - ADA U/L; numeric

#### `CALPRO` — Fecal Calprotectin

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: ELISA | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Fecal Calprotectin ug/g; numeric

#### `PLEURA` — Pleural Fluid Analysis

- Category: Pathology
- Specimen: Pleural Fluid | Container: Sterile container
- Method: Biochemistry and cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (8):
  - Appearance; text
  - Protein g/dL; numeric
  - Glucose mg/dL; numeric
  - Cell Count /cmm; numeric
  - Polymorphs %; numeric
  - Lymphocytes %; numeric
  - LDH U/L; numeric
  - ADA U/L; numeric

#### `SEMEN` — Semen Analysis

- Category: Pathology
- Specimen: Semen | Container: Sterile container
- Method: Macroscopy and microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (8):
  - Volume mL; numeric
  - pH; numeric
  - Sperm Count million/mL; numeric
  - Total Motility %; numeric
  - Progressive Motility %; numeric
  - Normal Morphology %; numeric
  - Leucocytes million/mL; numeric
  - Liquefaction Time minutes; numeric

#### `SOB` — Stool Occult Blood

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Immunochromatography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Stool Occult Blood; text

#### `OVA` — Stool Ova and Cyst

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - Ova; text
  - Cyst; text

#### `SRED` — Stool Reducing Substances

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Benedict method | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Stool Reducing Substances; text

#### `STOOL` — Stool Routine Examination

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Macroscopy and microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (6):
  - Colour; text
  - Consistency; text
  - Ova / Cyst; text
  - Occult Blood; text
  - Pus Cells /hpf; numeric
  - Epithelial Cells /hpf; numeric

#### `SYNOVIAL` — Synovial Fluid Analysis

- Category: Pathology
- Specimen: Synovial Fluid | Container: Sterile container
- Method: Biochemistry and microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (6):
  - Appearance; text
  - Leucocyte Count /cmm; numeric
  - Polymorphs %; numeric
  - Protein g/dL; numeric
  - Glucose mg/dL; numeric
  - Crystals; text

#### `UBIL` — Urine Bilirubin

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Bilirubin; text

#### `UGLUC` — Urine Glucose

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Glucose; text

#### `UKET` — Urine Ketones

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Ketones; text

#### `ULE` — Urine Leukocyte Esterase

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Leukocyte Esterase; text

#### `UMICRO` — Urine Microscopy

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (6):
  - Pus Cells /hpf; numeric
  - Red Blood Cells /hpf; numeric
  - Epithelial Cells /hpf; numeric
  - Casts; text
  - Crystals; text
  - Bacteria; text

#### `UNIT` — Urine Nitrite

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Nitrite; text

#### `UPREG` — Urine Pregnancy Test (hCG)

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Immunochromatography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Pregnancy Test (hCG); text

#### `UPROT` — Urine Protein

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Protein; text

#### `URINE` — Urine Routine Examination

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick and microscopy | Report type: text
- Price: ₹150.00 | GST: 0%
- Parameters (18):
  - Colour; ref Pale yellow; text
  - Appearance; ref Clear; text
  - pH; ref 4.6 - 8.0; numeric
  - Specific Gravity; ref 1.005 - 1.030; numeric
  - Protein; ref Negative; text
  - Glucose; ref Negative; text
  - Ketones; ref Negative; text
  - Blood; ref Negative; text
  - Bilirubin; ref Negative; text
  - Urobilinogen; ref Normal; text
  - Nitrite; ref Negative; text
  - Leucocyte Esterase; ref Negative; text
  - Pus Cells /hpf; ref 0 - 5; numeric
  - Red Blood Cells /hpf; ref 0 - 2; numeric
  - Epithelial Cells /hpf; ref Occasional; text
  - Casts /lpf; ref Absent; text
  - Crystals /hpf; ref Absent; text
  - Bacteria /hpf; ref Absent; text

#### `UURO` — Urine Urobilinogen

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Dipstick | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Urine Urobilinogen; text

### Cytology

#### `FNAC` — Fine Needle Aspiration Cytology (FNAC)

- Category: Pathology
- Specimen: Aspirate | Container: Sterile container
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Site; text
  - Cytology Findings; text
  - Diagnosis; text

#### `FLUIDCYT` — Fluid Cytology

- Category: Pathology
- Specimen: Body Fluid | Container: Sterile container
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Specimen; text
  - Cytology Findings; text
  - Diagnosis; text

#### `PAP` — Pap Smear

- Category: Pathology
- Specimen: Cervical Smear | Container: Pap smear collection kit
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Specimen Adequacy; text
  - Bethesda Interpretation; text
  - Recommendation; text

#### `SPUTUMCYT` — Sputum Cytology

- Category: Pathology
- Specimen: Sputum | Container: Sterile container
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Specimen; text
  - Cytology Findings; text
  - Diagnosis; text

#### `URINECYT` — Urine Cytology

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Cytology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Specimen; text
  - Cytology Findings; text
  - Diagnosis; text

### Endocrinology

#### `ACTH` — ACTH

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - ACTH pg/mL; numeric

#### `ALDO` — Aldosterone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Aldosterone ng/dL; numeric

#### `ATG` — Anti-Thyroglobulin Antibody

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Anti-Thyroglobulin Antibody IU/mL; numeric

#### `ATPO` — Anti-Thyroid Peroxidase Antibody

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Anti-Thyroid Peroxidase Antibody IU/mL; numeric

#### `BHCG` — Beta Human Chorionic Gonadotropin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Beta Human Chorionic Gonadotropin mIU/mL; numeric

#### `CPEP` — C-Peptide

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - C-Peptide ng/mL; numeric

#### `CORT` — Cortisol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Cortisol ug/dL; numeric

#### `E2` — Estradiol

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Estradiol pg/mL; numeric

#### `FSH` — Follicle Stimulating Hormone (FSH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Follicle Stimulating Hormone (FSH) mIU/mL; numeric

#### `FT3` — Free T3

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Free T3 pg/mL; numeric

#### `FT4` — Free T4

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Free T4 ng/dL; numeric

#### `GH` — Growth Hormone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Growth Hormone ng/mL; numeric

#### `INSULIN` — Insulin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Insulin uIU/mL; numeric

#### `IGF1` — Insulin-like Growth Factor 1 (IGF-1)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Insulin-like Growth Factor 1 (IGF-1) ng/mL; numeric

#### `LH` — Luteinising Hormone (LH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Luteinising Hormone (LH) mIU/mL; numeric

#### `PTH` — Parathyroid Hormone (PTH)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Parathyroid Hormone (PTH) pg/mL; numeric

#### `PROG` — Progesterone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Progesterone ng/mL; numeric

#### `PRL` — Prolactin

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Prolactin ng/mL; numeric

#### `RENIN` — Renin

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Renin ng/mL/hr; numeric

#### `TESTO` — Testosterone

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Testosterone ng/dL; numeric

#### `T3` — Total T3

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total T3 ng/dL; numeric

#### `T4` — Total T4

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Chemiluminescence | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total T4 ug/dL; numeric

### Haematology

#### `APTT` — Activated Partial Thromboplastin Time (APTT)

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Coagulometer | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Activated Partial Thromboplastin Time (APTT) seconds; numeric

#### `BGRH` — Blood Group and Rh Factor

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Slide agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - ABO Blood Group; text
  - Rh Factor; text

#### `CBC` — Complete Blood Count (CBC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹300.00 | GST: 0%
- Parameters (14):
  - Haemoglobin g/dL; ref 12.0 - 16.0 (adult); numeric
  - Total Leukocyte Count cells/cmm; ref 4,000 - 11,000; numeric
  - Platelet Count cells/cmm; ref 1,50,000 - 4,50,000; numeric
  - RBC Count million/cmm; ref 4.2 - 5.9 (adult); numeric
  - Packed Cell Volume (PCV) %; ref 36 - 46 (adult); numeric
  - Mean Corpuscular Volume (MCV) fL; ref 80 - 100; numeric
  - Mean Corpuscular Haemoglobin (MCH) pg; ref 27 - 32; numeric
  - Mean Corpuscular Hb Concentration (MCHC) g/dL; ref 32 - 36; numeric
  - Red Cell Distribution Width (RDW) %; ref 11.5 - 14.5; numeric
  - Neutrophils %; ref 40 - 70; numeric
  - Lymphocytes %; ref 20 - 40; numeric
  - Eosinophils %; ref 1 - 6; numeric
  - Monocytes %; ref 2 - 10; numeric
  - Basophils %; ref 0 - 2; numeric

#### `CROSS` — Crossmatch

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Tube method | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Crossmatch; text

#### `DDIMER` — D-Dimer

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - D-Dimer ng/mL; numeric

#### `DC` — Differential Leucocyte Count (DLC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (5):
  - Neutrophils %; numeric
  - Lymphocytes %; numeric
  - Eosinophils %; numeric
  - Monocytes %; numeric
  - Basophils %; numeric

#### `DCT` — Direct Coombs Test (DAT)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Direct Coombs Test (DAT); text

#### `ESR` — Erythrocyte Sedimentation Rate (ESR)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Westergren | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Erythrocyte Sedimentation Rate (ESR) mm/hr; numeric

#### `FIB` — Fibrinogen

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Clauss method | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Fibrinogen mg/dL; numeric

#### `G6PD` — G6PD Enzyme Activity

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Enzymatic | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - G6PD Enzyme Activity U/g Hb; numeric

#### `HB` — Haemoglobin

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹100.00 | GST: 0%
- Parameters (1):
  - Haemoglobin g/dL; ref 12 - 16; numeric

#### `HBELEC` — Haemoglobin Electrophoresis

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Electrophoresis | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - Haemoglobin Pattern; text
  - Interpretation; text

#### `ICT` — Indirect Coombs Test (IAT)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Indirect Coombs Test (IAT); text

#### `MPS` — Malaria Parasite Smear

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Thick and thin smear | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (5):
  - Parasite Species; text
  - Parasite Stage; text
  - Parasite Density /uL; numeric
  - RBC Parasitised %; numeric
  - Interpretation; text

#### `MCH` — Mean Corpuscular Haemoglobin (MCH)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Mean Corpuscular Haemoglobin (MCH) pg; numeric

#### `MCHC` — Mean Corpuscular Haemoglobin Concentration (MCHC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Mean Corpuscular Haemoglobin Concentration (MCHC) g/dL; numeric

#### `MCV` — Mean Corpuscular Volume (MCV)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Mean Corpuscular Volume (MCV) fL; numeric

#### `PCV` — Packed Cell Volume (PCV/HCT)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Packed Cell Volume (PCV/HCT) %; numeric

#### `PSMEAR` — Peripheral Blood Smear

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (4):
  - RBC Morphology; text
  - WBC Morphology; text
  - Platelet Morphology; text
  - Impression; text

#### `PLT` — Platelet Count

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Platelet Count cells/cmm; numeric

#### `PTINR` — Prothrombin Time / INR (PT/INR)

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Coagulometer | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - Prothrombin Time seconds; numeric
  - INR ratio; numeric

#### `RDW` — Red Cell Distribution Width (RDW)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Red Cell Distribution Width (RDW) %; numeric

#### `RETIC` — Reticulocyte Count

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Supravital stain | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Reticulocyte Count %; numeric

#### `SICKLE` — Sickling Test

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Sodium metabisulphite | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Sickling Test; text

#### `TC` — Total Leucocyte Count (TLC)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Automated analyser | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Total Leucocyte Count (TLC) cells/cmm; numeric

### Histopathology

#### `BIOPSYL` — Biopsy - Large

- Category: Pathology
- Specimen: Tissue | Container: Formalin container
- Method: Histopathology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (5):
  - Specimen; text
  - Gross Examination; text
  - Microscopic Examination; text
  - Diagnosis; text
  - Comment; text

#### `BIOPSY` — Biopsy - Small

- Category: Pathology
- Specimen: Tissue | Container: Formalin container
- Method: Histopathology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (5):
  - Specimen; text
  - Gross Examination; text
  - Microscopic Examination; text
  - Diagnosis; text
  - Comment; text

#### `BMA` — Bone Marrow Aspiration

- Category: Pathology
- Specimen: Bone Marrow | Container: Sterile container
- Method: Haematology / histopathology | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (4):
  - Specimen; text
  - Cellularity; text
  - Morphology; text
  - Impression; text

#### `IHC` — Immunohistochemistry (IHC)

- Category: Pathology
- Specimen: Tissue | Container: Formalin container
- Method: IHC | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Marker(s); text
  - Result; text
  - Interpretation; text

#### `SPECIAL` — Special Stain

- Category: Pathology
- Specimen: Tissue | Container: Formalin container
- Method: Histochemistry | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Stain; text
  - Result; text
  - Interpretation; text

### Microbiology

#### `AFB` — Acid Fast Bacilli (AFB) Smear

- Category: Pathology
- Specimen: Sputum | Container: Sterile container
- Method: Ziehl-Neelsen | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - AFB Result; text
  - Grading; text

#### `CULTUREAS` — Antibiotic Sensitivity

- Category: Pathology
- Specimen: Isolate | Container: Culture plate
- Method: Disc diffusion / MIC | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - Organism Isolated; text
  - Antibiotic Sensitivity; text

#### `BLOODC` — Blood Culture

- Category: Pathology
- Specimen: Blood | Container: Blood culture bottle
- Method: Automated culture | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

#### `CSFC` — CSF Culture

- Category: Pathology
- Specimen: CSF | Container: Sterile container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

#### `FUNGC` — Fungal Culture

- Category: Pathology
- Specimen: Specimen | Container: Sterile container
- Method: Culture | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

#### `GRAM` — Gram Stain

- Category: Pathology
- Specimen: Specimen | Container: Sterile container
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - Gram Stain Result; text
  - Organism Seen; text

#### `HPSA` — Helicobacter pylori Stool Antigen

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Immunochromatography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Helicobacter pylori Stool Antigen; text

#### `KOH` — KOH Mount

- Category: Pathology
- Specimen: Skin / Nail / Hair | Container: Sterile container
- Method: Microscopy | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - KOH Result; text
  - Fungal Elements; text

#### `MRSA` — MRSA Screen

- Category: Pathology
- Specimen: Nasal Swab | Container: Amies transport swab
- Method: Culture | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - MRSA Screen Result; text
  - Organism Isolated; text

#### `PUSC` — Pus Culture

- Category: Pathology
- Specimen: Pus | Container: Sterile container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

#### `SPUTUMC` — Sputum Culture

- Category: Pathology
- Specimen: Sputum | Container: Sterile container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

#### `STOOLC` — Stool Culture

- Category: Pathology
- Specimen: Stool | Container: Sterile stool container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

#### `THROATC` — Throat Swab Culture

- Category: Pathology
- Specimen: Throat Swab | Container: Amies transport swab
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

#### `URINEC` — Urine Culture

- Category: Pathology
- Specimen: Urine | Container: Sterile urine container
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

#### `VRE` — VRE Screen

- Category: Pathology
- Specimen: Rectal Swab | Container: Amies transport swab
- Method: Culture | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - VRE Screen Result; text
  - Organism Isolated; text

#### `WOUNDC` — Wound Swab Culture

- Category: Pathology
- Specimen: Wound Swab | Container: Amies transport swab
- Method: Culture and sensitivity | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Organism Isolated; text
  - Colony Count; text
  - Antibiotic Sensitivity; text

### Molecular Diagnostics

#### `CMVDNA` — CMV DNA

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Real-time PCR | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - CMV DNA copies/mL; numeric

#### `EBVDNA` — EBV DNA

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Real-time PCR | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - EBV DNA copies/mL; numeric

#### `HBVDNA` — Hepatitis B Viral Load (HBV DNA)

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Real-time PCR | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Hepatitis B Viral Load (HBV DNA) IU/mL; numeric

#### `HCVRNA` — Hepatitis C Viral Load (HCV RNA)

- Category: Pathology
- Specimen: Plasma | Container: Sodium citrate (light blue top)
- Method: Real-time PCR | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Hepatitis C Viral Load (HCV RNA) IU/mL; numeric

#### `HPVDNA` — HPV DNA

- Category: Pathology
- Specimen: Cervical Swab | Container: HPV collection kit
- Method: PCR | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - HPV DNA; text

#### `TBPCR` — Tuberculosis PCR

- Category: Pathology
- Specimen: Sputum / Tissue | Container: Sterile container
- Method: PCR | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Tuberculosis PCR; text

### Serology

#### `DSDNA` — Anti-dsDNA

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Anti-dsDNA IU/mL; numeric

#### `ASO` — Anti-Streptolysin O (ASO)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Anti-Streptolysin O (ASO) IU/mL; numeric

#### `ANA` — Antinuclear Antibody (ANA)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunofluorescence / ELISA | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - ANA Pattern; text
  - ANA Titre; text

#### `BRUCELLA` — Brucella Agglutination

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Brucella Agglutination; text

#### `CRP` — C-Reactive Protein (CRP)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - C-Reactive Protein (CRP) mg/L; numeric

#### `C3` — Complement C3

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Complement C3 mg/dL; numeric

#### `C4` — Complement C4

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Complement C4 mg/dL; numeric

#### `DENGUE` — Dengue NS1 / IgM / IgG

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Dengue NS1 Antigen; text
  - Dengue IgM Antibody; text
  - Dengue IgG Antibody; text

#### `HPYL` — Helicobacter pylori IgG

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Helicobacter pylori IgG; text

#### `HBSAG` — Hepatitis B Surface Antigen (HBsAg)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Hepatitis B Surface Antigen (HBsAg); text

#### `HCV` — Hepatitis C Antibody

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Hepatitis C Antibody; text

#### `HIV` — HIV 1 and 2 Antibodies

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - HIV 1 and 2 Antibodies; text

#### `LEPTO` — Leptospira IgM

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Leptospira IgM; text

#### `MPAG` — Malaria Antigen (Pf/Pan)

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: Rapid immunochromatography | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (3):
  - Pf Antigen; text
  - Pan Antigen; text
  - Interpretation; text

#### `RF` — Rheumatoid Factor (RF)

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Immunoturbidimetry | Report type: numeric
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Rheumatoid Factor (RF) IU/mL; numeric

#### `IGRA` — TB Interferon Gamma Release Assay

- Category: Pathology
- Specimen: Whole Blood | Container: EDTA (lavender top)
- Method: IGRA | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - TB Interferon Gamma Release Assay; text

#### `TPHA` — TPHA

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - TPHA Result; text
  - TPHA Titre; text

#### `TYPHI` — Typhoid IgM

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: ELISA / rapid | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (1):
  - Typhoid IgM; text

#### `VDRL` — VDRL

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Flocculation | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (2):
  - VDRL Result; text
  - VDRL Titre; text

#### `WIDAL` — Widal Test

- Category: Pathology
- Specimen: Serum | Container: Clot activator / gel (gold top)
- Method: Agglutination | Report type: text
- Price: ₹0.00 | GST: 0%
- Parameters (8):
  - S. typhi O; text
  - S. typhi H; text
  - S. paratyphi AH; text
  - S. paratyphi BH; text
  - S. paratyphi AO; text
  - S. paratyphi BO; text
  - S. typhi Vi; text
  - Interpretation; text

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
