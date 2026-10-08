/**
 * Reads and normalizes persisted chrome.storage.local records (settings, accounts, connections, vault blob).
 * Does not manage in-memory pending maps or session unlock keys in chrome.storage.session.
 */
import { getExposedPublicKey } from "../../shared/accounts";
import {
  customRpcForCluster,
  effectiveRpcUrl,
  normalizeClusterRpc,
  STORAGE,
  type AccountMeta,
  type Cluster,
  type ClusterRpcConfig,
  type ConnectionsMap,
  type Settings,
  type UiLocale,
} from "../../shared/storage-keys";
import { normalizeDefaultCuPrice } from "../simulate";
import type { VaultBlob } from "../../shared/crypto-vault";

export async function readSettings(): Promise<Settings> {
  const r = await chrome.storage.local.get(STORAGE.settings);
  const raw = r[STORAGE.settings] as Partial<Settings> | undefined;
  return normalizeSettings(raw);
}

function trimSetting(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeRpcByCluster(
  raw: Partial<Settings> | undefined,
  cluster: Cluster,
): Record<Cluster, ClusterRpcConfig> {
  const rawBy = raw?.rpcByCluster as unknown;
  if (rawBy && typeof rawBy === "object") {
    const rec = rawBy as Record<string, unknown>;
    return {
      devnet: normalizeClusterRpc(rec.devnet, "devnet"),
      mainnet: normalizeClusterRpc(rec.mainnet, "mainnet"),
    };
  }
  const old = customRpcForCluster(trimSetting(raw?.rpcUrl), cluster);
  const by: Record<Cluster, ClusterRpcConfig> = {
    devnet: { urls: [], active: "" },
    mainnet: { urls: [], active: "" },
  };
  if (old) {
    by[cluster] = { urls: [old], active: old };
  }
  return by;
}

function normalizeUiLocale(raw: unknown): UiLocale {
  if (raw === "zh-Hant" || raw === "zh-Hans" || raw === "en") return raw;
  return "zh-Hant";
}

export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  const cluster = raw?.cluster === "mainnet" ? "mainnet" : "devnet";
  const rpcByCluster = normalizeRpcByCluster(raw, cluster);
  return {
    cluster,
    rpcByCluster,
    rpcUrl: effectiveRpcUrl(cluster, rpcByCluster[cluster]),
    heliusApiUrl: typeof raw?.heliusApiUrl === "string" ? raw.heliusApiUrl : "",
    jupiterApiKey: typeof raw?.jupiterApiKey === "string" ? raw.jupiterApiKey : "",
    defaultCuPrice: normalizeDefaultCuPrice(raw?.defaultCuPrice),
    locale: normalizeUiLocale(raw?.locale),
  };
}

export async function writeSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.settings]: settings });
}

export async function readAccounts(): Promise<AccountMeta[]> {
  const r = await chrome.storage.local.get(STORAGE.accounts);
  return (r[STORAGE.accounts] as AccountMeta[] | undefined) ?? [];
}

export async function writeAccounts(accounts: AccountMeta[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.accounts]: accounts });
}

export async function readActiveAccountId(): Promise<string | null> {
  const r = await chrome.storage.local.get(STORAGE.activeAccountId);
  return (r[STORAGE.activeAccountId] as string | undefined) ?? null;
}

export async function writeActiveAccountId(id: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.activeAccountId]: id });
}

export async function clearActiveAccountId(): Promise<void> {
  await chrome.storage.local.remove(STORAGE.activeAccountId);
}

export async function readConnections(): Promise<ConnectionsMap> {
  const r = await chrome.storage.local.get(STORAGE.connections);
  return (r[STORAGE.connections] as ConnectionsMap | undefined) ?? {};
}

export async function writeConnections(map: ConnectionsMap): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.connections]: map });
}

export async function readVaultBlob(): Promise<VaultBlob | null> {
  const r = await chrome.storage.local.get(STORAGE.vault);
  return (r[STORAGE.vault] as VaultBlob | undefined) ?? null;
}

export async function writeVaultBlob(blob: VaultBlob): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.vault]: blob });
}

export async function getActivePublicKey(): Promise<string | null> {
  const accounts = await readAccounts();
  const activeId = await readActiveAccountId();
  const acc = accounts.find((a) => a.id === activeId);
  if (!acc) return null;
  return getExposedPublicKey(acc);
}
