/**
 * React context for the popup app state. Screens under App read it with usePopupContext.
 * The hook throws when a screen renders outside PopupProvider.
 * usePopupAppState builds the state object. This file only passes it down.
 */
import { createContext, useContext } from "react";
import type { JSX, ReactNode } from "react";
import type { PopupAppState } from "./usePopupAppState";

const PopupContext = createContext<PopupAppState | null>(null);

export function PopupProvider({
  value,
  children,
}: {
  value: PopupAppState;
  children: ReactNode;
}): JSX.Element {
  return <PopupContext.Provider value={value}>{children}</PopupContext.Provider>;
}

export function usePopupContext(): PopupAppState {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error("usePopupContext outside PopupProvider");
  return ctx;
}
