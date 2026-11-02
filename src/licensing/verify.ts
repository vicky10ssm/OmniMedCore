import { ALL_MODULE_IDS, type ModuleId } from "../app/modules";
import { LICENSE_PUBLIC_KEY_SPKI } from "./publicKey";
import type { Edition, LicenseFile, LicensePayload, LicenseStatus } from "./types";

const EDITIONS: Edition[] = ["diagnostics", "pharmacy", "hospital", "complete", "custom"];
const enc = new TextEncoder();

function b64Bytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

/** Stable JSON used by both the app verifier and vendor portal signer. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(",")}}`;
}

export function validateLicenseShape(payload: unknown): payload is LicensePayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<LicensePayload>;
  return (
    p.v === 1 &&
    typeof p.licenseId === "string" &&
    p.licenseId.length > 3 &&
    typeof p.customerName === "string" &&
    Array.isArray(p.tenantIds) &&
    Array.isArray(p.deviceIds) &&
    typeof p.edition === "string" &&
    EDITIONS.includes(p.edition as Edition) &&
    Array.isArray(p.modules) &&
    typeof p.maxTerminals === "number" &&
    typeof p.graceDays === "number" &&
    typeof p.issuedAt === "number" &&
    (p.expiresAt === null || typeof p.expiresAt === "number") &&
    (p.status === "active" || p.status === "revoked")
  );
}

export async function verifyLicenseFile(file: LicenseFile): Promise<LicensePayload> {
  if (!validateLicenseShape(file?.payload)) {
    throw new Error("This is not a valid MediCore licence file.");
  }
  if (!file.signature) throw new Error("Licence signature is missing.");
  const key = await crypto.subtle.importKey(
    "spki",
    b64Bytes(LICENSE_PUBLIC_KEY_SPKI) as BufferSource,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    b64Bytes(file.signature) as BufferSource,
    enc.encode(canonicalJson(file.payload)) as BufferSource
  );
  if (!valid) throw new Error("Licence signature could not be verified.");
  return file.payload;
}

export function parseLicenseJson(text: string): LicenseFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Licence must be valid JSON.");
  }
  const file = parsed as Partial<LicenseFile>;
  if (!file || !file.payload || !file.signature) {
    throw new Error("Licence file must contain an unsigned payload and signature.");
  }
  return file as LicenseFile;
}

export function statusForPayload(
  payload: LicensePayload,
  nowTs = Date.now()
): { status: LicenseStatus; readOnly: boolean; daysRemaining: number | null } {
  if (payload.status !== "active") {
    return { status: "invalid", readOnly: true, daysRemaining: null };
  }
  if (payload.expiresAt === null) {
    return { status: "active", readOnly: false, daysRemaining: null };
  }
  const remaining = Math.ceil((payload.expiresAt - nowTs) / 86_400_000);
  if (nowTs <= payload.expiresAt) {
    return { status: "active", readOnly: false, daysRemaining: remaining };
  }
  const graceEnds = payload.expiresAt + Math.max(0, payload.graceDays) * 86_400_000;
  if (nowTs <= graceEnds) {
    return { status: "grace", readOnly: false, daysRemaining: remaining };
  }
  return { status: "expired", readOnly: true, daysRemaining: remaining };
}

export function validModuleSet(payload: LicensePayload): Set<ModuleId> {
  const known = new Set<string>(ALL_MODULE_IDS);
  return new Set(payload.modules.filter((m): m is ModuleId => known.has(m)));
}
