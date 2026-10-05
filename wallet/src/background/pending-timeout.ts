import type { PendingRecord } from "../shared/commands";
import { PENDING_TIMEOUT_MS } from "../shared/commands";
import { getPending, takePending, unbindPopoutByRequest } from "./pending";
import { clearWalletSendState, getWalletSendState } from "./wallet-send-state";

export type TimeoutHandlers = {
  sendBridgeResult: (
    tabId: number,
    msg: import("../shared/bridge").AirwaveBridgeResult,
  ) => Promise<void>;
  walletSendSettled: (requestId: string, ok: boolean, errorMessage?: string) => void;
};

const pendingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export function cancelPendingTimeout(requestId: string): void {
  const t = pendingTimeouts.get(requestId);
  if (t != null) {
    clearTimeout(t);
    pendingTimeouts.delete(requestId);
  }
}

export function schedulePendingTimeout(requestId: string, handlers: TimeoutHandlers): void {
  cancelPendingTimeout(requestId);
  const timer = setTimeout(() => {
    pendingTimeouts.delete(requestId);
    void onPendingTimeout(requestId, handlers);
  }, PENDING_TIMEOUT_MS);
  pendingTimeouts.set(requestId, timer);
}

async function onPendingTimeout(requestId: string, handlers: TimeoutHandlers): Promise<void> {
  const p = getPending(requestId);
  if (!p) return;
  if (p.kind === "walletSend") {
    const ws = getWalletSendState(requestId);
    if (ws.broadcastSig) return;
    takePending(requestId);
    clearWalletSendState(requestId);
    unbindPopoutByRequest(requestId);
    handlers.walletSendSettled(requestId, false);
    return;
  }
  takePending(requestId);
  unbindPopoutByRequest(requestId);
  await handlers.sendBridgeResult(p.tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: false,
    error: { code: "TIMEOUT", message: "Request timed out" },
  });
}

export async function finishWalletSendWindowClosed(
  requestId: string,
  p: PendingRecord,
  handlers: TimeoutHandlers,
): Promise<void> {
  if (p.kind !== "walletSend") return;
  const ws = getWalletSendState(requestId);
  takePending(requestId);
  clearWalletSendState(requestId);
  if (ws.broadcastSig) {
    handlers.walletSendSettled(requestId, false, "已送出、確認未知");
  } else {
    handlers.walletSendSettled(requestId, false);
  }
}
