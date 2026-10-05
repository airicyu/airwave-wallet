import { Keypair } from "@solana/web3.js";
import { getExposedPublicKey, resolvePubkey, signingWatchPubkeyExists } from "../shared/accounts";
import type { AccountMeta } from "../shared/storage-keys";
import { getActiveAccountMeta } from "./active-account";
import { readAccounts } from "./storage-io";
import * as session from "./session";

export function pubkeyExists(accounts: AccountMeta[], publicKeyBase58: string): boolean {
  return signingWatchPubkeyExists(accounts, publicKeyBase58);
}

export type SignGateError = { code: string; message: string };

export async function signGateError(): Promise<SignGateError | null> {
  const active = await getActiveAccountMeta();
  if (!active) {
    return { code: "NO_ACCOUNT", message: "No active account" };
  }

  const gatePubkey = getExposedPublicKey(active);
  const accounts = await readAccounts();
  const secrets = session.isUnlocked() ? session.getVaultSecrets()?.secrets : undefined;
  const resolved = resolvePubkey(accounts, secrets, gatePubkey);

  if (resolved.role === "readOnly") {
    return { code: "ACCOUNT_READ_ONLY", message: "Read-only account cannot sign" };
  }
  if (!session.isUnlocked()) {
    return { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" };
  }
  return null;
}

/** signMessage enqueue：不含鎖定早退（鎖定仍 pending＋popout）。 */
export async function signMessageEnqueueGateError(): Promise<SignGateError | null> {
  const active = await getActiveAccountMeta();
  if (!active) {
    return { code: "NO_ACCOUNT", message: "No active account" };
  }
  const gatePubkey = getExposedPublicKey(active);
  const accounts = await readAccounts();
  const secrets = session.isUnlocked() ? session.getVaultSecrets()?.secrets : undefined;
  const resolved = resolvePubkey(accounts, secrets, gatePubkey);
  if (resolved.role === "readOnly") {
    return { code: "ACCOUNT_READ_ONLY", message: "Read-only account cannot sign" };
  }
  return null;
}

export async function keypairForAccountId(accountId: string): Promise<Keypair | null> {
  if (!session.isUnlocked()) return null;
  const accounts = await readAccounts();
  const meta = accounts.find((a) => a.id === accountId);
  if (!meta) return null;
  const secrets = session.getVaultSecrets()?.secrets;
  const gatePubkey = getExposedPublicKey(meta);
  const resolved = resolvePubkey(accounts, secrets, gatePubkey);
  if (resolved.role !== "signing") return null;
  return session.getKeypair(resolved.accountId) ?? null;
}

export async function signingErrorForAccountId(accountId: string): Promise<SignGateError | null> {
  const accounts = await readAccounts();
  const meta = accounts.find((a) => a.id === accountId);
  if (!meta) {
    return { code: "NO_KEY", message: "Missing key" };
  }
  const secrets = session.getVaultSecrets()?.secrets;
  const gatePubkey = getExposedPublicKey(meta);
  const resolved = resolvePubkey(accounts, secrets, gatePubkey);
  if (resolved.role === "readOnly") {
    return { code: "ACCOUNT_READ_ONLY", message: "Read-only account cannot sign" };
  }
  const kp = session.getKeypair(resolved.accountId);
  if (!kp) {
    return { code: "NO_KEY", message: "Missing key" };
  }
  return null;
}

export async function keypairForActiveSigning(): Promise<Keypair | null> {
  const active = await getActiveAccountMeta();
  if (!active || !session.isUnlocked()) return null;
  const accounts = await readAccounts();
  const secrets = session.getVaultSecrets()?.secrets;
  const gatePubkey = getExposedPublicKey(active);
  const resolved = resolvePubkey(accounts, secrets, gatePubkey);
  if (resolved.role !== "signing") return null;
  return session.getKeypair(resolved.accountId) ?? null;
}
