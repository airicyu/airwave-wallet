/**
 * Removes checkmark glyphs from a Jupiter token symbol before the wallet displays it.
 * The raw symbol from the API is not shown. Other characters stay as they arrived.
 */
export function sanitizeSymbol(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/[\u2713\u2714\u2705]/g, "").replace(/[✓✔✅]/g, "").trim();
}
