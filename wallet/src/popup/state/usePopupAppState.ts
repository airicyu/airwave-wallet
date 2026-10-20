/**
 * Composes popup screen state from the wallet mirror, navigation, and close-empty hooks.
 * Does not paint screens or run in the service worker.
 */
import { sendExtensionRequest } from "../../shared/protocol";
import type { PendingRecord, WalletSendSettledNotice } from "../../shared/protocol";
import {
  DAPP_APPROVAL_IN_SHELL_MSG,
  type DappApprovalInShellNotice,
} from "../../shared/protocol";
import {
  flowPageIdFromKind,
  popFlow,
  popFlowByRequestId,
  pushFlow,
  rejectFlowPending,
  topFlow,
  type FlowEntry,
} from "../../flow";
import { walletShellSurfaceFromHref } from "../../shared/shell";
import type { HomeTokenRow } from "../home/home-tokens";
import { abortWalletSendOnPopupUnload, syncWalletSendAbortId } from "../components/ApprovalHost";
import { useCloseEmptyPopup } from "./useCloseEmptyPopup";
import { usePopupNavigation } from "./usePopupNavigation";
import {
  bindLastNormalWindowPush,
  bindWalletShellFocusHydrate,
  hydrateLastNormalWindowId,
} from "../shell/shell-bridge";
import { shouldShowRpcGuide } from "../lib/rpc-guide";
import type { State, View } from "../types";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

