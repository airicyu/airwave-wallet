import { getExposedPublicKey, isSigningOrWatch, parsePublicKeyBase58 } from "../shared/accounts";
import { sendExtensionRequest } from "../shared/ext-api";
import type { AccountMeta } from "../shared/storage-keys";
import { resetCombinedCreate, validCombinedMembers } from "./accounts/combined-logic";
import { detectSecret } from "./onboarding/import-secret";
import { importSeedDockReady, mnemonicFromSlots, requestSeedPreview, resetImportSeedFlow } from "./onboarding/import-seed-flow";
import { resetGenerateSeedFlow } from "./onboarding/generate-seed-flow";
import { sendFormValid, submitTokenSend } from "./send/send-logic";
import { changePasswordCanSubmit, submitChangePassword } from "./settings/settings-logic";
import { isHomeView } from "./lib/format";
import {
  bindPopupShell,
  bumpUi,
  clearError,
  navigateTo,
  refresh,
  session,
  showError,
} from "./lib/session";
import type { PopupControllerApi } from "./state/popupControllerApi";
import { SUBPAGE_TITLES, type State, type View } from "./types";

let errorHideTimer: number | null = null;
let apiRef: PopupControllerApi | null = null;

export function clearSendForm(): void {
  session.sendAmount = "";
  session.sendRecipient = "";
  session.sendFormError = "";
}

export function clearChangePasswordFields(): void {
  session.changePwdCurrent = "";
  session.changePwdNew = "";
  session.changePwdConfirm = "";
  session.changePwdErr = "";
}

export function clearRevealSecret(): void {
  session.revealedSecretInMemory = null;
  session.revealPassword = "";
}

function showErrorToast(msg: string): void {
  if (errorHideTimer != null) {
    window.clearTimeout(errorHideTimer);
    errorHideTimer = null;
  }
  session.errorMessage = msg;
  bumpUi();
  errorHideTimer = window.setTimeout(() => {
    clearErrorToast();
  }, 4000);
}

function clearErrorToast(): void {
  if (errorHideTimer != null) {
    window.clearTimeout(errorHideTimer);
    errorHideTimer = null;
  }
  session.errorMessage = "";
  bumpUi();
}

export function performNavigate(view: View, accountId?: string): void {
  clearErrorToast();
  if (session.currentView === "send-approval" && view !== "send-approval" && session.activeWalletSendRequestId) {
    const rid = session.activeWalletSendRequestId;
    session.activeWalletSendRequestId = null;
    void sendExtensionRequest("ui.abortPending", { requestId: rid });
  }
  if (session.currentView === "add-import-seed" && view !== "add-import-seed") {
    resetImportSeedFlow();
  }
  if (session.currentView === "add-generate-seed" && view !== "add-generate-seed") {
    resetGenerateSeedFlow();
  }
  if (session.currentView === "add-import-secret" && view !== "add-import-secret") {
    session.importSecret = "";
    session.importLabel = "";
    session.importSecretErr = "";
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
      session.heliusDraft = "";
      session.jupiterDraft = "";
    }
  }
  if (view === "settings" || view.startsWith("settings-")) {
    session.rpcEditKey = null;
    session.rpcEditDraft = "";
  }
  if (accountId !== undefined) session.focusAccountId = accountId;
  session.currentView = view;
  session.menuOpen = false;
  apiRef?.setCurrentView(view);
  apiRef?.bump();

  if (view === "add-combined") {
    resetCombinedCreate();
  }
  if (view === "add-generate") {
    session.generateSuccessPk = null;
    session.generateLabel = "";
    session.generateErr = "";
  }
  if (view === "add-generate-seed") {
    resetGenerateSeedFlow();
    session.generateSeedLabel = "";
    session.generateSeedErr = "";
  }
  if (view === "add-import-secret") {
    session.importLabel = "";
    session.importSecret = "";
    session.importSecretErr = "";
  }
  if (view === "add-import-seed") {
    resetImportSeedFlow();
  }
  if (view === "add-watch") {
    session.watchLabel = "";
    session.watchPk = "";
    session.watchErr = "";
  }
  if (view === "account-rename" && session.lastState && session.focusAccountId) {
    const acc = session.lastState.accounts.find((a) => a.id === session.focusAccountId);
    if (acc) session.renameLabel = acc.label;
  }
}

