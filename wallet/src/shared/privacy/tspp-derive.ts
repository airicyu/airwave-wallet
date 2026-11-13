/**
 * Detects the shielded-key derivation payload in bytes a dApp asked the wallet to sign.
 * Does not derive keys, sign, or open an approval.
 */

const NEEDLE = [0x54, 0x53, 0x50, 0x50, 0x2f, 0x64, 0x65, 0x72, 0x69, 0x76, 0x65, 0x2f, 0x76, 0x31];

export function containsTsppDeriveV1(bytes: Uint8Array): boolean {
  const n = NEEDLE.length;
  if (bytes.length < n) return false;
  outer: for (let i = 0; i + n <= bytes.length; i++) {
    for (let j = 0; j < n; j++) {
      if (bytes[i + j] !== NEEDLE[j]) continue outer;
    }
    return true;
  }
  return false;
}

export function valueContainsTsppDeriveV1(value: unknown): boolean {
  if (typeof value === "string") return containsTsppDeriveV1(new TextEncoder().encode(value));
  if (value instanceof Uint8Array) return containsTsppDeriveV1(value);
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => typeof item === "number")) {
      const bytes = new Uint8Array(value.length);
      for (let i = 0; i < value.length; i++) bytes[i] = (value[i] as number) & 0xff;
      if (containsTsppDeriveV1(bytes)) return true;
    }
    return value.some((item) => valueContainsTsppDeriveV1(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => valueContainsTsppDeriveV1(item));
  }
  return false;
}
