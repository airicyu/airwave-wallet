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
  heliusApiUrl: string;
  jupiterApiKey: string;
};

export type AccountKind = "signing" | "readOnly";

export type AccountMeta = {
  id: string;
  label: string;
  publicKeyBase58: string;
  kind?: AccountKind;
};

export function accountKind(meta: AccountMeta): AccountKind {
  return meta.kind ?? "signing";
}

export type ConnectionRecord = {
  accountId: string;
  connectedAt: number;
  tabIds: number[];
};

export type ConnectionsMap = Record<string, ConnectionRecord>;

export const DEFAULT_SETTINGS: Settings = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  heliusApiUrl: "",
  jupiterApiKey: "",
};

export const PUBLIC_RPC_BY_CLUSTER: Record<Cluster, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

export function isPublicClusterRpc(url: string): boolean {
  const u = url.trim();
  return u === PUBLIC_RPC_BY_CLUSTER.devnet || u === PUBLIC_RPC_BY_CLUSTER.mainnet;
}
