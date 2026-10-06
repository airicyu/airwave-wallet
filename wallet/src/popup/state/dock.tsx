import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { JSX, ReactNode } from "react";

export type DockRegistration = {
  label: string;
  disabled: boolean;
  onPrimary: () => void | Promise<void>;
};

type DockCtx = {
  dock: DockRegistration | null;
  setDock: (d: DockRegistration | null) => void;
};

const DockContext = createContext<DockCtx | null>(null);

export function DockProvider({ children }: { children: ReactNode }): JSX.Element {
  const [dock, setDockState] = useState<DockRegistration | null>(null);
  const setDock = useCallback((d: DockRegistration | null) => setDockState(d), []);
  const value = useMemo(() => ({ dock, setDock }), [dock, setDock]);
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useDock(): DockCtx {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error("useDock outside DockProvider");
  return ctx;
}

export function useRegisterDock(spec: DockRegistration | null): void {
  const { setDock } = useDock();
  const label = spec?.label ?? "";
  const disabled = spec?.disabled ?? true;
  const onPrimary = spec?.onPrimary;
  const active = spec != null;
  useEffect(() => {
    if (!active || !onPrimary) {
      setDock(null);
      return () => setDock(null);
    }
    setDock({ label, disabled, onPrimary });
    return () => setDock(null);
  }, [active, label, disabled, onPrimary, setDock]);
}
