export type AirwaveInjectOut = {
  source: "airwave-inject";
  requestId: string;
  command: string;
  payload?: unknown;
};

export type AirwaveContentIn = {
  source: "airwave-content";
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
};

export type AirwaveBridgeResult = {
  type: "airwave-bridge-result";
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
};

export type AirwaveBridgeAccountChanged = {
  type: "airwave-bridge-account-changed";
  publicKeyBase58: string;
  cluster: "devnet" | "mainnet";
};

export type AirwaveBridgeDisconnected = {
  type: "airwave-bridge-disconnected";
  origin: string;
};
