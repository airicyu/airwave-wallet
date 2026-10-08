/**
 * Formatting helpers for the approval UI (lamports, truncated keys, hex dumps, pending payload bytes).
 * Does not approve, reject, or mutate pending requests.
 */
import type { PendingRecord, SignMessagePayload, SignTransactionPayload } from "../shared/commands";

export function formatSolFromLamports(lamports: number): string {
  const sol = lamports / 1e9;
  return `${sol.toFixed(9).replace(/\.?0+$/, "") || "0"} SOL`;
}

export function shortPk(pk: string): string {
  if (pk.length <= 8) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export { avatarPrefix, displayAccountName } from "../shared/account-display";

export function avatarLetter(label: string): string {
  const t = label.trim();
  return (t[0] ?? "A").toUpperCase();
}

export function bytesFromSignMessage(p: PendingRecord): Uint8Array {
  const { message } = p.payload as SignMessagePayload;
  return Uint8Array.from(message);
}

export function bytesFromSignTransaction(p: PendingRecord): Uint8Array {
  const { transaction } = p.payload as SignTransactionPayload;
  return Uint8Array.from(transaction);
}

export function displayOrigin(origin: string): string {
  return origin === "airwave:wallet" ? "Airwave" : origin;
}

export function shortSignature(sig: string): string {
  if (sig.length <= 8) return sig;
  return `${sig.slice(0, 4)}…${sig.slice(-4)}`;
}

export function hexGrouped(bytes: Uint8Array): string {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.replace(/(.{2})/g, "$1 ").trim();
}

export function hexCompact(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isDisplayableUtf8(bytes: Uint8Array): { ok: true; text: string } | { ok: false } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\0")) return { ok: false };
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) return { ok: false };
    }
    if (text.replace(/\s/g, "").length === 0) return { ok: false };
    return { ok: true, text };
  } catch {
    return { ok: false };
  }
}
