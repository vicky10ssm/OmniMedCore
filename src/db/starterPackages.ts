// Popular combined health-check packages for the starter catalogue.
//
// A package is a curated bundle of existing tests. Its component tests retain
// their own parameters; the package itself is just a price/name wrapper.
//
// Seeding is additive and idempotent per tenant:
// - packages are matched by stable seed id or case-insensitive name
// - existing custom/deleted packages are left alone
// - package items are matched by test id, including deleted items, so a
//   deliberately removed item is not resurrected
// - new packages ship with price 0 and 0% GST; the laboratory must set the
//   package price before billing

import { getDeviceId, now } from "./helpers";

export interface StarterPackageStore {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

interface StarterPackage {
  name: string;
  testCodes: string[];
}

const pkg = (name: string, testCodes: string[]): StarterPackage => ({
  name,
  testCodes,
});

export const STARTER_PACKAGES: StarterPackage[] = [
  pkg("Basic Health Check", [
    "CBC", "FBS", "LIPID", "LFT", "KFT", "URINE", "TSH",
  ]),
  pkg("Master Health Check (Comprehensive)", [
    "CBC", "FBS", "HBA1C", "LIPID", "LFT", "KFT", "URINE", "TSH",
    "VITD", "B12", "CRP", "CXP",
  ]),
  pkg("Full Body Checkup", [
    "CBC", "FBS", "HBA1C", "LIPID", "LFT", "KFT", "URINE", "TSH",
    "VITD", "B12", "FERRITIN", "CRP", "CXP",
  ]),
  pkg("Executive Health Check", [
    "CBC", "FBS", "HBA1C", "LIPID", "LFT", "KFT", "URINE", "TSH",
    "VITD", "B12", "FERRITIN", "HSCRP", "CXRPA",
  ]),
  pkg("Diabetic Profile", [
    "FBS", "PPBS", "HBA1C", "UACR", "CREAT", "LIPID", "CHOL", "TG",
    "HDL", "LDL",
  ]),
  pkg("Cardiac Risk Profile", [
    "FBS", "HBA1C", "LIPID", "HSCRP", "HOMOCYS", "APOB", "LPA", "TROPI",
  ]),
  pkg("Thyroid Profile", ["TSH", "T3", "T4", "FT3", "FT4", "ATPO"]),
  pkg("Anemia Profile", [
    "CBC", "HB", "FERRITIN", "IRON", "TIBC", "B12", "FOLATE", "RETIC",
    "PSMEAR",
  ]),
  pkg("Iron Studies", ["IRON", "TIBC", "FERRITIN"]),
  pkg("Fever Panel", [
    "CBC", "ESR", "CRP", "MPS", "MPAG", "DENGUE", "WIDAL", "TYPHI", "URINE",
  ]),
  pkg("Dengue Panel", ["CBC", "DENGUE", "PCV", "PLT"]),
  pkg("Women's Health", [
    "CBC", "FBS", "TSH", "LIPID", "VITD", "B12", "FERRITIN", "CA",
    "URINE", "PAP", "MAMMO",
  ]),
  pkg("Men's Health", [
    "CBC", "FBS", "LIPID", "LFT", "KFT", "TSH", "TESTO", "URINE", "CXP",
  ]),
  pkg("Senior Citizen Health Check", [
    "CBC", "FBS", "HBA1C", "LIPID", "LFT", "KFT", "TSH", "URINE",
    "VITD", "B12", "CXP", "DEXA",
  ]),
  pkg("Pre-employment Health Check", [
    "CBC", "FBS", "LFT", "KFT", "URINE", "CXP",
  ]),
  pkg("Pre-operative Health Check", [
    "CBC", "PTINR", "APTT", "FBS", "CREAT", "LFT", "HBSAG", "HIV",
    "HCV", "CXRPA",
  ]),
  pkg("Pregnancy Profile", [
    "CBC", "BGRH", "FBS", "TSH", "HIV", "HBSAG", "HCV", "VDRL", "URINE",
  ]),
  pkg("Arthritis Profile", [
    "RF", "CRP", "ASO", "ESR", "URIC", "ANA", "DSDNA", "C3", "C4",
  ]),
  pkg("Respiratory Profile", [
    "CBC", "CRP", "CXP", "CXRPA", "SPUTUMC",
  ]),
  pkg("Chest X-Ray + CBC", ["CBC", "CXP"]),
  pkg("Gut Health Panel", [
    "CBC", "STOOL", "CALPRO", "SOB", "OVA", "CRP",
  ]),
  pkg("UTI Panel", ["URINE", "URINEC", "CBC", "CRP", "CREAT"]),
  pkg("Tuberculosis Panel", [
    "CBC", "ESR", "CRP", "AFB", "TBPCR", "IGRA", "CXP",
  ]),
  pkg("Vitamin Profile", [
    "VITD", "B12", "FOLATE", "CA", "MG", "PHOS",
  ]),
  pkg("PCOS Profile", [
    "LH", "FSH", "TESTO", "INSULIN", "FBS", "HBA1C", "TSH", "PRL",
    "E2", "PROG",
  ]),
  pkg("Bone Health Panel", [
    "VITD", "CA", "PHOS", "ALP", "PTH", "DEXA",
  ]),
  pkg("Metabolic Syndrome Panel", [
    "FBS", "HBA1C", "LIPID", "TSH", "INSULIN", "LFT", "UACR",
  ]),
];

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function packageId(tenantId: string, name: string): string {
  return `pkg-seed-${slug(tenantId)}-${slug(name)}`;
}

function packageItemId(
  tenantId: string,
  packageName: string,
  testCode: string
): string {
  return `pkgi-seed-${slug(tenantId)}-${slug(packageName)}-${slug(testCode)}`;
}

export async function ensureStarterPackages(
  store: StarterPackageStore
): Promise<void> {
  const tenants = await store.all<{ id: string }>(
    "SELECT id FROM tenants WHERE deleted = 0"
  );
  const ts = now();
  const deviceId = getDeviceId();

  for (const tenant of tenants) {
    const tests = await store.all<{ id: string; code: string }>(
      "SELECT id, code FROM tests WHERE tenant_id = ? AND deleted = 0",
      [tenant.id]
    );
    if (tests.length === 0) continue;
    const testByCode = new Map(
      tests.map((test) => [test.code.trim().toLowerCase(), test.id])
    );

    const packages = await store.all<{
      id: string;
      name: string;
      deleted: number;
    }>(
      "SELECT id, name, deleted FROM packages WHERE tenant_id = ?",
      [tenant.id]
    );
    const packageById = new Map(packages.map((row) => [row.id, row]));
    const names = new Set(
      packages.map((row) => row.name.trim().toLowerCase())
    );

    let insertedPackages = 0;
    let insertedItems = 0;
    for (const definition of STARTER_PACKAGES) {
      const id = packageId(tenant.id, definition.name);
      const existing = packageById.get(id);
      const name = definition.name.trim().toLowerCase();

      if (existing?.deleted === 1) continue;
      if (!existing && names.has(name)) continue;

      const resolved = definition.testCodes
        .map((code) => testByCode.get(code.trim().toLowerCase()))
        .filter((testId): testId is string => Boolean(testId));
      if (resolved.length === 0) continue;

      if (!existing) {
        try {
          await store.run(
            `INSERT OR IGNORE INTO packages
               (id, name, price_paise, gst_rate_bp, is_active, created_at,
                updated_at, device_id, dirty, deleted, tenant_id)
             VALUES (?,?,0,0,1,?,?,?,1,0,?)`,
            [id, definition.name, ts, ts, deviceId, tenant.id]
          );
          packageById.set(id, {
            id,
            name: definition.name,
            deleted: 0,
          });
          names.add(name);
          insertedPackages += 1;
        } catch (error) {
          console.warn(`Could not add starter package ${definition.name}`, error);
          continue;
        }
      }

      const existingItems = await store.all<{ test_id: string }>(
        `SELECT test_id FROM package_items
         WHERE package_id = ? AND tenant_id = ?`,
        [id, tenant.id]
      );
      const linked = new Set(existingItems.map((row) => row.test_id));

      for (let index = 0; index < definition.testCodes.length; index += 1) {
        const code = definition.testCodes[index];
        const testId = testByCode.get(code.trim().toLowerCase());
        if (!testId || linked.has(testId)) continue;
        try {
          await store.run(
            `INSERT OR IGNORE INTO package_items
               (id, package_id, test_id, created_at, updated_at, device_id,
                dirty, deleted, tenant_id)
             VALUES (?,?,?,?,?,?,1,0,?)`,
            [
              packageItemId(tenant.id, definition.name, code),
              id,
              testId,
              ts,
              ts,
              deviceId,
              tenant.id,
            ]
          );
          linked.add(testId);
          insertedItems += 1;
        } catch (error) {
          console.warn(
            `Could not add ${code} to starter package ${definition.name}`,
            error
          );
        }
      }
    }
    if (insertedPackages > 0 || insertedItems > 0) {
      console.info(
        `Starter packages: added ${insertedPackages} package(s), ${insertedItems} item(s) for tenant ${tenant.id}`
      );
    }
  }
}