export function bindPopupRuntime(api: PopupControllerApi): void {
  apiRef = api;
  bindPopupShell({
    navigateTo: performNavigate,
    refresh: api.refresh,
    showError: showErrorToast,
    clearError: clearErrorToast,
    bump: api.bump,
  });
}

export type DockState = { hidden: boolean; label: string; disabled: boolean };

export function computeDock(wallet: State | null): DockState {
  const view = session.currentView;
  if (view === "add-generate") {
    if (session.generateSuccessPk) return { hidden: false, label: "完成", disabled: false };
    return { hidden: false, label: "產生", disabled: false };
  }
  if (view === "add-generate-seed") {
    return {
      hidden: false,
      label: "建立",
      disabled: session.generateSeedBusy || session.generateSeedWords == null,
    };
  }
  if (view === "add-import-secret") {
    return { hidden: false, label: "匯入", disabled: !detectSecret(session.importSecret).ok };
  }
  if (view === "add-import-seed") {
    const dock = importSeedDockReady();
    if (dock.step === "pick") {
      return { hidden: false, label: "匯入", disabled: dock.busy || dock.selected == null };
    }
    return { hidden: false, label: "下一步", disabled: dock.busy || !(dock.filled === 12 || dock.filled === 24) };
  }
  if (view === "add-watch") {
    return { hidden: false, label: "建立", disabled: parsePublicKeyBase58(session.watchPk) == null };
  }
  if (view === "add-combined") {
    return { hidden: false, label: "建立 Combined", disabled: validCombinedMembers().length < 1 };
  }
  if (view === "settings-password") {
    return { hidden: false, label: "變更密碼", disabled: !changePasswordCanSubmit() };
  }
  if (view === "token-send") {
    return { hidden: false, label: "確認", disabled: !wallet || !sendFormValid(wallet) };
  }
  return { hidden: true, label: "", disabled: true };
}

export function subpageTitle(): string {
  if (session.currentView === "add-import-seed" && session.importSeedStep === "pick") return "選帳戶";
  if (session.currentView === "token-detail" && session.detailTokenId) {
    const row = session.lastSuccessfulTokenRows.find((r) => r.id === session.detailTokenId);
    return row ? row.name || row.symbol : SUBPAGE_TITLES["token-detail"];
  }
  if (session.currentView === "token-send") {
    const row = session.detailTokenId
      ? session.lastSuccessfulTokenRows.find((r) => r.id === session.detailTokenId)
      : undefined;
    return row ? `送出 ${row.symbol}` : SUBPAGE_TITLES["token-send"];
  }
  if (isHomeView(session.currentView)) return "";
  return SUBPAGE_TITLES[session.currentView as keyof typeof SUBPAGE_TITLES] ?? "";
}

