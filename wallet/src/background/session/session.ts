import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  exportVaultKeyRaw,
  importVaultKeyRaw,
  type VaultSecrets,
} from "../../shared/crypto-vault";
import { SESSION_UNLOCKED } from "../../shared/storage-keys";
import { readVaultBlob } from "../storage";

type UnlockedSessionBlob = {
  version: 1;
  saltB64: string;
  keyRawB64: string;
  secrets: VaultSecrets;
};

let unlocked = false;
let vaultSecrets: VaultSecrets | null = null;
let vaultKey: CryptoKey | null = null;
let vaultSaltB64: string | null = null;
const keypairs = new Map<string, Keypair>();
let hydratePromise: Promise<void> | null = null;

export function setVaultCrypto(key: CryptoKey, saltB64: string): void {
  vaultKey = key;
  vaultSaltB64 = saltB64;
}

export function getVaultCrypto(): { key: CryptoKey; saltB64: string } | null {
  if (!vaultKey || !vaultSaltB64) return null;
  return { key: vaultKey, saltB64: vaultSaltB64 };
}

export function isUnlocked(): boolean {
  return unlocked;
}

export async function lock(): Promise<void> {
  unlocked = false;
  vaultSecrets = null;
  vaultKey = null;
  vaultSaltB64 = null;
  keypairs.clear();
  await chrome.storage.session.remove(SESSION_UNLOCKED);
}

export function loadSecrets(secrets: VaultSecrets): void {
  vaultSecrets = secrets;
  keypairs.clear();
  for (const [id, stored] of Object.entries(secrets.secrets)) {
    const kp = Keypair.fromSecretKey(bs58.decode(stored));
    keypairs.set(id, kp);
  }
  unlocked = true;
}

export function getKeypair(accountId: string): Keypair | undefined {
  return keypairs.get(accountId);
}

export function getVaultSecrets(): VaultSecrets | null {
  return vaultSecrets;
}

export function setVaultSecrets(secrets: VaultSecrets): void {
  vaultSecrets = secrets;
  loadSecrets(secrets);
}

export async function persistUnlockedSession(): Promise<void> {
  if (!unlocked || !vaultKey || !vaultSaltB64 || !vaultSecrets) return;
  const blob: UnlockedSessionBlob = {
    version: 1,
    saltB64: vaultSaltB64,
    keyRawB64: await exportVaultKeyRaw(vaultKey),
    secrets: vaultSecrets,
  };
  await chrome.storage.session.set({ [SESSION_UNLOCKED]: blob });
}

async function hydrateFromSessionStore(): Promise<void> {
  if (unlocked) return;
  const r = await chrome.storage.session.get(SESSION_UNLOCKED);
  const raw = r[SESSION_UNLOCKED] as UnlockedSessionBlob | undefined;
  if (!raw || raw.version !== 1 || !raw.saltB64 || !raw.keyRawB64 || !raw.secrets?.secrets) {
    return;
  }
  const vaultBlob = await readVaultBlob();
  if (vaultBlob && vaultBlob.kdfParams.salt !== raw.saltB64) {
    await chrome.storage.session.remove(SESSION_UNLOCKED);
    return;
  }
  try {
    const key = await importVaultKeyRaw(raw.keyRawB64);
    setVaultCrypto(key, raw.saltB64);
    loadSecrets(raw.secrets);
  } catch {
    await chrome.storage.session.remove(SESSION_UNLOCKED);
  }
}

export async function ensureHydrated(): Promise<void> {
  if (unlocked) return;
  if (!hydratePromise) {
    hydratePromise = hydrateFromSessionStore().finally(() => {
      hydratePromise = null;
    });
  }
  await hydratePromise;
}
