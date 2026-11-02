// Password hashing: PBKDF2-SHA256 via WebCrypto (no dependency, works offline).
// Stored format: pbkdf2$<iterations>$<saltB64>$<hashB64>
//
// Note for desktop packaging: WebCrypto requires a secure context. Vite dev
// (localhost) and https are secure; the packaged Tauri WebView must be verified
// at packaging time (WebView2 treats app schemes as secure in current versions).

const ITERATIONS = 210_000;
const enc = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterationsStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const expected = fromB64(hashB64);
    const actual = await derive(password, fromB64(saltB64), Number(iterationsStr));
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

export function passwordPolicyOk(password: string): boolean {
  return password.length >= 6;
}
