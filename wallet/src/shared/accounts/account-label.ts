export const ACCOUNT_LABEL_MAX = 15;

export function parseOptionalAccountLabel(
  raw: string | undefined,
): { ok: true; label: string | undefined } | { ok: false } {
  if (raw == null) return { ok: true, label: undefined };
  const t = raw.trim();
  if (!t) return { ok: true, label: undefined };
  if (t.length > ACCOUNT_LABEL_MAX) return { ok: false };
  return { ok: true, label: t };
}

export function parseRequiredAccountLabel(
  raw: string | undefined,
): { ok: true; label: string } | { ok: false } {
  const t = raw?.trim() ?? "";
  if (!t || t.length > ACCOUNT_LABEL_MAX) return { ok: false };
  return { ok: true, label: t };
}
