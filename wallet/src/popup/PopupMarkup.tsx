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
import { HomeTokenList, TokenDetailView } from "./components/HomeTokenList";
import { LegalDoc } from "./components/LegalDoc";
import { IconBack, IconCopy, IconLock, IconMenu, IconRefresh } from "./components/StrokeIcon";
import { WalletWidget } from "./components/WalletWidget";
import { getExposedPublicKey } from "../shared/accounts";
import { sendExtensionRequest } from "../shared/ext-api";
import { isHomeView } from "./lib/format";
import { bumpUi, navigateTo, refresh, session } from "./lib/session";
import {
  AboutHub,
  AddAccountChooser,
  AddImportChooser,
  GenerateBurnerScreen,
  GenerateSeedScreen,
  ImportSecretScreen,
  ImportSeedScreen,
  LockedScreen,
  SetupScreen,
  WatchAccountScreen,
} from "./onboarding/OnboardingScreens";
import { computeDock, handleBack, handleDockPrimary, subpageTitle } from "./runtime";
import { TokenSendForm } from "./send/TokenSendForm";
import {
  ChangePasswordScreen,
  CuPriceScreen,
  KeysScreen,
  NetworkScreen,
  RpcScreen,
  SettingsHub,
} from "./settings/SettingsScreens";
import type { State, View } from "./types";

export type PopupMarkupProps = {
  wallet: State | null;
  currentView: View;
  tick: number;
  onOpenTokenDetail: (tokenId: string) => void;
  onTokenSend: () => void;
};

function MenuItems(): JSX.Element {
  return (
    <>
      <button type="button" className="menu-item" onClick={() => navigateTo("accounts")}>
        Wallet accounts
      </button>
      <button type="button" className="menu-item" onClick={() => navigateTo("settings")}>
        Settings
      </button>
      <button type="button" className="menu-item" onClick={() => navigateTo("connected-sites")}>
        Connected sites
      </button>
      <button type="button" className="menu-item" onClick={() => navigateTo("about")}>
        About this app
      </button>
    </>
  );
}

