/**
 * Rejects in-flight dApp pendings when an approval surface closes without a user decision.
 * Does not handle walletSend or signAndSendTransaction window-close finish paths.
 */
import type { SignMessagePayload } from "../../shared/commands";
import { messageLooksLikeTransactionMessage } from "../../shared/sign-message-tx";
import { sendBridgeResult } from "../messaging";
import { getPending, pendingRequests, takePending } from "./pending";

export async function rejectOrdinaryDappPending(
  requestId: string,
  closedMessage = "Approval window closed",
): Promise<void> {
  const p = getPending(requestId);
  if (!p) return;
  if (p.kind === "walletSend" || p.kind === "signAndSendTransaction") return;

  takePending(requestId);

  let error: { code: string; message: string } = {
    code: "USER_REJECTED",
    message: closedMessage,
  };
  if (p.kind === "signMessage") {
    const { message } = p.payload as SignMessagePayload;
    const msgBytes = Uint8Array.from(message);
    if (messageLooksLikeTransactionMessage(msgBytes)) {
      error = {
        code: "SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION",
        message: "Message looks like a transaction",
      };
    }
  }

  await sendBridgeResult(p.tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: false,
    error,
  });
}

const DAPP_SHELL_KINDS = new Set([
  "connect",
  "signMessage",
  "signTransaction",
  "signAndSendTransaction",
]);

/** Oldest pending dApp approval presented in the side panel shell (`uiHost: "sidebar"`). */
export function findSidebarDappApprovalRequestId(): string | null {
  let oldest: { id: string; at: number } | null = null;
  for (const [id, record] of pendingRequests) {
    if (record.uiHost !== "sidebar") continue;
    if (!DAPP_SHELL_KINDS.has(record.kind)) continue;
    if (!oldest || record.createdAt < oldest.at) {
      oldest = { id, at: record.createdAt };
    }
  }
  return oldest?.id ?? null;
}
