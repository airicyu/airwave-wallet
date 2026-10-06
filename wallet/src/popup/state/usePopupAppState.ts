import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { State, View } from "../types";
import { session } from "../lib/session";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { PopupControllerApi } from "./popupControllerApi";

const STORAGE_KEYS = [
  "airwave.accounts.v1",
  "airwave.activeAccountId.v1",
  "airwave.settings.v1",
  "airwave.connections.v1",
] as const;

type WalletMirror = {
  wallet: State | null;
  currentView: View;
  tick: number;
};

type Action =
  | { type: "setWallet"; wallet: State }
  | { type: "setView"; view: View }
  | { type: "tick" };

function reducer(state: WalletMirror, action: Action): WalletMirror {
  switch (action.type) {
    case "setWallet":
      return { ...state, wallet: action.wallet };
    case "setView":
      return { ...state, currentView: action.view };
    case "tick":
      return { ...state, tick: state.tick + 1 };
    default:
      return state;
  }
}

export function usePopupAppState(): PopupControllerApi {
  const [mirror, dispatch] = useReducer(reducer, {
    wallet: null,
    currentView: "home-token",
    tick: 0,
  });
  const mirrorRef = useRef(mirror);
  mirrorRef.current = mirror;

  const bump = useCallback(() => dispatch({ type: "tick" }), []);

  const setCurrentView = useCallback((view: View) => {
    session.currentView = view;
    dispatch({ type: "setView", view });
  }, []);

  const refresh = useCallback(async (): Promise<State> => {
    const res = await sendExtensionRequest("wallet.getState");
    if (!res.ok) throw new Error(res.error?.message ?? "getState failed");
    const state = res.result as State;
    if (!state.connections) state.connections = [];
    session.lastState = state;
    dispatch({ type: "setWallet", wallet: state });
    bump();
    return state;
  }, [bump]);

  useEffect(() => {
    session.currentView = mirror.currentView;
  }, [mirror.currentView]);

  useEffect(() => {
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (STORAGE_KEYS.some((k) => changes[k])) void refresh();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  return useMemo(
    () => ({
      wallet: mirror.wallet,
      currentView: mirror.currentView,
      tick: mirror.tick,
      setCurrentView,
      refresh,
      bump,
      getMirror: () => mirrorRef.current,
    }),
    [mirror.wallet, mirror.currentView, mirror.tick, setCurrentView, refresh, bump],
  );
}

export type PopupAppState = ReturnType<typeof usePopupAppState>;
