/**
 * Popup view, menu, and back navigation.
 * Does not mirror chrome.storage or own close-empty drafts.
 */
import { useCallback, useRef, useState, type MutableRefObject } from "react";
import { abortWalletSendOnPopupUnload } from "../components/ApprovalHost";
import { BACK_PARENT } from "../runtime";
import { noteCombinedCreateNavigation } from "../accounts/combined-logic";
import { clearSendDraft } from "../send/send-draft";
import type { View } from "../types";

type NavBag = {
  currentView: View;
  activeWalletSendRequestId: string | null;
  focusAccountId: string | null;
};

export function usePopupNavigation(deps: {
  accountCount: number;
  clearError: () => void;
  setDetailTokenId: (id: string | null) => void;
  setFocusAccountId: (id: string | null) => void;
  setPendingSendFormError: (value: string | null) => void;
  setActiveWalletSendRequestId: (id: string | null) => void;
  bagRef: MutableRefObject<NavBag>;
  resetCloseEmptyFlow: () => void;
  clearCloseEmptyDraft: () => void;
}) {
  const [currentView, setCurrentView] = useState<View>("home-token");
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSeq, setNavSeq] = useState(0);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const backOverrideRef = useRef<(() => boolean) | null>(null);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const navigateTo = useCallback((next: View, accountId?: string) => {
    const d = depsRef.current;
    const current = d.bagRef.current.currentView;
    d.clearError();

    if (current !== next) {
      if (current === "send-approval" && next !== "send-approval" && d.bagRef.current.activeWalletSendRequestId) {
        abortWalletSendOnPopupUnload();
        d.bagRef.current.activeWalletSendRequestId = null;
        d.setActiveWalletSendRequestId(null);
      }
      if (current === "token-send" && next !== "token-send" && next !== "send-approval") {
        d.setPendingSendFormError(null);
      }
      const sendFlow = current === "token-send" || current === "send-pick" || current === "send-approval";
      const stayInSend = next === "token-send" || next === "send-pick" || next === "send-approval";
      if (sendFlow && !stayInSend) clearSendDraft();
      noteCombinedCreateNavigation(current, next);
      if (next === "token-send" && current !== "token-send") {
        d.setPendingSendFormError(null);
      }
    }

    if (accountId !== undefined) {
      d.setFocusAccountId(accountId);
      d.bagRef.current.focusAccountId = accountId;
    }
    d.bagRef.current.currentView = next;
    setCurrentView(next);
    setMenuOpen(false);
    setNavSeq((n) => n + 1);
    setTitleOverride(null);
  }, []);

  const handleBack = useCallback(() => {
    const d = depsRef.current;
    if (backOverrideRef.current?.()) return;
    const view = d.bagRef.current.currentView;
    if (view === "close-empty-sending") return;
    if (view === "rpc-guide") return;
    if (view === "settings-rpc" && d.accountCount === 0) {
      navigateTo("add-account");
      return;
    }
    if (view === "close-empty-pick") {
      d.resetCloseEmptyFlow();
    }
    if (view === "close-empty-confirm") {
      d.clearCloseEmptyDraft();
    }
    if (view === "token-detail") {
      d.setDetailTokenId(null);
      navigateTo("home-token");
      return;
    }
    navigateTo(BACK_PARENT[view] ?? "home-token");
  }, [navigateTo]);

  const setBackOverride = useCallback((fn: (() => boolean) | null) => {
    backOverrideRef.current = fn;
  }, []);

  return {
    currentView,
    setCurrentView,
    menuOpen,
    setMenuOpen,
    navSeq,
    titleOverride,
    setTitleOverride,
    navigateTo,
    handleBack,
    setBackOverride,
  };
}
