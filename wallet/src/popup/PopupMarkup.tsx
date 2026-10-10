import type { JSX } from "react";
import disclaimerMd from "../../../docs/legal/disclaimer.md?raw";
import termsMd from "../../../docs/legal/terms-of-use.md?raw";
import {
  AccountsList,
  CombinedCreateScreen,
  ConnectedSites,
  ManageScreen,
  RenameScreen,
  RevealScreen,
} from "./accounts/AccountsScreens";
import { ApprovalHost } from "./components/ApprovalHost";
import { FlowHost } from "../flow";
import { HomeActivityList } from "./components/HomeActivityList";
import { HomeTokenList, TokenDetailView } from "./components/HomeTokenList";
import {
  CloseEmptyConfirmScreen,
  CloseEmptyPickScreen,
  CloseEmptyRecycleButton,
  CloseEmptyResultScreen,
  CloseEmptySendingScreen,
} from "./close-empty/CloseEmptyFeature";
import { LegalDoc } from "./components/LegalDoc";
import { CopyPkButton } from "./components/CopyPkButton";
import { RefreshAssetsButton } from "./components/RefreshAssetsButton";
import {
  IconAccounts,
  IconBack,
  IconCollapseRight,
  IconGlobe,
  IconInfo,
  IconLock,
  IconMenu,
  IconSettings,
  IconSidebar,
} from "./components/StrokeIcon";
import { hydrateLastNormalWindowId } from "./shell/shell-bridge";
import { closeSidebar, isSidePanelSurface, isWalletWindowSurface, switchToSidebar } from "./shell/shell-switch";
import { WalletWidget } from "./components/WalletWidget";
import { getExposedPublicKey } from "../shared/accounts";
import { jsonRpcMissing } from "../shared/storage-keys";
import { sendExtensionRequest } from "../shared/ext-api";
import { apiErrorMessage } from "../shared/ui-i18n";
import { isHomeView } from "./lib/format";
import {
  AboutHub,
  AddAccountChooser,
  AddImportChooser,
  GenerateBurnerScreen,
  GenerateSeedScreen,
  ImportSecretScreen,
  ImportSeedScreen,
  LockedScreen,
  WatchAccountScreen,
} from "./onboarding/OnboardingScreens";
import { SetupFlow } from "./onboarding/SetupFlow";
import { RpcGuideScreen } from "./onboarding/RpcGuideScreen";
import { screenEnterKey, subpageTitle } from "./runtime";
import { TokenSendForm } from "./send/TokenSendForm";
import {
  ChangePasswordScreen,
  CuPriceScreen,
  KeysScreen,
  LocaleScreen,
  NetworkScreen,
  RpcScreen,
  SettingsHub,
} from "./settings/SettingsScreens";
import { usePopupContext } from "./state/PopupContext";
import { useT } from "./state/useT";
import { useDock } from "./state/dock";

function ErrorToast(): JSX.Element {
  const { toast, toastVariant, clearError } = usePopupContext();
  const className =
    toastVariant === "warn" ? "toast-banner toast-warn" : "error toast-error";
  return (
    <p
      id="error"
      className={className}
      role="status"
      aria-live="polite"
      hidden={!toast}
      onClick={() => clearError()}
    >
      {toast}
    </p>
  );
}

function MenuItems(): JSX.Element {
  const { navigateTo, refresh, setMenuOpen } = usePopupContext();
  const { t } = useT();
  return (
    <>
      <button type="button" className="menu-item" onClick={() => navigateTo("accounts")}>
        <IconAccounts />
        {t("menu.walletAccounts")}
      </button>
      <button type="button" className="menu-item" onClick={() => navigateTo("settings")}>
        <IconSettings />
        {t("menu.settings")}
      </button>
      <button type="button" className="menu-item" onClick={() => navigateTo("connected-sites")}>
        <IconGlobe />
        {t("menu.connectedSites")}
      </button>
      <button type="button" className="menu-item" onClick={() => navigateTo("about")}>
        <IconInfo />
        {t("menu.about")}
      </button>
      <button
        type="button"
        className="menu-item menu-item-lock"
        onClick={async () => {
          setMenuOpen(false);
          await sendExtensionRequest("wallet.lock");
          await refresh();
        }}
      >
        <IconLock size={16} />
        {t("menu.lockWallet")}
      </button>
    </>
  );
}

