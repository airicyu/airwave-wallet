/**
 * This file keeps a short-lived cache of closable token accounts for one active account, cluster, and RPC URL. The close-empty list reads it so a repeat open does not scan again within the minute. The scan itself lives in the closable scan module.
 */
import type { ClosableEntry } from "../../shared/close-empty";

const TTL_MS = 60_000;

type CacheEntry = {
  key: string;
  entries: ClosableEntry[];
  partialScan: boolean;
  fetchedAt: number;
};

let cache: CacheEntry | null = null;

export function closableCacheKey(activeAccountId: string, cluster: string, rpcUrl: string): string {
  return `${activeAccountId}|${cluster}|${rpcUrl}`;
}

export function getClosableCache(key: string): { entries: ClosableEntry[]; partialScan: boolean } | null {
  if (!cache || cache.key !== key) return null;
  if (Date.now() - cache.fetchedAt > TTL_MS) return null;
  return { entries: cache.entries, partialScan: cache.partialScan };
}

export function setClosableCache(
  key: string,
  entries: ClosableEntry[],
  partialScan: boolean,
): void {
  cache = { key, entries, partialScan, fetchedAt: Date.now() };
}

export function clearClosableCache(): void {
  cache = null;
}
