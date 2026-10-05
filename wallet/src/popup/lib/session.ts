import type { SeedPathKind } from "../../shared/seed-derive";
import type { HomeTokenRow } from "../home";
import type { CombinedCreateState, State, View } from "../types";

export const session = {
  currentView: "home-token" as View,
  focusAccountId: null as string | null,
  menuOpen: false,
  revealedSecretInMemory: null as string | null,
  lastActiveAccountId: null as string | null,
  lastSettingsRpc: "",
  lastSettingsFingerprint: "",
  lastState: null as State | null,
  lastSuccessfulTokenRows: [] as HomeTokenRow[],
  homeAssetsRefreshTimer: null as ReturnType<typeof setTimeout> | null,
  homeAssetsRequestGen: 0,
  expandedTokenRowIds: new Set<string>(),
  detailTokenId: null as string | null,
  activeWalletSendRequestId: null as string | null,
  generateSuccessPk: null as string | null,
  generateSeedWords: null as string[] | null,
  generateSeedPk: null as string | null,
  generateSeedBusy: false,
  importSeedWords: Array(12).fill("") as string[],
  importSeedStep: "words" as "words" | "pick",
  importSeedKind: "phantom" as SeedPathKind,
  importSeedCustomPath: "m/44'/501'/{n}'/0'",
  importSeedPathPreview: "",
  importSeedPreview: [] as { index: number; publicKeyBase58: string }[],
  importSeedSelected: null as number | null,
  importSeedBusy: false,
  importSeedPreviewGen: 0,
  combinedCreate: {
    draftChips: [],
    pickedPks: new Set<string>(),
    currentMain: "",
  } as CombinedCreateState,
  rpcEditKey: null as string | null,
  keysHeliusRevealed: false,
  keysJupiterRevealed: false,
  lastLegalDefaultCuPrice: 25_000,
};

type NavFn = (view: View, accountId?: string) => void;
let navigateImpl: NavFn | null = null;
let applyChromeImpl: (() => void) | null = null;
let syncDockImpl: (() => void) | null = null;
let refreshImpl: (() => Promise<State>) | null = null;
let showErrorImpl: ((msg: string) => void) | null = null;
let clearErrorImpl: (() => void) | null = null;

export function bindPopupShell(fns: {
  navigateTo: NavFn;
  applyViewChrome: () => void;
  syncShellDock: () => void;
  refresh: () => Promise<State>;
  showError: (msg: string) => void;
  clearError: () => void;
}): void {
  navigateImpl = fns.navigateTo;
  applyChromeImpl = fns.applyViewChrome;
  syncDockImpl = fns.syncShellDock;
  refreshImpl = fns.refresh;
  showErrorImpl = fns.showError;
  clearErrorImpl = fns.clearError;
}

export function navigateTo(view: View, accountId?: string): void {
  navigateImpl!(view, accountId);
}

export function applyViewChrome(): void {
  applyChromeImpl!();
}

export function syncShellDock(): void {
  syncDockImpl!();
}

export function refresh(): Promise<State> {
  return refreshImpl!();
}

export function showError(msg: string): void {
  showErrorImpl!(msg);
}

export function clearError(): void {
  clearErrorImpl!();
}
