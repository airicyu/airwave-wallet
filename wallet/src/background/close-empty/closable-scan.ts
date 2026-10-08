/**
 * Scans parsed token accounts for zero-balance, owner-closable SPL accounts across wallet owners.
 * Does not enrich display metadata or build unsigned close transactions.
 */
import { address } from "@solana/kit";
import type { ClosableEntry } from "../../shared/close-empty-types";
import type { ClosableOwnerTarget } from "../../shared/close-empty-owners";
import { WRAPPED_SOL_MINT, shortMint, type HomeTokenRow } from "../../shared/home-tokens";
import {
  fetchParsedTokenAccountsForOwner,
  type ParsedOwnerTokenAccount,
} from "../../shared/parsed-token-accounts";
import { solanaRpcForUrl } from "../../shared/solana-rpc";

function isClosableParsed(row: ParsedOwnerTokenAccount, scanOwner: string): boolean {
  if (row.amount !== "0") return false;
  if (row.frozen) return false;
  if (row.owner !== scanOwner) return false;
  if (row.closeAuthority && row.closeAuthority !== scanOwner) return false;
  if (row.program === "token-2022") {
    if (row.extensions && row.extensions.length > 0) return false;
  }
  return true;
}

function symbolForMint(mint: string, homeRows: HomeTokenRow[]): string {
  const row = homeRows.find((r) => r.id === mint);
  if (row?.symbol) return row.symbol;
  if (mint === WRAPPED_SOL_MINT) return "wSOL";
  return shortMint(mint);
}

function entriesFromParsedForOwner(
  parsed: ParsedOwnerTokenAccount[],
  target: ClosableOwnerTarget,
  homeRows: HomeTokenRow[],
): ClosableEntry[] {
  const entries: ClosableEntry[] = [];
  for (const row of parsed) {
    if (!isClosableParsed(row, target.owner)) continue;
    entries.push({
      tokenAccount: row.pubkey,
      owner: target.owner,
      ownerAccountId: target.ownerAccountId,
      ownerLabel: target.ownerLabel,
      mint: row.mint,
      symbol: symbolForMint(row.mint, homeRows),
      tokenProgram: row.program,
      rentLamports: row.lamports.toString(10),
    });
  }
  return entries;
}

export function scanClosableFromCachedParsed(
  targets: ClosableOwnerTarget[],
  homeRows: HomeTokenRow[],
  parsedByOwner: ReadonlyMap<string, ParsedOwnerTokenAccount[]>,
): ClosableEntry[] {
  const entries: ClosableEntry[] = [];
  for (const target of targets) {
    const parsed = parsedByOwner.get(target.owner);
    if (!parsed) continue;
    entries.push(...entriesFromParsedForOwner(parsed, target, homeRows));
  }
  return entries;
}

export async function scanClosableForOwners(
  rpcUrl: string,
  targets: ClosableOwnerTarget[],
  homeRows: HomeTokenRow[],
): Promise<{ entries: ClosableEntry[]; ownerFailures: number }> {
  const entries: ClosableEntry[] = [];
  let ownerFailures = 0;
  for (const target of targets) {
    try {
      const parsed = await fetchParsedTokenAccountsForOwner(rpcUrl, target.owner);
      entries.push(...entriesFromParsedForOwner(parsed, target, homeRows));
    } catch {
      ownerFailures += 1;
    }
  }
  return { entries, ownerFailures };
}

export async function readTokenAccountClosableState(
  rpcUrl: string,
  tokenAccount: string,
  expectedOwner: string,
): Promise<
  | { ok: true; amount: string; owner: string; frozen: boolean; hasExtensions: boolean }
  | { ok: false; missing: true }
  | { ok: false; missing: false }
> {
  const rpc = solanaRpcForUrl(rpcUrl);
  try {
    const res = await rpc
      .getAccountInfo(address(tokenAccount), { encoding: "jsonParsed", commitment: "confirmed" })
      .send();
    const val = res.value;
    if (!val) return { ok: false, missing: true };
    const parsed = (val.data as { parsed?: { info?: Record<string, unknown> } }).parsed?.info;
    if (!parsed) return { ok: false, missing: false };
    const amount = (parsed.tokenAmount as { amount?: string } | undefined)?.amount ?? "";
    const owner = typeof parsed.owner === "string" ? parsed.owner : "";
    const state = parsed.state as string | undefined;
    const frozen = state === "frozen";
    const extensions = Array.isArray(parsed.extensions) ? parsed.extensions : [];
    if (owner !== expectedOwner) return { ok: false, missing: false };
    return {
      ok: true,
      amount,
      owner,
      frozen,
      hasExtensions: extensions.length > 0,
    };
  } catch {
    return { ok: false, missing: false };
  }
}
