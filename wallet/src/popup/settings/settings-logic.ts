/**
 * Settings edit helpers, RPC/settings fingerprints, and patch flows for the popup settings screens.
 * Does not write chrome.storage directly without typed wallet extension commands.
 */
import { sendExtensionRequest } from "../../shared/ext-api";
import {
  customRpcForCluster,
  PUBLIC_RPC_BY_CLUSTER,
  type Cluster,
  type ClusterRpcConfig,
  type PublicSettings,
  type Settings,
  type UiLocale,
} from "../../shared/storage-keys";
import { apiErrorMessage, messageForErrorCode, t } from "../../shared/ui-i18n";
import type { MessageKey } from "../../shared/ui-messages";
import type { State } from "../types";

export const MASKED_SECRET_DISPLAY = "••••••";

export type SettingsIo = {
  refresh: () => Promise<State>;
  showError: (msg: string) => void;
  locale: UiLocale;
};

export function rpcFingerprint(settings: PublicSettings): string {
  const pack = (c: Cluster): string => {
    const cfg = settings.rpcByCluster[c];
    return `${cfg.active}\u001e${cfg.urls.join("\u001f")}`;
  };
  return `${pack("devnet")}|${pack("mainnet")}`;
}

export function settingsFingerprint(settings: PublicSettings): string {
  return `${settings.cluster}|${rpcFingerprint(settings)}|${settings.heliusConfigured}|${settings.jupiterConfigured}|${settings.defaultCuPrice}`;
}

export function cloneRpcByCluster(
  raw: Record<Cluster, ClusterRpcConfig> | undefined,
): Record<Cluster, ClusterRpcConfig> {
  const src = raw ?? {
    devnet: { urls: [], active: "" },
    mainnet: { urls: [], active: "" },
  };
  return {
    devnet: { urls: [...src.devnet.urls], active: src.devnet.active },
    mainnet: { urls: [...src.mainnet.urls], active: src.mainnet.active },
  };
}

export async function patchRpcByCluster(next: Record<Cluster, ClusterRpcConfig>, io: SettingsIo, locale: UiLocale): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", { rpcByCluster: next });
  if (!res.ok) {
    if (res.error?.code === "INVALID_RPC") io.showError(t(locale, "error.invalidRpcUrl"));
    else io.showError(apiErrorMessage(locale, res.error, "error.saveRpcFailed"));
  } else await io.refresh();
}

export async function patchSettingsPartial(patch: Partial<Settings>, io: SettingsIo, locale: UiLocale): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", patch);
  if (!res.ok) io.showError(apiErrorMessage(locale, res.error, "error.saveSettingsFailed"));
  else await io.refresh();
}

export function looksHttpUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

export function rpcOptionKey(cluster: Cluster, isPublic: boolean, url: string): string {
  return isPublic ? `${cluster}:public` : `${cluster}:${url}`;
}

async function readStoredIntegrationSecrets(): Promise<{ jupiterApiKey: string; heliusApiUrl: string }> {
  const res = await sendExtensionRequest("wallet.readIntegrationSecrets", {});
  if (!res.ok) return { jupiterApiKey: "", heliusApiUrl: "" };
  const result = (res.result ?? {}) as { jupiterApiKey?: string; heliusApiUrl?: string };
  return {
    jupiterApiKey: result.jupiterApiKey ?? "",
    heliusApiUrl: result.heliusApiUrl ?? "",
  };
}

export function apiKeysHubSummary(settings: PublicSettings, locale: UiLocale): string {
  const h = settings.heliusConfigured;
  const j = settings.jupiterConfigured;
  if (h && j) return t(locale, "settings.hub.keysConfigured");
  if (h || j) return t(locale, "settings.hub.keysPartial");
  return t(locale, "settings.hub.keysUnset");
}

export function changePasswordCanSubmit(current: string, next: string, confirm: string): boolean {
  if (next.length < 8) return false;
  if (next !== confirm) return false;
  if (!current) return false;
  return true;
}

export async function submitChangePassword(args: {
  currentPassword: string;
  newPassword: string;
  confirm: string;
  locale: UiLocale;
  io: SettingsIo;
}): Promise<{ ok: true } | { ok: false; err?: MessageKey }> {
  const { currentPassword, newPassword, confirm, locale } = args;
  if (newPassword.length < 8) {
    return { ok: false, err: "error.passwordTooShort" };
  }
  if (newPassword !== confirm) {
    return { ok: false, err: "error.passwordNewMismatch" };
  }
  const res = await sendExtensionRequest("wallet.changeVaultPassword", {
    currentPassword,
    newPassword,
  });
  if (!res.ok) {
    const code = res.error?.code;
    if (code === "INVALID_PASSWORD") return { ok: false, err: "error.code.INVALID_PASSWORD" };
    if (code === "WEAK_PASSWORD") return { ok: false, err: "error.code.WEAK_PASSWORD" };
    args.io.showError(messageForErrorCode(locale, code ?? "") || t(locale, "error.changePasswordFailed"));
    return { ok: false };
  }
  await args.io.refresh();
  return { ok: true };
}

export function parseDefaultCuPriceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 0 || i > 1_000_000_000) return null;
  return i;
}

export async function persistHeliusField(args: {
  wallet: State;
  revealed: boolean;
  draft: string;
  io: SettingsIo;
  locale: UiLocale;
}): Promise<boolean> {
  const stored = (await readStoredIntegrationSecrets()).heliusApiUrl;
  if (!args.revealed && args.wallet.settings.heliusConfigured) return false;
  let heliusApiUrl = args.draft.trim();
  if (heliusApiUrl === MASKED_SECRET_DISPLAY) heliusApiUrl = stored;
  if (heliusApiUrl === stored) return false;
  await patchSettingsPartial({ heliusApiUrl }, args.io, args.locale);
  return true;
}

export async function persistJupiterField(args: {
  wallet: State;
  revealed: boolean;
  draft: string;
  io: SettingsIo;
  locale: UiLocale;
}): Promise<boolean> {
  const stored = (await readStoredIntegrationSecrets()).jupiterApiKey;
  if (!args.revealed && args.wallet.settings.jupiterConfigured) return false;
  let jupiterApiKey = args.draft.trim();
  if (jupiterApiKey === MASKED_SECRET_DISPLAY) jupiterApiKey = stored;
  if (jupiterApiKey === stored) return false;
  await patchSettingsPartial({ jupiterApiKey }, args.io, args.locale);
  return true;
}

export function confirmRpcUrl(args: {
  cluster: Cluster;
  url: string;
  isNew: boolean;
  draft: string;
  wallet: State;
  locale: UiLocale;
}): { ok: false; error: MessageKey } | { ok: true; next: Record<Cluster, ClusterRpcConfig>; nextUrl: string } {
  const nextUrl = customRpcForCluster(args.draft, args.cluster);
  if (!looksHttpUrl(args.draft) || !nextUrl) {
    return { ok: false, error: "error.invalidRpcUrl" };
  }
  const next = cloneRpcByCluster(args.wallet.settings.rpcByCluster);
  if (args.isNew) {
    if (!next[args.cluster].urls.includes(nextUrl)) {
      next[args.cluster].urls = [...next[args.cluster].urls, nextUrl];
    }
    next[args.cluster].active = nextUrl;
  } else {
    const urls = next[args.cluster].urls.map((u) => (u === args.url ? nextUrl : u));
    next[args.cluster].urls = [...new Set(urls)];
    if (next[args.cluster].active === args.url) next[args.cluster].active = nextUrl;
  }
  return { ok: true, next, nextUrl };
}

export { PUBLIC_RPC_BY_CLUSTER };
export type { Cluster };
