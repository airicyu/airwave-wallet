/**
 * Close-empty pick, confirm, sending, and result screens.
 * Does not list closable accounts or build the unsigned transactions.
 */
import type { JSX } from "react";
import {
  CloseEmptyConfirmScreen,
  CloseEmptyPickScreen,
  CloseEmptyResultScreen,
  CloseEmptySendingScreen,
} from "./close-empty/CloseEmptyFeature";
import { sendExtensionRequest } from "../shared/protocol";
import { apiErrorMessage } from "../shared/i18n";
import { usePopupContext } from "./state/PopupContext";
import { useT } from "./state/useT";

export function CloseEmptyViews(): JSX.Element {
  const {
    wallet,
    currentView,
    navigateTo,
    closeEmptyEntries,
    setCloseEmptyPlan,
    closeEmptyPlan,
    closeEmptyResult,
    closeEmptyStaleError,
    setCloseEmptyStaleError,
    setCloseEmptySending,
    setCloseEmptyResult,
    showError,
    resetCloseEmptyFlow,
    setHomeAssetsForce,
  } = usePopupContext();
  const { locale } = useT();
  if (!wallet) return <></>;
  return (
    <>
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
                    setCloseEmptyResult(res.result as import("../shared/close-empty").CloseEmptyCommitResult);
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
    </>
  );
}
