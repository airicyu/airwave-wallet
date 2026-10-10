/**
 * chrome.storage key constants and Settings/AccountMeta types with RPC and settings normalization helpers.
 * Does not read or write storage records (see background storage-io).
 */
import { resolveHeliusApiTarget } from "./helius-api-target";
export const STORAGE = {
  settings: "airwave.settings.v1",
  accounts: "airwave.accounts.v1",
  activeAccountId: "airwave.activeAccountId.v1",
  connections: "airwave.connections.v1",
  vault: "airwave.vault.v1",
  /** Integer generation of local records; not the extension X.Y.Z. */
  schemaGeneration: "airwave.schemaGeneration",
} as const;

/** This build's local schema generation. Existing `*.v1` keys are generation 1. */
export const CURRENT_SCHEMA_GENERATION = 1;

/** `chrome.storage.session` only: unlock working key. Cleared when the browser closes. Never write to local. */
export const SESSION_UNLOCKED = "airwave.unlocked.session.v1";

export type UiLocale = "zh-Hant" | "zh-Hans" | "en";

/** Wallet shell: standalone window or Chrome side panel (roadmap 0.25.0). */
export type ShellMode = "window" | "sidebar";

export type Cluster = "devnet" | "mainnet";

export type ClusterRpcConfig = {
  /** Custom endpoints (not that cluster's public RPC). */
  urls: string[];
  /** Selected custom URL. Devnet empty = official public RPC; Mainnet empty = unset. */
  active: string;
};

export type Settings = {
  cluster: Cluster;
  /** RPC the current cluster actually uses (Connection / holdings). */
  rpcUrl: string;
  rpcByCluster: Record<Cluster, ClusterRpcConfig>;
  heliusApiUrl: string;
  jupiterApiKey: string;
  /** micro-lamports per CU; default CU price for unsigned signTransaction. */
  defaultCuPrice: number;
  locale: UiLocale;
  shell: ShellMode;
  /** First-account RPC guide already seen (Skip or open Settings both count). */
  rpcGuideDismissed: boolean;
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
  shell: "window",
  rpcGuideDismissed: false,
};

export const PUBLIC_RPC_BY_CLUSTER: Record<Cluster, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

/** Persisted `shell` is ignored; live mode is whether the side panel document is open. */
export function normalizeShellMode(_raw?: unknown): ShellMode {
  return "window";
}

export function isPublicClusterRpc(url: string): boolean {
  const u = url.trim();
  return u === PUBLIC_RPC_BY_CLUSTER.devnet || u === PUBLIC_RPC_BY_CLUSTER.mainnet;
}

export function isAllowedCustomRpc(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.username || parsed.password) return false;
    if (!parsed.hostname) return false;
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:") {
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    }
    return false;
  } catch {
    return false;
  }
}

export function customRpcForCluster(url: string, cluster: Cluster): string {
  const t = url.trim();
  if (!t || isPublicClusterRpc(t)) return "";
  if (!isAllowedCustomRpc(t)) return "";
  return t;
}

export type PublicSettings = Omit<Settings, "jupiterApiKey" | "heliusApiUrl"> & {
  jupiterConfigured: boolean;
  heliusConfigured: boolean;
};

export function toPublicSettings(settings: Settings): PublicSettings {
  const { jupiterApiKey, heliusApiUrl, ...rest } = settings;
  return {
    ...rest,
    jupiterConfigured: jupiterApiKey.trim().length > 0,
    heliusConfigured: resolveHeliusApiTarget(heliusApiUrl) != null,
  };
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

export function isMainnetRpcReady(cfg: ClusterRpcConfig): boolean {
  const active = cfg.active.trim();
  if (!active) return false;
  if (active === PUBLIC_RPC_BY_CLUSTER.mainnet) return false;
  return isAllowedCustomRpc(active) && cfg.urls.includes(active);
}

export function jsonRpcMissing(settings: { cluster: Cluster; rpcUrl: string }): boolean {
  return settings.cluster === "mainnet" && settings.rpcUrl.trim() === "";
}

export function effectiveRpcUrl(cluster: Cluster, cfg: ClusterRpcConfig): string {
  if (cluster === "mainnet") {
    return isMainnetRpcReady(cfg) ? cfg.active.trim() : "";
  }
  if (cfg.active && cfg.urls.includes(cfg.active)) return cfg.active;
  return PUBLIC_RPC_BY_CLUSTER.devnet;
}
