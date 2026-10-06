import type { SeedPathKind } from "../../shared/seed-derive";
import type { HomeTokenRow } from "../home/home-tokens";
import type { CombinedCreateState, State, View } from "../types";

export const session = {
  currentView: "home-token" as View,
  focusAccountId: null as string | null,
  menuOpen: false,
  revealedSecretInMemory: null as string | null,
  lastActiveAccountId: null as string | null,
  lastState: null as State | null,
  lastSuccessfulTokenRows: [] as HomeTokenRow[],
  homeAssetsRequestGen: 0,
  homeAssetsForce: false,
  expandedTokenRowIds: new Set<string>(),
  detailTokenId: null as string | null,
  activeWalletSendRequestId: null as string | null,
  generateSuccessPk: null as string | null,
  generateSeedWords: null as string[] | null,
  generateSeedPk: null as string | null,
  generateSeedBusy: false,
  generateLabel: "",
  generateErr: "",
  generateSeedLabel: "",
  generateSeedErr: "",
  importLabel: "",
  importSecret: "",
  importSecretErr: "",
  watchLabel: "",
  watchPk: "",
  watchErr: "",
  combinedLabel: "",
  combinedDraft: "",
  combinedErr: "",
  renameLabel: "",
  manageAddSubPk: "",
  revealPassword: "",
  revealHint: "",
  sendAmount: "",
  sendRecipient: "",
  sendFormError: "",
  changePwdCurrent: "",
  changePwdNew: "",
  changePwdConfirm: "",
  changePwdErr: "",
  heliusDraft: "",
  jupiterDraft: "",
  cuPriceDraft: "",
  setupPassword: "",
  setupPassword2: "",
  unlockPassword: "",
  importSeedWords: Array(12).fill("") as string[],
  importSeedStep: "words" as "words" | "pick",
  importSeedKind: "phantom" as SeedPathKind,
  importSeedCustomPath: "m/44'/501'/{n}'/0'",
  importSeedPathPreview: "",
  importSeedPreview: [] as { index: number; publicKeyBase58: string }[],
  importSeedSelected: null as number | null,
  importSeedBusy: false,
  importSeedPreviewGen: 0,
  importSeedErr: "",
  combinedCreate: {
    draftChips: [],
    pickedPks: new Set<string>(),
    currentMain: "",
  } as CombinedCreateState,
  rpcEditKey: null as string | null,
  rpcEditDraft: "",
  keysHeliusRevealed: false,
  keysJupiterRevealed: false,
  lastLegalDefaultCuPrice: 25_000,
  errorMessage: "",
};

type NavFn = (view: View, accountId?: string) => void;
let navigateImpl: NavFn | null = null;
let refreshImpl: (() => Promise<State>) | null = null;
let showErrorImpl: ((msg: string) => void) | null = null;
let clearErrorImpl: (() => void) | null = null;
let bumpImpl: (() => void) | null = null;

export function bindPopupShell(fns: {
  navigateTo: NavFn;
  refresh: () => Promise<State>;
  showError: (msg: string) => void;
  clearError: () => void;
  bump: () => void;
}): void {
  navigateImpl = fns.navigateTo;
  refreshImpl = fns.refresh;
  showErrorImpl = fns.showError;
  clearErrorImpl = fns.clearError;
  bumpImpl = fns.bump;
}

export function navigateTo(view: View, accountId?: string): void {
  navigateImpl!(view, accountId);
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

export function bumpUi(): void {
  bumpImpl?.();
}

/** @deprecated chrome is React-driven; kept so leftover calls still re-render */
export function applyViewChrome(): void {
  bumpUi();
}

/** @deprecated dock is React-driven */
export function syncShellDock(): void {
  bumpUi();
}
