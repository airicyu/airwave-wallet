import { address, isAddress } from "@solana/kit";
import type { AccountMeta, CombinedAccountMeta, SigningOrWatchMeta } from "./storage-keys";

export type ResolvedPubkey =
  | { role: "signing"; accountId: string }
  | { role: "readOnly"; accountId: string | null };

export function isCombinedAccount(meta: AccountMeta): meta is CombinedAccountMeta {
  return meta.kind === "combined";
}

export function isSigningOrWatch(meta: AccountMeta): meta is SigningOrWatchMeta {
  return !isCombinedAccount(meta);
}

export function getExposedPublicKey(meta: AccountMeta): string {
  if (isCombinedAccount(meta)) return meta.mainPubkey;
  return meta.publicKeyBase58;
}

export function signingWatchPubkeyExists(
  accounts: AccountMeta[],
  publicKeyBase58: string,
): boolean {
  return accounts.some(
    (a) => isSigningOrWatch(a) && a.publicKeyBase58 === publicKeyBase58,
  );
}

export function parsePublicKeyBase58(raw: string): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (!isAddress(trimmed)) return null;
  try {
    return address(trimmed);
  } catch {
    return null;
  }
}

export function dedupePreserveOrder(pubkeys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pk of pubkeys) {
    if (seen.has(pk)) continue;
    seen.add(pk);
    out.push(pk);
  }
  return out;
}

export function isCombinedAccountId(accounts: AccountMeta[], value: string): boolean {
  return accounts.some((a) => isCombinedAccount(a) && a.id === value);
}

export function normalizeSubPubkeysInput(
  raw: string[],
  accounts: AccountMeta[],
): { ok: true; subPubkeys: string[] } | { ok: false } {
  const parsed: string[] = [];
  for (const item of raw) {
    if (isCombinedAccountId(accounts, item.trim())) return { ok: false };
    const pk = parsePublicKeyBase58(item);
    if (!pk) return { ok: false };
    parsed.push(pk);
  }
  const subPubkeys = dedupePreserveOrder(parsed);
  if (subPubkeys.length === 0) return { ok: false };
  return { ok: true, subPubkeys };
}

export function resolvePubkey(
  accounts: AccountMeta[],
  vaultSecrets: Record<string, string> | undefined,
  pubkey: string,
): ResolvedPubkey {
  for (const a of accounts) {
    if (!isSigningOrWatch(a) || a.publicKeyBase58 !== pubkey) continue;
    if (a.kind === "readOnly") {
      return { role: "readOnly", accountId: a.id };
    }
    if (vaultSecrets) {
      if (vaultSecrets[a.id]) {
        return { role: "signing", accountId: a.id };
      }
      continue;
    }
    return { role: "signing", accountId: a.id };
  }
  return { role: "readOnly", accountId: null };
}

export function getHomeTokenOwners(meta: AccountMeta): string[] {
  if (isCombinedAccount(meta)) {
    return dedupePreserveOrder(meta.subPubkeys);
  }
  return [getExposedPublicKey(meta)];
}

export function findCombinedById(
  accounts: AccountMeta[],
  combinedId: string,
): CombinedAccountMeta | undefined {
  const acc = accounts.find((a) => a.id === combinedId);
  if (acc && isCombinedAccount(acc)) return acc;
  return undefined;
}
