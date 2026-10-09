import { getCompiledTransactionMessageDecoder } from "@solana/kit";

/** Decode 成功即視為交易 message。popout 不要再 parse 決定 UI。 */
export function messageLooksLikeTransactionMessage(bytes: Uint8Array): boolean {
  try {
    getCompiledTransactionMessageDecoder().decode(bytes);
    return true;
  } catch {
    return false;
  }
}
