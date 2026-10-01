import { sendExtensionRequest } from "../shared/ext-api";
import {
  accountKind,
  isPublicClusterRpc,
  PUBLIC_RPC_BY_CLUSTER,
  type AccountMeta,
  type Settings,
} from "../shared/storage-keys";
import { type HomeTokenRow } from "./home-tokens";

type ConnectionSummary = {
  origin: string;
  accountId: string;
  connectedAt: number;
};

type State = {
  vaultExists: boolean;
  unlocked: boolean;
  accounts: AccountMeta[];
  activeAccountId: string | null;
  settings: Settings;
  connections: ConnectionSummary[];
};

type View =
  | "home-token"
  | "home-activity"
  | "accounts"
  | "add-account"
  | "account-rename"
  | "account-manage"
  | "account-reveal-key"
  | "settings"
  | "connected-sites";

const SUBPAGE_TITLES: Record<Exclude<View, "home-token" | "home-activity">, string> = {
  accounts: "Accounts",
  "add-account": "Add account",
  "account-rename": "Rename",
  "account-manage": "Manage",
  "account-reveal-key": "Reveal key",
  settings: "Settings",
  "connected-sites": "Connected sites",
};

let currentView: View = "home-token";
let focusAccountId: string | null = null;
let menuOpen = false;
let revealedSecretInMemory: string | null = null;
let lastActiveAccountId: string | null = null;
let lastSettingsRpc = "";
let lastSettingsFingerprint = "";
let lastState: State | null = null;
let lastSuccessfulTokenRows: HomeTokenRow[] = [];
let homeAssetsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let homeAssetsRequestGen = 0;

const el = {
  setup: document.getElementById("setup")!,
  locked: document.getElementById("locked")!,
  createVaultBanner: document.getElementById("create-vault-banner")!,
  shell: document.getElementById("shell")!,
  barHome: document.getElementById("bar-home")!,
  barSubpage: document.getElementById("bar-subpage")!,
  subpageTitle: document.getElementById("subpage-title")!,
  menuOverlay: document.getElementById("menu-overlay")!,
  menuDropdown: document.getElementById("menu-dropdown")!,
  homeTabBar: document.getElementById("home-tab-bar")!,
  widgetLabel: document.getElementById("widget-label")!,
  widgetAddr: document.getElementById("widget-addr")!,
  widgetAvatar: document.getElementById("widget-avatar")!,
  homeTokens: document.getElementById("home-tokens")!,
  homeAssetsError: document.getElementById("home-assets-error")!,
  accountsList: document.getElementById("accounts-list")!,
  renameAddrHint: document.getElementById("rename-addr-hint")!,
  renameLabel: document.getElementById("rename-label") as HTMLInputElement,
  manageName: document.getElementById("manage-name")!,
  manageAddr: document.getElementById("manage-addr")!,
  manageReadonlyBadge: document.getElementById("manage-readonly-badge")!,
  btnGoReveal: document.getElementById("btn-go-reveal")!,
  revealHint: document.getElementById("reveal-hint")!,
  revealMaskBlock: document.getElementById("reveal-mask-block")!,
  revealSecretBlock: document.getElementById("reveal-secret-block")!,
  revealPassword: document.getElementById("reveal-password") as HTMLInputElement,
  revealSecretText: document.getElementById("reveal-secret-text")!,
  connectedList: document.getElementById("connected-list")!,
  clusterSelect: document.getElementById("cluster-select") as HTMLSelectElement,
  rpcUrl: document.getElementById("rpc-url") as HTMLInputElement,
  heliusApiUrl: document.getElementById("helius-api-url") as HTMLInputElement,
  jupiterApiKey: document.getElementById("jupiter-api-key") as HTMLInputElement,
  error: document.getElementById("error")!,
};

const screens: Record<View, HTMLElement> = {
  "home-token": document.getElementById("screen-home-token")!,
  "home-activity": document.getElementById("screen-home-activity")!,
  accounts: document.getElementById("screen-accounts")!,
  "add-account": document.getElementById("screen-add-account")!,
  "account-rename": document.getElementById("screen-account-rename")!,
  "account-manage": document.getElementById("screen-account-manage")!,
  "account-reveal-key": document.getElementById("screen-account-reveal-key")!,
  settings: document.getElementById("screen-settings")!,
  "connected-sites": document.getElementById("screen-connected-sites")!,
};

function showError(msg: string): void {
  el.error.hidden = false;
  el.error.textContent = msg;
}

