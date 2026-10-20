/**
 * Mutable approval-shell session: DOM refs, pending/sim state, and late-bound action hooks.
 * Does not load pending or wire event listeners.
 */
import { DEFAULT_UI_LOCALE, type UiLocale } from "../../shared/i18n";
import type { MessageKey } from "../../shared/i18n";
import type { PendingRecord } from "../../shared/protocol";
import type { SimulatePendingTxResult } from "../../shared/tx";
import type { ApprovalShellConfig, ApprovalShellDomRefs } from "./types";

export type SendStatusPhase = "idle" | "pending" | "confirmed" | "failed";

export type ShellSession = {
  shellLocale: UiLocale;
  shellTitleKey: MessageKey | null;
  shellConfig: ApprovalShellConfig | null;
  requestId: string | null;
  mountRoot: ParentNode | null;
  shellDomBound: boolean;

  viewUnlock: HTMLElement;
  viewGone: HTMLElement;
  goneTitle: HTMLElement;
  goneLead: HTMLElement;
  siteLabel: HTMLElement;
  viewSign: HTMLElement;
  unlockPassword: HTMLInputElement;
  unlockError: HTMLElement;
  btnUnlock: HTMLElement;
  signOrigin: HTMLElement;
  signBody: HTMLElement;
  signError: HTMLElement;
  signPageTitle: HTMLElement;
  signAvatar: HTMLElement;
  signLabel: HTMLElement;
  signAddr: HTMLElement;
  btnCopyPk: HTMLElement;
  btnCopySite: HTMLButtonElement | null;
  signReject: HTMLButtonElement;
  signApprove: HTMLButtonElement;
  signDock: HTMLElement;
  btnCloseExpired: HTMLElement;

  pending: PendingRecord | null;
  frozenPk: string;
  resolving: boolean;
  approveHoldTimer: ReturnType<typeof setTimeout> | null;
  lastSim: SimulatePendingTxResult | null;
  simulating: boolean;
  txRawHex: string;
  simGen: number;
  lastAcceptedSimSeq: number;
  localCuLimit: number | null;
  localCuPrice: number | null;
  cuUserOverride: boolean;
  txCuEditable: boolean;
  cuDirty: boolean;
  draftLimitStr: string;
  draftPriceStr: string;
  cuApplyBusy: boolean;
  feeDetailsOpen: boolean;
  signTxBodyReady: boolean;
  feeFrozenForSim: boolean;
  feeBreakdownReady: boolean;
  txDetailsReady: boolean;
  lastDeltaFingerprint: string;
  lastDeltaPaintFingerprint: string;
  pendingOriginFull: string;
  sendStatusPhase: SendStatusPhase;
  confirmedTimer: ReturnType<typeof setTimeout> | null;
  requestEnded: boolean;
  expiryTimer: number | null;

  onRunSimulation: (() => void) | null;
  onApplyApproveFromSimulation: ((sim: SimulatePendingTxResult | null) => void) | null;
  onRestoreWalletSendReview: (() => void) | null;
  onResolve: ((decision: "approve" | "reject") => Promise<void>) | null;
};

function emptyDom(): HTMLElement {
  return null as unknown as HTMLElement;
}

