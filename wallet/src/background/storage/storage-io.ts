/**
 * Reads and normalizes persisted chrome.storage.local records (settings, accounts, connections, vault blob).
 * Does not manage in-memory pending maps or session unlock keys in chrome.storage.session.
 */
import { getExposedPublicKey } from "../../shared/accounts";
import { DEFAULT_JUPITER_API_URL, DEFAULT_OPENROUTER_API_URL } from "../../shared/rpc";
import {
  customRpcForCluster,
  effectiveRpcUrl,
  normalizeClusterRpc,
  STORAGE,
  type AccountMeta,
  type Cluster,
  type ClusterRpcConfig,
  type ConnectionsMap,
  normalizeShellMode,
  type AddressCard,
  type Settings,
  type UiLocale,
} from "../../shared/protocol";
import { normalizeDefaultCuPrice } from "../simulate";
import {
  isLegalOpenRouterModelId,
  LEGACY_039_DEFAULT_DECISIONS_MODEL,
  LEGACY_039_DEFAULT_REPORT_MODEL,
  normalizeDecisionsModel,
  normalizeModelChain,
  normalizeReportModel,
  type TxAiModelMode,
} from "../../shared/tx-ai";
import type { VaultBlob } from "../../shared/vault";

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

function normalizeIdleAutoLockEnabled(raw: unknown): boolean {
  if (raw === false) return false;
  if (raw === true) return true;
  return true;
}

function normalizeIdleAutoLockMinutes(raw: unknown): number {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 1440) return raw;
  return 10;
}

export function isPatchIdleAutoLockMinutesValid(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 1440;
}

function normalizeTxAiMode(raw: unknown): TxAiModelMode {
  return raw === "custom" ? "custom" : "default";
}

function migrateLegacySingleModel(
  legacy: string,
  defaultLegacyId: string,
): { mode: TxAiModelMode; chain: string[] } {
  const trimmed = legacy.trim();
  if (!trimmed || trimmed === defaultLegacyId) return { mode: "default", chain: [] };
  if (!isLegalOpenRouterModelId(trimmed)) return { mode: "default", chain: [] };
  return { mode: "custom", chain: [trimmed] };
}

function normalizeTxAiFields(raw: Partial<Settings> | undefined): {
  openRouterReportModelMode: TxAiModelMode;
  openRouterReportModelChain: string[];
  openRouterDecisionsModelMode: TxAiModelMode;
  openRouterDecisionsModelChain: string[];
  openRouterModel: string;
  openRouterDecisionsModel: string;
} {
  const hasReportMode =
    raw?.openRouterReportModelMode === "default" || raw?.openRouterReportModelMode === "custom";
  const hasDecisionsMode =
    raw?.openRouterDecisionsModelMode === "default" || raw?.openRouterDecisionsModelMode === "custom";

  let reportMode = hasReportMode ? normalizeTxAiMode(raw?.openRouterReportModelMode) : "default";
  let reportChain = normalizeModelChain(raw?.openRouterReportModelChain, 5);
  let decisionsMode = hasDecisionsMode ? normalizeTxAiMode(raw?.openRouterDecisionsModelMode) : "default";
  let decisionsChain = normalizeModelChain(raw?.openRouterDecisionsModelChain, 5);

  if (!hasReportMode) {
    const earlyChain = normalizeModelChain(raw?.openRouterReportModelChain, 5);
    if (earlyChain.length > 0) {
      reportMode = "custom";
      reportChain = earlyChain;
    } else {
      const legacy = typeof raw?.openRouterModel === "string" ? raw.openRouterModel : "";
      const migrated = migrateLegacySingleModel(legacy, LEGACY_039_DEFAULT_REPORT_MODEL);
      reportMode = migrated.mode;
      reportChain = migrated.chain;
    }
  } else if (reportMode === "custom" && reportChain.length === 0) {
    const legacy = typeof raw?.openRouterModel === "string" ? raw.openRouterModel : "";
    if (legacy.trim()) reportChain = normalizeModelChain([legacy], 5);
  }

  if (!hasDecisionsMode) {
    const earlyChain = normalizeModelChain(raw?.openRouterDecisionsModelChain, 5);
    if (earlyChain.length > 0) {
      decisionsMode = "custom";
      decisionsChain = earlyChain;
    } else {
      const legacy = typeof raw?.openRouterDecisionsModel === "string" ? raw.openRouterDecisionsModel : "";
      const migrated = migrateLegacySingleModel(legacy, LEGACY_039_DEFAULT_DECISIONS_MODEL);
      decisionsMode = migrated.mode;
      decisionsChain = migrated.chain;
    }
  } else if (decisionsMode === "custom" && decisionsChain.length === 0) {
    const legacy = typeof raw?.openRouterDecisionsModel === "string" ? raw.openRouterDecisionsModel : "";
    if (legacy.trim()) decisionsChain = normalizeModelChain([legacy], 5);
  }

  const openRouterModel =
    reportMode === "custom" && reportChain[0] ? reportChain[0] : normalizeReportModel(raw?.openRouterModel);
  const openRouterDecisionsModel =
    decisionsMode === "custom" && decisionsChain[0]
      ? decisionsChain[0]
      : normalizeDecisionsModel(raw?.openRouterDecisionsModel);

  return {
    openRouterReportModelMode: reportMode,
    openRouterReportModelChain: reportChain,
    openRouterDecisionsModelMode: decisionsMode,
    openRouterDecisionsModelChain: decisionsChain,
    openRouterModel,
    openRouterDecisionsModel,
  };
}

