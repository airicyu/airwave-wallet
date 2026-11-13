/**
 * Mainnet USD label for a private balance: Jupiter unit price times base units.
 * Devnet is not priced. Does not use JavaScript number for the amount.
 */
import Big from "big.js";
import { lookupJupiterUsdQuotes } from "../home-tokens/jupiter-mint-meta";
import { WRAPPED_SOL_MINT } from "../../shared/home";
import { SOL_MINT } from "../../shared/privacy/sol-mint";
import { jupiterApiUrlForCall } from "../../shared/rpc";
import type { Settings } from "../../shared/protocol";

function labelFor(raw: string, decimals: number, price: string): string | null {
  try {
    const total = new Big(raw).div(new Big(10).pow(decimals)).times(price);
    if (total.lt(0)) return null;
    return `$${total.toFixed(2)}`;
  } catch {
    return null;
  }
}

export async function privateUsdByMint(
  rows: { mint: string; amountRaw: string }[],
  settings: Settings,
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (settings.cluster !== "mainnet" || rows.length === 0) return labels;
  const query = [...new Set(rows.map((row) => (row.mint === SOL_MINT ? WRAPPED_SOL_MINT : row.mint)))];
  const quotes = await lookupJupiterUsdQuotes(query, settings.jupiterApiKey, jupiterApiUrlForCall(settings));
  for (const row of rows) {
    const key = row.mint === SOL_MINT ? WRAPPED_SOL_MINT : row.mint;
    const quote = quotes.get(key);
    const decimals = row.mint === SOL_MINT ? 9 : quote?.decimals;
    if (!quote || decimals == null) continue;
    const label = labelFor(row.amountRaw, decimals, quote.usdPrice);
    if (label) labels.set(row.mint, label);
  }
  return labels;
}