const STORAGE_KEYS = [
  "airwave.accounts.v1",
  "airwave.activeAccountId.v1",
  "airwave.settings.v1",
  "airwave.connections.v1",
  "airwave.addressBook.v1",
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
  const closeEmpty = useCloseEmptyPopup();
  const [detailTokenId, setDetailTokenId] = useState<string | null>(null);
  const [activeWalletSendRequestId, setActiveWalletSendRequestId] = useState<string | null>(null);
  const [flowStack, setFlowStack] = useState<FlowEntry[]>([]);
  const [homeTokenRows, setHomeTokenRows] = useState<HomeTokenRow[]>([]);
  const [focusAccountId, setFocusAccountId] = useState<string | null>(null);
  const [expandedTokenRowIds, setExpandedTokenRowIds] = useState<Set<string>>(() => new Set());
  const [homeAssetsForce, setHomeAssetsForce] = useState(false);
  const [closableScanGen, setClosableScanGen] = useState(0);
  const bumpClosableScan = useCallback(() => setClosableScanGen((g) => g + 1), []);
  const [toast, setToast] = useState("");
  const [toastVariant, setToastVariant] = useState<"error" | "warn">("error");
  const [pendingSendFormError, setPendingSendFormError] = useState<string | null>(null);
  const errorHideTimer = useRef<number | null>(null);
  const lastActiveAccountId = useRef<string | null>(null);

  const bagRef = useRef({
    currentView: "home-token" as View,
    detailTokenId,
    activeWalletSendRequestId,
    flowStack,
    focusAccountId,
  });

  const clearError = useCallback(() => {
    if (errorHideTimer.current != null) {
      window.clearTimeout(errorHideTimer.current);
      errorHideTimer.current = null;
    }
    setToast("");
    setToastVariant("error");
  }, []);

  const showToast = useCallback((msg: string, variant: "error" | "warn" = "error") => {
    if (errorHideTimer.current != null) {
      window.clearTimeout(errorHideTimer.current);
      errorHideTimer.current = null;
    }
    setToastVariant(variant);
    setToast(msg);
    errorHideTimer.current = window.setTimeout(() => {
      errorHideTimer.current = null;
      setToast("");
      setToastVariant("error");
    }, 4000);
  }, []);

  const showError = useCallback((msg: string) => showToast(msg, "error"), [showToast]);

  const refresh = useCallback(async (): Promise<State> => {
    const res = await sendExtensionRequest("wallet.getState");
    if (!res.ok) throw new Error(res.error?.message ?? "getState failed");
    const state = res.result as State;
    if (!state.connections) state.connections = [];
    if (!Array.isArray(state.addressBook)) state.addressBook = [];
    dispatch({ type: "setWallet", wallet: state });
    return state;
  }, []);

  const setActiveWalletSendRequestIdTracked = useCallback((id: string | null) => {
    bagRef.current.activeWalletSendRequestId = id;
    syncWalletSendAbortId(id);
    setActiveWalletSendRequestId(id);
  }, []);

  const {
    currentView,
    menuOpen,
    setMenuOpen,
    navSeq,
    titleOverride,
    setTitleOverride,
    navigateTo,
    handleBack,
    setBackOverride,
  } = usePopupNavigation({
    accountCount: mirror.wallet?.accounts.length ?? 0,
    clearError,
    setDetailTokenId,
    setFocusAccountId,
    setPendingSendFormError,
    setActiveWalletSendRequestId,
    bagRef,
    resetCloseEmptyFlow: closeEmpty.resetCloseEmptyFlow,
    clearCloseEmptyDraft: closeEmpty.clearCloseEmptyDraft,
  });
  bagRef.current = {
    currentView,
    detailTokenId,
    activeWalletSendRequestId,
    flowStack,
    focusAccountId,
  };

  const {
    closeEmptyEntries,
    setCloseEmptyEntries,
    closeEmptySelected,
    setCloseEmptySelected,
    closeEmptyPlan,
    setCloseEmptyPlan,
    closeEmptyResult,
    setCloseEmptyResult,
    closeEmptyStaleError,
    setCloseEmptyStaleError,
    closeEmptySending,
    setCloseEmptySending,
    clearCloseEmptyDraft,
    resetCloseEmptyFlow,
  } = closeEmpty;

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
      resetCloseEmptyFlow();
      const view = bagRef.current.currentView;
      if (view === "token-send" || view === "token-detail") {
        navigateTo("home-token");
      }
      if (view.startsWith("close-empty")) {
        navigateTo("home-token");
      }
    }
    if (state.vaultExists && !state.unlocked) {
      clearCloseEmptyDraft();
    }
    if (state.vaultExists && state.unlocked && shouldShowRpcGuide(state)) {
      const view = bagRef.current.currentView;
      if (view !== "rpc-guide") navigateTo("rpc-guide");
    }
  }, [mirror.wallet, navigateTo, clearCloseEmptyDraft]);

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
      setPendingSendFormError(notice.error ?? "CANCELLED");
    };
    const openSidebarFlow = (requestId: string) => {
      if (walletShellSurfaceFromHref(window.location.href) !== "sidebar") return;
      void (async () => {
        const res = await sendExtensionRequest("ui.getPending", { requestId });
        if (!res.ok) return;
        const pageId = flowPageIdFromKind((res.result as PendingRecord).kind);
        if (!pageId) return;
        setFlowStack((prev) => {
          const top = topFlow(prev);
          if (top && top.requestId !== requestId) rejectFlowPending(top.requestId);
          return pushFlow(prev, { pageId, requestId });
        });
        setMenuOpen(false);
        setTitleOverride(null);
      })();
    };

    const onDappApproval = (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const notice = message as DappApprovalInShellNotice;
      if (notice.kind !== DAPP_APPROVAL_IN_SHELL_MSG) return;
      openSidebarFlow(notice.requestId);
    };

    const hydrateSidebarDappApproval = async () => {
      if (walletShellSurfaceFromHref(window.location.href) !== "sidebar") return;
      const res = await sendExtensionRequest("shell.getSidebarDappApproval");
      if (!res.ok || !res.result || typeof res.result !== "object") return;
      const requestId = (res.result as { requestId?: string | null }).requestId;
      if (!requestId) return;
      openSidebarFlow(requestId);
    };

    chrome.runtime.onMessage.addListener(onSettled);
    chrome.runtime.onMessage.addListener(onDappApproval);

    const onUnload = () => {
      abortWalletSendOnPopupUnload();
    };
    const onPageHide = () => {
      abortWalletSendOnPopupUnload();
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onPageHide);

    void refresh().catch((e) => {
      showError(String(e));
    });

    void hydrateLastNormalWindowId();
    void hydrateSidebarDappApproval();
    const unbindShell = bindLastNormalWindowPush();
    const unbindFocusHydrate = bindWalletShellFocusHydrate();

    return () => {
      unbindFocusHydrate();
      unbindShell();
      chrome.runtime.onMessage.removeListener(onSettled);
      chrome.runtime.onMessage.removeListener(onDappApproval);
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
      flowStack,
      finishFlowPage: (requestId?: string) => {
        setFlowStack((prev) =>
          requestId ? popFlowByRequestId(prev, requestId) : popFlow(prev),
        );
      },
      homeTokenRows,
      setHomeTokenRows,
      focusAccountId,
      setFocusAccountId,
      expandedTokenRowIds,
      setExpandedTokenRowIds,
      homeAssetsForce,
      setHomeAssetsForce,
      closableScanGen,
      bumpClosableScan,
      toast,
      toastVariant,
      showToast,
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
      closeEmptyEntries,
      setCloseEmptyEntries,
      closeEmptySelected,
      setCloseEmptySelected,
      closeEmptyPlan,
      setCloseEmptyPlan,
      closeEmptyResult,
      setCloseEmptyResult,
      closeEmptyStaleError,
      setCloseEmptyStaleError,
      closeEmptySending,
      setCloseEmptySending,
      clearCloseEmptyDraft,
      resetCloseEmptyFlow,
    }),
    [
      mirror.wallet,
      currentView,
      detailTokenId,
      activeWalletSendRequestId,
      flowStack,
      homeTokenRows,
      focusAccountId,
      expandedTokenRowIds,
      homeAssetsForce,
      closableScanGen,
      bumpClosableScan,
      toast,
      toastVariant,
      showToast,
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
      closeEmptyEntries,
      closeEmptyPlan,
      closeEmptyResult,
      closeEmptyStaleError,
      closeEmptySending,
      clearCloseEmptyDraft,
      resetCloseEmptyFlow,
      closeEmptySelected,
    ],
  );
}

export type PopupAppState = ReturnType<typeof usePopupAppState>;
