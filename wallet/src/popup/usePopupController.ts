import { useEffect, useRef } from "react";
import type { PopupControllerApi } from "./state/popupControllerApi";
import type { WalletSendSettledNotice } from "../shared/commands";
import { abortWalletSendOnPopupUnload } from "./components/ApprovalHost";
import { navigateTo, session } from "./lib/session";
import { bindPopupRuntime, clearChangePasswordFields, clearRevealSecret } from "./runtime";
import { resetImportSeedFlow } from "./onboarding/import-seed-flow";

export function usePopupController(api: PopupControllerApi): void {
  const apiRef = useRef(api);
  apiRef.current = api;
  bindPopupRuntime(api);

  useEffect(() => {
    const onSettled = (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const notice = message as WalletSendSettledNotice;
      if (notice.kind !== "airwave-wallet-send-settled") return;
      if (!session.activeWalletSendRequestId || notice.requestId !== session.activeWalletSendRequestId) return;
      if (notice.ok) return;
      const wasApproval = session.currentView === "send-approval";
      session.activeWalletSendRequestId = null;
      if (wasApproval) navigateTo("token-send");
      session.sendFormError = notice.error ?? "已取消";
      apiRef.current.bump();
    };
    chrome.runtime.onMessage.addListener(onSettled);

    const onUnload = () => abortWalletSendOnPopupUnload();
    const onPageHide = () => {
      abortWalletSendOnPopupUnload();
      clearRevealSecret();
      clearChangePasswordFields();
      if (session.currentView === "add-import-seed") resetImportSeedFlow();
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onPageHide);

    void apiRef.current.refresh().catch((e) => {
      session.errorMessage = String(e);
      apiRef.current.bump();
    });

    return () => {
      chrome.runtime.onMessage.removeListener(onSettled);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);
}
