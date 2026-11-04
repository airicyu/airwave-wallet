/**
 * Builds a version 1 Solana off-chain message byte string.
 * Does not sign, sort untrusted input, or talk to the network.
 */

const DOMAIN = new Uint8Array(16);
DOMAIN[0] = 0xff;
new TextEncoder().encodeInto("solana offchain", DOMAIN.subarray(1));

export function encodeOffchainMessageV1(signers: readonly Uint8Array[], message: string): Uint8Array {
  const body = new TextEncoder().encode(message);
  const out = new Uint8Array(16 + 1 + 1 + signers.length * 32 + body.length);
  out.set(DOMAIN, 0);
  out[16] = 1;
  out[17] = signers.length;
  let offset = 18;
  for (const key of signers) {
    out.set(key, offset);
    offset += 32;
  }
  out.set(body, offset);
  return out;
}
