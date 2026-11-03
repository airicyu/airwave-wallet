/**
 * Parses the settings priority-fee string into lamports.
 * Does not read chrome.storage or rewrite a transaction.
 */

export const DEFAULT_PRIORITY_FEE_LAMPORTS = "5000";
export const PRIORITY_FEE_LAMPORTS_MAX = 1_000_000_000n;

export function parsePriorityFeeLamports(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = BigInt(trimmed);
  if (n > PRIORITY_FEE_LAMPORTS_MAX) return null;
  return n;
}

/** Missing or blank becomes the factory string. A corrupt stored value becomes the factory string. */
export function normalizePriorityFeeSetting(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim() === "") return DEFAULT_PRIORITY_FEE_LAMPORTS;
  const n = parsePriorityFeeLamports(raw);
  if (n == null) return DEFAULT_PRIORITY_FEE_LAMPORTS;
  return n.toString();
}
