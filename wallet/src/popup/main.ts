import disclaimerMd from "../../../docs/legal/disclaimer.md?raw";
import termsMd from "../../../docs/legal/terms-of-use.md?raw";
import { sendExtensionRequest } from "../shared/ext-api";
import {
  getExposedPublicKey,
  isSigningOrWatch,
  parsePublicKeyBase58,
} from "../shared/accounts";
import type { AccountMeta } from "../shared/storage-keys";
import { bindAccountsEvents, clearRevealSecret, renderAccountsList, renderConnections, renderManageScreen, renderRevealScreen, renderWidget } from "./accounts-ui";
import {
  abortWalletSendOnPopupUnload,
  bindWalletSendSettledListener,
  mountPopupApprovalShell,
  teardownApprovalShell,
} from "./approval-host";
import { bindCombinedCreateEvents, renderCombinedCreateScreen, resetCombinedCreate, validCombinedMembers } from "./combined-ui";
import { el, elBtnBack, elDock, elDockPrimary, elImportSeedRoot, screens } from "./dom";
import { isHomeView, renderLegalDoc, shortAddr } from "./format";
import { bindGenerateSeedCopyButtons, renderGenerateChrome, renderGenerateSeedChrome, resetGenerateSeedFlow } from "./generate-seed-flow";
import { detectSecret, syncImportSecretFmt } from "./import-secret";
import {
  bindImportSeedUi,
  importSeedDockReady,
  mnemonicFromSlots,
  renderImportSeedScreen,
  requestSeedPreview,
  resetImportSeedFlow,
} from "./import-seed-flow";
import { hardenSensitiveTextInput, hardenWalletPasswordInput } from "./password-input";
import { bindSendFormEvents, clearSendForm, sendFormValid, submitTokenSend, renderTokenSendScreen } from "./send-flow";
import {
  bindPopupShell,
  session,
} from "./session";
import {
  bindSettingsEvents,
  changePasswordCanSubmit,
  clearChangePasswordFields,
  renderSettingsPanel,
  settingsFingerprint,
  submitChangePassword,
} from "./settings-ui";
import { refreshHomeAssets, renderTokenDetailScreen, scheduleRefreshHomeAssets } from "./tokens-ui";
import { SUBPAGE_TITLES, type State, type View } from "./types";
import "../popout/style.css";

let errorHideTimer: number | null = null;

function showError(msg: string): void {
  if (errorHideTimer != null) {
    window.clearTimeout(errorHideTimer);
    errorHideTimer = null;
  }
  el.error.hidden = false;
  el.error.textContent = msg;
  errorHideTimer = window.setTimeout(() => {
    clearError();
  }, 4000);
}

function clearError(): void {
  if (errorHideTimer != null) {
    window.clearTimeout(errorHideTimer);
    errorHideTimer = null;
  }
  el.error.hidden = true;
  el.error.textContent = "";
}

