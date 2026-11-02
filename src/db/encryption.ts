// Encryption at rest.

const PBKDF2_ITERATIONS = 210000;
const KEY_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const RECOVERY_BYTES = 20;

export interface EncryptedBlob {
  v: 1;
  alg: "AES-GCM";
  iv: string;
  data: string;
}

export interface KeyEnvelope {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  wrapped: string;
  recovery?: { salt: string; iv: string; wrapped: string };
  created_at: number;
}

const enc = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveWrappingKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

export async function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: KEY_BITS }, true, ["encrypt", "decrypt"]);
}

export async function wrapDeviceKey(
  deviceKey: CryptoKey,
  passphrase: string,
  slot: "passphrase" | "recovery" = "passphrase",
  existing?: KeyEnvelope
): Promise<KeyEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrappingKey = await deriveWrappingKey(passphrase, salt, PBKDF2_ITERATIONS);
  const wrapped = await crypto.subtle.wrapKey("raw", deviceKey, wrappingKey, { name: "AES-GCM", iv: iv as BufferSource });
  const slotData = { salt: toB64(salt), iv: toB64(iv), wrapped: toB64(new Uint8Array(wrapped)) };
  if (slot === "recovery") {
    if (!existing) throw new Error("Recovery slot needs an existing envelope");
    return { ...existing, recovery: slotData };
  }
  return { v: 1, kdf: "PBKDF2-SHA256", iterations: PBKDF2_ITERATIONS, ...slotData, recovery: existing?.recovery, created_at: Date.now() };
}

export async function unwrapDeviceKey(
  envelope: KeyEnvelope,
  secret: string,
  slot: "passphrase" | "recovery" = "passphrase"
): Promise<CryptoKey> {
  const src = slot === "recovery" ? envelope.recovery : envelope;
  if (!src) throw new Error("This database has no recovery code set up.");
  const wrappingKey = await deriveWrappingKey(secret, fromB64(src.salt), envelope.iterations);
  try {
    return await crypto.subtle.unwrapKey(
      "raw",
      fromB64(src.wrapped) as BufferSource,
      wrappingKey,
      { name: "AES-GCM", iv: fromB64(src.iv) as BufferSource },
      { name: "AES-GCM", length: KEY_BITS },
      true,
      ["encrypt", "decrypt"]
    );
  } catch {
    throw new Error(slot === "recovery" ? "That recovery code is not correct." : "Wrong passphrase.");
  }
}

export async function encryptBytes(deviceKey: CryptoKey, plain: Uint8Array): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, deviceKey, plain as BufferSource);
  return { v: 1, alg: "AES-GCM", iv: toB64(iv), data: toB64(new Uint8Array(data)) };
}

export async function decryptBytes(deviceKey: CryptoKey, blob: EncryptedBlob): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(blob.iv) as BufferSource }, deviceKey, fromB64(blob.data) as BufferSource);
  return new Uint8Array(plain);
}

export function generateRecoveryCode(): string {
  const raw = crypto.getRandomValues(new Uint8Array(RECOVERY_BYTES));
  const hex = Array.from(raw, (b) => b.toString(16).padStart(2, "0")).join("");
  return hex.match(/.{1,4}/g)!.join("-");
}

export const MIN_PASSPHRASE_LENGTH = 12;

export function passphraseOk(passphrase: string): { ok: boolean; reason?: string } {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return { ok: false, reason: `Use at least ${MIN_PASSPHRASE_LENGTH} characters. This is the passphrase that protects every patient record on this computer.` };
  }
  if (/^(.)\1+$/.test(passphrase)) {
    return { ok: false, reason: "That is a single repeated character. Choose something less guessable." };
  }
  return { ok: true };
}

let sessionKey: CryptoKey | null = null;

export function isLocked(): boolean {
  return sessionKey === null;
}

export function getSessionDeviceKey(): CryptoKey | null {
  return sessionKey;
}

export function setSessionDeviceKey(key: CryptoKey): void {
  sessionKey = key;
}

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("diagbill", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("sqlite-bytes");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(record: string): Promise<T | undefined> {
  return openStore().then(
    (store) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = store.transaction("sqlite-bytes", "readonly");
        const req = tx.objectStore("sqlite-bytes").get(record);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPut(record: string, value: unknown): Promise<void> {
  return openStore().then(
    (store) =>
      new Promise<void>((resolve, reject) => {
        const tx = store.transaction("sqlite-bytes", "readwrite");
        tx.objectStore("sqlite-bytes").put(value, record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function loadEnvelope(): Promise<KeyEnvelope | null> {
  const raw = await idbGet<KeyEnvelope>("envelope");
  return raw && raw.v === 1 ? raw : null;
}

export async function isEncryptionEnabled(): Promise<boolean> {
  return (await loadEnvelope()) !== null;
}

async function verifyKeyAgainstData(key: CryptoKey): Promise<void> {
  const blob = await idbGet<EncryptedBlob | Uint8Array>("main");
  if (!(blob instanceof Uint8Array)) {
    if (!blob || (blob as EncryptedBlob).v !== 1) return;
    await decryptBytes(key, blob as EncryptedBlob);
  }
}

export async function enableEncryption(passphrase: string): Promise<{ recoveryCode: string }> {
  const existing = await loadEnvelope();
  if (existing) throw new Error("Encryption is already set up on this computer.");
  const key = await generateDeviceKey();
  const recoveryCode = generateRecoveryCode();
  let envelope = await wrapDeviceKey(key, passphrase, "passphrase");
  envelope = await wrapDeviceKey(key, recoveryCode, "recovery", envelope);
  const plain = await idbGet<Uint8Array>("main");
  sessionKey = key;
  if (plain instanceof Uint8Array && plain.length > 0) {
    await idbPut("main", await encryptBytes(key, plain));
  }
  await idbPut("envelope", envelope);
  return { recoveryCode };
}

export async function unlockWithPassphrase(passphrase: string): Promise<void> {
  const envelope = await loadEnvelope();
  if (!envelope) throw new Error("Encryption is not set up on this computer.");
  const key = await unwrapDeviceKey(envelope, passphrase, "passphrase");
  await verifyKeyAgainstData(key);
  sessionKey = key;
}

export async function unlockWithRecoveryCode(code: string): Promise<void> {
  const envelope = await loadEnvelope();
  if (!envelope) throw new Error("Encryption is not set up on this computer.");
  const key = await unwrapDeviceKey(envelope, code.trim(), "recovery");
  await verifyKeyAgainstData(key);
  sessionKey = key;
}

export async function changePassphrase(current: string, next: string): Promise<void> {
  const envelope = await loadEnvelope();
  if (!envelope) throw new Error("Encryption is not set up on this computer.");
  const key = await unwrapDeviceKey(envelope, current, "passphrase");
  const updated = await wrapDeviceKey(key, next, "passphrase", envelope);
  await idbPut("envelope", updated);
}

export async function readEncryptedRecord(record: string): Promise<EncryptedBlob | Uint8Array | KeyEnvelope | undefined> {
  return idbGet(record);
}

export async function writeEncryptedRecord(record: string, value: unknown): Promise<void> {
  return idbPut(record, value);
}
