import type { JSX } from "react";
import { FlowHost } from "../flow";
import { CopyPkButton } from "./components/CopyPkButton";
import {
  IconAccounts,
  IconBack,
  IconBook,
  IconCollapseRight,
  IconGlobe,
  IconInfo,
  IconLock,
  IconMenu,
  IconNetwork,
  IconSettings,
  IconSidebar,
} from "./components/StrokeIcon";
import { hydrateLastNormalWindowId } from "./shell/shell-bridge";
import { closeSidebar, isSidePanelSurface, isWalletWindowSurface, switchToSidebar } from "./shell/shell-switch";
import { WalletWidget } from "./components/WalletWidget";
import { getExposedPublicKey } from "../shared/accounts";
import { sendExtensionRequest } from "../shared/protocol";
import { isHomeView } from "./lib/format";
import { LockedScreen } from "./onboarding/OnboardingScreens";
import { SetupFlow } from "./onboarding/SetupFlow";
import { subpageTitle } from "./runtime";
import { AccountViews } from "./AccountViews";
import { CloseEmptyViews } from "./CloseEmptyViews";
import { HomeViews } from "./HomeViews";
import { SettingsViews } from "./SettingsViews";
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
      <button type="button" className="menu-item" onClick={() => navigateTo("address-cards")}>
        <IconBook />
        {t("menu.addressCards")}
      </button>
      <button type="button" className="menu-item" onClick={() => navigateTo("settings-network")}>
        <IconNetwork />
        {t("settings.hub.network")}
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
        <header className="top-bar" id="top-bar" hidden={currentView === "close-empty-sending" || currentView === "rpc-guide" || currentView === "send-approval"}>
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
          <HomeViews />
          <CloseEmptyViews />
          <AccountViews />
          <SettingsViews />

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
