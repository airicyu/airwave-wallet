/** UI 小數字串 → 最小單位（可為 0）；禁止 Number／parseFloat。 */
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

/** 送出數量：同 amountUiToRaw，但 0 視為無效。 */
export function parseAmountUiToRaw(amountUi: string, decimals: number): bigint | null {
  const v = amountUiToRaw(amountUi, decimals);
  if (v == null || v === 0n) return null;
  return v;
}

/** 最小單位 → UI 小數字串（去尾零）；禁止 Number。 */
export function formatRawToAmountUi(raw: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) return "0";
  if (decimals === 0) return raw.toString();
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** SOL 預留費（lamports）：5_000 + ceil(200_000 × defaultCuPrice / 1_000_000) */
export function solReserveLamports(defaultCuPrice: number): bigint {
  const price = BigInt(Math.max(0, Math.floor(defaultCuPrice)));
  const prio = (200_000n * price + 999_999n) / 1_000_000n;
  return 5_000n + prio;
}
