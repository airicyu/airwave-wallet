import { sendExtensionRequest } from "../../shared/ext-api";
import {
  customRpcForCluster,
  PUBLIC_RPC_BY_CLUSTER,
  type Cluster,
  type ClusterRpcConfig,
  type Settings,
} from "../../shared/storage-keys";
import type { State } from "../types";

export const MASKED_SECRET_DISPLAY = "••••••";

export type SettingsIo = {
  refresh: () => Promise<State>;
  showError: (msg: string) => void;
};

export function rpcFingerprint(settings: Settings): string {
  const pack = (c: Cluster): string => {
    const cfg = settings.rpcByCluster[c];
    return `${cfg.active}\u001e${cfg.urls.join("\u001f")}`;
  };
  return `${pack("devnet")}|${pack("mainnet")}`;
}

export function settingsFingerprint(settings: Settings): string {
  return `${settings.cluster}|${rpcFingerprint(settings)}|${settings.heliusApiUrl}|${settings.jupiterApiKey}|${settings.defaultCuPrice}`;
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

export async function patchRpcByCluster(next: Record<Cluster, ClusterRpcConfig>, io: SettingsIo): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", { rpcByCluster: next });
  if (!res.ok) io.showError(res.error?.message ?? "儲存 RPC 失敗");
  else await io.refresh();
}

export async function patchSettingsPartial(patch: Partial<Settings>, io: SettingsIo): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", patch);
  if (!res.ok) io.showError(res.error?.message ?? "儲存設定失敗");
  else await io.refresh();
}

export function looksHttpUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

export function rpcOptionKey(cluster: Cluster, isPublic: boolean, url: string): string {
  return isPublic ? `${cluster}:public` : `${cluster}:${url}`;
}

export function apiKeysHubSummary(settings: Settings): string {
  const h = settings.heliusApiUrl.trim().length > 0;
  const j = settings.jupiterApiKey.trim().length > 0;
  if (h && j) return "已設定";
  if (h || j) return "部分設定";
  return "未設定";
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
  io: SettingsIo;
}): Promise<{ ok: true } | { ok: false; err?: string }> {
  const { currentPassword, newPassword, confirm } = args;
  if (newPassword.length < 8) {
    return { ok: false, err: "新密碼過短" };
  }
  if (newPassword !== confirm) {
    return { ok: false, err: "新密碼不一致" };
  }
  const res = await sendExtensionRequest("wallet.changeVaultPassword", {
    currentPassword,
    newPassword,
  });
  if (!res.ok) {
    const code = res.error?.code;
    if (code === "INVALID_PASSWORD") return { ok: false, err: "密碼錯誤" };
    if (code === "WEAK_PASSWORD") return { ok: false, err: "新密碼過短" };
    args.io.showError(res.error?.message ?? "變更失敗");
    return { ok: false };
  }
  await args.io.refresh();
  return { ok: true };
}

export function parseDefaultCuPriceInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
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
}): Promise<boolean> {
  if (!args.revealed && args.wallet.settings.heliusApiUrl) return false;
  let heliusApiUrl = args.draft.trim();
  if (heliusApiUrl === MASKED_SECRET_DISPLAY) heliusApiUrl = args.wallet.settings.heliusApiUrl;
  if (heliusApiUrl === args.wallet.settings.heliusApiUrl) return false;
  await patchSettingsPartial({ heliusApiUrl }, args.io);
  return true;
}

export async function persistJupiterField(args: {
  wallet: State;
  revealed: boolean;
  draft: string;
  io: SettingsIo;
}): Promise<boolean> {
  if (!args.revealed && args.wallet.settings.jupiterApiKey) return false;
  let jupiterApiKey = args.draft.trim();
  if (jupiterApiKey === MASKED_SECRET_DISPLAY) jupiterApiKey = args.wallet.settings.jupiterApiKey;
  if (jupiterApiKey === args.wallet.settings.jupiterApiKey) return false;
  await patchSettingsPartial({ jupiterApiKey }, args.io);
  return true;
}

export function confirmRpcUrl(args: {
  cluster: Cluster;
  url: string;
  isNew: boolean;
  draft: string;
  wallet: State;
}): { ok: false; error: string } | { ok: true; next: Record<Cluster, ClusterRpcConfig>; nextUrl: string } {
  const nextUrl = customRpcForCluster(args.draft, args.cluster);
  if (!looksHttpUrl(args.draft) || !nextUrl) {
    return { ok: false, error: "請輸入有效的 https RPC URL" };
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
