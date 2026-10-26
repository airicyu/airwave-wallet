/**
 * This file checks whether sign-message bytes decode as a compiled transaction message. The approval UI uses that to refuse a transaction disguised as a message. It does not parse the message for display.
 */
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
