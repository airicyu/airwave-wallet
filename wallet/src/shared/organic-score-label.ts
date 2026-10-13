/**
 * Formats Jupiter organicScore for the verified-shield overlay.
 * Does not decide verified vs empty; callers must skip unverified and native SOL.
 */

export function formatOrganicScoreLabel(score: unknown): string | undefined {
  if (typeof score !== "number" || !Number.isFinite(score) || score <= 0) {
    return undefined;
  }
  const n = Math.round(score);
  if (n <= 0) return undefined;
  if (n >= 1000) return "99+";
  return String(n);
}