export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  const cluster = raw?.cluster === "mainnet" ? "mainnet" : "devnet";
  const rpcByCluster = normalizeRpcByCluster(raw, cluster);
  const txAi = normalizeTxAiFields(raw);
  return {
    cluster,
    rpcByCluster,
    rpcUrl: effectiveRpcUrl(cluster, rpcByCluster[cluster]),
    heliusApiUrl: typeof raw?.heliusApiUrl === "string" ? raw.heliusApiUrl : "",
    jupiterApiUrl: typeof raw?.jupiterApiUrl === "string" ? raw.jupiterApiUrl : DEFAULT_JUPITER_API_URL,
    jupiterApiKey: typeof raw?.jupiterApiKey === "string" ? raw.jupiterApiKey : "",
    openRouterApiKey: typeof raw?.openRouterApiKey === "string" ? raw.openRouterApiKey : "",
    openRouterApiUrl:
      typeof raw?.openRouterApiUrl === "string" ? raw.openRouterApiUrl : DEFAULT_OPENROUTER_API_URL,
    ...txAi,
    txAiAnalysisEnabled: raw?.txAiAnalysisEnabled ?? true,
    defaultCuPrice: normalizeDefaultCuPrice(raw?.defaultCuPrice),
    locale: normalizeUiLocale(raw?.locale),
    shell: normalizeShellMode(raw?.shell),
    rpcGuideDismissed: raw?.rpcGuideDismissed === true,
    idleAutoLockEnabled: normalizeIdleAutoLockEnabled(raw?.idleAutoLockEnabled),
    idleAutoLockMinutes: normalizeIdleAutoLockMinutes(raw?.idleAutoLockMinutes),
    debugModeEnabled: raw?.debugModeEnabled === true,
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

export async function readAddressBook(): Promise<AddressCard[]> {
  const r = await chrome.storage.local.get(STORAGE.addressBook);
  const raw = r[STORAGE.addressBook];
  if (!Array.isArray(raw)) return [];
  const cards: AddressCard[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<AddressCard>;
    if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.address !== "string") continue;
    cards.push({ id: row.id, name: row.name, address: row.address });
  }
  return cards;
}

export async function writeAddressBook(cards: AddressCard[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE.addressBook]: cards });
}

export async function getActivePublicKey(): Promise<string | null> {
  const accounts = await readAccounts();
  const activeId = await readActiveAccountId();
  const acc = accounts.find((a) => a.id === activeId);
  if (!acc) return null;
  return getExposedPublicKey(acc);
}
