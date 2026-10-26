/**
 * This file turns an account label and public key into the name and the two-letter avatar prefix shown in lists. An empty label falls back to the start of the key.
 */
export function displayAccountName(label: string, pubkey: string): string {
  const t = label.trim();
  if (t) return t;
  if (pubkey) return pubkey.slice(0, 4);
  return "—";
}

export function avatarPrefix(displayName: string): string {
  if (!displayName || displayName === "—") return "?";
  return displayName.slice(0, 2);
}
