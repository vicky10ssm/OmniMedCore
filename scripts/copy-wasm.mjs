// Copies sql.js's WASM binaries into public/ so the app can load them.
// sql.js resolves to sql-wasm-browser.wasm in bundlers (browser field) and
// sql-wasm.wasm elsewhere — ship both. Runs on `npm install` (postinstall).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "node_modules", "sql.js", "dist");
mkdirSync(join(root, "public"), { recursive: true });

for (const file of ["sql-wasm.wasm", "sql-wasm-browser.wasm"]) {
  copyFileSync(join(dist, file), join(root, "public", file));
  console.log(`copied ${file} → public/`);
}
