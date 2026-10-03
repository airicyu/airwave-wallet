import { Message, VersionedMessage } from "@solana/web3.js";

function spansFullBuffer(original: Uint8Array, serialized: Uint8Array): boolean {
  return serialized.byteLength === original.length;
}

/** SDK 整段解析 legacy / versioned transaction message；popout 不要重複 parse 決定 UI。 */
export function messageLooksLikeTransactionMessage(bytes: Uint8Array): boolean {
  try {
    const v0 = VersionedMessage.deserialize(bytes);
    if (spansFullBuffer(bytes, v0.serialize())) return true;
  } catch {
    /* try legacy */
  }
  try {
    const legacy = Message.from(bytes);
    if (spansFullBuffer(bytes, legacy.serialize())) return true;
  } catch {
    /* not a tx message */
  }
  return false;
}
