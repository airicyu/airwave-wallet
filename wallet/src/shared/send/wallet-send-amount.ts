/**
 * Parses and formats wallet-send amounts without JavaScript number math on chain units.
 * Does not build transactions or read chrome storage.
 */
import type { HomeTokenRow } from "../home/home-tokens";
import { NATIVE_SOL_ID } from "../home/home-tokens";
import { formatScaledUiAmountLabel, parseScaledUiAmountToRaw } from "../home/scaled-ui-amount";

function scaledMultiplierForRow(row: HomeTokenRow): number | undefined {
  const m = row.scaledUiMultiplier;
  if (m == null || !Number.isFinite(m) || m <= 0 || m === 1) return undefined;
  return m;
}

/** UI decimal string → smallest units (may be 0). Do not use Number/parseFloat. */
export function amountUiToRaw(amountUi: string, decimals: number): bigint | null {
  if (!/^\d+(\.\d+)?$/.test(amountUi)) return null;
  if (!Number.isInteger(decimals) || decimals < 0) return null;
  const [intPart, fracPart = ""] = amountUi.split(".");
  if (fracPart.length > decimals) return null;
  const paddedFrac = fracPart.padEnd(decimals, "0");
  const digits = intPart + paddedFrac;
  const trimmed = digits.replace(/^0+/, "") || "0";
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

/** Send amount: same as amountUiToRaw, but 0 is invalid. */
export function parseAmountUiToRaw(amountUi: string, decimals: number): bigint | null {
  const v = amountUiToRaw(amountUi, decimals);
  if (v == null || v === 0n) return null;
  return v;
}

/** Scaled or plain UI string → on-chain raw for send. Returns null when invalid or zero. */
export function parseSendAmountUiToRaw(amountUi: string, row: HomeTokenRow): bigint | null {
  if (row.id === NATIVE_SOL_ID) {
    return parseAmountUiToRaw(amountUi, row.decimals);
  }
  const mult = scaledMultiplierForRow(row);
  if (mult != null) {
    return parseScaledUiAmountToRaw(amountUi, row.decimals, mult);
  }
  return parseAmountUiToRaw(amountUi, row.decimals);
}

/** On-chain raw balance for a home row (prefers `balanceRaw` when set). */
export function tokenBalanceRawFromRow(row: HomeTokenRow): bigint | null {
  if (row.balanceRaw) {
    try {
      return BigInt(row.balanceRaw);
    } catch {
      /* fall through */
    }
  }
  const label = row.uiAmountLabel.replace(/,/g, "");
  const mult = scaledMultiplierForRow(row);
  if (mult != null) {
    return parseScaledUiAmountToRaw(label, row.decimals, mult);
  }
  return amountUiToRaw(label, row.decimals);
}

/** Format a raw balance for the send form (scaled UI when the mint uses Scaled UI Amount). */
export function formatSendAmountUiFromRaw(raw: bigint, row: HomeTokenRow): string {
  const mult = scaledMultiplierForRow(row);
  if (mult != null) {
    return formatScaledUiAmountLabel(raw, row.decimals, mult);
  }
  return formatRawToAmountUi(raw, row.decimals);
}

/** Smallest units → UI decimal string (trim trailing zeros). Do not use Number. */
export function formatRawToAmountUi(raw: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) return "0";
  if (decimals === 0) return raw.toString();
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** SOL fee reserve (lamports): 5_000 signature fee plus the v1 priority fee. */
export function solReserveLamports(priorityFeeLamports: bigint): bigint {
  const fee = priorityFeeLamports < 0n ? 0n : priorityFeeLamports;
  return 5_000n + fee;
}