import type { View } from "../types";

export { avatarPrefix, displayAccountName } from "../../shared/account-display";

export function shortAddr(pk: string): string {
  if (pk.length <= 8) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export function avatarLetter(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  return t.slice(0, 1).toUpperCase();
}

export function isHomeView(view: View): boolean {
  return view === "home-token" || view === "home-activity";
}
