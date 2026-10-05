import { cancelPendingTimeout } from "./pending-timeout";
import { clearWalletSendState, getWalletSendState } from "./wallet-send-state";
import { getPending, takePending, unbindPopoutByRequest } from "./pending";

export function finishWalletSendUserAbort(
  requestId: string,
  broadcastSettled: (requestId: string, ok: boolean, errorMessage?: string) => void,
): boolean {
  const p = getPending(requestId);
  if (!p || p.kind !== "walletSend") return false;
  cancelPendingTimeout(requestId);
  const ws = getWalletSendState(requestId);
  takePending(requestId);
  clearWalletSendState(requestId);
  unbindPopoutByRequest(requestId);
  if (ws.broadcastSig) {
    broadcastSettled(requestId, false, "已送出、確認未知");
  } else {
    broadcastSettled(requestId, false);
  }
  return true;
}
