/**
 * Approval shell pending load, sign view render, and resolve/approve flow.
 * Does not wire DOM listeners or bind React refs.
 */
import { sendExtensionRequest } from "../../shared/protocol";
import type { PendingRecord } from "../../shared/protocol";
import { accountVisualKind, paintAccountKindMark } from "../../shared/marks";
import { attachTxAiToSignShell } from "../tx-ai-widget";
import { bytesFromSignMessage, bytesFromSignTransaction, displayAccountName, displayOrigin, hexCompact } from "../format";
import { renderSignMessageBody } from "../dom/sign-message";
import { sess } from "./session";
import {
  closeHost,
  hideAll,
  isSendStatusLocked,
  setSendStatusChrome,
  setSignButtons,
  setSignClusterStrip,
  walletSendRejectExit,
} from "./dom";
import { armExpiry, showGone } from "./gone";
import {
  accountMetaForPending,
  exposedPk,
  isBroadcastAfterApproveKind,
  isSignTxKind,
} from "./kinds";
import { setPopoutWindowTitle, tr, progressUserMessage } from "./locale";
import {
  applyApproveFromSimulation,
  renderSignTransactionBody,
  resetSignTxSession,
  runSimulation,
  startSignTxAutoSim,
} from "./sign-tx";
import { startBlockhashProbeOnce } from "./blockhash-probe";
import {
  enterWalletSendConfirming,
  enterWalletSendConfirmedPage,
  enterWalletSendFailedPage,
  resetSendStatusUiForNewReview,
} from "../dom/send-status";

function clearApproveHold(): void {
  if (sess.approveHoldTimer != null) {
    clearTimeout(sess.approveHoldTimer);
    sess.approveHoldTimer = null;
  }
}

function startApproveHold(): void {
  clearApproveHold();
  setSignButtons({ approve: true });
  sess.approveHoldTimer = setTimeout(() => {
    sess.approveHoldTimer = null;
    if (!sess.pending || sess.resolving) return;
    if (sess.pending.kind === "signMessage" && sess.pending.messageLooksLikeTx) return;
    if (isSignTxKind(sess.pending.kind)) {
      applyApproveFromSimulation(sess.lastSim);
      return;
    }
    if (sess.pending.kind === "signMessage" && !sess.pending.messageLooksLikeTx) {
      setSignButtons({ approve: false });
    }
  }, 700);
}

export function showUnlockScreen(): void {
  hideAll();
  setPopoutWindowTitle("window.title.approval");
  const becameVisible = sess.viewUnlock.hidden;
  sess.viewUnlock.hidden = false;
  sess.unlockPassword.value = "";
  sess.unlockError.hidden = true;
  sess.unlockError.textContent = "";
  if (becameVisible) sess.unlockPassword.focus();
}

async function showConnectOrFinishReconnect(): Promise<void> {
  if (!sess.pending || sess.pending.kind !== "connect") return;
  if (sess.pending.reconnectWhileLocked) {
    await resolvePending("approve");
    return;
  }
  closeHost();
}

async function refreshAfterUnlock(holdAfterUnlock: boolean): Promise<void> {
  if (!sess.pending) return;
  if (sess.pending.kind === "connect") {
    await showConnectOrFinishReconnect();
    return;
  }
  if (sess.pending.kind === "signMessage") {
    await renderSignShell(sess.pending, holdAfterUnlock, "signMessage");
  } else if (isSignTxKind(sess.pending.kind)) {
    await renderSignShell(sess.pending, holdAfterUnlock, "signTransaction");
  }
}

async function renderSignShell(
  p: PendingRecord,
  holdAfterUnlock: boolean,
  mode: "signMessage" | "signTransaction",
): Promise<void> {
  if (!isBroadcastAfterApproveKind(p.kind)) {
    resetSendStatusUiForNewReview();
  } else if (isSendStatusLocked()) {
    return;
  }

  const stateRes = await sendExtensionRequest("wallet.getState", {});
  if (isSendStatusLocked() || sess.requestEnded) return;
  hideAll();
  setSendStatusChrome(false);
  const pageTitle = mode === "signTransaction" ? tr("approval.signTx") : tr("approval.signMsg");
  setPopoutWindowTitle(mode === "signTransaction" ? "approval.signTx" : "approval.signMsg");
  sess.signPageTitle.textContent = pageTitle;
  sess.viewSign.hidden = false;
  sess.signDock.hidden = false;
  setSignButtons({ approveLabel: tr("approval.approve") });

  if (!stateRes.ok) {
    sess.signBody.innerHTML = "";
    const err = document.createElement("p");
    err.className = "warn-line";
    err.textContent = tr("error.code.ACCOUNTS_LOAD_FAILED");
    sess.signBody.appendChild(err);
    setSignButtons({ reject: false, approve: true });
    return;
  }

  const state = stateRes.result as {
    accounts: import("../../shared/protocol").AccountMeta[];
    unlocked: boolean;
    settings: { cluster: "devnet" | "mainnet" };
  };

  if (!state.unlocked) {
    showUnlockScreen();
    return;
  }

  sess.pendingOriginFull = p.origin;
  sess.signOrigin.textContent = displayOrigin(p.origin);
  const meta = accountMetaForPending(state.accounts, p.signAccountId);
  if (!meta) {
    sess.signBody.innerHTML = "";
    const err = document.createElement("p");
    err.className = "warn-line";
    err.textContent = tr("approval.accountMissing");
    sess.signBody.appendChild(err);
    setSignButtons({ reject: false, approve: true });
    return;
  }

  sess.frozenPk = exposedPk(meta);
  const name = displayAccountName(meta.label, sess.frozenPk);
  paintAccountKindMark(sess.signAvatar, accountVisualKind(meta));
  sess.signLabel.textContent = name;
  sess.signAddr.textContent = "";

  sess.settingsCluster = state.settings.cluster;
  setSignClusterStrip(mode === "signTransaction" && state.settings.cluster === "devnet");

  if (mode === "signMessage") {
    renderSignMessageBody(p, bytesFromSignMessage(p));
  } else {
    sess.txRawHex = hexCompact(bytesFromSignTransaction(p));
    sess.lastSim = null;
    sess.localCuLimit = null;
    sess.localCuPrice = null;
    sess.cuUserOverride = false;
    sess.txCuEditable = false;
    sess.lastAcceptedSimSeq = 0;
    sess.cuDirty = false;
    sess.draftLimitStr = "";
    sess.draftPriceStr = "";
    sess.cuApplyBusy = false;
    sess.feeDetailsOpen = false;
    resetSignTxSession();
    renderSignTransactionBody(null, true);
    if (sess.requestId) attachTxAiToSignShell(sess.viewSign, sess.requestId, sess.shellLocale);
    startBlockhashProbeOnce();
    startSignTxAutoSim();
    void runSimulation();
  }

  setSignButtons({ reject: false });
  if (holdAfterUnlock) {
    if (mode === "signMessage" && !p.messageLooksLikeTx) {
      startApproveHold();
    } else if (mode === "signTransaction") {
      startApproveHold();
    }
  } else if (mode === "signMessage" && sess.approveHoldTimer == null && !p.messageLooksLikeTx) {
    setSignButtons({ approve: false });
  }
}