export const sess: ShellSession = {
  shellLocale: DEFAULT_UI_LOCALE,
  shellTitleKey: null,
  shellConfig: null,
  requestId: null,
  mountRoot: null,
  shellDomBound: false,

  viewUnlock: emptyDom(),
  viewGone: emptyDom(),
  goneTitle: emptyDom(),
  goneLead: emptyDom(),
  siteLabel: emptyDom(),
  viewSign: emptyDom(),
  unlockPassword: emptyDom() as HTMLInputElement,
  unlockError: emptyDom(),
  btnUnlock: emptyDom(),
  signOrigin: emptyDom(),
  signBody: emptyDom(),
  signError: emptyDom(),
  signPageTitle: emptyDom(),
  signAvatar: emptyDom(),
  signLabel: emptyDom(),
  signAddr: emptyDom(),
  btnCopyPk: emptyDom(),
  btnCopySite: null,
  signReject: emptyDom() as HTMLButtonElement,
  signApprove: emptyDom() as HTMLButtonElement,
  signDock: emptyDom(),
  btnCloseExpired: emptyDom(),

  pending: null,
  frozenPk: "",
  resolving: false,
  approveHoldTimer: null,
  lastSim: null,
  simulating: false,
  txRawHex: "",
  simGen: 0,
  lastAcceptedSimSeq: 0,
  localCuLimit: null,
  localCuPrice: null,
  cuUserOverride: false,
  txCuEditable: false,
  cuDirty: false,
  draftLimitStr: "",
  draftPriceStr: "",
  cuApplyBusy: false,
  feeDetailsOpen: false,
  signTxBodyReady: false,
  feeFrozenForSim: false,
  feeBreakdownReady: false,
  txDetailsReady: false,
  lastDeltaFingerprint: "",
  lastDeltaPaintFingerprint: "",
  pendingOriginFull: "",
  sendStatusPhase: "idle",
  confirmedTimer: null,
  requestEnded: false,
  expiryTimer: null,

  onRunSimulation: null,
  onApplyApproveFromSimulation: null,
  onRestoreWalletSendReview: null,
  onResolve: null,
};

export function assignShellDomRefs(refs: ApprovalShellDomRefs): void {
  sess.viewUnlock = refs.viewUnlock;
  sess.viewGone = refs.viewGone;
  sess.goneTitle = refs.goneTitle;
  sess.goneLead = refs.goneLead;
  sess.viewSign = refs.viewSign;
  sess.unlockPassword = refs.unlockPassword;
  sess.unlockError = refs.unlockError;
  sess.btnUnlock = refs.btnUnlock;
  sess.signOrigin = refs.signOrigin;
  sess.signBody = refs.signBody;
  sess.signError = refs.signError;
  sess.signPageTitle = refs.signPageTitle;
  sess.signAvatar = refs.signAvatar;
  sess.signLabel = refs.signLabel;
  sess.signAddr = refs.signAddr;
  sess.btnCopyPk = refs.btnCopyPk;
  sess.btnCopySite = refs.btnCopySite;
  sess.signReject = refs.signReject;
  sess.signApprove = refs.signApprove;
  sess.signDock = refs.signDock;
  sess.btnCloseExpired = refs.btnCloseExpired;
  sess.siteLabel = sess.viewSign.querySelector(".site-label") as HTMLElement;
}

export function resetShellSessionState(): void {
  sess.shellConfig = null;
  sess.shellTitleKey = null;
  sess.requestId = null;
  sess.mountRoot = null;
  sess.pending = null;
  sess.frozenPk = "";
  sess.resolving = false;
  sess.requestEnded = false;
  sess.sendStatusPhase = "idle";
  sess.lastSim = null;
  sess.simulating = false;
  sess.txRawHex = "";
  sess.simGen = 0;
  sess.lastAcceptedSimSeq = 0;
  sess.localCuLimit = null;
  sess.localCuPrice = null;
  sess.cuUserOverride = false;
  sess.txCuEditable = false;
  sess.cuDirty = false;
  sess.draftLimitStr = "";
  sess.draftPriceStr = "";
  sess.cuApplyBusy = false;
  sess.feeDetailsOpen = false;
  sess.signTxBodyReady = false;
  sess.feeFrozenForSim = false;
  sess.feeBreakdownReady = false;
  sess.txDetailsReady = false;
  sess.lastDeltaFingerprint = "";
  sess.lastDeltaPaintFingerprint = "";
  sess.onRunSimulation = null;
  sess.onApplyApproveFromSimulation = null;
  sess.onRestoreWalletSendReview = null;
  sess.onResolve = null;
}
