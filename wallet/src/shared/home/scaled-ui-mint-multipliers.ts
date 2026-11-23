/**
 * Loads Token-2022 Scaled UI Amount multipliers from mint accounts via JSON-RPC.
 * Does not aggregate wallet balances or format labels.
 */
import { address } from "@solana/kit";
import { solanaRpcForUrl } from "../rpc";
import { withRateLimitRetry } from "../rpc";
import {
  scaledUiConfigFromMintInfo,
  scaledUiCurrentMultiplier,
} from "./scaled-ui-amount";

const MINT_FETCH_CHUNK = 20;

function mintInfoFromAccountValue(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== "object") return undefined;
  const parsed = (data as { parsed?: { info?: Record<string, unknown> } }).parsed;
  return parsed?.info;
}

/** Current multiplier per mint that has `scaledUiAmountConfig`. Omits mints without the extension. */
export async function fetchScaledUiMultipliersByMint(
  rpcUrl: string,
  mints: string[],
  signal?: AbortSignal,
  unixSec: number = Math.floor(Date.now() / 1000),
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(mints)].filter((m) => m.length > 0);
  if (unique.length === 0 || !rpcUrl.trim()) return out;

  const rpc = solanaRpcForUrl(rpcUrl);
  for (let offset = 0; offset < unique.length; offset += MINT_FETCH_CHUNK) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const chunk = unique.slice(offset, offset + MINT_FETCH_CHUNK);
    await Promise.all(
      chunk.map(async (mint) => {
        try {
          const res = await withRateLimitRetry(
            () =>
              rpc
                .getAccountInfo(address(mint), { encoding: "jsonParsed", commitment: "confirmed" })
                .send(),
            signal,
          );
          const info = mintInfoFromAccountValue(res.value);
          const config = scaledUiConfigFromMintInfo(info);
          if (!config) return;
          const mult = scaledUiCurrentMultiplier(config, unixSec);
          if (!Number.isFinite(mult) || mult <= 0) return;
          out.set(mint, mult);
        } catch {
          /* omit mint when mint fetch fails */
        }
      }),
    );
  }
  return out;
}
