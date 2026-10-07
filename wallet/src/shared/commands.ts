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
  | "wallet.createVault"
  | "wallet.importAccount"
  | "wallet.previewSeedAccounts"
  | "wallet.importSeedAccount"
  | "wallet.generateSeedAccount"
  | "wallet.generateAccount"
  | "wallet.setActiveAccount"
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
  | "storage.patchSettings";

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

export type UiHost = "popout" | "popup";

export type PendingRecord = {
  kind: PendingKind;
  tabId: number;
  frameId: number;
  origin: string;
  payload: unknown;
  createdAt: number;
  uiHost: UiHost;
  /** signMessage／signTransaction／signAndSendTransaction：enqueue 時凍結的簽名帳戶（僅 SW 記憶體） */
  signAccountId?: string;
  /** signMessage：enqueue 時 SW 判定（popout 只信此旗標） */
  messageLooksLikeTx?: boolean;
};

export type ConnectPayload = {
  silent?: boolean;
};

export type SignMessagePayload = {
  message: number[];
};

export type SignTransactionPayload = {
  transaction: number[];
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

/** 僅擴充頁 runtime；非 airwave-bridge-* */
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
};

export type ResolvePendingPayload = {
  requestId: string;
  decision: "approve" | "reject";
};
