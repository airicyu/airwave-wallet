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