function clearError(): void {
  el.error.hidden = true;
  el.error.textContent = "";
}

function shortAddr(pk: string): string {
  if (pk.length <= 8) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function avatarLetter(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  return t.slice(0, 1).toUpperCase();
}

function isHomeView(view: View): boolean {
  return view === "home-token" || view === "home-activity";
}

function clearRevealSecret(): void {
  revealedSecretInMemory = null;
  el.revealPassword.value = "";
  el.revealSecretText.textContent = "";
  el.revealMaskBlock.hidden = false;
  el.revealSecretBlock.hidden = true;
}

function setMenuOpen(open: boolean): void {
  menuOpen = open;
  el.menuOverlay.hidden = !open;
  el.menuOverlay.setAttribute("aria-hidden", open ? "false" : "true");
  document.querySelectorAll(".menu-dropdown").forEach((dd) => {
    const node = dd as HTMLElement;
    if (!open) {
      node.hidden = true;
      return;
    }
    const bar = node.closest(".bar-home, .bar-subpage") as HTMLElement | null;
    node.hidden = !bar || bar.hidden;
  });
  document.querySelectorAll("#btn-menu, .btn-menu-sub").forEach((btn) => {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function navigateTo(view: View, accountId?: string): void {
  if (currentView === "account-reveal-key" && view !== "account-reveal-key") {
    clearRevealSecret();
  }
  if (accountId !== undefined) focusAccountId = accountId;
  currentView = view;
  setMenuOpen(false);
  applyViewChrome();
  if (lastState && view === "home-token") {
    scheduleRefreshHomeAssets(lastState);
  }
  if (lastState) {
    if (currentView === "account-manage") renderManageScreen(lastState);
    if (currentView === "account-reveal-key") renderRevealScreen(lastState);
    if (currentView === "account-rename") {
      const acc = lastState.accounts.find((a) => a.id === focusAccountId);
      if (acc) {
        el.renameLabel.value = acc.label;
        el.renameAddrHint.textContent = shortAddr(acc.publicKeyBase58);
      }
    }
  }
}

function applyViewChrome(): void {
  const home = isHomeView(currentView);
  el.barHome.hidden = !home;
  el.barSubpage.hidden = home;
  el.homeTabBar.hidden = !home;

  if (!home) {
    el.subpageTitle.textContent = SUBPAGE_TITLES[currentView as keyof typeof SUBPAGE_TITLES] ?? "";
  }

  for (const [name, section] of Object.entries(screens)) {
    section.hidden = name !== currentView;
  }

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const tab = (btn as HTMLElement).dataset.homeTab;
    btn.classList.toggle("active", tab === currentView);
  });
}

function renderTokenCards(rows: HomeTokenRow[]): void {
  el.homeTokens.innerHTML = "";
  for (const row of rows) {
    const li = document.createElement("li");
    li.className = "token-card";
    const iconEl = document.createElement("div");
    iconEl.className = "token-icon";
    iconEl.setAttribute("aria-hidden", "true");
    if (row.iconUrl) {
      const img = document.createElement("img");
      img.src = row.iconUrl;
      img.alt = "";
      img.addEventListener("error", () => {
        iconEl.textContent = row.iconLetter;
      });
      iconEl.append(img);
    } else {
      iconEl.textContent = row.iconLetter;
    }
    const main = document.createElement("div");
    main.className = "token-main";
    const nameRow = document.createElement("div");
    nameRow.className = "token-name-row";
    const nameEl = document.createElement("div");
    nameEl.className = "token-sym";
    nameEl.textContent = row.name || row.symbol;
    nameRow.append(nameEl);
    if (row.isVerified) {
      const tick = document.createElement("span");
      tick.className = "token-verified";
      tick.title = "Jupiter verified";
      tick.setAttribute("aria-label", "verified");
      tick.textContent = "✓";
      nameRow.append(tick);
    }
    if (row.organicScore != null && Number.isFinite(row.organicScore)) {
      const score = document.createElement("span");
      score.className = "token-score";
      const n = Math.round(row.organicScore);
      score.textContent = String(n);
      score.title = row.organicScoreLabel
        ? `organic ${n} (${row.organicScoreLabel})`
        : `organic ${n}`;
      nameRow.append(score);
    }
    const qtyEl = document.createElement("div");
    qtyEl.className = "token-qty";
    qtyEl.textContent = `${row.uiAmountLabel} ${row.symbol}`;
    main.append(nameRow, qtyEl);
    const usd = document.createElement("div");
    usd.className = "token-usd";
    usd.textContent = row.usdLabel;
    li.append(iconEl, main, usd);
    el.homeTokens.append(li);
  }
}

function settingsFingerprint(settings: Settings): string {
  return `${settings.cluster}|${settings.rpcUrl}|${settings.heliusApiUrl}|${settings.jupiterApiKey}`;
}

function scheduleRefreshHomeAssets(state: State, force = false): void {
  if (homeAssetsRefreshTimer) clearTimeout(homeAssetsRefreshTimer);
  homeAssetsRefreshTimer = setTimeout(() => {
    homeAssetsRefreshTimer = null;
    void refreshHomeAssets(state, force);
  }, 300);
}

async function refreshHomeAssets(state: State, force = false): Promise<void> {
  const gen = ++homeAssetsRequestGen;
  el.homeAssetsError.hidden = true;
  el.homeAssetsError.textContent = "";

  const active = state.accounts.find((a) => a.id === state.activeAccountId);
  if (!active || currentView !== "home-token") return;

  const hadRows = lastSuccessfulTokenRows.length > 0;
  if (!hadRows) {
    el.homeTokens.innerHTML = "";
    const loadingLi = document.createElement("li");
    loadingLi.className = "muted";
    loadingLi.textContent = "載入中…";
    el.homeTokens.append(loadingLi);
  }

  try {
    const res = await sendExtensionRequest("wallet.getHomeTokens", force ? { force: true } : {});
    if (gen !== homeAssetsRequestGen || currentView !== "home-token") return;
    if (!res.ok) {
      if (hadRows) {
        el.homeAssetsError.hidden = false;
        el.homeAssetsError.textContent = res.error?.message ?? "無法載入持倉";
        return;
      }
      el.homeTokens.innerHTML = "";
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent = res.error?.message ?? "無法載入持倉";
      return;
    }
    const payload = res.result as {
      rows?: HomeTokenRow[];
      error?: string;
      fromCache?: boolean;
    };
    const rows = payload.rows ?? [];
    lastSuccessfulTokenRows = rows;
    renderTokenCards(rows);
    if (payload.error) {
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent = payload.error;
    }
  } catch (e) {
    if (gen !== homeAssetsRequestGen || currentView !== "home-token") return;
    if (hadRows) {
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent =
        e instanceof Error ? e.message : "無法載入持倉";
      return;
    }
    el.homeTokens.innerHTML = "";
    el.homeAssetsError.hidden = false;
    el.homeAssetsError.textContent =
      e instanceof Error ? e.message : "無法載入持倉";
  }
}

function renderConnections(state: State): void {
  el.connectedList.innerHTML = "";
  for (const c of state.connections) {
    const li = document.createElement("li");
    li.className = "connected-row";
    const span = document.createElement("span");
    span.textContent = c.origin;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn";
    btn.title = "Disconnect";
    btn.setAttribute("aria-label", "Disconnect");
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    btn.addEventListener("click", async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.disconnectOrigin", {
        origin: c.origin,
      });
      if (!res.ok) showError(res.error?.message ?? "斷開失敗");
      else await refresh();
    });
    li.append(span, btn);
    el.connectedList.append(li);
  }
}

