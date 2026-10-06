import { sendExtensionRequest } from "../../shared/ext-api";
import type { WalletSendSettledNotice } from "../../shared/commands";
import type { HomeTokenRow } from "../home/home-tokens";
import { abortWalletSendOnPopupUnload, syncWalletSendAbortId } from "../components/ApprovalHost";
import { BACK_PARENT } from "../runtime";
import type { State, View } from "../types";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

const STORAGE_KEYS = [
  "airwave.accounts.v1",
  "airwave.activeAccountId.v1",
  "airwave.settings.v1",
  "airwave.connections.v1",
] as const;

type WalletMirror = {
  wallet: State | null;
};

type Action = { type: "setWallet"; wallet: State };

function reducer(state: WalletMirror, action: Action): WalletMirror {
  switch (action.type) {
    case "setWallet":
      return { wallet: action.wallet };
    default:
      return state;
  }
}

export function usePopupAppState() {
  const [mirror, dispatch] = useReducer(reducer, { wallet: null });
  const [currentView, setCurrentView] = useState<View>("home-token");
  const [detailTokenId, setDetailTokenId] = useState<string | null>(null);
  const [activeWalletSendRequestId, setActiveWalletSendRequestId] = useState<string | null>(null);
  const [homeTokenRows, setHomeTokenRows] = useState<HomeTokenRow[]>([]);
  const [focusAccountId, setFocusAccountId] = useState<string | null>(null);
  const [expandedTokenRowIds, setExpandedTokenRowIds] = useState<Set<string>>(() => new Set());
  const [homeAssetsForce, setHomeAssetsForce] = useState(false);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSeq, setNavSeq] = useState(0);
  const [pendingSendFormError, setPendingSendFormError] = useState<string | null>(null);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);

  const errorHideTimer = useRef<number | null>(null);
  const lastActiveAccountId = useRef<string | null>(null);
  const backOverrideRef = useRef<(() => boolean) | null>(null);

  const bagRef = useRef({
    currentView,
    detailTokenId,
    activeWalletSendRequestId,
    focusAccountId,
  });
  bagRef.current = {
    currentView,
    detailTokenId,
    activeWalletSendRequestId,
    focusAccountId,
  };

  const clearError = useCallback(() => {
    if (errorHideTimer.current != null) {
      window.clearTimeout(errorHideTimer.current);
      errorHideTimer.current = null;
    }
    setToast("");
  }, []);

  const showError = useCallback((msg: string) => {
    if (errorHideTimer.current != null) {
      window.clearTimeout(errorHideTimer.current);
      errorHideTimer.current = null;
    }
    setToast(msg);
    errorHideTimer.current = window.setTimeout(() => {
      errorHideTimer.current = null;
      setToast("");
    }, 4000);
  }, []);

  const refresh = useCallback(async (): Promise<State> => {
    const res = await sendExtensionRequest("wallet.getState");
    if (!res.ok) throw new Error(res.error?.message ?? "getState failed");
    const state = res.result as State;
    if (!state.connections) state.connections = [];
    dispatch({ type: "setWallet", wallet: state });
    return state;
  }, []);

  const setActiveWalletSendRequestIdTracked = useCallback((id: string | null) => {
    bagRef.current.activeWalletSendRequestId = id;
    syncWalletSendAbortId(id);
    setActiveWalletSendRequestId(id);
  }, []);

  const navigateTo = useCallback((next: View, accountId?: string) => {
    const current = bagRef.current.currentView;
    clearError();

    if (current !== next) {
      if (current === "send-approval" && next !== "send-approval" && bagRef.current.activeWalletSendRequestId) {
        abortWalletSendOnPopupUnload();
        bagRef.current.activeWalletSendRequestId = null;
        setActiveWalletSendRequestId(null);
      }
      if (current === "token-send" && next !== "token-send" && next !== "send-approval") {
        setPendingSendFormError(null);
      }
      if (next === "token-send" && current !== "token-send") {
        setPendingSendFormError(null);
      }
    }

    if (accountId !== undefined) {
      setFocusAccountId(accountId);
      bagRef.current.focusAccountId = accountId;
    }
    bagRef.current.currentView = next;
    setCurrentView(next);
    setMenuOpen(false);
    setNavSeq((n) => n + 1);
    setTitleOverride(null);
  }, [clearError]);

  const handleBack = useCallback(() => {
    if (backOverrideRef.current?.()) return;
    const view = bagRef.current.currentView;
    if (view === "token-detail") {
      setDetailTokenId(null);
      navigateTo("home-token");
      return;
    }
    navigateTo(BACK_PARENT[view] ?? "home-token");
  }, [navigateTo]);

  const setBackOverride = useCallback((fn: (() => boolean) | null) => {
    backOverrideRef.current = fn;
  }, []);

  const consumePendingSendFormError = useCallback(() => {
    setPendingSendFormError(null);
  }, []);

  useEffect(() => {
    syncWalletSendAbortId(activeWalletSendRequestId);
  }, [activeWalletSendRequestId]);

  useEffect(() => {
    const state = mirror.wallet;
    if (!state) return;
    if (state.vaultExists && !state.unlocked) {
      setMenuOpen(false);
      setDetailTokenId(null);
      setPendingSendFormError(null);
    }
    if (state.activeAccountId !== lastActiveAccountId.current) {
      lastActiveAccountId.current = state.activeAccountId;
      setHomeTokenRows([]);
      setExpandedTokenRowIds(new Set());
      setDetailTokenId(null);
      setPendingSendFormError(null);
      const view = bagRef.current.currentView;
      if (view === "token-send" || view === "token-detail") {
        navigateTo("home-token");
      }
    }
  }, [mirror.wallet, navigateTo]);

  useEffect(() => {
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (STORAGE_KEYS.some((k) => changes[k])) void refresh();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  useEffect(() => {
    const onSettled = (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const notice = message as WalletSendSettledNotice;
      if (notice.kind !== "airwave-wallet-send-settled") return;
      if (!bagRef.current.activeWalletSendRequestId || notice.requestId !== bagRef.current.activeWalletSendRequestId) {
        return;
      }
      if (notice.ok) return;
      const wasApproval = bagRef.current.currentView === "send-approval";
      setActiveWalletSendRequestId(null);
      bagRef.current.activeWalletSendRequestId = null;
      syncWalletSendAbortId(null);
      if (wasApproval) navigateTo("token-send");
      setPendingSendFormError(notice.error ?? "已取消");
    };
    chrome.runtime.onMessage.addListener(onSettled);

    const onUnload = () => abortWalletSendOnPopupUnload();
    const onPageHide = () => abortWalletSendOnPopupUnload();
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onPageHide);

    void refresh().catch((e) => {
      showError(String(e));
    });

    return () => {
      chrome.runtime.onMessage.removeListener(onSettled);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [navigateTo, refresh, showError]);

  return useMemo(
    () => ({
      wallet: mirror.wallet,
      currentView,
      detailTokenId,
      setDetailTokenId,
      activeWalletSendRequestId,
      setActiveWalletSendRequestId: setActiveWalletSendRequestIdTracked,
      homeTokenRows,
      setHomeTokenRows,
      focusAccountId,
      setFocusAccountId,
      expandedTokenRowIds,
      setExpandedTokenRowIds,
      homeAssetsForce,
      setHomeAssetsForce,
      toast,
      menuOpen,
      setMenuOpen,
      navSeq,
      titleOverride,
      setTitleOverride,
      pendingSendFormError,
      setPendingSendFormError,
      consumePendingSendFormError,
      navigateTo,
      handleBack,
      refresh,
      showError,
      clearError,
      setBackOverride,
    }),
    [
      mirror.wallet,
      currentView,
      detailTokenId,
      activeWalletSendRequestId,
      homeTokenRows,
      focusAccountId,
      expandedTokenRowIds,
      homeAssetsForce,
      toast,
      menuOpen,
      navSeq,
      titleOverride,
      pendingSendFormError,
      consumePendingSendFormError,
      navigateTo,
      handleBack,
      refresh,
      showError,
      clearError,
      setBackOverride,
      setActiveWalletSendRequestIdTracked,
    ],
  );
}

export type PopupAppState = ReturnType<typeof usePopupAppState>;
