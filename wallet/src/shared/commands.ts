/**
 * Names extension commands and the in-memory pending record shared by the
 * service worker and extension pages. Does not dispatch or persist them.
 */

export type AirwaveCommand =
  | "debug.ping"
  | "dapp.connect"
  | "dapp.disconnect"
  | "dapp.signMessage"
  | "dapp.signTransaction"
  | "dapp.signAndSendTransaction"
  | "ui.getPending"
  | "ui.resolvePending"
  | "ui.simulatePendingTx"
  | "ui.abortPending"
  | "wallet.unlock"
  | "wallet.lock"
  | "wallet.getState"
  | "wallet.readIntegrationSecrets"
  | "wallet.createVault"
  | "wallet.importAccount"
  | "wallet.previewSeedAccounts"
  | "wallet.importSeedAccount"
  | "wallet.generateSeedAccount"
  | "wallet.generateAccount"
  | "wallet.setActiveAccount"
  | "wallet.reorderAccounts"
  | "wallet.renameAccount"
  | "wallet.deleteAccount"
  | "wallet.addReadOnlyAccount"
  | "wallet.createCombinedAccount"
  | "wallet.addCombinedSub"
  | "wallet.removeCombinedSub"
  | "wallet.setCombinedMain"
  | "wallet.exportAccountSecret"
  | "wallet.disconnectOrigin"
  | "wallet.disconnectAllOrigins"
  | "wallet.getHomeTokens"
  | "wallet.listClosableTokenAccounts"
  | "wallet.planCloseEmpty"
  | "wallet.commitCloseEmpty"
  | "wallet.getHomeActivity"
  | "wallet.beginSend"
  | "wallet.changeVaultPassword"
  | "storage.patchSettings"
  | "shell.getLastNormalWindowId"
  | "shell.getSidebarDappApproval"
  | "shell.switchToWindow"
  | "shell.sidebarOpened";

export const PENDING_TIMEOUT_MS = 120_000;

export type ExtensionRequest = {
  kind: "airwave-ext-req";
  requestId: string;
  command: AirwaveCommand;
  payload?: unknown;
  origin?: string;
  tabId?: number;
  frameId?: number;
};

export type ExtensionResponse = {
  kind: "airwave-ext-res";
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
};

export type PendingKind =
  | "connect"
  | "signMessage"
  | "signTransaction"
  | "signAndSendTransaction"
  | "walletSend";

export type UiHost = "popout" | "popup" | "window" | "sidebar";

/** In-wallet approval host from 0.13 (includes legacy in-memory `"popup"`). */
export function isInWalletShellHost(host: UiHost): boolean {
  return host === "popup" || host === "window" || host === "sidebar";
}

export type PendingRecord = {
  kind: PendingKind;
  tabId: number;
  frameId: number;
  origin: string;
  payload: unknown;
  createdAt: number;
  uiHost: UiHost;
  /** Signing account frozen at enqueue for signMessage / signTransaction / signAndSendTransaction (SW memory only). */
  signAccountId?: string;
  /** signMessage: SW verdict at enqueue (popout trusts this flag only). */
  messageLooksLikeTx?: boolean;
  /**
   * Connected origin called connect again while locked (not silent).
   * After unlock, finish the connection without showing connect consent.
   */
  reconnectWhileLocked?: boolean;
};

export type ConnectPayload = {
  silent?: boolean;
};

export type SignMessagePayload = {
  message: number[];
};

export type SignTransactionPayload = {
  transaction: number[];
  chain: string;
};

export type SignAndSendTransactionPayload = {
  transaction: number[];
  chain: string;
};

export type BeginSendPayload = {
  tokenId: string;
  amountUi: string;
  recipient: string;
};

/** Extension-page runtime only; not airwave-bridge-*. */
export type WalletSendSettledNotice = {
  kind: "airwave-wallet-send-settled";
  requestId: string;
  ok: boolean;
  error?: string;
  signature?: string;
};

export type WalletSendProgressNotice = {
  kind: "airwave-wallet-send-progress";
  requestId: string;
  error: string;
  /** Pretty-printed RPC/preflight err + logs; omitted when there is nothing extra. */
  detail?: string;
  /** False when sendTransaction preflight rejected the tx (never landed). */
  landed?: boolean;
  signature?: string;
};

export type ResolvePendingPayload = {
  requestId: string;
  decision: "approve" | "reject";
};