function setMenuOpen(open: boolean): void {
  session.menuOpen = open;
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

function syncShellDock(): void {
  elDock.hidden = true;
  elDockPrimary.disabled = true;
  elDockPrimary.textContent = "";

  if (session.currentView === "add-generate") {
    elDock.hidden = false;
    if (session.generateSuccessPk) {
      elDockPrimary.textContent = "完成";
      elDockPrimary.disabled = false;
      return;
    }
    elDockPrimary.textContent = "產生";
    elDockPrimary.disabled = false;
    return;
  }

  if (session.currentView === "add-generate-seed") {
    elDock.hidden = false;
    elDockPrimary.textContent = "建立";
    elDockPrimary.disabled = session.generateSeedBusy || session.generateSeedWords == null;
    return;
  }

  if (session.currentView === "add-import-secret") {
    elDock.hidden = false;
    elDockPrimary.textContent = "匯入";
    const d = detectSecret((document.getElementById("import-secret") as HTMLTextAreaElement).value);
    elDockPrimary.disabled = !d.ok;
    return;
  }

  if (session.currentView === "add-import-seed") {
    elDock.hidden = false;
    const dock = importSeedDockReady();
    if (dock.step === "pick") {
      elDockPrimary.textContent = "匯入";
      elDockPrimary.disabled = dock.busy || dock.selected == null;
    } else {
      elDockPrimary.textContent = "下一步";
      elDockPrimary.disabled = dock.busy || !(dock.filled === 12 || dock.filled === 24);
    }
    return;
  }

  if (session.currentView === "add-watch") {
    elDock.hidden = false;
    elDockPrimary.textContent = "建立";
    const pk = (document.getElementById("watch-pk") as HTMLInputElement).value;
    elDockPrimary.disabled = parsePublicKeyBase58(pk) == null;
    return;
  }

  if (session.currentView === "add-combined") {
    elDock.hidden = false;
    elDockPrimary.textContent = "建立 Combined";
    elDockPrimary.disabled = validCombinedMembers().length < 1;
    return;
  }

  if (session.currentView === "settings-password") {
    elDock.hidden = false;
    elDockPrimary.textContent = "變更密碼";
    elDockPrimary.disabled = !changePasswordCanSubmit();
    return;
  }

  if (session.currentView === "token-send") {
    elDock.hidden = false;
    elDockPrimary.textContent = "確認";
    elDockPrimary.disabled = !session.lastState || !sendFormValid(session.lastState);
    return;
  }

  if (session.currentView === "send-approval") {
    elDock.hidden = true;
  }
}

function applyViewChrome(): void {
  const home = isHomeView(session.currentView);
  el.barHome.hidden = !home;
  el.barSubpage.hidden = home;
  el.homeTabBar.hidden = !home;

  if (!home) {
    if (session.currentView === "add-import-seed" && session.importSeedStep === "pick") {
      el.subpageTitle.textContent = "選帳戶";
    } else {
      el.subpageTitle.textContent = SUBPAGE_TITLES[session.currentView as keyof typeof SUBPAGE_TITLES] ?? "";
    }
  }

  for (const [name, section] of Object.entries(screens)) {
    section.hidden = name !== session.currentView;
  }

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const tab = (btn as HTMLElement).dataset.homeTab;
    btn.classList.toggle("active", tab === session.currentView);
  });

  if (session.currentView === "add-generate") renderGenerateChrome();
  if (session.currentView === "add-generate-seed") renderGenerateSeedChrome();
  elBtnBack.hidden = false;
  syncShellDock();
}

