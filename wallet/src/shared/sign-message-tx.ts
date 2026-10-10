import { getCompiledTransactionMessageDecoder } from "@solana/kit";

/** If decode succeeds, treat it as a transaction message. The popout must not parse again to pick UI. */
export function messageLooksLikeTransactionMessage(bytes: Uint8Array): boolean {
  try {
    getCompiledTransactionMessageDecoder().decode(bytes);
    return true;
  } catch {
    return false;
  }
}
