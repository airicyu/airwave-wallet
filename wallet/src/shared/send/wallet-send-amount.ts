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
