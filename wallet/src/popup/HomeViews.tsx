/**
 * Home, token, send, and address-book screens inside the popup shell.
 * Does not draw the top bar, account screens, or settings.
 */
import type { JSX } from "react";
import { HomeActivityList } from "./components/HomeActivityList";
import { HomeTokenList, TokenDetailView } from "./components/HomeTokenList";
import { CloseEmptyRecycleButton } from "./close-empty/CloseEmptyFeature";
import { RefreshAssetsButton } from "./components/RefreshAssetsButton";
import { ApprovalHost } from "./components/ApprovalHost";
import { jsonRpcMissing } from "../shared/protocol";
import { sendExtensionRequest } from "../shared/protocol";
import { screenEnterKey } from "./runtime";
import { TokenSendForm } from "./send/TokenSendForm";
import { AddressCardRenameScreen, AddressCardsAddScreen, AddressCardsScreen, SendPickScreen } from "./address-cards/AddressCardsScreens";
import { usePopupContext } from "./state/PopupContext";
import { useT } from "./state/useT";

export function HomeViews(): JSX.Element {
  const {
    wallet,
    currentView,
    detailTokenId,
    setDetailTokenId,
    activeWalletSendRequestId,
    navSeq,
    navigateTo,
    setCloseEmptyEntries,
    setHomeAssetsForce,
  } = usePopupContext();
  const { t } = useT();
  if (!wallet) return <></>;
  return (
    <>
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
                      const body = res.result as { entries?: import("../shared/close-empty").ClosableEntry[] };
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

          {currentView === "send-pick" ? (
            <section id="screen-send-pick" className="screen">
              <SendPickScreen wallet={wallet} />
            </section>
          ) : null}

          {currentView === "address-cards" ? (
            <section id="screen-address-cards" className="screen">
              <AddressCardsScreen wallet={wallet} />
            </section>
          ) : null}

          {currentView === "address-cards-add" ? (
            <section id="screen-address-cards-add" className="screen">
              <AddressCardsAddScreen />
            </section>
          ) : null}

          {currentView === "address-card-rename" ? (
            <section id="screen-address-card-rename" className="screen">
              <AddressCardRenameScreen key={screenEnterKey("address-card-rename", navSeq)} wallet={wallet} />
            </section>
          ) : null}

          {currentView === "send-approval" && activeWalletSendRequestId ? (
            <section id="screen-send-approval" className="screen approval-shell-host">
              <ApprovalHost key={activeWalletSendRequestId} requestId={activeWalletSendRequestId} />
            </section>
          ) : null}
          {currentView === "home-activity" ? (
            <HomeActivityList wallet={wallet} currentView={currentView} />
          ) : null}
    </>
  );
}
