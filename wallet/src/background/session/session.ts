/**
 * Holds unlocked vault secrets and loaded signing keypairs in service-worker memory.
 * Session storage keeps only the AES key and salt. Does not encrypt the vault blob.
 */
import {
  decryptVaultWithKey,
  exportVaultKeyRaw,
  importVaultKeyRaw,
  type VaultSecrets,
} from "../../shared/crypto-vault";
import type { LoadedAccountKeys } from "../../shared/keypair-bytes";
import { loadedAccountFromStoredSecret } from "../../shared/keypair-bytes";
import { isSigningOrWatch } from "../../shared/accounts";
import { accountKind, SESSION_UNLOCKED } from "../../shared/storage-keys";
import { readAccounts, readVaultBlob } from "../storage";

export class AccountKeyMismatchError extends Error {
  readonly code = "ACCOUNT_KEY_MISMATCH" as const;
  constructor() {
    super("Account address does not match the stored key");
    this.name = "AccountKeyMismatchError";
  }
}

type UnlockedSessionBlob = {
  version: 2;
  saltB64: string;
  keyRawB64: string;
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
  clearUnlockedMemory();
  await chrome.storage.session.remove(SESSION_UNLOCKED);
}

function clearUnlockedMemory(): void {
  unlocked = false;
  vaultSecrets = null;
  vaultKey = null;
  vaultSaltB64 = null;
  accountsById.clear();
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
  const accounts = await readAccounts();
  for (const meta of accounts) {
    if (!isSigningOrWatch(meta) || accountKind(meta) !== "signing") continue;
    const loaded = accountsById.get(meta.id);
    if (!loaded) continue;
    if (loaded.address !== meta.publicKeyBase58) {
      clearUnlockedMemory();
      await chrome.storage.session.remove(SESSION_UNLOCKED);
      throw new AccountKeyMismatchError();
    }
  }
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
    version: 2,
    saltB64: vaultSaltB64,
    keyRawB64: await exportVaultKeyRaw(vaultKey),
  };
  await chrome.storage.session.set({ [SESSION_UNLOCKED]: blob });
}

async function hydrateFromSessionStore(): Promise<void> {
  if (unlocked) return;
  const r = await chrome.storage.session.get(SESSION_UNLOCKED);
  const raw = r[SESSION_UNLOCKED] as UnlockedSessionBlob | undefined;
  if (!raw || raw.version !== 2 || !raw.saltB64 || !raw.keyRawB64) {
    await chrome.storage.session.remove(SESSION_UNLOCKED);
    return;
  }
  const vaultBlob = await readVaultBlob();
  if (!vaultBlob || vaultBlob.kdfParams.salt !== raw.saltB64) {
    await chrome.storage.session.remove(SESSION_UNLOCKED);
    return;
  }
  try {
    const key = await importVaultKeyRaw(raw.keyRawB64);
    const secrets = await decryptVaultWithKey(key, vaultBlob);
    setVaultCrypto(key, raw.saltB64);
    await loadSecrets(secrets);
  } catch {
    clearUnlockedMemory();
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