function navigateTo(view: View, accountId?: string): void {
  clearError();
  if (session.currentView === "send-approval" && view !== "send-approval" && session.activeWalletSendRequestId) {
    const rid = session.activeWalletSendRequestId;
    session.activeWalletSendRequestId = null;
    teardownApprovalShell();
    void sendExtensionRequest("ui.abortPending", { requestId: rid });
  }
  if (session.currentView === "add-import-seed" && view !== "add-import-seed") {
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
  }
  if (session.currentView === "add-generate-seed" && view !== "add-generate-seed") {
    resetGenerateSeedFlow();
  }
  if (session.currentView === "add-import-secret" && view !== "add-import-secret") {
    const importSecret = document.getElementById("import-secret") as HTMLTextAreaElement | null;
    if (importSecret) importSecret.value = "";
  }
  if (session.currentView === "account-reveal-key" && view !== "account-reveal-key") {
    clearRevealSecret();
  }
  if (session.currentView === "token-send" && view !== "token-send" && view !== "send-approval") {
    clearSendForm();
  }
  if (view === "token-send" && session.currentView !== "token-send") {
    clearSendForm();
  }
  if (view === "settings-password" && session.currentView !== "settings-password") {
    clearChangePasswordFields();
  }
  if (view.startsWith("settings") && session.currentView.startsWith("settings") && view !== session.currentView) {
    if (session.currentView === "settings-password") clearChangePasswordFields();
    if (session.currentView === "settings-keys") {
      session.keysHeliusRevealed = false;
      session.keysJupiterRevealed = false;
    }
  }
  if (view === "settings" || view.startsWith("settings-")) {
    session.rpcEditKey = null;
  }
  if (accountId !== undefined) session.focusAccountId = accountId;
  session.currentView = view;
  setMenuOpen(false);
  applyViewChrome();
  if (session.lastState && view === "home-token") {
    scheduleRefreshHomeAssets(session.lastState);
  }
  if (view === "add-combined") {
    resetCombinedCreate();
    if (session.lastState) renderCombinedCreateScreen(session.lastState);
  }
  if (view === "add-generate") {
    session.generateSuccessPk = null;
    renderGenerateChrome();
    const genLabel = document.getElementById("generate-label") as HTMLInputElement;
    const genErr = document.getElementById("generate-err");
    if (genLabel) genLabel.value = "";
    if (genErr) genErr.textContent = "";
  }
  if (view === "add-generate-seed") {
    resetGenerateSeedFlow();
    renderGenerateSeedChrome();
  }
  if (view === "add-import-secret") {
    const importLabel = document.getElementById("import-label") as HTMLInputElement;
    const importSecret = document.getElementById("import-secret") as HTMLTextAreaElement;
    const importErr = document.getElementById("import-secret-err");
    if (importLabel) importLabel.value = "";
    if (importSecret) {
      importSecret.value = "";
      hardenSensitiveTextInput(importSecret);
    }
    if (importErr) importErr.textContent = "";
    syncImportSecretFmt();
  }
  if (view === "add-import-seed") {
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
    renderImportSeedScreen();
  }
  if (view === "add-watch") {
    const wName = document.getElementById("watch-label") as HTMLInputElement;
    const wPk = document.getElementById("watch-pk") as HTMLInputElement;
    const wErr = document.getElementById("watch-err");
    if (wName) wName.value = "";
    if (wPk) wPk.value = "";
    if (wErr) wErr.textContent = "";
  }
  if (view === "send-approval") {
    mountPopupApprovalShell();
  }
  syncShellDock();
  if (session.lastState) {
    if (session.currentView === "token-detail") renderTokenDetailScreen(session.lastState);
    if (session.currentView === "token-send") renderTokenSendScreen(session.lastState);
    if (session.currentView === "account-manage") renderManageScreen(session.lastState);
    if (session.currentView === "account-reveal-key") renderRevealScreen(session.lastState);
    if (session.currentView === "account-rename") {
      const acc = session.lastState.accounts.find((a) => a.id === session.focusAccountId);
      if (acc) {
        el.renameLabel.value = acc.label;
        el.renameAddrHint.textContent = shortAddr(getExposedPublicKey(acc));
      }
    }
  }
}

