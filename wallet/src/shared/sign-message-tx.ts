import {
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
} from "@solana/kit";

function spansFullBuffer(original: Uint8Array, serialized: ArrayLike<number>): boolean {
  const len = "byteLength" in serialized ? serialized.byteLength : serialized.length;
  return len === original.length;
}

/** SDK 整段解析 legacy / versioned transaction message；popout 不要重複 parse 決定 UI。 */
export function messageLooksLikeTransactionMessage(bytes: Uint8Array): boolean {
  try {
    const decoded = getCompiledTransactionMessageDecoder().decode(bytes);
    const serialized = getCompiledTransactionMessageEncoder().encode(decoded);
    if (spansFullBuffer(bytes, serialized)) return true;
  } catch {
    /* not a tx message */
  }
  return false;
}
