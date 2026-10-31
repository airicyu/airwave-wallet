/**
 * Reads the lifetime token from a wire-encoded transaction for RPC blockhash checks.
 * Does not validate durable-nonce semantics or simulate the transaction.
 */
import { getCompiledTransactionMessageDecoder } from "@solana/kit";
import { messageBytesToUint8Array } from "./compiled-message";
import { decodeWireTransaction } from "./tx-wire";

export function recentBlockhashFromWireTx(bytes: Uint8Array): string | null {
  try {
    const tx = decodeWireTransaction(bytes);
    const compiled = getCompiledTransactionMessageDecoder().decode(
      messageBytesToUint8Array(tx.messageBytes),
    );
    const token = compiled.lifetimeToken?.trim();
    return token ? token : null;
  } catch {
    return null;
  }
}
