import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import type { VaultSecrets } from "../shared/crypto-vault";

let unlocked = false;
let vaultSecrets: VaultSecrets | null = null;
let vaultKey: CryptoKey | null = null;
let vaultSaltB64: string | null = null;
const keypairs = new Map<string, Keypair>();

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

export function lock(): void {
  unlocked = false;
  vaultSecrets = null;
  vaultKey = null;
  vaultSaltB64 = null;
  keypairs.clear();
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
