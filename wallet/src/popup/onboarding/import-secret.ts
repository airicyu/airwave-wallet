import type { SecretDetect } from "../types";

export function detectSecret(raw: string): SecretDetect {
  const t = raw.trim();
  if (!t) return { kind: "empty", ok: false };
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      const ok =
        Array.isArray(arr) &&
        arr.length >= 32 &&
        arr.every((n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 255);
      return { kind: "bytes", ok };
    } catch {
      return { kind: "bytes", ok: false };
    }
  }
  const b58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(t) && t.length >= 64 && t.length <= 128;
  return { kind: "base58", ok: b58 };
}
