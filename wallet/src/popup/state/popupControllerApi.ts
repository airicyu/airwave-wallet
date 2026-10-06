import type { State, View } from "../types";

export type PopupControllerApi = {
  wallet: State | null;
  currentView: View;
  tick: number;
  setCurrentView: (view: View) => void;
  refresh: () => Promise<State>;
  bump: () => void;
  getMirror: () => { wallet: State | null; currentView: View; tick: number };
};