function renderAccountsList(state: State): void {
  el.accountsList.innerHTML = "";
  for (const a of state.accounts) {
    const card = document.createElement("div");
    card.className = "account-card";
    if (a.id === state.activeAccountId) card.classList.add("active");

    const main = document.createElement("div");
    main.className = "account-card-main";
    main.addEventListener("click", async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.setActiveAccount", { accountId: a.id });
      if (!res.ok) showError(res.error?.message ?? "切換失敗");
      else {
        await refresh();
        navigateTo("home-token");
      }
    });

    const titleRow = document.createElement("div");
    titleRow.className = "account-title-row";
    const nameSpan = document.createElement("span");
    nameSpan.className = "account-name";
    nameSpan.textContent = a.label;

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "icon-btn ghost-inline";
    renameBtn.title = "Rename account";
    renameBtn.setAttribute("aria-label", "Rename account");
    renameBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
    renameBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      navigateTo("account-rename", a.id);
      el.renameLabel.value = a.label;
      el.renameAddrHint.textContent = shortAddr(a.publicKeyBase58);
    });

    titleRow.append(nameSpan, renameBtn);
    if (a.id === state.activeAccountId) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.style.borderColor = "var(--accent)";
      badge.style.color = "var(--accent)";
      badge.textContent = "Active";
      titleRow.append(badge);
    }
    if (accountKind(a) === "readOnly") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Read-only";
      titleRow.append(badge);
    }

    const addrRow = document.createElement("div");
    addrRow.className = "account-addr-row";
    const addr = document.createElement("span");
    addr.className = "addr";
    addr.textContent = shortAddr(a.publicKeyBase58);
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-btn ghost-inline";
    copyBtn.title = "Copy address";
    copyBtn.setAttribute("aria-label", "Copy address");
    copyBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      void navigator.clipboard.writeText(a.publicKeyBase58);
    });
    addrRow.append(addr, copyBtn);
    main.append(titleRow, addrRow);

    const kebab = document.createElement("button");
    kebab.type = "button";
    kebab.className = "icon-btn";
    kebab.title = "Manage account";
    kebab.setAttribute("aria-label", "Manage account");
    kebab.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    kebab.addEventListener("click", () => {
      navigateTo("account-manage", a.id);
      renderManageScreen(state);
    });

    card.append(main, kebab);
    el.accountsList.append(card);
  }
}

