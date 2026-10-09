/**
 * Cleans up sign-and-send pendings when the user rejects or closes the approval window before broadcast completes.
 * Does not sign transactions or wait for on-chain confirmation.
 */
import { sendBridgeResult } from "../messaging";
import { cancelPendingTimeout, getPending, takePending, unbindPopoutByRequest } from "../pending";
import { clearWalletSendState, getWalletSendState } from "./wallet-send-state";

export async function finishSignAndSendRejected(
  requestId: string,
  tabId: number,
  userRejectedMessage = "User rejected",
): Promise<void> {
  const ws = getWalletSendState(requestId);
  const frameId = getPending(requestId)?.frameId;
  cancelPendingTimeout(requestId);
  takePending(requestId);
  clearWalletSendState(requestId);
  unbindPopoutByRequest(requestId);
  if (ws.broadcastSig) {
    await sendBridgeResult(
      tabId,
      {
        type: "airwave-bridge-result",
        requestId,
        ok: false,
        error: { code: "BROADCAST_UNCONFIRMED", message: "BROADCAST_UNCONFIRMED" },
      },
      frameId,
    );
    return;
  }
  await sendBridgeResult(
    tabId,
    {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: userRejectedMessage },
    },
    frameId,
  );
}

export async function finishSignAndSendWindowClosed(requestId: string): Promise<void> {
  const p = getPending(requestId);
  if (!p || p.kind !== "signAndSendTransaction") return;
  const ws = getWalletSendState(requestId);
  cancelPendingTimeout(requestId);
  takePending(requestId);
  clearWalletSendState(requestId);
  if (ws.broadcastSig) {
    await sendBridgeResult(
      p.tabId,
      {
        type: "airwave-bridge-result",
        requestId,
        ok: false,
        error: { code: "BROADCAST_UNCONFIRMED", message: "BROADCAST_UNCONFIRMED" },
      },
      p.frameId,
    );
    void chrome.runtime
      .sendMessage({
        kind: "airwave-wallet-send-settled",
        requestId,
        ok: false,
        error: "BROADCAST_UNCONFIRMED",
      })
      .catch(() => {});
    return;
  }
  await sendBridgeResult(
    p.tabId,
    {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "Approval window closed" },
    },
    p.frameId,
  );
}
