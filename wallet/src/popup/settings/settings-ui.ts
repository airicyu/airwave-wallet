import { sendExtensionRequest } from "../../shared/ext-api";
import {
  customRpcForCluster,
  PUBLIC_RPC_BY_CLUSTER,
  type Cluster,
  type ClusterRpcConfig,
  type Settings,
} from "../../shared/storage-keys";
import { el } from "../lib";
import { SVG_CHECK, SVG_PLUS, SVG_TRASH, SVG_EYE } from "../lib";
import { hardenApiKeyInput } from "../lib";
import { clearError, navigateTo, refresh, session, showError, syncShellDock } from "../lib";

const MASKED_SECRET_DISPLAY = "••••••";

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

function cloneRpcByCluster(
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

async function patchRpcByCluster(next: Record<Cluster, ClusterRpcConfig>): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", { rpcByCluster: next });
  if (!res.ok) showError(res.error?.message ?? "儲存 RPC 失敗");
  else await refresh();
}

export async function patchSettingsPartial(patch: Partial<Settings>): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", patch);
  if (!res.ok) showError(res.error?.message ?? "儲存設定失敗");
  else await refresh();
}

function looksHttpUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s);
}

function rpcIconButton(title: string, svgInner: string, extraClass = ""): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `icon-btn ghost-inline rpc-icon-btn${extraClass ? ` ${extraClass}` : ""}`;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${svgInner}</svg>`;
  return btn;
}

function rpcOptionKey(cluster: Cluster, isPublic: boolean, url: string): string {
  return isPublic ? `${cluster}:public` : `${cluster}:${url}`;
}

function apiKeysHubSummary(settings: Settings): string {
  const h = settings.heliusApiUrl.trim().length > 0;
  const j = settings.jupiterApiKey.trim().length > 0;
  if (h && j) return "已設定";
  if (h || j) return "部分設定";
  return "未設定";
}

export function renderSettingsHub(settings: Settings): void {
  el.hubSummaryNetwork.textContent = settings.cluster === "mainnet" ? "Mainnet" : "Devnet";
  el.hubSummaryRpc.textContent = settings.rpcUrl;
  el.hubSummaryKeys.textContent = apiKeysHubSummary(settings);
  el.hubSummaryCuPrice.textContent = String(settings.defaultCuPrice);
}

export function syncNetworkRadios(settings: Settings): void {
  document.querySelectorAll<HTMLInputElement>('input[name="settings-cluster"]').forEach((radio) => {
    radio.checked = radio.value === settings.cluster;
  });
}

export function renderSettingsKeysFields(settings: Settings): void {
  const heliusFocused = document.activeElement === el.heliusApiUrl;
  const jupiterFocused = document.activeElement === el.jupiterApiKey;
  if (!heliusFocused) {
    if (!session.keysHeliusRevealed && settings.heliusApiUrl) {
      el.heliusApiUrl.value = MASKED_SECRET_DISPLAY;
      el.heliusApiUrl.readOnly = true;
    } else if (session.keysHeliusRevealed) {
      el.heliusApiUrl.readOnly = false;
      el.heliusApiUrl.value = settings.heliusApiUrl;
    } else {
      el.heliusApiUrl.readOnly = false;
      el.heliusApiUrl.value = "";
    }
  }
  if (!jupiterFocused) {
    if (!session.keysJupiterRevealed && settings.jupiterApiKey) {
      el.jupiterApiKey.value = MASKED_SECRET_DISPLAY;
      el.jupiterApiKey.readOnly = true;
    } else if (session.keysJupiterRevealed) {
      el.jupiterApiKey.readOnly = false;
      el.jupiterApiKey.value = settings.jupiterApiKey;
    } else {
      el.jupiterApiKey.readOnly = false;
      el.jupiterApiKey.value = "";
    }
  }
}

export function renderSettingsCuPriceField(settings: Settings): void {
  if (document.activeElement === el.defaultCuPriceInput) return;
  el.defaultCuPriceInput.value = String(settings.defaultCuPrice);
}

export function renderSettingsPanel(settings: Settings): void {
  renderSettingsHub(settings);
  syncNetworkRadios(settings);
  const badgeDev = document.getElementById("rpc-badge-devnet");
  const badgeMain = document.getElementById("rpc-badge-mainnet");
  if (badgeDev) badgeDev.hidden = settings.cluster !== "devnet";
  if (badgeMain) badgeMain.hidden = settings.cluster !== "mainnet";
  renderRpcByCluster(settings, "devnet");
  renderRpcByCluster(settings, "mainnet");
  renderSettingsKeysFields(settings);
  renderSettingsCuPriceField(settings);
}

export function renderRpcByCluster(settings: Settings, cluster: Cluster): void {
  const host = document.querySelector<HTMLElement>(`[data-rpc-list="${cluster}"]`);
  if (!host) return;
  host.replaceChildren();
  const cfg = settings.rpcByCluster[cluster];

  const addRow = (url: string, isPublic: boolean): void => {
    const key = rpcOptionKey(cluster, isPublic, url);
    const wrap = document.createElement("div");
    const row = document.createElement("div");
    const selected = isPublic ? cfg.active === "" : cfg.active === url;
    row.className = selected ? "rpc-row selected" : "rpc-row";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `rpc-active-${cluster}`;
    radio.checked = selected;
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      const next = cloneRpcByCluster(settings.rpcByCluster);
      next[cluster] = { ...next[cluster], active: isPublic ? "" : url };
      void patchRpcByCluster(next);
    });
    const text = document.createElement("button");
    text.type = "button";
    text.className = "rpc-url-text";
    text.addEventListener("click", () => {
      session.rpcEditKey = session.rpcEditKey === key ? null : key;
      renderRpcByCluster(settings, cluster);
    });
    text.textContent = url;
    row.append(radio, text);
    if (isPublic) {
      const badge = document.createElement("span");
      badge.className = "rpc-badge";
      badge.textContent = "內建";
      row.append(badge);
    } else {
      const del = rpcIconButton("刪除", SVG_TRASH, "danger");
      del.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const next = cloneRpcByCluster(settings.rpcByCluster);
        const urls = next[cluster].urls.filter((u) => u !== url);
        const active = next[cluster].active === url ? "" : next[cluster].active;
        next[cluster] = { urls, active };
        if (session.rpcEditKey === key) session.rpcEditKey = null;
        void patchRpcByCluster(next);
      });
      row.append(del);
    }
    wrap.append(row);
    if (session.rpcEditKey === key) {
      wrap.append(buildRpcEditor(settings, cluster, url, isPublic, false));
    }
    host.append(wrap);
  };

  addRow(PUBLIC_RPC_BY_CLUSTER[cluster], true);
  for (const u of cfg.urls) addRow(u, false);
  if (session.rpcEditKey === `${cluster}:new`) {
    host.append(buildRpcEditor(settings, cluster, "", false, true));
  }
}

function buildRpcEditor(
  settings: Settings,
  cluster: Cluster,
  url: string,
  isPublic: boolean,
  isNew: boolean,
): HTMLElement {
  const edit = document.createElement("div");
  edit.className = "rpc-edit";
  const input = document.createElement("input");
  input.type = "text";
  input.value = url;
  input.readOnly = isPublic;
  input.autocomplete = "off";
  input.placeholder = "https://";
  edit.append(input);
  if (!isPublic) {
    const ok = rpcIconButton("確認", SVG_CHECK);
    ok.addEventListener("click", () => {
      clearError();
      const nextUrl = customRpcForCluster(input.value, cluster);
      if (!looksHttpUrl(input.value.trim()) || !nextUrl) {
        showError("請輸入有效的 https RPC URL");
        return;
      }
      const next = cloneRpcByCluster(settings.rpcByCluster);
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
      void patchRpcByCluster(next);
    });
    edit.append(ok);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        ok.click();
      }
      if (ev.key === "Escape") {
        session.rpcEditKey = null;
        renderRpcByCluster(settings, cluster);
      }
    });
  }
  queueMicrotask(() => {
    if (!isPublic) input.focus();
  });
  return edit;
}

export function clearChangePasswordFieldValues(): void {
  el.changePwdCurrent.value = "";
  el.changePwdNew.value = "";
  el.changePwdConfirm.value = "";
}

export function clearChangePasswordFields(): void {
  clearChangePasswordFieldValues();
  el.changePwdErr.textContent = "";
}

export function changePasswordCanSubmit(): boolean {
  const newPwd = el.changePwdNew.value;
  const confirm = el.changePwdConfirm.value;
  if (newPwd.length < 8) return false;
  if (newPwd !== confirm) return false;
  if (!el.changePwdCurrent.value) return false;
  return true;
}

export async function submitChangePassword(): Promise<void> {
  clearError();
  el.changePwdErr.textContent = "";
  const currentPassword = el.changePwdCurrent.value;
  const newPassword = el.changePwdNew.value;
  const confirm = el.changePwdConfirm.value;
  if (newPassword.length < 8) {
    clearChangePasswordFieldValues();
    el.changePwdErr.textContent = "新密碼過短";
    syncShellDock();
    return;
  }
  if (newPassword !== confirm) {
    clearChangePasswordFieldValues();
    el.changePwdErr.textContent = "新密碼不一致";
    syncShellDock();
    return;
  }
  const res = await sendExtensionRequest("wallet.changeVaultPassword", {
    currentPassword,
    newPassword,
  });
  clearChangePasswordFieldValues();
  syncShellDock();
  if (!res.ok) {
    const code = res.error?.code;
    if (code === "INVALID_PASSWORD") el.changePwdErr.textContent = "密碼錯誤";
    else if (code === "WEAK_PASSWORD") el.changePwdErr.textContent = "新密碼過短";
    else showError(res.error?.message ?? "變更失敗");
    return;
  }
  await refresh();
  navigateTo("settings");
}

async function persistHeliusField(): Promise<void> {
  if (!session.lastState) return;
  if (!session.keysHeliusRevealed && session.lastState.settings.heliusApiUrl) return;
  let heliusApiUrl = el.heliusApiUrl.value.trim();
  if (heliusApiUrl === MASKED_SECRET_DISPLAY) heliusApiUrl = session.lastState.settings.heliusApiUrl;
  if (heliusApiUrl === session.lastState.settings.heliusApiUrl) return;
  session.keysHeliusRevealed = false;
  await patchSettingsPartial({ heliusApiUrl });
}

async function persistJupiterField(): Promise<void> {
  if (!session.lastState) return;
  if (!session.keysJupiterRevealed && session.lastState.settings.jupiterApiKey) return;
  let jupiterApiKey = el.jupiterApiKey.value.trim();
  if (jupiterApiKey === MASKED_SECRET_DISPLAY) jupiterApiKey = session.lastState.settings.jupiterApiKey;
  if (jupiterApiKey === session.lastState.settings.jupiterApiKey) return;
  session.keysJupiterRevealed = false;
  await patchSettingsPartial({ jupiterApiKey });
}

function parseDefaultCuPriceInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 0 || i > 1_000_000_000) return null;
  return i;
}

function commitDefaultCuPriceFromInput(): void {
  const parsed = parseDefaultCuPriceInput(el.defaultCuPriceInput.value);
  if (parsed == null) {
    el.defaultCuPriceInput.value = String(session.lastLegalDefaultCuPrice);
    return;
  }
  if (parsed === session.lastLegalDefaultCuPrice) return;
  session.lastLegalDefaultCuPrice = parsed;
  void patchSettingsPartial({ defaultCuPrice: parsed });
}

let defaultCuPriceDebounce: ReturnType<typeof setTimeout> | null = null;

export function bindSettingsEvents(): void {
  document.querySelectorAll<HTMLInputElement>('input[name="settings-cluster"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked || !session.lastState) return;
      const cluster = radio.value as Cluster;
      if (cluster === session.lastState.settings.cluster) return;
      void patchSettingsPartial({ cluster });
    });
  });

  document.querySelectorAll(".btn-rpc-add").forEach((btn) => {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_PLUS}</svg>`;
    btn.addEventListener("click", () => {
      const cluster = (btn as HTMLElement).dataset.rpcCluster as Cluster;
      if (!session.lastState || !cluster) return;
      session.rpcEditKey = `${cluster}:new`;
      renderRpcByCluster(session.lastState.settings, cluster);
    });
  });

  const btnHeliusReveal = document.getElementById("btn-helius-reveal")!;
  const btnHeliusConfirm = document.getElementById("btn-helius-confirm")!;
  const btnJupiterReveal = document.getElementById("btn-jupiter-reveal")!;
  const btnJupiterConfirm = document.getElementById("btn-jupiter-confirm")!;
  btnHeliusReveal.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_EYE}</svg>`;
  btnJupiterReveal.innerHTML = btnHeliusReveal.innerHTML;
  btnHeliusConfirm.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_CHECK}</svg>`;
  btnJupiterConfirm.innerHTML = btnHeliusConfirm.innerHTML;

  btnHeliusReveal.addEventListener("click", () => {
    if (!session.lastState) return;
    session.keysHeliusRevealed = !session.keysHeliusRevealed;
    renderSettingsKeysFields(session.lastState.settings);
    if (session.keysHeliusRevealed) {
      el.heliusApiUrl.readOnly = false;
      el.heliusApiUrl.focus();
    }
  });
  btnJupiterReveal.addEventListener("click", () => {
    if (!session.lastState) return;
    session.keysJupiterRevealed = !session.keysJupiterRevealed;
    renderSettingsKeysFields(session.lastState.settings);
    if (session.keysJupiterRevealed) {
      el.jupiterApiKey.readOnly = false;
      el.jupiterApiKey.focus();
    }
  });
  btnHeliusConfirm.addEventListener("click", () => void persistHeliusField());
  btnJupiterConfirm.addEventListener("click", () => void persistJupiterField());
  el.heliusApiUrl.addEventListener("blur", () => void persistHeliusField());
  el.jupiterApiKey.addEventListener("blur", () => void persistJupiterField());
  el.heliusApiUrl.addEventListener("input", () => {
    if (el.heliusApiUrl.value === "") void persistHeliusField();
  });
  el.jupiterApiKey.addEventListener("input", () => {
    if (el.jupiterApiKey.value === "") void persistJupiterField();
  });

  for (const inp of [el.changePwdCurrent, el.changePwdNew, el.changePwdConfirm]) {
    inp.addEventListener("input", () => {
      el.changePwdErr.textContent = "";
      syncShellDock();
    });
  }

  el.defaultCuPriceInput.addEventListener("input", () => {
    if (defaultCuPriceDebounce != null) clearTimeout(defaultCuPriceDebounce);
    defaultCuPriceDebounce = setTimeout(() => {
      defaultCuPriceDebounce = null;
      commitDefaultCuPriceFromInput();
    }, 500);
  });

  el.defaultCuPriceInput.addEventListener("blur", () => {
    if (defaultCuPriceDebounce != null) {
      clearTimeout(defaultCuPriceDebounce);
      defaultCuPriceDebounce = null;
    }
    commitDefaultCuPriceFromInput();
  });

  hardenApiKeyInput(el.heliusApiUrl);
  hardenApiKeyInput(el.jupiterApiKey);
}