function render(state: State): void {
  session.lastState = state;
  const isLocked = state.vaultExists && !state.unlocked;

  el.setup.hidden = state.vaultExists;
  el.locked.hidden = !isLocked;
  el.shell.hidden = !state.vaultExists || isLocked;

  if (isLocked) {
    setMenuOpen(false);
    session.detailTokenId = null;
    clearSendForm();
    return;
  }

  if (!state.vaultExists) return;

  if (state.activeAccountId !== session.lastActiveAccountId) {
    session.lastActiveAccountId = state.activeAccountId;
    session.lastSuccessfulTokenRows = [];
    session.expandedTokenRowIds.clear();
    session.detailTokenId = null;
    clearSendForm();
    if (session.currentView === "token-send" || session.currentView === "token-detail") {
      navigateTo("home-token");
      return;
    }
  }

  renderWidget(state);
  applyViewChrome();

  renderSettingsPanel(state.settings);
  session.lastLegalDefaultCuPrice = state.settings.defaultCuPrice;

  const settingsFp = settingsFingerprint(state.settings);
  const settingsChanged = settingsFp !== session.lastSettingsFingerprint;
  session.lastSettingsFingerprint = settingsFp;
  const rpcChanged = state.settings.rpcUrl !== session.lastSettingsRpc;
  session.lastSettingsRpc = state.settings.rpcUrl;

  renderConnections(state);
  renderAccountsList(state);

  if (session.currentView === "account-manage") renderManageScreen(state);
  if (session.currentView === "account-rename") {
    const acc = state.accounts.find((a) => a.id === session.focusAccountId);
    if (acc) {
      el.renameLabel.value = acc.label;
      el.renameAddrHint.textContent = shortAddr(getExposedPublicKey(acc));
    }
  }
  if (session.currentView === "account-reveal-key") renderRevealScreen(state);
  if (session.currentView === "add-combined") renderCombinedCreateScreen(state);

  if (session.currentView === "home-token" && state.activeAccountId) {
    scheduleRefreshHomeAssets(state);
  } else if ((rpcChanged || settingsChanged) && session.currentView === "home-token") {
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

bindPopupShell({
  navigateTo,
  applyViewChrome,
  syncShellDock,
  refresh,
  showError,
  clearError,
});

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
  if (session.currentView === "account-reveal-key") {
    navigateTo("account-manage");
    return;
  }
  if (session.currentView === "account-rename" || session.currentView === "account-manage" || session.currentView === "add-account") {
    navigateTo("accounts");
    return;
  }
  if (session.currentView === "add-generate") {
    if (session.generateSuccessPk) {
      session.generateSuccessPk = null;
      renderGenerateChrome();
      syncShellDock();
      return;
    }
    navigateTo("add-account");
    return;
  }
  if (session.currentView === "add-generate-seed") {
    navigateTo("add-account");
    return;
  }
  if (session.currentView === "add-import-seed") {
    if (session.importSeedStep === "pick") {
      session.importSeedPreviewGen++;
      session.importSeedBusy = false;
      session.importSeedStep = "words";
      session.importSeedPreview = [];
      session.importSeedSelected = null;
      session.importSeedPathPreview = "";
      renderImportSeedScreen();
      return;
    }
    navigateTo("add-import");
    return;
  }
  if (session.currentView === "add-import-secret") {
    navigateTo("add-import");
    return;
  }
  if (session.currentView === "add-import") {
    navigateTo("add-account");
    return;
  }
  if (session.currentView === "add-combined" || session.currentView === "add-watch") {
    navigateTo("add-account");
    return;
  }
  if (
    session.currentView === "settings-network" ||
    session.currentView === "settings-rpc" ||
    session.currentView === "settings-keys" ||
    session.currentView === "settings-cu-price" ||
    session.currentView === "settings-password"
  ) {
    navigateTo("settings");
    return;
  }
  if (session.currentView === "about-disclaimer" || session.currentView === "about-terms") {
    navigateTo("about");
    return;
  }
  if (session.currentView === "settings" || session.currentView === "connected-sites" || session.currentView === "about") {
    navigateTo("home-token");
    return;
  }
  if (session.currentView === "send-approval") {
    navigateTo("token-send");
    return;
  }
  if (session.currentView === "token-send") {
    navigateTo("token-detail");
    return;
  }
  if (session.currentView === "token-detail") {
    session.detailTokenId = null;
    navigateTo("home-token");
    return;
  }
  navigateTo("home-token");
}

async function handleDockPrimary(): Promise<void> {
  if (session.currentView === "token-send") {
    await submitTokenSend();
    syncShellDock();
    return;
  }
  if (session.currentView === "add-generate") {
    if (session.generateSuccessPk) {
      session.generateSuccessPk = null;
      navigateTo("add-account");
      return;
    }
    clearError();
    const label = (document.getElementById("generate-label") as HTMLInputElement).value.trim();
    const res = await sendExtensionRequest("wallet.generateAccount", {
      label: label || undefined,
    });
    if (!res.ok) {
      const errEl = document.getElementById("generate-err");
      if (errEl) errEl.textContent = res.error?.message ?? "失敗";
      return;
    }
    const { account } = res.result as { account: AccountMeta };
    const pk = isSigningOrWatch(account) ? account.publicKeyBase58 : getExposedPublicKey(account);
    session.generateSuccessPk = pk;
    renderGenerateChrome();
    syncShellDock();
    await refresh();
    return;
  }

  if (session.currentView === "add-generate-seed") {
    if (!session.generateSeedWords) return;
    clearError();
    session.generateSeedBusy = true;
    syncShellDock();
    const label = (document.getElementById("generate-seed-label") as HTMLInputElement).value.trim();
    const fallbackLabel = session.lastState ? `Account ${session.lastState.accounts.length + 1}` : undefined;
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic: session.generateSeedWords.join(" "),
      pathKind: "phantom",
      index: 0,
      label: label || fallbackLabel,
    });
    session.generateSeedBusy = false;
    if (!res.ok) {
      const errEl = document.getElementById("generate-seed-err");
      if (errEl) errEl.textContent = res.error?.message ?? "失敗";
      syncShellDock();
      return;
    }
    await refresh();
    navigateTo("add-account");
    return;
  }

  if (session.currentView === "add-import-secret") {
    clearError();
    const raw = (document.getElementById("import-secret") as HTMLTextAreaElement).value;
    const d = detectSecret(raw);
    if (!d.ok) {
      const errEl = document.getElementById("import-secret-err");
      if (errEl) errEl.textContent = "無法辨識";
      return;
    }
    const label = (document.getElementById("import-label") as HTMLInputElement).value.trim();
    const res = await sendExtensionRequest("wallet.importAccount", {
      secret: raw.trim(),
      label: label || undefined,
    });
    if (!res.ok) {
      const errEl = document.getElementById("import-secret-err");
      if (errEl) errEl.textContent = res.error?.message ?? "匯入失敗";
      return;
    }
    (document.getElementById("import-secret") as HTMLTextAreaElement).value = "";
    (document.getElementById("import-label") as HTMLInputElement).value = "";
    syncImportSecretFmt();
    await refresh();
    navigateTo("accounts");
    return;
  }

  if (session.currentView === "add-import-seed") {
    clearError();
    if (session.importSeedStep === "words") {
      const outcome = await requestSeedPreview();
      if (outcome !== "ok") return;
      session.importSeedSelected = null;
      session.importSeedStep = "pick";
      renderImportSeedScreen();
      return;
    }
    if (session.importSeedSelected == null) return;
    session.importSeedBusy = true;
    syncShellDock();
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic: mnemonicFromSlots(),
      pathKind: session.importSeedKind,
      customPath: session.importSeedKind === "custom" ? session.importSeedCustomPath : undefined,
      index: session.importSeedSelected,
    });
    session.importSeedBusy = false;
    if (!res.ok) {
      const err = document.getElementById("import-seed-err");
      if (err) err.textContent = res.error?.message ?? "匯入失敗";
      syncShellDock();
      return;
    }
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
    await refresh();
    navigateTo("accounts");
    return;
  }

  if (session.currentView === "add-watch") {
    clearError();
    const publicKeyBase58 = (document.getElementById("watch-pk") as HTMLInputElement).value.trim();
    const label = (document.getElementById("watch-label") as HTMLInputElement).value.trim();
    if (!parsePublicKeyBase58(publicKeyBase58)) {
      const errEl = document.getElementById("watch-err");
      if (errEl) errEl.textContent = "地址無效";
      syncShellDock();
      return;
    }
    await addWatchAccount(publicKeyBase58, label || undefined);
    return;
  }

  if (session.currentView === "add-combined") {
    clearError();
    const label = (document.getElementById("combined-label") as HTMLInputElement).value.trim();
    const subPubkeys = validCombinedMembers();
    if (subPubkeys.length === 0) {
      const errEl = document.getElementById("combined-err");
      if (errEl) errEl.textContent = "至少一個有效地址";
      syncShellDock();
      return;
    }
    const res = await sendExtensionRequest("wallet.createCombinedAccount", {
      label: label || undefined,
      subPubkeys,
      mainPubkey: session.combinedCreate.currentMain || subPubkeys[0],
    });
    if (!res.ok) {
      const errEl = document.getElementById("combined-err");
      if (errEl) errEl.textContent = res.error?.message ?? "建立失敗";
      return;
    }
    resetCombinedCreate();
    await refresh();
    navigateTo("accounts");
    return;
  }

  if (session.currentView === "settings-password") {
    await submitChangePassword();
  }
}