export async function loadPending(): Promise<void> {
  const mountedId = sess.requestId;
  if (!mountedId) {
    showGone();
    closeHost();
    return;
  }
  const res = await sendExtensionRequest("ui.getPending", { requestId: mountedId });
  if (isSendStatusLocked() || sess.requestId !== mountedId || sess.requestEnded) return;
  if (!res.ok) {
    showGone();
    closeHost();
    return;
  }
  sess.pending = res.result as PendingRecord;
  armExpiry(sess.pending.createdAt);
  if (isSendStatusLocked() || sess.requestEnded || sess.requestId !== mountedId) return;

  const stateRes = await sendExtensionRequest("wallet.getState", {});
  if (isSendStatusLocked() || sess.requestId !== mountedId || sess.requestEnded) return;
  if (!stateRes.ok) {
    showGone();
    return;
  }
  const state = stateRes.result as { unlocked: boolean };
  if (!state.unlocked) {
    showUnlockScreen();
    return;
  }

  if (sess.pending.kind === "connect") {
    await showConnectOrFinishReconnect();
    return;
  }

  if (sess.pending.kind === "signMessage") {
    await renderSignShell(sess.pending, false, "signMessage");
  } else if (isSignTxKind(sess.pending.kind)) {
    await renderSignShell(sess.pending, false, "signTransaction");
  }
}

export async function resolvePending(decision: "approve" | "reject"): Promise<void> {
  if (!sess.requestId || sess.resolving) return;
  if (
    decision === "approve" &&
    sess.pending &&
    isSignTxKind(sess.pending.kind) &&
    (sess.cuDirty || sess.cuApplyBusy)
  ) {
    return;
  }
  sess.resolving = true;
  if (sess.pending && isBroadcastAfterApproveKind(sess.pending.kind) && decision === "approve") {
    enterWalletSendConfirming();
  } else if (
    decision === "approve" &&
    (sess.pending?.kind === "signMessage" || (sess.pending && isSignTxKind(sess.pending.kind)))
  ) {
    setSignButtons({ reject: true, approve: true, approveLabel: tr("approval.approving") });
  } else if (
    decision === "reject" &&
    (sess.pending?.kind === "signMessage" || (sess.pending && isSignTxKind(sess.pending.kind)))
  ) {
    setSignButtons({ reject: true, approve: true });
  }
  const res = await sendExtensionRequest("ui.resolvePending", { requestId: sess.requestId, decision });
  if (!res.ok) {
    if (res.error?.code === "NOT_FOUND") {
      showGone();
      return;
    }
    sess.resolving = false;
    const code = res.error?.code;
    if (sess.pending && isBroadcastAfterApproveKind(sess.pending.kind) && decision === "approve") {
      enterWalletSendFailedPage(code ?? "SEND_BROADCAST_FAILED");
      return;
    }
    const msg = code ? progressUserMessage(code) : tr("error.genericFailed");
    if (sess.pending?.kind === "signMessage" || (sess.pending && isSignTxKind(sess.pending.kind))) {
      sess.signError.hidden = false;
      sess.signError.textContent = msg;
      const approveOff =
        sess.pending.kind === "signMessage" && sess.pending.messageLooksLikeTx === true;
      setSignButtons({
        reject: false,
        approve: approveOff,
        approveLabel: tr("approval.approve"),
      });
      if (sess.pending && isSignTxKind(sess.pending.kind)) applyApproveFromSimulation(sess.lastSim);
    }
    return;
  }
  if (sess.pending && isBroadcastAfterApproveKind(sess.pending.kind)) {
    sess.resolving = false;
    if (decision === "reject") {
      if (sess.pending.kind === "walletSend") {
        walletSendRejectExit();
      } else {
        closeHost();
      }
      return;
    }
    const accepted = (res.result as { accepted?: boolean })?.accepted === true;
    if (accepted) {
      enterWalletSendConfirming();
      return;
    }
  }
  sess.resolving = false;
  closeHost();
}

export { refreshAfterUnlock };
