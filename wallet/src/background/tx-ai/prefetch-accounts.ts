/**
 * Batched getMultipleAccounts for transaction-AI preflight.
 * Does not call OpenRouter or run the sandbox loop.
 */
import { rpcRead } from "./rpc-read";

export const PREFETCH_ACCOUNTS_BATCH = 20;
export const PREFETCH_ACCOUNTS_MAX = 60;

export type PrefetchAccountsRead = {
  preflightPubkeys: string[];
  pubkeys: string[];
  accounts: unknown[];
};

export async function fetchPrefetchAccounts(
  rpcUrl: string,
  pubkeys: string[],
  signal?: AbortSignal,
): Promise<PrefetchAccountsRead | null> {
  if (!rpcUrl.trim() || pubkeys.length === 0) return null;
  const mergedPubkeys: string[] = [];
  const mergedAccounts: unknown[] = [];
  for (let offset = 0; offset < pubkeys.length; offset += PREFETCH_ACCOUNTS_BATCH) {
    const chunk = pubkeys.slice(offset, offset + PREFETCH_ACCOUNTS_BATCH);
    const read = await rpcRead(rpcUrl, "getMultipleAccounts", [chunk, { encoding: "jsonParsed" }], signal);
    if (!read || typeof read !== "object" || !("result" in read)) return null;
    const value = (read as { result?: { value?: unknown[] } }).result?.value;
    if (!Array.isArray(value) || value.length !== chunk.length) return null;
    for (let i = 0; i < chunk.length; i += 1) {
      mergedPubkeys.push(chunk[i]);
      mergedAccounts.push(value[i]);
    }
  }
  return { preflightPubkeys: pubkeys, pubkeys: mergedPubkeys, accounts: mergedAccounts };
}

export function lamportsFromBalanceRpc(read: unknown): string | undefined {
  if (!read || typeof read !== "object") return undefined;
  const envelope = read as { ok?: boolean; result?: { value?: unknown } };
  if (envelope.ok === false) return undefined;
  const value = envelope.result?.value;
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  return undefined;
}