export function PopupMarkup({
  wallet,
  currentView,
  tick,
  onOpenTokenDetail,
  onTokenSend,
}: PopupMarkupProps): JSX.Element {
  const vaultExists = wallet?.vaultExists ?? false;
  const unlocked = wallet?.unlocked ?? false;
  const isLocked = vaultExists && !unlocked;
  const showShell = vaultExists && unlocked;
  const home = isHomeView(currentView);
  const dock = computeDock(wallet);
  const title = subpageTitle();

  if (wallet == null) {
    return (
      <p id="error" className="error toast-error" hidden={!session.errorMessage} onClick={() => (session.errorMessage = "")}>
        {session.errorMessage}
      </p>
    );
  }

  if (!vaultExists) {
    return (
      <>
        <SetupScreen />
        <p
          id="error"
          className="error toast-error"
          hidden={!session.errorMessage}
          onClick={() => {
            session.errorMessage = "";
            bumpUi();
          }}
        >
          {session.errorMessage}
        </p>
      </>
    );
  }

  if (isLocked) {
    return (
      <>
        <LockedScreen />
        <p
          id="error"
          className="error toast-error"
          hidden={!session.errorMessage}
          onClick={() => {
            session.errorMessage = "";
            bumpUi();
          }}
        >
          {session.errorMessage}
        </p>
      </>
    );
  }

  if (!showShell) return <></>;

  return (
    <>
      <div id="shell" className="shell">
        <header className="top-bar" id="top-bar">
          <div className="bar-home" id="bar-home" hidden={!home}>
            <div className="bar-wallet-group">
              <button
                type="button"
                className="bar-wallet"
                id="btn-widget-accounts"
                title="Wallet accounts"
                onClick={() => navigateTo("accounts")}
              >
                <WalletWidget wallet={wallet} />
              </button>
              <button
                type="button"
                className="icon-btn ghost-inline"
                id="btn-widget-copy"
                title="Copy public key"
                aria-label="Copy public key"
                onClick={() => {
                  const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
                  if (active) void navigator.clipboard.writeText(getExposedPublicKey(active));
                }}
              >
                <IconCopy />
              </button>
            </div>
            <div className="bar-spacer" />
            <div className="bar-end">
              <button
                type="button"
                className="icon-btn"
                id="btn-lock-home"
                title="Lock wallet"
                aria-label="Lock wallet"
                onClick={async () => {
                  await sendExtensionRequest("wallet.lock");
                  await refresh();
                }}
              >
                <IconLock />
              </button>
              <div className="menu-anchor">
                <button
                  type="button"
                  className="icon-btn"
                  id="btn-menu"
                  title="Menu"
                  aria-label="Menu"
                  aria-expanded={session.menuOpen}
                  onClick={() => {
                    session.menuOpen = !session.menuOpen;
                    bumpUi();
                  }}
                >
                  <IconMenu />
                </button>
                <div id="menu-dropdown" className="menu-dropdown" hidden={!session.menuOpen}>
                  <MenuItems />
                </div>
              </div>
            </div>
          </div>
          <div className="bar-subpage" id="bar-subpage" hidden={home}>
            <button type="button" className="icon-btn" id="btn-back" title="Back" aria-label="Back" onClick={() => handleBack()}>
              <IconBack />
            </button>
            <div className="bar-subpage-title" id="subpage-title">
              {title}
            </div>
            <div className="menu-anchor">
              <button
                type="button"
                className="icon-btn btn-menu-sub"
                title="Menu"
                aria-label="Menu"
                aria-expanded={session.menuOpen}
                onClick={() => {
                  session.menuOpen = !session.menuOpen;
                  bumpUi();
                }}
              >
                <IconMenu />
              </button>
              <div className="menu-dropdown menu-dropdown-sub" hidden={!session.menuOpen}>
                <MenuItems />
              </div>
            </div>
          </div>
        </header>

        <div
          id="menu-overlay"
          className="menu-overlay"
          hidden={!session.menuOpen}
          aria-hidden={session.menuOpen ? "false" : "true"}
          onClick={() => {
            session.menuOpen = false;
            bumpUi();
          }}
        />

        <main className="screen-body">
          {currentView === "home-token" ? (
            <section id="screen-home-token" className="screen">
              <div className="section-head">
                <h3>Tokens</h3>
                <button
                  type="button"
                  className="icon-btn ghost-inline"
                  id="btn-refresh-assets"
                  title="Refresh balances"
                  aria-label="Refresh balances"
                  onClick={() => {
                    session.homeAssetsForce = true;
                    bumpUi();
                  }}
                >
                  <IconRefresh />
                </button>
              </div>
              <HomeTokenList wallet={wallet} currentView={currentView} onOpenDetail={onOpenTokenDetail} tick={tick} />
            </section>
          ) : null}

          {currentView === "token-detail" ? (
            <section id="screen-token-detail" className="screen">
              {session.detailTokenId ? (
                <TokenDetailView wallet={wallet} tokenId={session.detailTokenId} onSend={onTokenSend} />
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

          {currentView === "send-approval" && session.activeWalletSendRequestId ? (
            <section id="screen-send-approval" className="screen approval-shell-host">
              <ApprovalHost requestId={session.activeWalletSendRequestId} />
            </section>
          ) : null}

          {currentView === "home-activity" ? (
            <section id="screen-home-activity" className="screen">
              <div className="empty-state">
                <p>尚無交易歷史</p>
                <p className="muted">鏈上 Activity 將於後續版本提供。</p>
              </div>
            </section>
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
              <ImportSecretScreen />
            </section>
          ) : null}

          {currentView === "add-import-seed" ? (
            <section id="screen-add-import-seed" className="screen">
              <ImportSeedScreen />
            </section>
          ) : null}

          {currentView === "add-generate-seed" ? (
            <section id="screen-add-generate-seed" className="screen">
              <GenerateSeedScreen />
            </section>
          ) : null}

          {currentView === "add-generate" ? (
            <section id="screen-add-generate" className="screen">
              <GenerateBurnerScreen />
            </section>
          ) : null}

          {currentView === "add-watch" ? (
            <section id="screen-add-watch" className="screen">
              <WatchAccountScreen />
            </section>
          ) : null}

          {currentView === "add-combined" ? (
            <section id="screen-add-combined" className="screen">
              <CombinedCreateScreen wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-rename" ? (
            <section id="screen-account-rename" className="screen">
              <RenameScreen wallet={wallet} />
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

        <footer id="shell-dock" className="shell-dock" hidden={dock.hidden}>
          <button type="button" className="primary-btn" id="dock-primary" disabled={dock.disabled} onClick={() => void handleDockPrimary()}>
            {dock.label}
          </button>
        </footer>

        <nav id="home-tab-bar" className="tab-bar" hidden={!home}>
          <button
            type="button"
            className={`tab-btn${currentView === "home-token" ? " active" : ""}`}
            onClick={() => navigateTo("home-token")}
          >
            Token
          </button>
          <button
            type="button"
            className={`tab-btn${currentView === "home-activity" ? " active" : ""}`}
            onClick={() => navigateTo("home-activity")}
          >
            Activity
          </button>
        </nav>
      </div>

      <p
        id="error"
        className="error toast-error"
        hidden={!session.errorMessage}
        onClick={() => {
          session.errorMessage = "";
          bumpUi();
        }}
      >
        {session.errorMessage}
      </p>
    </>
  );
}