bindImportSeedUi();
bindGenerateSeedCopyButtons();
bindCombinedCreateEvents();
bindAccountsEvents();
bindSettingsEvents();
bindSendFormEvents();
bindWalletSendSettledListener();

document.getElementById("btn-create")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("setup-password") as HTMLInputElement).value;
  const password2 = (document.getElementById("setup-password-2") as HTMLInputElement).value;
  if (!password || password.length < 8) {
    showError("密碼至少 8 字");
    return;
  }
  if (password !== password2) {
    showError("密碼不一致");
    return;
  }
  const res = await sendExtensionRequest("wallet.createVault", { password, empty: true });
  if (!res.ok) showError(res.error?.message ?? "建立失敗");
  else {
    await refresh();
    navigateTo("add-account");
  }
});

async function submitUnlock(): Promise<void> {
  clearError();
  const password = (document.getElementById("unlock-password") as HTMLInputElement).value;
  const res = await sendExtensionRequest("wallet.unlock", { password });
  if (!res.ok) showError(res.error?.message ?? "解鎖失敗");
  else await refresh();
}

document.getElementById("btn-unlock")!.addEventListener("click", () => {
  void submitUnlock();
});

document.getElementById("unlock-password")!.addEventListener("keydown", (ev) => {
  if ((ev as KeyboardEvent).key === "Enter") {
    ev.preventDefault();
    void submitUnlock();
  }
});

