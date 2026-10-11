/** Strips checkmark glyphs from Jupiter token symbols before display. */
export function sanitizeSymbol(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/[\u2713\u2714\u2705]/g, "").replace(/[✓✔✅]/g, "").trim();
}