function renderManageScreen(state: State): void {
  const acc = state.accounts.find((a) => a.id === focusAccountId);
  if (!acc) return;
  el.manageName.textContent = acc.label;
  el.manageAddr.textContent = acc.publicKeyBase58;
  const ro = accountKind(acc) === "readOnly";
  el.manageReadonlyBadge.hidden = !ro;
  el.btnGoReveal.hidden = ro || !state.unlocked;
}

function renderRevealScreen(state: State): void {
  const acc = state.accounts.find((a) => a.id === focusAccountId);
  if (!acc) {
    navigateTo("accounts");
    return;
  }
  if (accountKind(acc) !== "signing" || !state.unlocked) {
    navigateTo("account-manage");
    return;
  }
  el.revealHint.textContent = `${acc.label} · ${shortAddr(acc.publicKeyBase58)}`;
  if (!revealedSecretInMemory) {
    clearRevealSecret();
  }
}

function renderWidget(state: State): void {
  const active = state.accounts.find((a) => a.id === state.activeAccountId);
  if (!active) {
    el.widgetLabel.textContent = "—";
    el.widgetAddr.textContent = "";
    el.widgetAvatar.textContent = "?";
    return;
  }
  el.widgetLabel.textContent = active.label;
  el.widgetAddr.textContent = shortAddr(active.publicKeyBase58);
  el.widgetAvatar.textContent = avatarLetter(active.label);
  document.getElementById("btn-widget-accounts")?.setAttribute(
    "title",
    `${active.label} · ${active.publicKeyBase58}`,
  );
}

function render(state: State): void {
  lastState = state;
  const hasAccounts = state.accounts.length > 0;
  const isLocked = state.vaultExists && !state.unlocked;

  el.setup.hidden = state.vaultExists || hasAccounts;
  el.createVaultBanner.hidden = state.vaultExists || !hasAccounts;
  el.locked.hidden = !isLocked;
  el.shell.hidden = isLocked || !hasAccounts;

  if (isLocked) {
    setMenuOpen(false);
    return;
  }

  if (!hasAccounts) return;

  if (state.activeAccountId !== lastActiveAccountId) {
    lastActiveAccountId = state.activeAccountId;
    lastSuccessfulTokenRows = [];
  }

  renderWidget(state);
  applyViewChrome();

  el.clusterSelect.value = state.settings.cluster;
  el.rpcUrl.value = state.settings.rpcUrl;
  el.heliusApiUrl.value = state.settings.heliusApiUrl;
  el.jupiterApiKey.value = state.settings.jupiterApiKey;

  const settingsFp = settingsFingerprint(state.settings);
  const settingsChanged = settingsFp !== lastSettingsFingerprint;
  lastSettingsFingerprint = settingsFp;
  const rpcChanged = state.settings.rpcUrl !== lastSettingsRpc;
  lastSettingsRpc = state.settings.rpcUrl;

  renderConnections(state);
  renderAccountsList(state);

  if (currentView === "account-manage") renderManageScreen(state);
  if (currentView === "account-rename") {
    const acc = state.accounts.find((a) => a.id === focusAccountId);
    if (acc) {
      el.renameLabel.value = acc.label;
      el.renameAddrHint.textContent = shortAddr(acc.publicKeyBase58);
    }
  }
  if (currentView === "account-reveal-key") renderRevealScreen(state);

  if (currentView === "home-token" && state.activeAccountId) {
    scheduleRefreshHomeAssets(state);
  } else if ((rpcChanged || settingsChanged) && currentView === "home-token") {
    scheduleRefreshHomeAssets(state);
  }
}

