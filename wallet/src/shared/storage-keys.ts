export const STORAGE = {
  settings: "airwave.settings.v1",
  accounts: "airwave.accounts.v1",
  activeAccountId: "airwave.activeAccountId.v1",
  connections: "airwave.connections.v1",
  vault: "airwave.vault.v1",
} as const;

/** 僅 `chrome.storage.session`：解鎖工作金鑰。關瀏覽器即清。禁止寫入 local。 */
export const SESSION_UNLOCKED = "airwave.unlocked.session.v1";

export type UiLocale = "zh-Hant" | "zh-Hans" | "en";

export type Cluster = "devnet" | "mainnet";

export type ClusterRpcConfig = {
  /** 自訂節點（不含該鏈公開 RPC） */
  urls: string[];
  /** 目前選用的自訂 URL；空字串＝該鏈公開節點 */
  active: string;
};

export type Settings = {
  cluster: Cluster;
  /** 目前 cluster 實際使用的 RPC（給 Connection／持倉） */
  rpcUrl: string;
  rpcByCluster: Record<Cluster, ClusterRpcConfig>;
  heliusApiUrl: string;
  jupiterApiKey: string;
  /** micro-lamports per CU；未簽 signTransaction 預設 CU price */
  defaultCuPrice: number;
  locale: UiLocale;
};

export type AccountKind = "signing" | "readOnly";

export type SigningOrWatchMeta = {
  id: string;
  label: string;
  kind?: AccountKind;
  publicKeyBase58: string;
};

export type CombinedAccountMeta = {
  id: string;
  label: string;
  kind: "combined";
  subPubkeys: string[];
  mainPubkey: string;
};

export type AccountMeta = SigningOrWatchMeta | CombinedAccountMeta;

export function accountKind(meta: AccountMeta): AccountKind | "combined" {
  if (meta.kind === "combined") return "combined";
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
  rpcByCluster: {
    devnet: { urls: [], active: "" },
    mainnet: { urls: [], active: "" },
  },
  heliusApiUrl: "",
  jupiterApiKey: "",
  defaultCuPrice: 25_000,
  locale: "zh-Hant",
};

export const PUBLIC_RPC_BY_CLUSTER: Record<Cluster, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

export function isPublicClusterRpc(url: string): boolean {
  const u = url.trim();
  return u === PUBLIC_RPC_BY_CLUSTER.devnet || u === PUBLIC_RPC_BY_CLUSTER.mainnet;
}

export function customRpcForCluster(url: string, cluster: Cluster): string {
  const t = url.trim();
  if (!t || isPublicClusterRpc(t)) return "";
  return t;
}

export function emptyClusterRpc(): ClusterRpcConfig {
  return { urls: [], active: "" };
}

export function normalizeClusterRpc(raw: unknown, cluster: Cluster): ClusterRpcConfig {
  if (typeof raw === "string") {
    const c = customRpcForCluster(raw, cluster);
    return { urls: c ? [c] : [], active: c };
  }
  if (!raw || typeof raw !== "object") return emptyClusterRpc();
  const rec = raw as { urls?: unknown; active?: unknown };
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (u: unknown): void => {
    const c = customRpcForCluster(typeof u === "string" ? u : "", cluster);
    if (c && !seen.has(c)) {
      seen.add(c);
      urls.push(c);
    }
  };
  if (Array.isArray(rec.urls)) {
    for (const u of rec.urls) push(u);
  }
  const active = customRpcForCluster(
    typeof rec.active === "string" ? rec.active : "",
    cluster,
  );
  if (active && !seen.has(active)) {
    urls.push(active);
  }
  return { urls, active: active && urls.includes(active) ? active : "" };
}

export function effectiveRpcUrl(cluster: Cluster, cfg: ClusterRpcConfig): string {
  if (cfg.active && cfg.urls.includes(cfg.active)) return cfg.active;
  return PUBLIC_RPC_BY_CLUSTER[cluster];
}