export function PopupMarkup(): JSX.Element {
  const {
    wallet,
    currentView,
    detailTokenId,
    setDetailTokenId,
    activeWalletSendRequestId,
    flowStack,
    finishFlowPage,
    homeTokenRows,
    setHomeAssetsForce,
    menuOpen,
    setMenuOpen,
    navSeq,
    titleOverride,
    navigateTo,
    handleBack,
    closeEmptyEntries,
    setCloseEmptyEntries,
    closeEmptyPlan,
    setCloseEmptyPlan,
    closeEmptyResult,
    setCloseEmptyResult,
    closeEmptyStaleError,
    setCloseEmptyStaleError,
    setCloseEmptySending,
    showError,
    resetCloseEmptyFlow,
  } = usePopupContext();
  const { locale, t } = useT();
  const { dock } = useDock();

  const vaultExists = wallet?.vaultExists ?? false;
  const unlocked = wallet?.unlocked ?? false;
  const isLocked = vaultExists && !unlocked;
  const showShell = vaultExists && unlocked;
  const home = isHomeView(currentView);
  const title =
    titleOverride ??
    subpageTitle({
      locale: wallet?.settings.locale ?? "zh-Hant",
      currentView,
      detailTokenId,
      homeTokenRows,
    });

  if (wallet == null) {
    return <ErrorToast />;
  }

  if (!vaultExists) {
    return (
      <>
        <SetupFlow />
        <ErrorToast />
      </>
    );
  }

  if (isLocked) {
    return (
      <>
        <LockedScreen />
        <ErrorToast />
      </>
    );
  }

  if (!showShell) return <></>;

  const flowCovered = flowStack.length > 0;

  return (
    <>
      <div className="shell-stack">
        <div
          className={flowCovered ? "shell-layer is-paused" : "shell-layer"}
          style={{ zIndex: 0 }}
          aria-hidden={flowCovered}
          inert={flowCovered}
        >
      <div id="shell" className="shell">
        <header className="top-bar" id="top-bar" hidden={currentView === "close-empty-sending" || currentView === "rpc-guide"}>
          <div className="bar-home" id="bar-home" hidden={!home}>
            <div className="bar-wallet-group">
              <div className="bar-wallet">
                <button
                  type="button"
                  className="bar-wallet-hit"
                  id="btn-widget-accounts"
                  title={t("menu.walletAccounts")}
                  onClick={() => navigateTo("accounts")}
                >
                  <WalletWidget wallet={wallet} />
                </button>
                <CopyPkButton
                  id="btn-widget-copy"
                  publicKey={(() => {
                    const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
                    return active ? getExposedPublicKey(active) : "";
                  })()}
                />
              </div>
            </div>
            <div className="bar-spacer" />
            <div className="bar-end">
              {isWalletWindowSurface() ? (
                <button
                  type="button"
                  className="icon-btn"
                  id="btn-shell-to-sidebar"
                  title={t("shell.toSidebar")}
                  aria-label={t("shell.toSidebar")}
                  onMouseDown={() => void hydrateLastNormalWindowId()}
                  onClick={() => switchToSidebar()}
                >
                  <IconSidebar />
                </button>
              ) : null}
              {isSidePanelSurface() ? (
                <button
                  type="button"
                  className="icon-btn"
                  id="btn-shell-close-sidebar"
                  title={t("shell.closeSidebar")}
                  aria-label={t("shell.closeSidebar")}
                  onMouseDown={() => void hydrateLastNormalWindowId()}
                  onClick={() => closeSidebar()}
                >
                  <IconCollapseRight />
                </button>
              ) : null}
              <div className="menu-anchor">
                <button
                  type="button"
                  className="icon-btn"
                  id="btn-menu"
                  title={t("menu.menu")}
                  aria-label={t("menu.menu")}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <IconMenu />
                </button>
                <div id="menu-dropdown" className="menu-dropdown" hidden={!menuOpen}>
                  <MenuItems />
                </div>
              </div>
            </div>
          </div>
          <div className="bar-subpage" id="bar-subpage" hidden={home}>
            <button
              type="button"
              className="icon-btn"
              id="btn-back"
              title={t("menu.back")}
              aria-label={t("menu.back")}
              onClick={() => handleBack()}
            >
              <IconBack />
            </button>
            <div className="bar-subpage-title" id="subpage-title">
              {title}
            </div>
            <div className="menu-anchor">
              <button
                type="button"
                className="icon-btn btn-menu-sub"
                title={t("menu.menu")}
                aria-label={t("menu.menu")}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <IconMenu />
              </button>
              <div className="menu-dropdown menu-dropdown-sub" hidden={!menuOpen}>
                <MenuItems />
              </div>
            </div>
          </div>
        </header>
        {home && wallet.settings.cluster === "devnet" ? (
          <div className="cluster-strip" role="status">
            Devnet
          </div>
        ) : null}

        <div
          id="menu-overlay"
          className="menu-overlay"
          hidden={!menuOpen}
          aria-hidden={menuOpen ? "false" : "true"}
          onClick={() => setMenuOpen(false)}
        />

        <main className="screen-body">
          {currentView === "home-token" ? (
            <section id="screen-home-token" className="screen">
              <div className="section-head section-head-tokens">
                <h3>{t("common.tokens")}</h3>
                <div className="section-head-actions">
                {jsonRpcMissing(wallet.settings) ? null : (
                  <>
                <CloseEmptyRecycleButton
                  wallet={wallet}
                  onOpen={async () => {
                    const res = await sendExtensionRequest("wallet.listClosableTokenAccounts", {});
                    if (res.ok) {
                      const body = res.result as { entries?: import("../shared/close-empty-types").ClosableEntry[] };
                      setCloseEmptyEntries(body.entries ?? []);
                    }
                    navigateTo("close-empty-pick");
                  }}
                />
                <RefreshAssetsButton
                  activeAccountId={wallet.activeAccountId}
                  currentView={currentView}
                  onRefresh={() => setHomeAssetsForce(true)}
                />
                  </>
                )}
                </div>
              </div>
              <HomeTokenList
                wallet={wallet}
                currentView={currentView}
                onOpenDetail={(tokenId) => {
                  setDetailTokenId(tokenId);
                  navigateTo("token-detail");
                }}
              />
            </section>
          ) : null}

          {currentView === "token-detail" ? (
            <section id="screen-token-detail" className="screen">
              {detailTokenId ? (
                <TokenDetailView
                  wallet={wallet}
                  tokenId={detailTokenId}
                  onSend={() => navigateTo("token-send")}
                />
              ) : (
                <div id="token-detail-root" className="token-detail" />
              )}
            </section>
          ) : null}

          {currentView === "token-send" ? (
            <section id="screen-token-send" className="screen">
              <TokenSendForm wallet={wallet} />
            </section>
          ) : null}

          {currentView === "send-approval" && activeWalletSendRequestId ? (
            <section id="screen-send-approval" className="screen approval-shell-host">
              <ApprovalHost key={activeWalletSendRequestId} requestId={activeWalletSendRequestId} />
            </section>
          ) : null}

          {currentView === "close-empty-pick" ? (
            <section className="screen">
              <CloseEmptyPickScreen
                wallet={wallet}
                initialEntries={closeEmptyEntries}
                onNext={(selected, plan) => {
                  setCloseEmptyPlan(plan);
                  navigateTo("close-empty-confirm");
                }}
              />
            </section>
          ) : null}

          {currentView === "close-empty-confirm" && closeEmptyPlan ? (
            <section className="screen">
              <CloseEmptyConfirmScreen
                wallet={wallet}
                plan={closeEmptyPlan}
                staleError={closeEmptyStaleError}
                onConfirm={() => {
                  void (async () => {
                    setCloseEmptyStaleError(null);
                    setCloseEmptySending(true);
                    navigateTo("close-empty-sending");
                    const res = await sendExtensionRequest("wallet.commitCloseEmpty", {
                      planId: closeEmptyPlan.planId,
                    });
                    setCloseEmptySending(false);
                    if (!res.ok) {
                      if (res.error?.code === "STALE_LIST") {
                        setCloseEmptyStaleError(apiErrorMessage(locale, res.error, "error.code.CLOSE_EMPTY_STALE_LIST"));
                        navigateTo("close-empty-confirm");
                        return;
                      }
                      showError(apiErrorMessage(locale, res.error, "error.sendFailed"));
                      navigateTo("close-empty-confirm");
                      return;
                    }
                    setCloseEmptyResult(res.result as import("../shared/close-empty-types").CloseEmptyCommitResult);
                    navigateTo("close-empty-result");
                  })();
                }}
              />
            </section>
          ) : null}

          {currentView === "close-empty-sending" ? (
            <section className="screen">
              <CloseEmptySendingScreen />
            </section>
          ) : null}

          {currentView === "close-empty-result" && closeEmptyResult ? (
            <section className="screen">
              <CloseEmptyResultScreen
                result={closeEmptyResult}
                onDone={() => {
                  resetCloseEmptyFlow();
                  setHomeAssetsForce(true);
                  navigateTo("home-token");
                }}
              />
            </section>
          ) : null}

          {currentView === "rpc-guide" ? <RpcGuideScreen /> : null}

          {currentView === "home-activity" ? (
            <HomeActivityList wallet={wallet} currentView={currentView} />
          ) : null}

          {currentView === "accounts" ? (
            <section id="screen-accounts" className="screen">
              <AccountsList wallet={wallet} />
            </section>
          ) : null}

          {currentView === "add-account" ? (
            <section id="screen-add-account" className="screen">
              <AddAccountChooser />
            </section>
          ) : null}

          {currentView === "add-import" ? (
            <section id="screen-add-import" className="screen">
              <AddImportChooser />
            </section>
          ) : null}

          {currentView === "add-import-secret" ? (
            <section id="screen-add-import-secret" className="screen">
              <ImportSecretScreen key={screenEnterKey("add-import-secret", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-import-seed" ? (
            <section id="screen-add-import-seed" className="screen">
              <ImportSeedScreen key={screenEnterKey("add-import-seed", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-generate-seed" ? (
            <section id="screen-add-generate-seed" className="screen">
              <GenerateSeedScreen key={screenEnterKey("add-generate-seed", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-generate" ? (
            <section id="screen-add-generate" className="screen">
              <GenerateBurnerScreen key={screenEnterKey("add-generate", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-watch" ? (
            <section id="screen-add-watch" className="screen">
              <WatchAccountScreen key={screenEnterKey("add-watch", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-combined" ? (
            <section id="screen-add-combined" className="screen">
              <CombinedCreateScreen key={screenEnterKey("add-combined", navSeq)} wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-rename" ? (
            <section id="screen-account-rename" className="screen">
              <RenameScreen key={screenEnterKey("account-rename", navSeq)} wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-manage" ? (
            <section id="screen-account-manage" className="screen">
              <ManageScreen wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-reveal-key" ? (
            <section id="screen-account-reveal-key" className="screen">
              <RevealScreen wallet={wallet} />
            </section>
          ) : null}

          {currentView === "settings" ? (
            <section id="screen-settings" className="screen">
              <SettingsHub settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-locale" ? (
            <section id="screen-settings-locale" className="screen">
              <LocaleScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-network" ? (
            <section id="screen-settings-network" className="screen">
              <NetworkScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-rpc" ? (
            <section id="screen-settings-rpc" className="screen">
              <RpcScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-keys" ? (
            <section id="screen-settings-keys" className="screen">
              <KeysScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-cu-price" ? (
            <section id="screen-settings-cu-price" className="screen">
              <CuPriceScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-password" ? (
            <section id="screen-settings-password" className="screen">
              <ChangePasswordScreen />
            </section>
          ) : null}

          {currentView === "about" ? (
            <section id="screen-about" className="screen">
              <AboutHub />
            </section>
          ) : null}

          {currentView === "about-disclaimer" ? (
            <section id="screen-about-disclaimer" className="screen">
              <article id="legal-disclaimer" className="legal-doc">
                <LegalDoc markdown={disclaimerMd} />
              </article>
            </section>
          ) : null}

          {currentView === "about-terms" ? (
            <section id="screen-about-terms" className="screen">
              <article id="legal-terms" className="legal-doc">
                <LegalDoc markdown={termsMd} />
              </article>
            </section>
          ) : null}

          {currentView === "connected-sites" ? (
            <section id="screen-connected-sites" className="screen">
              <ConnectedSites wallet={wallet} />
            </section>
          ) : null}
        </main>

        <footer id="shell-dock" className="shell-dock" hidden={!dock}>
          {dock?.meta ? <p className="shell-dock-meta">{dock.meta}</p> : null}
          <div className={dock?.secondaryLabel ? "shell-dock-row" : undefined}>
            {dock?.secondaryLabel ? (
              <button
                type="button"
                className="ghost-btn"
                id="dock-secondary"
                onClick={() => void dock.onSecondary?.()}
              >
                {dock.secondaryLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="primary-btn"
              id="dock-primary"
              disabled={dock?.disabled ?? true}
              onClick={() => void dock?.onPrimary()}
            >
              {dock?.label ?? ""}
            </button>
          </div>
        </footer>

        <nav id="home-tab-bar" className="tab-bar" hidden={!home}>
          <button
            type="button"
            className={`tab-btn${currentView === "home-token" ? " active" : ""}`}
            onClick={() => navigateTo("home-token")}
          >
            {t("common.tokens")}
          </button>
          <button
            type="button"
            className={`tab-btn${currentView === "home-activity" ? " active" : ""}`}
            onClick={() => navigateTo("home-activity")}
          >
            {t("common.activity")}
          </button>
        </nav>
      </div>
          <ErrorToast />
        </div>
        {flowStack.map((entry, i) => (
          <FlowHost
            key={entry.requestId}
            entry={entry}
            layer={i + 1}
            paused={i < flowStack.length - 1}
            onFinished={finishFlowPage}
          />
        ))}
      </div>
    </>
  );
}
