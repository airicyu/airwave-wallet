/**
 * Binds and disposes the approval shell session against React-owned DOM refs.
 * Does not render markup; delegates to flow, events, and sign-tx modules.
 */
import { STORAGE, type Settings } from "../../shared/protocol";
import { parseUiLocale } from "../../shared/i18n";
import { stopTxAiWatch } from "../tx-ai-widget";
import type { ApprovalShellConfig, ApprovalShellDomRefs } from "./types";
import {
  assignShellDomRefs,
  resetShellSessionState,
  sess,
} from "./session";
import { resetSendStatusUiForNewReview } from "../dom/send-status";
import { hideAll, isSendStatusLocked, setSignButtons } from "./dom";
import { applyShellLocaleToStaticChrome, loadShellLocale, tr } from "./locale";
import { unwireShellEvents, wireShellEvents } from "./events";
import { loadPending, resolvePending } from "./flow";
import { isSignTxKind } from "./kinds";
import {
  applyApproveFromSimulation,
  renderSignTransactionBody,
  resetSignTxSession,
  runSimulation,
} from "./sign-tx";

export type { ApprovalShellCallbacks, ApprovalShellConfig, ApprovalShellDomRefs } from "./types";

let settingsChangeListener: ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void) | null =
  null;

function wireSessionActions(): void {
  sess.onRunSimulation = () => void runSimulation();
  sess.onApplyApproveFromSimulation = applyApproveFromSimulation;
  sess.onResolve = resolvePending;
  sess.onRestoreWalletSendReview = () => {
    if (sess.lastSim) {
      renderSignTransactionBody(sess.lastSim, false);
      applyApproveFromSimulation(sess.lastSim);
    } else {
      renderSignTransactionBody(null, true);
      setSignButtons({ reject: false, approve: true, approveLabel: tr("approval.approve") });
    }
  };
}

/** Unbind listeners and session state. Does not clear sign-body DOM (stacked sidebar layers keep their paint). */
function disposeApprovalShellRuntime(): void {
  stopTxAiWatch();
  resetSignTxSession();
  unwireShellEvents();
  sess.shellDomBound = false;
  if (sess.expiryTimer != null) {
    window.clearTimeout(sess.expiryTimer);
    sess.expiryTimer = null;
  }
  if (settingsChangeListener) {
    chrome.storage.onChanged.removeListener(settingsChangeListener);
    settingsChangeListener = null;
  }
  resetShellSessionState();
}

/** Binds the approval shell runtime to React-owned DOM refs. Returns dispose. */
export function bindApprovalShell(refs: ApprovalShellDomRefs, config: ApprovalShellConfig): () => void {
  disposeApprovalShellRuntime();
  assignShellDomRefs(refs);
  resetSendStatusUiForNewReview();
  sess.shellConfig = config;
  sess.requestId = config.requestId;
  sess.mountRoot = refs.viewSign.parentElement;
  sess.requestEnded = false;
  sess.sendStatusPhase = "idle";
  sess.shellDomBound = true;
  wireSessionActions();

  hideAll();
  wireShellEvents();
  void loadShellLocale().then(() => {
    applyShellLocaleToStaticChrome();
  });
  settingsChangeListener = (changes, area) => {
    if (area !== "local" || !(STORAGE.settings in changes)) return;
    const settings = changes[STORAGE.settings].newValue as Settings | undefined;
    sess.shellLocale = parseUiLocale(settings?.locale);
    applyShellLocaleToStaticChrome();
    if (!sess.viewSign.hidden && sess.pending && isSignTxKind(sess.pending.kind) && !isSendStatusLocked()) {
      renderSignTransactionBody(sess.lastSim, sess.simulating);
    }
  };
  chrome.storage.onChanged.addListener(settingsChangeListener);
  void loadPending();

  return disposeApprovalShellRuntime;
}
