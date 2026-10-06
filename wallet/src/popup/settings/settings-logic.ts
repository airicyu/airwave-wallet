import { sendExtensionRequest } from "../../shared/ext-api";
import {
  customRpcForCluster,
  PUBLIC_RPC_BY_CLUSTER,
  type Cluster,
  type ClusterRpcConfig,
  type Settings,
} from "../../shared/storage-keys";
import { bumpUi, clearError, navigateTo, refresh, session, showError } from "../lib/session";

export const MASKED_SECRET_DISPLAY = "••••••";

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

export async function patchRpcByCluster(next: Record<Cluster, ClusterRpcConfig>): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", { rpcByCluster: next });
  if (!res.ok) showError(res.error?.message ?? "儲存 RPC 失敗");
  else await refresh();
}

export async function patchSettingsPartial(patch: Partial<Settings>): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", patch);
  if (!res.ok) showError(res.error?.message ?? "儲存設定失敗");
  else await refresh();
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

export function changePasswordCanSubmit(): boolean {
  if (session.changePwdNew.length < 8) return false;
  if (session.changePwdNew !== session.changePwdConfirm) return false;
  if (!session.changePwdCurrent) return false;
  return true;
}

export async function submitChangePassword(): Promise<void> {
  clearError();
  session.changePwdErr = "";
  const currentPassword = session.changePwdCurrent;
  const newPassword = session.changePwdNew;
  const confirm = session.changePwdConfirm;
  if (newPassword.length < 8) {
    session.changePwdCurrent = "";
    session.changePwdNew = "";
    session.changePwdConfirm = "";
    session.changePwdErr = "新密碼過短";
    bumpUi();
    return;
  }
  if (newPassword !== confirm) {
    session.changePwdCurrent = "";
    session.changePwdNew = "";
    session.changePwdConfirm = "";
    session.changePwdErr = "新密碼不一致";
    bumpUi();
    return;
  }
  const res = await sendExtensionRequest("wallet.changeVaultPassword", {
    currentPassword,
    newPassword,
  });
  session.changePwdCurrent = "";
  session.changePwdNew = "";
  session.changePwdConfirm = "";
  bumpUi();
  if (!res.ok) {
    const code = res.error?.code;
    if (code === "INVALID_PASSWORD") session.changePwdErr = "密碼錯誤";
    else if (code === "WEAK_PASSWORD") session.changePwdErr = "新密碼過短";
    else showError(res.error?.message ?? "變更失敗");
    bumpUi();
    return;
  }
  await refresh();
  navigateTo("settings");
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

export function commitDefaultCuPriceFromDraft(): void {
  const parsed = parseDefaultCuPriceInput(session.cuPriceDraft);
  if (parsed == null) {
    session.cuPriceDraft = String(session.lastLegalDefaultCuPrice);
    bumpUi();
    return;
  }
  if (parsed === session.lastLegalDefaultCuPrice) return;
  session.lastLegalDefaultCuPrice = parsed;
  void patchSettingsPartial({ defaultCuPrice: parsed });
}

export async function persistHeliusField(): Promise<void> {
  if (!session.lastState) return;
  if (!session.keysHeliusRevealed && session.lastState.settings.heliusApiUrl) return;
  let heliusApiUrl = session.heliusDraft.trim();
  if (heliusApiUrl === MASKED_SECRET_DISPLAY) heliusApiUrl = session.lastState.settings.heliusApiUrl;
  if (heliusApiUrl === session.lastState.settings.heliusApiUrl) return;
  session.keysHeliusRevealed = false;
  await patchSettingsPartial({ heliusApiUrl });
}

export async function persistJupiterField(): Promise<void> {
  if (!session.lastState) return;
  if (!session.keysJupiterRevealed && session.lastState.settings.jupiterApiKey) return;
  let jupiterApiKey = session.jupiterDraft.trim();
  if (jupiterApiKey === MASKED_SECRET_DISPLAY) jupiterApiKey = session.lastState.settings.jupiterApiKey;
  if (jupiterApiKey === session.lastState.settings.jupiterApiKey) return;
  session.keysJupiterRevealed = false;
  await patchSettingsPartial({ jupiterApiKey });
}

export function confirmRpcUrl(cluster: Cluster, url: string, isNew: boolean): void {
  clearError();
  const nextUrl = customRpcForCluster(session.rpcEditDraft, cluster);
  if (!looksHttpUrl(session.rpcEditDraft) || !nextUrl) {
    showError("請輸入有效的 https RPC URL");
    return;
  }
  if (!session.lastState) return;
  const next = cloneRpcByCluster(session.lastState.settings.rpcByCluster);
  if (isNew) {
    if (!next[cluster].urls.includes(nextUrl)) {
      next[cluster].urls = [...next[cluster].urls, nextUrl];
    }
    next[cluster].active = nextUrl;
    session.rpcEditKey = rpcOptionKey(cluster, false, nextUrl);
  } else {
    const urls = next[cluster].urls.map((u) => (u === url ? nextUrl : u));
    next[cluster].urls = [...new Set(urls)];
    if (next[cluster].active === url) next[cluster].active = nextUrl;
    session.rpcEditKey = rpcOptionKey(cluster, false, nextUrl);
  }
  session.rpcEditDraft = nextUrl;
  void patchRpcByCluster(next);
}

export { PUBLIC_RPC_BY_CLUSTER };
export type { Cluster };
