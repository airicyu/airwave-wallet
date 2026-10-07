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

export async function partiallySignWireTransaction(
  txBytes: Uint8Array,
  signer: KeyPairSigner,
): Promise<Uint8Array> {
  const tx = decodeWireTransaction(txBytes);
  const signed = await partiallySignTransaction([signer.keyPair], tx);
  return encodeWireTransaction(signed);
}
