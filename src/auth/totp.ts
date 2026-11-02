// TOTP (RFC 6238) two-factor authentication.
//
// Implemented directly on WebCrypto rather than pulling in a library: the whole
// algorithm is ~40 lines of HMAC, and every dependency in the desktop build is
// something that has to be audited and shipped offline.
//
// Compatibility: SHA-1, 6 digits, 30-second step — the defaults that Google
// Authenticator, Authy, Microsoft Authenticator and 1Password all assume.
// The secret is Base32 (RFC 4648) because that is what authenticator apps scan.

import { hashPassword, verifyPassword } from "./crypto";

const STEP_SECONDS = 30;
const DIGITS = 6;
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Generates a new random Base32 secret (160 bits, the RFC-recommended size). */
export function generateSecret(bytes = 20): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return base32Encode(raw);
}

/** Base32-encodes bytes without padding (authenticator apps omit it). */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Decodes Base32, tolerating spaces, dashes, padding and lower case. */
export function base32Decode(input: string): Uint8Array {
  const s = input.toUpperCase().replace(/[\s\-=]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of s) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("Invalid Base32 secret");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function hmacSha1(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg as BufferSource);
  return new Uint8Array(sig);
}

/**
 * Computes the TOTP code for a given time-step.
 * @param step Unix time divided by 30 (see `currentStep`).
 */
export async function totpAtStep(secretB32: string, step: number): Promise<string> {
  const key = base32Decode(secretB32);
  // 8-byte big-endian counter.
  const msg = new Uint8Array(8);
  let n = step;
  for (let i = 7; i >= 0; i--) {
    msg[i] = n & 0xff;
    n = Math.floor(n / 256);
  }
  const hash = await hmacSha1(key, msg);
  // Dynamic truncation (RFC 4226 §5.3).
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** The time-step a timestamp belongs to. */
export function stepAt(ts: number): number {
  return Math.floor(ts / 1000 / STEP_SECONDS);
}

/** The current time-step. */
export function currentStep(): number {
  return stepAt(Date.now());
}

/** Seconds until the current code expires — used by the countdown in the UI. */
export function secondsRemaining(): number {
  return STEP_SECONDS - (Math.floor(Date.now() / 1000) % STEP_SECONDS);
}

export interface VerifyResult {
  ok: boolean;
  /** The step the code matched, so the caller can burn it against replay. */
  step?: number;
}

/**
 * Verifies a submitted code, allowing ±1 step of clock drift between the
 * server and the phone (phones and PCs routinely disagree by a few seconds).
 *
 * `minStep` is the replay guard: pass the previously accepted step and a code
 * from that step or earlier will be rejected even though it still validates.
 */
export async function verifyTotp(
  secretB32: string,
  code: string,
  minStep = -1
): Promise<VerifyResult> {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== DIGITS) return { ok: false };
  const now = currentStep();
  for (const drift of [0, -1, 1]) {
    const step = now + drift;
    if (step <= minStep) continue; // already used
    if ((await totpAtStep(secretB32, step)) === clean) return { ok: true, step };
  }
  return { ok: false };
}

/** otpauth:// URI that authenticator apps consume from a QR code. */
export function otpauthUri(secretB32: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretB32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Renders any string as a QR code using an external image service.
 *
 * Deliberate choice: bundling a QR encoder would add weight for a screen that
 * is shown once per user. The secret travels to Google's chart API, so for a
 * centre that would rather not do that, the manual Base32 key is displayed
 * underneath and can be typed into the app instead. See FEATURE_DECISIONS.md.
 */
export function qrCodeUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

// ---- Recovery codes -------------------------------------------------------

/** Generates `count` one-time recovery codes, formatted for reading aloud. */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.getRandomValues(new Uint8Array(5));
    const hex = Array.from(raw, (b) => b.toString(16).padStart(2, "0")).join("");
    codes.push(`${hex.slice(0, 5)}-${hex.slice(5, 10)}`);
  }
  return codes;
}

/** Hashes recovery codes for storage (never store them in the clear). */
export async function hashRecoveryCodes(codes: string[]): Promise<string> {
  const hashed = await Promise.all(codes.map((c) => hashPassword(c)));
  return JSON.stringify(hashed);
}

/**
 * Checks a recovery code and returns the remaining hashes.
 * A recovery code is single-use, so the caller must persist `remaining`.
 */
export async function consumeRecoveryCode(
  stored: string,
  code: string
): Promise<{ ok: boolean; remaining: string[] }> {
  let hashes: string[] = [];
  try {
    hashes = JSON.parse(stored) as string[];
  } catch {
    return { ok: false, remaining: [] };
  }
  const clean = code.trim().toLowerCase();
  for (let i = 0; i < hashes.length; i++) {
    if (await verifyPassword(clean, hashes[i])) {
      return { ok: true, remaining: hashes.filter((_, j) => j !== i) };
    }
  }
  return { ok: false, remaining: hashes };
}
