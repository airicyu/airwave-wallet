/**
 * Schedules and fires in-memory pending timeouts, rejecting dapp or wallet-send flows when approval stalls.
 * Does not perform cryptographic signing or build transactions.
 */
import type { PendingRecord } from "../../shared/commands";
import { PENDING_TIMEOUT_MS } from "../../shared/commands";
import { getPending, takePending, unbindPopoutByRequest } from "./pending";
import { clearWalletSendState, getWalletSendState } from "../send";

export type TimeoutHandlers = {
  sendBridgeResult: (
    tabId: number,
    msg: import("../../shared/bridge").AirwaveBridgeResult,
    frameId?: number,
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
  if (p.kind === "walletSend" || p.kind === "signAndSendTransaction") {
    const ws = getWalletSendState(requestId);
    if (ws.broadcastSig) return;
    takePending(requestId);
    clearWalletSendState(requestId);
    unbindPopoutByRequest(requestId);
    if (p.kind === "walletSend") {
      handlers.walletSendSettled(requestId, false);
      return;
    }
    await handlers.sendBridgeResult(
      p.tabId,
      {
        type: "airwave-bridge-result",
        requestId,
        ok: false,
        error: { code: "TIMEOUT", message: "Request timed out" },
      },
      p.frameId,
    );
    return;
  }
  takePending(requestId);
  unbindPopoutByRequest(requestId);
  await handlers.sendBridgeResult(
    p.tabId,
    {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "TIMEOUT", message: "Request timed out" },
    },
    p.frameId,
  );
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
    handlers.walletSendSettled(requestId, false, "BROADCAST_UNCONFIRMED");
  } else {
    handlers.walletSendSettled(requestId, false);
  }
}
