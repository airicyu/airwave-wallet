import type { ParsedOwnerTokenAccount } from "../../shared/parsed-token-accounts";

const TTL_MS = 45_000;

type Entry = {
  fingerprint: string;
  owner: string;
  accounts: ParsedOwnerTokenAccount[];
  fetchedAt: number;
};

const byKey = new Map<string, Entry>();

function key(fingerprint: string, owner: string): string {
  return `${fingerprint}\u001f${owner}`;
}

export function setOwnerParsedTokenAccounts(
  fingerprint: string,
  owner: string,
  accounts: ParsedOwnerTokenAccount[],
): void {
  byKey.set(key(fingerprint, owner), {
    fingerprint,
    owner,
    accounts,
    fetchedAt: Date.now(),
  });
}

export function getOwnerParsedTokenAccounts(
  fingerprint: string,
  owner: string,
): ParsedOwnerTokenAccount[] | null {
  const entry = byKey.get(key(fingerprint, owner));
  if (!entry || entry.fingerprint !== fingerprint) return null;
  if (Date.now() - entry.fetchedAt >= TTL_MS) return null;
  return entry.accounts;
}
