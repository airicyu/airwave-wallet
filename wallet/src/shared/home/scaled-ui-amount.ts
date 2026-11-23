/**
 * Token-2022 Scaled UI Amount: multiplier from mint config and raw↔scaled conversions for display and send.
 * Does not call RPC or build home rows.
 */
import Big from "big.js";

export type ScaledUiAmountConfig = {
  multiplier: number;
  newMultiplier: number;
  newMultiplierEffectiveTimestamp: number;
};

function finiteMultiplier(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v)) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

/** Parse `scaledUiAmountConfig` from a jsonParsed mint `info` object. */
export function scaledUiConfigFromMintInfo(info: Record<string, unknown> | undefined): ScaledUiAmountConfig | undefined {
  if (!info) return undefined;
  const extensions = info.extensions;
  if (!Array.isArray(extensions)) return undefined;
  for (const entry of extensions) {
    if (!entry || typeof entry !== "object") continue;
    const ext = entry as { extension?: unknown; state?: unknown };
    if (ext.extension !== "scaledUiAmountConfig" || !ext.state || typeof ext.state !== "object") continue;
    const s = ext.state as Record<string, unknown>;
    const multiplier = finiteMultiplier(s.multiplier);
    const newMultiplier = finiteMultiplier(s.newMultiplier);
    const ts = s.newMultiplierEffectiveTimestamp;
    const newMultiplierEffectiveTimestamp =
      typeof ts === "number" && Number.isFinite(ts)
        ? Math.trunc(ts)
        : typeof ts === "string" && /^\d+$/.test(ts)
          ? Number(ts)
          : 0;
    if (multiplier == null || newMultiplier == null) return undefined;
    return { multiplier, newMultiplier, newMultiplierEffectiveTimestamp };
  }
  return undefined;
}

export function scaledUiCurrentMultiplier(config: ScaledUiAmountConfig, unixSec: number): number {
  if (unixSec >= config.newMultiplierEffectiveTimestamp) return config.newMultiplier;
  return config.multiplier;
}

/** On-chain raw smallest units → scaled UI amount (trunc toward zero, then ÷ 10^decimals). */
export function rawAmountToScaledUiAmount(raw: bigint, decimals: number, multiplier: number): Big {
  if (raw < 0n || !Number.isInteger(decimals) || decimals < 0 || !Number.isFinite(multiplier) || multiplier <= 0) {
    return new Big(0);
  }
  const scaledProduct = new Big(raw.toString()).times(multiplier);
  const truncated = scaledProduct.round(0, Big.roundDown);
  return truncated.div(new Big(10).pow(decimals));
}

export function formatScaledUiAmountLabel(raw: bigint, decimals: number, multiplier: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) return "0";
  const ui = rawAmountToScaledUiAmount(raw, decimals, multiplier);
  if (decimals === 0) return ui.round(0, Big.roundDown).toFixed(0);
  const fixed = ui.toFixed(decimals);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return trimmed || "0";
}

/** Scaled UI decimal string → on-chain raw smallest units (floor). Returns null when invalid or zero. */
export function parseScaledUiAmountToRaw(amountUi: string, decimals: number, multiplier: number): bigint | null {
  if (!/^\d+(\.\d+)?$/.test(amountUi)) return null;
  if (!Number.isInteger(decimals) || decimals < 0) return null;
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null;
  const frac = amountUi.split(".")[1] ?? "";
  if (frac.length > decimals) return null;
  try {
    const ui = new Big(amountUi);
    if (!ui.gt(0)) return null;
    const raw = ui.times(new Big(10).pow(decimals)).div(multiplier).round(0, Big.roundDown);
    const asInt = BigInt(raw.toFixed(0));
    if (asInt === 0n) return null;
    return asInt;
  } catch {
    return null;
  }
}

export function scaledUiAmountToNumber(raw: bigint, decimals: number, multiplier: number): number {
  return rawAmountToScaledUiAmount(raw, decimals, multiplier).toNumber();
}
