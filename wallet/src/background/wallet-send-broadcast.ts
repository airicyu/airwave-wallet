import type { WalletSendProgressNotice, WalletSendSettledNotice } from "../shared/commands";
import { sendBridgeResult } from "./origin-notify";
import type { TimeoutHandlers } from "./pending-timeout";

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

export function broadcastWalletSendProgress(requestId: string, error: string): void {
  const msg: WalletSendProgressNotice = {
    kind: "airwave-wallet-send-progress",
    requestId,
    error,
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