async function refresh(): Promise<State> {
  const res = await sendExtensionRequest("wallet.getState");
  if (!res.ok) throw new Error(res.error?.message ?? "getState failed");
  const state = res.result as State;
  if (!state.connections) state.connections = [];
  render(state);
  return state;
}

async function addWatchAccount(publicKeyBase58: string, label?: string): Promise<void> {
  const res = await sendExtensionRequest("wallet.addReadOnlyAccount", {
    publicKeyBase58,
    label,
  });
  if (!res.ok) showError(res.error?.message ?? "新增失敗");
  else {
    await refresh();
    navigateTo("accounts");
  }
}

function handleBack(): void {
  if (currentView === "account-reveal-key") {
    navigateTo("account-manage");
    return;
  }
  if (currentView === "account-rename" || currentView === "account-manage" || currentView === "add-account") {
    navigateTo("accounts");
    return;
  }
  navigateTo("home-token");
}

document.getElementById("btn-create")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("setup-password") as HTMLInputElement).value;
  const label = (document.getElementById("setup-label") as HTMLInputElement).value;
  if (!password || password.length < 8) {
    showError("密碼至少 8 字");
    return;
  }
  const res = await sendExtensionRequest("wallet.createVault", { password, label });
  if (!res.ok) showError(res.error?.message ?? "建立失敗");
  else await refresh();
});

document.getElementById("btn-add-watch-setup")!.addEventListener("click", async () => {
  clearError();
  const publicKeyBase58 = (document.getElementById("setup-watch-pk") as HTMLInputElement).value;
  const label = (document.getElementById("setup-watch-label") as HTMLInputElement).value;
  await addWatchAccount(publicKeyBase58, label);
});

document.getElementById("btn-create-late")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("late-setup-password") as HTMLInputElement).value;
  const label = (document.getElementById("late-setup-label") as HTMLInputElement).value;
  if (!password || password.length < 8) {
    showError("密碼至少 8 字");
    return;
  }
  const res = await sendExtensionRequest("wallet.createVault", { password, label });
  if (!res.ok) showError(res.error?.message ?? "建立失敗");
  else await refresh();
});

document.getElementById("btn-unlock")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("unlock-password") as HTMLInputElement).value;
  const res = await sendExtensionRequest("wallet.unlock", { password });
  if (!res.ok) showError(res.error?.message ?? "解鎖失敗");
  else await refresh();
});

document.getElementById("btn-lock-home")!.addEventListener("click", async () => {
  await sendExtensionRequest("wallet.lock");
  await refresh();
});

document.getElementById("btn-menu")!.addEventListener("click", () => {
  setMenuOpen(!menuOpen);
});

document.querySelectorAll(".btn-menu-sub").forEach((btn) => {
  btn.addEventListener("click", () => setMenuOpen(!menuOpen));
});

el.menuOverlay.addEventListener("click", () => setMenuOpen(false));

document.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const nav = (item as HTMLElement).dataset.nav as View;
    if (nav === "accounts" || nav === "settings" || nav === "connected-sites") {
      navigateTo(nav);
    }
  });
});

document.getElementById("btn-widget-accounts")!.addEventListener("click", () => {
  navigateTo("accounts");
});

document.getElementById("btn-widget-copy")!.addEventListener("click", () => {
  const active = lastState?.accounts.find((a) => a.id === lastState?.activeAccountId);
  if (active) void navigator.clipboard.writeText(active.publicKeyBase58);
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = (btn as HTMLElement).dataset.homeTab as View;
    if (tab) navigateTo(tab);
  });
});

document.getElementById("btn-back")!.addEventListener("click", () => handleBack());

document.getElementById("btn-go-add-account")!.addEventListener("click", () => {
  navigateTo("add-account");
});

document.getElementById("btn-generate")!.addEventListener("click", async () => {
  clearError();
  const res = await sendExtensionRequest("wallet.generateAccount", {});
  if (!res.ok) showError(res.error?.message ?? "失敗");
  else {
    await refresh();
    navigateTo("accounts");
  }
});

