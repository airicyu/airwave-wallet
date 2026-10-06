import { sendBridgeResult } from "../messaging";
import { cancelPendingTimeout, getPending, takePending, unbindPopoutByRequest } from "../pending";
import { clearWalletSendState, getWalletSendState } from "./wallet-send-state";

export async function finishSignAndSendRejected(
  requestId: string,
  tabId: number,
  userRejectedMessage = "User rejected",
): Promise<void> {
  const ws = getWalletSendState(requestId);
  cancelPendingTimeout(requestId);
  takePending(requestId);
  clearWalletSendState(requestId);
  unbindPopoutByRequest(requestId);
  if (ws.broadcastSig) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "BROADCAST_UNCONFIRMED", message: "已送出、確認未知" },
    });
    return;
  }
  await sendBridgeResult(tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: false,
    error: { code: "USER_REJECTED", message: userRejectedMessage },
  });
}

export async function finishSignAndSendWindowClosed(requestId: string): Promise<void> {
  const p = getPending(requestId);
  if (!p || p.kind !== "signAndSendTransaction") return;
  const ws = getWalletSendState(requestId);
  cancelPendingTimeout(requestId);
  takePending(requestId);
  clearWalletSendState(requestId);
  if (ws.broadcastSig) {
    await sendBridgeResult(p.tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "BROADCAST_UNCONFIRMED", message: "已送出、確認未知" },
    });
    void chrome.runtime
      .sendMessage({
        kind: "airwave-wallet-send-settled",
        requestId,
        ok: false,
        error: "已送出、確認未知",
      })
      .catch(() => {});
    return;
  }
  await sendBridgeResult(p.tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: false,
    error: { code: "USER_REJECTED", message: "Approval window closed" },
  });
}
