export const STORAGE = {
  settings: "airwave.settings.v1",
  accounts: "airwave.accounts.v1",
  activeAccountId: "airwave.activeAccountId.v1",
  connections: "airwave.connections.v1",
  vault: "airwave.vault.v1",
} as const;

export type Cluster = "devnet" | "mainnet";

export type Settings = {
  cluster: Cluster;
  rpcUrl: string;
};

export type AccountMeta = {
  id: string;
  label: string;
  publicKeyBase58: string;
};

export type ConnectionRecord = {
  accountId: string;
  connectedAt: number;
  tabIds: number[];
};

export type ConnectionsMap = Record<string, ConnectionRecord>;

export const DEFAULT_SETTINGS: Settings = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
};