document.getElementById("btn-import")!.addEventListener("click", async () => {
  clearError();
  const secretBase58 = (document.getElementById("import-secret") as HTMLInputElement).value;
  const res = await sendExtensionRequest("wallet.importAccount", { secretBase58 });
  if (!res.ok) showError(res.error?.message ?? "匯入失敗");
  else {
    (document.getElementById("import-secret") as HTMLInputElement).value = "";
    await refresh();
    navigateTo("accounts");
  }
});

document.getElementById("btn-add-watch")!.addEventListener("click", async () => {
  clearError();
  const publicKeyBase58 = (document.getElementById("watch-pk") as HTMLInputElement).value;
  const label = (document.getElementById("watch-label") as HTMLInputElement).value;
  await addWatchAccount(publicKeyBase58, label);
});

document.getElementById("btn-rename")!.addEventListener("click", async () => {
  clearError();
  if (!focusAccountId) return;
  const label = el.renameLabel.value;
  const res = await sendExtensionRequest("wallet.renameAccount", { accountId: focusAccountId, label });
  if (!res.ok) showError(res.error?.message ?? "重新命名失敗");
  else {
    await refresh();
    navigateTo("accounts");
  }
});

document.getElementById("btn-delete")!.addEventListener("click", async () => {
  clearError();
  if (!focusAccountId) return;
  if (!confirm("確定移除此錢包帳戶？")) return;
  const res = await sendExtensionRequest("wallet.deleteAccount", { accountId: focusAccountId });
  if (!res.ok) showError(res.error?.message ?? "刪除失敗");
  else {
    focusAccountId = null;
    await refresh();
    navigateTo("accounts");
  }
});

el.btnGoReveal.addEventListener("click", () => {
  navigateTo("account-reveal-key");
});

document.getElementById("btn-reveal-submit")!.addEventListener("click", async () => {
  clearError();
  if (!focusAccountId) return;
  const password = el.revealPassword.value;
  const res = await sendExtensionRequest("wallet.exportAccountSecret", {
    accountId: focusAccountId,
    password,
  });
  if (!res.ok) {
    showError(res.error?.message ?? "無法匯出");
    return;
  }
  const { secretBase58 } = res.result as { secretBase58: string };
  revealedSecretInMemory = secretBase58;
  el.revealSecretText.textContent = secretBase58;
  el.revealMaskBlock.hidden = true;
  el.revealSecretBlock.hidden = false;
  el.revealPassword.value = "";
});

document.getElementById("btn-copy-secret")!.addEventListener("click", async () => {
  if (revealedSecretInMemory) {
    await navigator.clipboard.writeText(revealedSecretInMemory);
  }
});

document.getElementById("btn-save-settings")!.addEventListener("click", async () => {
  clearError();
  const cluster = el.clusterSelect.value as Settings["cluster"];
  const rpcUrl = el.rpcUrl.value.trim();
  const heliusApiUrl = el.heliusApiUrl.value.trim();
  const jupiterApiKey = el.jupiterApiKey.value.trim();
  const res = await sendExtensionRequest("storage.patchSettings", {
    cluster,
    rpcUrl,
    heliusApiUrl,
    jupiterApiKey,
  });
  if (!res.ok) showError(res.error?.message ?? "儲存失敗");
  else await refresh();
});

document.getElementById("btn-refresh-assets")!.addEventListener("click", async () => {
  const state = await refresh();
  if (currentView === "home-token") await refreshHomeAssets(state, true);
});

document.getElementById("btn-disconnect-all")!.addEventListener("click", async () => {
  clearError();
  const res = await sendExtensionRequest("wallet.disconnectAllOrigins");
  if (!res.ok) showError(res.error?.message ?? "斷開失敗");
  else await refresh();
});

el.clusterSelect.addEventListener("change", () => {
  const cluster = el.clusterSelect.value as Settings["cluster"];
  const current = el.rpcUrl.value.trim();
  if (!current || isPublicClusterRpc(current)) {
    el.rpcUrl.value = PUBLIC_RPC_BY_CLUSTER[cluster];
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    changes["airwave.accounts.v1"] ||
    changes["airwave.activeAccountId.v1"] ||
    changes["airwave.settings.v1"] ||
    changes["airwave.connections.v1"]
  ) {
    void refresh();
  }
});

window.addEventListener("pagehide", () => {
  clearRevealSecret();
});

void refresh().catch((e) => showError(String(e)));