export function handleBack(): void {
  if (session.currentView === "account-reveal-key") {
    navigateTo("account-manage");
    return;
  }
  if (
    session.currentView === "account-rename" ||
    session.currentView === "account-manage" ||
    session.currentView === "add-account"
  ) {
    navigateTo("accounts");
    return;
  }
  if (session.currentView === "add-generate") {
    if (session.generateSuccessPk) {
      session.generateSuccessPk = null;
      bumpUi();
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
      bumpUi();
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

export async function handleDockPrimary(): Promise<void> {
  if (session.currentView === "token-send") {
    await submitTokenSend();
    bumpUi();
    return;
  }
  if (session.currentView === "add-generate") {
    if (session.generateSuccessPk) {
      session.generateSuccessPk = null;
      navigateTo("add-account");
      return;
    }
    clearError();
    const label = session.generateLabel.trim();
    const res = await sendExtensionRequest("wallet.generateAccount", {
      label: label || undefined,
    });
    if (!res.ok) {
      session.generateErr = res.error?.message ?? "失敗";
      bumpUi();
      return;
    }
    const { account } = res.result as { account: AccountMeta };
    const pk = isSigningOrWatch(account) ? account.publicKeyBase58 : getExposedPublicKey(account);
    session.generateSuccessPk = pk;
    bumpUi();
    await refresh();
    return;
  }

  if (session.currentView === "add-generate-seed") {
    if (!session.generateSeedWords) return;
    clearError();
    session.generateSeedBusy = true;
    bumpUi();
    const label = session.generateSeedLabel.trim();
    const fallbackLabel = session.lastState ? `Account ${session.lastState.accounts.length + 1}` : undefined;
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic: session.generateSeedWords.join(" "),
      pathKind: "phantom",
      index: 0,
      label: label || fallbackLabel,
    });
    session.generateSeedBusy = false;
    if (!res.ok) {
      session.generateSeedErr = res.error?.message ?? "失敗";
      bumpUi();
      return;
    }
    await refresh();
    navigateTo("add-account");
    return;
  }

  if (session.currentView === "add-import-secret") {
    clearError();
    const raw = session.importSecret;
    const d = detectSecret(raw);
    if (!d.ok) {
      session.importSecretErr = "無法辨識";
      bumpUi();
      return;
    }
    const label = session.importLabel.trim();
    const res = await sendExtensionRequest("wallet.importAccount", {
      secret: raw.trim(),
      label: label || undefined,
    });
    if (!res.ok) {
      session.importSecretErr = res.error?.message ?? "匯入失敗";
      bumpUi();
      return;
    }
    session.importSecret = "";
    session.importLabel = "";
    session.importSecretErr = "";
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
      bumpUi();
      return;
    }
    if (session.importSeedSelected == null) return;
    session.importSeedBusy = true;
    bumpUi();
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic: mnemonicFromSlots(),
      pathKind: session.importSeedKind,
      customPath: session.importSeedKind === "custom" ? session.importSeedCustomPath : undefined,
      index: session.importSeedSelected,
    });
    session.importSeedBusy = false;
    if (!res.ok) {
      session.importSeedErr = res.error?.message ?? "匯入失敗";
      bumpUi();
      return;
    }
    resetImportSeedFlow();
    await refresh();
    navigateTo("accounts");
    return;
  }

  if (session.currentView === "add-watch") {
    clearError();
    const publicKeyBase58 = session.watchPk.trim();
    const label = session.watchLabel.trim();
    if (!parsePublicKeyBase58(publicKeyBase58)) {
      session.watchErr = "地址無效";
      bumpUi();
      return;
    }
    const res = await sendExtensionRequest("wallet.addReadOnlyAccount", {
      publicKeyBase58,
      label: label || undefined,
    });
    if (!res.ok) showError(res.error?.message ?? "新增失敗");
    else {
      await refresh();
      navigateTo("accounts");
    }
    return;
  }

  if (session.currentView === "add-combined") {
    clearError();
    const label = session.combinedLabel.trim();
    const subPubkeys = validCombinedMembers();
    if (subPubkeys.length === 0) {
      session.combinedErr = "至少一個有效地址";
      bumpUi();
      return;
    }
    const res = await sendExtensionRequest("wallet.createCombinedAccount", {
      label: label || undefined,
      subPubkeys,
      mainPubkey: session.combinedCreate.currentMain || subPubkeys[0],
    });
    if (!res.ok) {
      session.combinedErr = res.error?.message ?? "建立失敗";
      bumpUi();
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

export function syncWalletSideEffects(state: State): void {
  session.lastState = state;
  if (state.vaultExists && !state.unlocked) {
    session.menuOpen = false;
    session.detailTokenId = null;
    clearSendForm();
  }
  if (state.activeAccountId !== session.lastActiveAccountId) {
    session.lastActiveAccountId = state.activeAccountId;
    session.lastSuccessfulTokenRows = [];
    session.expandedTokenRowIds.clear();
    session.detailTokenId = null;
    clearSendForm();
    if (session.currentView === "token-send" || session.currentView === "token-detail") {
      performNavigate("home-token");
    }
  }
  session.lastLegalDefaultCuPrice = state.settings.defaultCuPrice;
}

export { showErrorToast as showError, clearErrorToast as clearErrorRuntime };
