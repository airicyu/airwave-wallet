import type { WalletSendProgressNotice, WalletSendSettledNotice } from "../../shared/commands";
import { sendBridgeResult } from "../messaging";
import type { TimeoutHandlers } from "../pending";

export function broadcastWalletSendSettled(
  requestId: string,
  ok: boolean,
  errorMessage?: string,
  signature?: string,
): void {
  const msg: WalletSendSettledNotice = {
    kind: "airwave-wallet-send-settled",
    requestId,
    ok,
    ...(errorMessage ? { error: errorMessage } : {}),
    ...(signature ? { signature } : {}),
  };
  void chrome.runtime.sendMessage(msg).catch(() => {});
}

export function broadcastWalletSendProgress(
  requestId: string,
  error: string,
  extra?: { detail?: string; landed?: boolean; signature?: string },
): void {
  const msg: WalletSendProgressNotice = {
    kind: "airwave-wallet-send-progress",
    requestId,
    error,
    ...(extra?.detail ? { detail: extra.detail } : {}),
    ...(extra?.landed === true ? { landed: true } : extra?.landed === false ? { landed: false } : {}),
    ...(extra?.signature ? { signature: extra.signature } : {}),
  };
  void chrome.runtime.sendMessage(msg).catch(() => {});
}

export const walletSendNotify = {
  progress: broadcastWalletSendProgress,
  settled: broadcastWalletSendSettled,
};

export const pendingTimeoutHandlers: TimeoutHandlers = {
  sendBridgeResult,
  walletSendSettled: (requestId, ok, errorMessage) => {
    broadcastWalletSendSettled(requestId, ok, errorMessage);
  },
};
