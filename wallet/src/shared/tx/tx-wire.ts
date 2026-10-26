/**
 * This file decodes and encodes a Solana transaction on the wire, strips signature slots for read-only checks, and applies a partial sign with a keypair signer. Callers pass the signer. This file does not load the vault.
 */
import {
  getTransactionDecoder,
  getTransactionEncoder,
  partiallySignTransaction,
} from "@solana/kit";
import type { KeyPairSigner } from "@solana/signers";

export function decodeWireTransaction(bytes: Uint8Array) {
  return getTransactionDecoder().decode(bytes);
}

export function encodeWireTransaction(tx: ReturnType<typeof decodeWireTransaction>): Uint8Array {
  return new Uint8Array(getTransactionEncoder().encode(tx));
}

/** Copy wire bytes with every signature slot cleared (64 zero bytes on encode). For AI/RPC reads only. */
export function stripWireSignatures(bytes: Uint8Array): Uint8Array {
  const tx = decodeWireTransaction(bytes);
  const signatures = { ...tx.signatures };
  for (const address of Object.keys(signatures)) {
    signatures[address as keyof typeof signatures] = null;
  }
  return encodeWireTransaction({ ...tx, signatures });
}

export async function partiallySignWireTransaction(
  txBytes: Uint8Array,
  signer: KeyPairSigner,
): Promise<Uint8Array> {
  const tx = decodeWireTransaction(txBytes);
  const signed = await partiallySignTransaction([signer.keyPair], tx);
  return encodeWireTransaction(signed);
}
