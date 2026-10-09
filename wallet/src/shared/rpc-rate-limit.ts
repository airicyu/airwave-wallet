/**
 * Abort-aware wait-and-retry for HTTP 429 / Solana RPC rate limits.
 * Does not assemble token balances or choose which RPC method to call.
 */
import { isLikelyRpcRateLimitMessage } from "./friendly-error-message";

export function isRpcRateLimitError(e: unknown): boolean {
  if (e instanceof Error) return isLikelyRpcRateLimitMessage(e.message);
  if (typeof e === "string") return isLikelyRpcRateLimitMessage(e);
  try {
    return isLikelyRpcRateLimitMessage(JSON.stringify(e));
  } catch {
    return isLikelyRpcRateLimitMessage(String(e));
  }
}

export function sleepAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function retryAfterMsFromError(e: unknown, attempt: number, baseDelayMs: number): number {
  if (e && typeof e === "object" && "retryAfterMs" in e) {
    const n = Number((e as { retryAfterMs?: unknown }).retryAfterMs);
    if (Number.isFinite(n) && n > 0) return Math.min(n, 20_000);
  }
  return Math.min(baseDelayMs * 2 ** attempt, 8_000);
}

export async function withRateLimitRetry<T>(
  run: () => Promise<T>,
  signal?: AbortSignal,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await run();
    } catch (e) {
      last = e;
      if (!isRpcRateLimitError(e) || attempt >= maxAttempts - 1) throw e;
      await sleepAbort(retryAfterMsFromError(e, attempt, baseDelayMs), signal);
    }
  }
  throw last;
}