document.getElementById("btn-lock-home")!.addEventListener("click", async () => {
  await sendExtensionRequest("wallet.lock");
  await refresh();
});

document.getElementById("btn-menu")!.addEventListener("click", () => {
  setMenuOpen(!session.menuOpen);
});

document.querySelectorAll(".btn-menu-sub").forEach((btn) => {
  btn.addEventListener("click", () => setMenuOpen(!session.menuOpen));
});

el.menuOverlay.addEventListener("click", () => setMenuOpen(false));

document.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const nav = (item as HTMLElement).dataset.nav as View;
    if (nav === "accounts" || nav === "settings" || nav === "connected-sites" || nav === "about") {
      navigateTo(nav);
    }
  });
});

document.querySelectorAll("[data-about-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = (btn as HTMLElement).dataset.aboutNav as View;
    if (target) navigateTo(target);
  });
});

document.querySelectorAll("[data-settings-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = (btn as HTMLElement).dataset.settingsNav as View;
    if (target) navigateTo(target);
  });
});

document.getElementById("btn-widget-accounts")!.addEventListener("click", () => {
  navigateTo("accounts");
});

document.getElementById("btn-widget-copy")!.addEventListener("click", () => {
  const active = session.lastState?.accounts.find((a) => a.id === session.lastState?.activeAccountId);
  if (active) void navigator.clipboard.writeText(getExposedPublicKey(active));
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

document.querySelectorAll("[data-nav-add]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = (btn as HTMLElement).dataset.navAdd as View;
    if (target) navigateTo(target);
  });
});

elDockPrimary.addEventListener("click", () => {
  void handleDockPrimary();
});

const importSecretInput = document.getElementById("import-secret") as HTMLTextAreaElement;
importSecretInput.addEventListener("input", () => {
  syncImportSecretFmt();
  const errEl = document.getElementById("import-secret-err");
  if (errEl) errEl.textContent = "";
  syncShellDock();
});

const watchPkInput = document.getElementById("watch-pk") as HTMLInputElement;
watchPkInput.addEventListener("input", () => {
  const errEl = document.getElementById("watch-err");
  if (errEl) errEl.textContent = "";
  syncShellDock();
});

document.getElementById("btn-refresh-assets")!.addEventListener("click", async () => {
  const state = await refresh();
  if (session.currentView === "home-token") await refreshHomeAssets(state, true);
});

document.getElementById("about-version")!.textContent = chrome.runtime.getManifest().version;
renderLegalDoc(document.getElementById("legal-disclaimer")!, disclaimerMd);
renderLegalDoc(document.getElementById("legal-terms")!, termsMd);

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

window.addEventListener("beforeunload", abortWalletSendOnPopupUnload);

window.addEventListener("pagehide", () => {
  abortWalletSendOnPopupUnload();
  clearRevealSecret();
  clearChangePasswordFields();
  if (session.currentView === "add-import-seed") {
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
  }
});

for (const id of [
  "setup-password",
  "setup-password-2",
  "unlock-password",
  "reveal-password",
  "change-pwd-current",
  "change-pwd-new",
  "change-pwd-confirm",
]) {
  const node = document.getElementById(id);
  if (node instanceof HTMLInputElement) hardenWalletPasswordInput(node);
}

el.error.addEventListener("click", () => {
  clearError();
});

void refresh().catch((e) => showError(String(e)));
