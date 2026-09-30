export type AirwaveCommand =
  | "debug.ping"
  | "dapp.connect"
  | "dapp.signMessage"
  | "dapp.signTransaction"
  | "ui.getPending"
  | "ui.resolvePending"
  | "wallet.unlock"
  | "wallet.lock"
  | "wallet.getState"
  | "wallet.createVault"
  | "wallet.importAccount"
  | "wallet.generateAccount"
  | "wallet.setActiveAccount"
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
