/**
 * This file keeps per-request wallet-send state in the service worker: the last valid block height and the signature once broadcast has started. Finish and abort read it. It is not written to chrome.storage.
 */
export type WalletSendRuntimeState = {
  lastValidBlockHeight?: number;
  broadcastSig?: string;
};

const stateByRequest = new Map<string, WalletSendRuntimeState>();

export function getWalletSendState(requestId: string): WalletSendRuntimeState {
  let s = stateByRequest.get(requestId);
  if (!s) {
    s = {};
    stateByRequest.set(requestId, s);
  }
  return s;
}

export function clearWalletSendState(requestId: string): void {
  stateByRequest.delete(requestId);
}
