/**
 * Builds home-token quantity fields from on-chain raw smallest units and an optional Scaled UI multiplier.
 * Does not fetch RPC data or sort token rows.
 */
import { formatScaledUiAmountLabel, scaledUiAmountToNumber } from "./scaled-ui-amount";

function formatUnscaledUiLabel(raw: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) return "0";
  if (decimals === 0) return raw.toString();
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function tokenAmountFieldsFromRaw(
  raw: bigint,
  decimals: number,
  scaledUiMultiplier?: number,
): { uiAmount: number; uiAmountLabel: string } {
  const mult =
    scaledUiMultiplier != null && Number.isFinite(scaledUiMultiplier) && scaledUiMultiplier > 0
      ? scaledUiMultiplier
      : undefined;
  if (mult != null && mult !== 1) {
    const uiAmountLabel = formatScaledUiAmountLabel(raw, decimals, mult);
    const uiAmount = scaledUiAmountToNumber(raw, decimals, mult);
    return { uiAmount, uiAmountLabel };
  }
  const uiAmountLabel = formatUnscaledUiLabel(raw, decimals);
  const uiAmount =
    decimals > 0 ? Number(raw) / 10 ** decimals : Number(raw);
  return { uiAmount, uiAmountLabel };
}
