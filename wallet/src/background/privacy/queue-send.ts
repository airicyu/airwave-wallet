/**
 * Puts one already-built private-balance transaction on the existing wallet-send
 * approval queue. The caller builds the transaction. This file only reserves the
 * pending entry, starts its timeout, and returns that request id.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { encodeWireTransaction } from "../../shared/tx";
import { walletShellSurfaceFromHref } from "../../shared/shell";
import { addPending, pendingInsertError, schedulePendingTimeout } from "../pending";
import { pendingTimeoutHandlers } from "../send/wallet-send-broadcast";
import { privacyFail } from "./ready";

export function queueWalletSend(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
  accountId: string,
  tx: Parameters<typeof encodeWireTransaction>[0],
): { requestId: string } | ExtensionResponse {
  const requestId = crypto.randomUUID();
  const url = sender.url ?? sender.tab?.url ?? "";
  const reserved = addPending(requestId, {
    kind: "walletSend",
    tabId: 0,
    frameId: 0,
    origin: "airwave:wallet",
    payload: { transaction: Array.from(encodeWireTransaction(tx)) },
    createdAt: Date.now(),
    signAccountId: accountId,
    uiHost: walletShellSurfaceFromHref(url) === "sidebar" ? "sidebar" : "window",
  });
  if (!reserved) return privacyFail(req, pendingInsertError(requestId));
  schedulePendingTimeout(requestId, pendingTimeoutHandlers);
  return { requestId };
}
