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
