const PBKDF2_ITERATIONS = 310_000;

export type VaultSecrets = {
  secrets: Record<string, string>;
};

export type VaultBlob = {
  version: 1;
  kdf: "pbkdf2-sha256";
  kdfParams: { salt: string; iterations: number };
  cipher: "aes-gcm";
  ciphertext: string;
};

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportVaultKeyRaw(key: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return b64encode(raw);
}

export async function importVaultKeyRaw(rawB64: string): Promise<CryptoKey> {
  const raw = b64decode(rawB64);
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

async function seal(key: CryptoKey, secrets: VaultSecrets): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(secrets));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return b64encode(combined);
}

export async function encryptVault(
  password: string,
  secrets: VaultSecrets,
): Promise<{ blob: VaultBlob; key: CryptoKey }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const ciphertext = await seal(key, secrets);
  return {
    key,
    blob: {
      version: 1,
      kdf: "pbkdf2-sha256",
      kdfParams: { salt: b64encode(salt), iterations: PBKDF2_ITERATIONS },
      cipher: "aes-gcm",
      ciphertext,
    },
  };
}

export async function encryptVaultWithKey(
  key: CryptoKey,
  saltB64: string,
  secrets: VaultSecrets,
): Promise<VaultBlob> {
  return {
    version: 1,
    kdf: "pbkdf2-sha256",
    kdfParams: { salt: saltB64, iterations: PBKDF2_ITERATIONS },
    cipher: "aes-gcm",
    ciphertext: await seal(key, secrets),
  };
}

export async function decryptVault(
  password: string,
  blob: VaultBlob,
): Promise<{ secrets: VaultSecrets; key: CryptoKey }> {
  const salt = b64decode(blob.kdfParams.salt);
  const combined = b64decode(blob.ciphertext);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return {
    key,
    secrets: JSON.parse(new TextDecoder().decode(plain)) as VaultSecrets,
  };
}
