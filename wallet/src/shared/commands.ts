export type AirwaveCommand =
  | "debug.ping"
  | "dapp.connect"
  | "dapp.disconnect"
  | "dapp.signMessage"
  | "dapp.signTransaction"
  | "ui.getPending"
  | "ui.resolvePending"
  | "ui.simulatePendingTx"
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
  | "wallet.changeVaultPassword"
  | "storage.patchSettings";

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

export type PendingKind = "connect" | "signMessage" | "signTransaction";

export type PendingRecord = {
  kind: PendingKind;
  tabId: number;
  frameId: number;
  origin: string;
  payload: unknown;
  createdAt: number;
  /** signMessage／signTransaction：enqueue 時凍結的簽名帳戶（僅 SW 記憶體） */
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

export type ResolvePendingPayload = {
  requestId: string;
  decision: "approve" | "reject";
};
