// MediCore licence administration portal.
//
// Run:  $env:MEDICORE_PORTAL_ADMIN_TOKEN="..." ; node license-portal/server.mjs
// Open: http://127.0.0.1:8787
//
// This portal signs offline licences with the vendor private key. It must never
// be deployed with the development token or the private key committed to source.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, sign } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MEDICORE_PORTAL_PORT || 8787);
const TOKEN = process.env.MEDICORE_PORTAL_ADMIN_TOKEN || "change-me";
const KEY_PATH = join(here, "keys", "private-key.pem");
const DATA_DIR = join(here, "data");
const DATA_FILE = join(DATA_DIR, "licenses.json");
const UI_FILE = join(here, "public", "index.html");

if (!existsSync(KEY_PATH)) {
  console.error(`Missing private key at ${KEY_PATH}. Generate it with the documented key setup first.`);
  process.exit(1);
}
if (TOKEN === "change-me") {
  console.warn("WARNING: using the development licence-portal token. Set MEDICORE_PORTAL_ADMIN_TOKEN before exposure.");
}
mkdirSync(DATA_DIR, { recursive: true });

const privateKey = readFileSync(KEY_PATH, "utf8");
const editionModules = {
  diagnostics: ["patients","billing","invoices","dues","samples","reports","tests","doctors","expenses","compliance"],
  pharmacy: ["patients","pharmacy","expenses","compliance"],
  hospital: ["patients","admissions","expenses","compliance"],
  complete: ["patients","billing","invoices","dues","admissions","samples","reports","tests","doctors","pharmacy","expenses","compliance"],
  custom: [],
};
const knownModules = new Set(Object.values(editionModules).flat());

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function readData() {
  if (!existsSync(DATA_FILE)) return { licenses: [] };
  return JSON.parse(readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function signPayload(payload) {
  return sign("sha256", Buffer.from(canonicalJson(payload)), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64");
}

function fileFor(payload) {
  return { payload, signature: signPayload(payload) };
}

function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}

function auth(req) {
  return req.headers.authorization === `Bearer ${TOKEN}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request too large"));
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function hardwareDeviceIds(value) {
  const deviceIds = (value ?? []).map(String).map((id) => id.trim().toLowerCase()).filter(Boolean);
  const invalid = deviceIds.filter((id) => !/^[a-f0-9]{64}$/.test(id));
  if (invalid.length) {
    throw new Error(
      "Hardware Device IDs must be 64-character lowercase SHA-256 fingerprints. Reissue legacy UUID licences with the current Hardware Device ID."
    );
  }
  return deviceIds;
}

function normalise(body) {
  const edition = editionModules[body.edition] ? body.edition : "custom";
  const modules = edition === "custom"
    ? [...new Set(body.modules ?? [])]
    : editionModules[edition];
  if (modules.length === 0) throw new Error("Select an edition or at least one module");
  const unknown = modules.filter((m) => !knownModules.has(m));
  if (unknown.length) throw new Error(`Unknown modules: ${unknown.join(", ")}`);
  const tenantIds = (body.tenantIds ?? []).map(String).filter(Boolean);
  const deviceIds = hardwareDeviceIds(body.deviceIds);
  if (tenantIds.length === 0) throw new Error("At least one tenant ID is required");
  if (deviceIds.length === 0) throw new Error("At least one device ID is required");
  const maxTerminals = Math.max(1, Number(body.maxTerminals) || deviceIds.length);
  if (deviceIds.length > maxTerminals) throw new Error("Device count exceeds max terminals");
  const expiresAt = body.expiresAt ? new Date(body.expiresAt).getTime() : null;
  if (expiresAt !== null && !Number.isFinite(expiresAt)) throw new Error("Invalid expiry date");
  return {
    v: 1,
    licenseId: body.licenseId || `MED-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
    customerName: String(body.customerName || "").trim(),
    tenantIds,
    deviceIds,
    edition,
    modules,
    maxTerminals,
    issuedAt: Date.now(),
    expiresAt,
    graceDays: Math.max(0, Number(body.graceDays ?? 30)),
    status: "active",
    supportReference: String(body.supportReference || ""),
  };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
      });
      res.end(readFileSync(UI_FILE));
      return;
    }
    if (!url.pathname.startsWith("/api/")) return json(res, 404, { error: "Not found" });
    if (!auth(req)) return json(res, 401, { error: "Invalid portal admin token" });

    const data = readData();

    if (req.method === "GET" && url.pathname === "/api/licenses") {
      return json(res, 200, {
        licenses: data.licenses.map((l) => ({
          licenseId: l.payload.licenseId,
          customerName: l.payload.customerName,
          edition: l.payload.edition,
          modules: l.payload.modules,
          tenantIds: l.payload.tenantIds,
          deviceIds: l.payload.deviceIds,
          maxTerminals: l.payload.maxTerminals,
          expiresAt: l.payload.expiresAt,
          status: l.payload.status,
          createdAt: l.createdAt,
        })),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/licenses") {
      const body = await readBody(req);
      const payload = normalise(body);
      if (!payload.customerName) throw new Error("Customer name is required");
      if (data.licenses.some((l) => l.payload.licenseId === payload.licenseId)) {
        throw new Error("License ID already exists");
      }
      const record = { createdAt: Date.now(), payload, signature: signPayload(payload) };
      data.licenses.push(record);
      writeData(data);
      return json(res, 201, fileFor(payload));
    }

    const match = url.pathname.match(/^\/api\/licenses\/([^/]+)(?:\/(renew|revoke))?$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const action = match[2];
      const record = data.licenses.find((l) => l.payload.licenseId === id);
      if (!record) return json(res, 404, { error: "Licence not found" });

      if (req.method === "GET" && !action) {
        return json(res, 200, fileFor(record.payload));
      }
      if (req.method === "POST" && action === "renew") {
        const body = await readBody(req);
        const expiresAt = new Date(body.expiresAt).getTime();
        if (!Number.isFinite(expiresAt)) throw new Error("Invalid expiry date");
        hardwareDeviceIds(record.payload.deviceIds);
        record.payload = {
          ...record.payload,
          expiresAt,
          issuedAt: Date.now(),
          status: "active",
          modules: body.modules?.length
            ? [...new Set(body.modules)].filter((m) => knownModules.has(m))
            : record.payload.modules,
          maxTerminals: body.maxTerminals ? Math.max(1, Number(body.maxTerminals)) : record.payload.maxTerminals,
        };
        record.signature = signPayload(record.payload);
        writeData(data);
        return json(res, 200, fileFor(record.payload));
      }
      if (req.method === "POST" && action === "revoke") {
        record.payload = { ...record.payload, status: "revoked", issuedAt: Date.now() };
        record.signature = signPayload(record.payload);
        writeData(data);
        return json(res, 200, fileFor(record.payload));
      }
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Request failed" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`MediCore licence portal: http://127.0.0.1:${PORT}`);
  console.log("Admin token is read from MEDICORE_PORTAL_ADMIN_TOKEN.");
});
