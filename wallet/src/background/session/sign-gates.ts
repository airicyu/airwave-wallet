/**
 * Pre-enqueue signing gates: active account, read-only role, lock state, and pubkey resolution for dapp requests.
 * Does not sign messages or transactions.
 */
import { getExposedPublicKey, isSigningOrWatch, resolvePubkey, signingWatchPubkeyExists } from "../../shared/accounts";
import type { LoadedAccountKeys } from "../../shared/keypair-bytes";
import { accountKind, type AccountMeta } from "../../shared/storage-keys";
import { getActiveAccountMeta } from "./active-account";
import { readAccounts } from "../storage";
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

/** signMessage enqueue: no early return on lock (locked still pending + popout). */
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

async function mismatchIfSigningAddressWrong(
  accounts: AccountMeta[],
  signingAccountId: string,
): Promise<SignGateError | null> {
  const signingMeta = accounts.find((a) => a.id === signingAccountId);
  if (!signingMeta || !isSigningOrWatch(signingMeta) || accountKind(signingMeta) !== "signing") {
    return null;
  }
  const loaded = session.getLoadedAccount(signingAccountId);
  if (!loaded || loaded.address === signingMeta.publicKeyBase58) return null;
  await session.lock();
  return {
    code: "ACCOUNT_KEY_MISMATCH",
    message: "Account address does not match the stored key",
  };
}

export async function loadedAccountForAccountId(accountId: string): Promise<LoadedAccountKeys | null> {
  if (!session.isUnlocked()) return null;
  const accounts = await readAccounts();
  const meta = accounts.find((a) => a.id === accountId);
  if (!meta) return null;
  const secrets = session.getVaultSecrets()?.secrets;
  const gatePubkey = getExposedPublicKey(meta);
  const resolved = resolvePubkey(accounts, secrets, gatePubkey);
  if (resolved.role !== "signing") return null;
  if (await mismatchIfSigningAddressWrong(accounts, resolved.accountId)) return null;
  return session.getLoadedAccount(resolved.accountId) ?? null;
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
  const mismatch = await mismatchIfSigningAddressWrong(accounts, resolved.accountId);
  if (mismatch) return mismatch;
  const loaded = session.getLoadedAccount(resolved.accountId);
  if (!loaded) {
    return { code: "NO_KEY", message: "Missing key" };
  }
  return null;
}

export async function loadedAccountForActiveSigning(): Promise<LoadedAccountKeys | null> {
  const active = await getActiveAccountMeta();
  if (!active || !session.isUnlocked()) return null;
  const accounts = await readAccounts();
  const secrets = session.getVaultSecrets()?.secrets;
  const gatePubkey = getExposedPublicKey(active);
  const resolved = resolvePubkey(accounts, secrets, gatePubkey);
  if (resolved.role !== "signing") return null;
  if (await mismatchIfSigningAddressWrong(accounts, resolved.accountId)) return null;
  return session.getLoadedAccount(resolved.accountId) ?? null;
}

/** @deprecated use loadedAccountForAccountId */
export async function keypairForAccountId(accountId: string): Promise<LoadedAccountKeys | null> {
  return loadedAccountForAccountId(accountId);
}

/** @deprecated use loadedAccountForActiveSigning */
export async function keypairForActiveSigning(): Promise<LoadedAccountKeys | null> {
  return loadedAccountForActiveSigning();
}
