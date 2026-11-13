/**
 * Decimals for a private-balance mint. Native SOL is 9.
 * Other mints use a Jupiter token record, then the mint account.
 */
import { address } from "@solana/kit";
import { SOL_MINT } from "../../shared/privacy/sol-mint";
import { jupiterApiUrlForCall, solanaRpcForUrl } from "../../shared/rpc";
import type { Settings } from "../../shared/protocol";
import { lookupJupiterUsdQuotes } from "../home-tokens/jupiter-mint-meta";

function usable(decimals: unknown): decimals is number {
  return typeof decimals === "number" && Number.isInteger(decimals) && decimals >= 0 && decimals <= 18;
}

async function readMintAccountDecimals(rpcUrl: string, mint: string): Promise<number | null> {
  try {
    const rpc = solanaRpcForUrl(rpcUrl);
    const res = await rpc
      .getAccountInfo(address(mint), { encoding: "jsonParsed", commitment: "confirmed" })
      .send();
    const info = (res.value?.data as { parsed?: { info?: { decimals?: unknown } } } | null)?.parsed?.info;
    return usable(info?.decimals) ? info.decimals : null;
  } catch {
    return null;
  }
}

/** SOL is 9. SPL decimals come from Jupiter, then the mint account. */
export async function decimalsByMint(
  mints: string[],
  settings: Settings,
  rpcUrl: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(mints)];
  for (const mint of unique) {
    if (mint === SOL_MINT) out.set(mint, 9);
  }
  const spl = unique.filter((mint) => mint !== SOL_MINT);
  if (settings.cluster === "mainnet" && spl.length > 0) {
    const quotes = await lookupJupiterUsdQuotes(spl, settings.jupiterApiKey, jupiterApiUrlForCall(settings));
    for (const mint of spl) {
      const decimals = quotes.get(mint)?.decimals;
      if (usable(decimals)) out.set(mint, decimals);
    }
  }
  for (const mint of spl) {
    if (out.has(mint) || !rpcUrl.trim()) continue;
    const decimals = await readMintAccountDecimals(rpcUrl, mint);
    if (decimals != null) out.set(mint, decimals);
  }
  return out;
}
