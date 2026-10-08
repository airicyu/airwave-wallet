/**
 * Holds unlocked vault secrets and loaded signing keypairs in the service worker, with session-storage hydrate.
 * Does not encrypt the vault blob or write long-lived unlock keys to chrome.storage.local.
 */
import {
  exportVaultKeyRaw,
  importVaultKeyRaw,
  type VaultSecrets,
} from "../../shared/crypto-vault";
import type { LoadedAccountKeys } from "../../shared/keypair-bytes";
import { loadedAccountFromStoredSecret } from "../../shared/keypair-bytes";
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
const accountsById = new Map<string, LoadedAccountKeys>();
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
  accountsById.clear();
  await chrome.storage.session.remove(SESSION_UNLOCKED);
}

export async function loadSecrets(secrets: VaultSecrets): Promise<void> {
  vaultSecrets = secrets;
  accountsById.clear();
  unlocked = false;
  const entries = Object.entries(secrets.secrets);
  await Promise.all(
    entries.map(async ([id, stored]) => {
      const loaded = await loadedAccountFromStoredSecret(stored);
      accountsById.set(id, loaded);
    }),
  );
  unlocked = true;
}

export function getLoadedAccount(accountId: string): LoadedAccountKeys | undefined {
  return accountsById.get(accountId);
}

export function getVaultSecrets(): VaultSecrets | null {
  return vaultSecrets;
}

export async function setVaultSecrets(secrets: VaultSecrets): Promise<void> {
  vaultSecrets = secrets;
  await loadSecrets(secrets);
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
    await loadSecrets(raw.secrets);
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
