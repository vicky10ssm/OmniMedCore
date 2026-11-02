// One-time vendor signing-key setup for MediCore licences.
//
// Run only when creating a new signing identity:
//   node license-portal/generate-keys.mjs
//
// Back up license-portal/keys/private-key.pem securely. Losing it prevents
// renewals for every licence signed by it; leaking it lets anyone mint licences.
// After generating a new key, update src/licensing/publicKey.ts with the printed
// SPKI value and rebuild every application bundle.

import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const keyDir = join(here, "keys");
const privatePath = join(keyDir, "private-key.pem");
const publicPath = join(keyDir, "public-key.txt");

if (existsSync(privatePath) && !process.argv.includes("--force")) {
  console.error(`Refusing to overwrite ${privatePath}. Pass --force only for deliberate key rotation.`);
  process.exit(1);
}

mkdirSync(keyDir, { recursive: true });
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
const publicSpki = publicKey.export({ type: "spki", format: "der" }).toString("base64");

writeFileSync(privatePath, privatePem, { mode: 0o600 });
writeFileSync(publicPath, publicSpki + "\n");
console.log(`Private key: ${privatePath}`);
console.log(`Public SPKI: ${publicPath}`);
console.log("\nUpdate src/licensing/publicKey.ts with:\n");
console.log(`export const LICENSE_PUBLIC_KEY_SPKI =\n  "${publicSpki}";`);
console.log("\nBack up the private key offline. Never commit it or ship it in the app/installer.");
