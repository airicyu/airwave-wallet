/**
 * Wallet-send confirming, failed, and confirmed status cards inside the sign body.
 * Does not resolve pending or run simulation.
 */
import { disposeSignTxBody, stopAutoSim } from "../sign-tx-body";
import { SEND_STATUS_AURORA_SVG } from "../../shared/marks";
import { shortSignature } from "../format";
import { sess } from "../shell/session";
import { hideAll, isSendStatusLocked, setSendStatusChrome, setSignButtons } from "../shell/dom";
import { progressUserMessage, setPopoutWindowTitle, tr } from "../shell/locale";

const SEND_STATUS_CHECK_SVG =
  '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

const SEND_STATUS_FAIL_SVG =
  '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9 9l6 6M15 9l-6 6"/></svg>';

const confirmedDismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Auto-close after wallet-send confirmed; keyed by request so rebind/pause does not cancel other layers. */
export function scheduleWalletSendConfirmedDismiss(requestId: string, exit: () => void): void {
  cancelWalletSendConfirmedDismiss(requestId);
  confirmedDismissTimers.set(
    requestId,
    setTimeout(() => {
      confirmedDismissTimers.delete(requestId);
      exit();
    }, 1000),
  );
}

export function cancelWalletSendConfirmedDismiss(requestId: string): void {
  const timer = confirmedDismissTimers.get(requestId);
  if (timer == null) return;
  clearTimeout(timer);
  confirmedDismissTimers.delete(requestId);
}

/** Clears wallet-send status chrome so a sign-only pending does not inherit the prior send UI. */
export function resetSendStatusUiForNewReview(): void {
  sess.sendStatusPhase = "idle";
  sess.requestEnded = false;
  setSendStatusChrome(false);
  sess.signDock.hidden = false;
  sess.signError.hidden = true;
  sess.signError.textContent = "";
  const hadSendStatusCard = Boolean(sess.signBody.querySelector(".send-status-card"));
  if (hadSendStatusCard) {
    sess.signBody.innerHTML = "";
  }
  if (hadSendStatusCard || sess.signTxBodyReady) {
    disposeSignTxBody();
    sess.signTxBodyReady = false;
    sess.feeFrozenForSim = false;
    sess.feeBreakdownReady = false;
    sess.txDetailsReady = false;
    sess.lastDeltaFingerprint = "";
    sess.lastDeltaPaintFingerprint = "";
  }
}

function ensureSendStatusCard(): HTMLElement {
  let card = sess.signBody.querySelector<HTMLElement>(".send-status-card");
  if (card) return card;
  disposeSignTxBody();
  sess.signTxBodyReady = false;
  sess.feeFrozenForSim = false;
  sess.feeBreakdownReady = false;
  sess.txDetailsReady = false;
  sess.signBody.replaceChildren();
  card = document.createElement("div");
  card.className = "send-status-card";
  const mark = document.createElement("div");
  mark.className = "send-status-mark";
  mark.setAttribute("aria-hidden", "true");
  const title = document.createElement("p");
  title.className = "send-status-title";
  const lead = document.createElement("p");
  lead.className = "send-status-lead";
  const sigEl = document.createElement("p");
  sigEl.className = "send-status-sig";
  sigEl.hidden = true;
  card.append(mark, title, lead, sigEl);
  sess.signBody.append(card);
  return card;
}

export function enterWalletSendConfirming(): void {
  stopAutoSim();
  if (sess.expiryTimer != null) {
    window.clearTimeout(sess.expiryTimer);
    sess.expiryTimer = null;
  }
  sess.sendStatusPhase = "pending";
  sess.simGen += 1;
  sess.signDock.hidden = true;
  setSendStatusChrome(true);
  setPopoutWindowTitle("approval.confirming");
  sess.signPageTitle.textContent = tr("approval.confirming");
  sess.signError.hidden = true;
  const card = ensureSendStatusCard();
  card.classList.remove("is-confirmed", "is-failed");
  card.classList.add("is-pending");
  card.querySelector(".send-status-actions")?.remove();
  card.querySelector(".send-fail-details")?.remove();
  const mark = card.querySelector<HTMLElement>(".send-status-mark")!;
  mark.replaceChildren();
  mark.style.color = "";
  mark.innerHTML = SEND_STATUS_AURORA_SVG;
  const title = card.querySelector(".send-status-title")!;
  title.textContent = tr("approval.confirming");
  const lead = card.querySelector<HTMLElement>(".send-status-lead")!;
  lead.hidden = false;
  lead.textContent = tr("approval.waitingChain");
  const sigEl = card.querySelector<HTMLElement>(".send-status-sig")!;
  sigEl.hidden = true;
  sigEl.textContent = "";
}

export function restoreWalletSendReviewAfterError(): void {
  sess.sendStatusPhase = "idle";
  setSendStatusChrome(false);
  sess.signDock.hidden = false;
  setPopoutWindowTitle("approval.signTx");
  sess.signPageTitle.textContent = tr("approval.signTx");
  sess.signError.hidden = true;
  sess.onRestoreWalletSendReview?.();
}

function canRetryFailedSend(code: string): boolean {
  return code !== "SEND_BLOCKHASH_EXPIRED";
}

export type SendFailUiExtra = {
  detail?: string;
  landed?: boolean;
  signature?: string;
};

function failDetailText(code: string, extra?: SendFailUiExtra): string {
  if (extra?.detail) return extra.detail;
  if (code !== "SEND_BROADCAST_FAILED" && code !== "SEND_TX_INVALID") return "";
  if (sess.lastSim?.outcome !== "fail") return "";
  let errPart = "";
  if (sess.lastSim.err != null) {
    try {
      errPart = JSON.stringify(sess.lastSim.err, null, 2);
    } catch {
      errPart = String(sess.lastSim.err);
    }
  }
  const logsPart = sess.lastSim.logs?.join("\n") ?? "";
  return [errPart, logsPart].filter(Boolean).join("\n\n");
}

function failLanded(code: string, extra?: SendFailUiExtra): boolean | undefined {
  if (extra?.landed === true) return true;
  if (extra?.landed === false) return false;
  if (code === "SEND_CHAIN_FAILED") return true;
  if (code === "SEND_BROADCAST_FAILED" || code === "SEND_TX_INVALID") return false;
  return undefined;
}

export function enterWalletSendFailedPage(errorCode: string, extra?: SendFailUiExtra): void {
  if (sess.expiryTimer != null) {
    window.clearTimeout(sess.expiryTimer);
    sess.expiryTimer = null;
  }
  sess.sendStatusPhase = "failed";
  sess.resolving = false;
  sess.simGen += 1;
  hideAll();
  sess.viewSign.hidden = false;
  setSendStatusChrome(true);
  sess.signDock.hidden = true;
  sess.signError.hidden = true;
  setPopoutWindowTitle("approval.sendFailedTitle");
  sess.signPageTitle.textContent = tr("approval.sendFailedTitle");
  const card = ensureSendStatusCard();
  card.classList.remove("is-pending", "is-confirmed");
  card.classList.add("is-failed");
  card.querySelector(".send-status-actions")?.remove();
  card.querySelector(".send-fail-details")?.remove();
  const mark = card.querySelector<HTMLElement>(".send-status-mark")!;
  mark.replaceChildren();
  mark.style.color = "var(--danger)";
  const failMark = document.createElement("span");
  failMark.className = "send-status-check send-status-fail";
  failMark.innerHTML = SEND_STATUS_FAIL_SVG;
  mark.append(failMark);
  const title = card.querySelector(".send-status-title")!;
  title.textContent = tr("approval.sendFailedTitle");
  const lead = card.querySelector<HTMLElement>(".send-status-lead")!;
  lead.hidden = false;
  lead.textContent = progressUserMessage(errorCode);
  const sigEl = card.querySelector<HTMLElement>(".send-status-sig")!;
  if (extra?.signature) {
    sigEl.hidden = false;
    sigEl.textContent = shortSignature(extra.signature);
  } else {
    sigEl.hidden = true;
    sigEl.textContent = "";
  }
  const detailText = failDetailText(errorCode, extra);
  const landed = failLanded(errorCode, extra);
  if (detailText || landed !== undefined) {
    const details = document.createElement("details");
    details.className = "send-fail-details";
    const summary = document.createElement("summary");
    summary.textContent = tr("sim.failDetails");
    details.append(summary);
    if (landed === false) {
      const stage = document.createElement("p");
      stage.className = "send-fail-stage";
      stage.textContent = tr("approval.sendNotLanded");
      details.append(stage);
    } else if (landed === true) {
      const stage = document.createElement("p");
      stage.className = "send-fail-stage";
      stage.textContent = tr("approval.sendLandedFailed");
      details.append(stage);
    }
    if (detailText) {
      const pre = document.createElement("pre");
      pre.textContent = detailText;
      details.append(pre);
    }
    card.append(details);
  }
  const actions = document.createElement("div");
  actions.className = "send-status-actions";
  const reviewBtn = document.createElement("button");
  reviewBtn.type = "button";
  reviewBtn.className = "ghost-btn";
  reviewBtn.textContent = tr("approval.reviewTx");
  reviewBtn.addEventListener("click", () => restoreWalletSendReviewAfterError());
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "primary-btn";
  retryBtn.textContent = tr("approval.retrySend");
  const retryOk = canRetryFailedSend(errorCode);
  retryBtn.disabled = !retryOk;
  if (retryOk) {
    retryBtn.addEventListener("click", () => void sess.onResolve?.("approve"));
  }
  const exitBtn = document.createElement("button");
  exitBtn.type = "button";
  exitBtn.className = "ghost-btn";
  exitBtn.textContent = tr("approval.exitSend");
  exitBtn.addEventListener("click", () => void sess.onResolve?.("reject"));
  actions.append(reviewBtn, retryBtn, exitBtn);
  card.append(actions);
}

export function enterWalletSendConfirmedPage(signature?: string): void {
  const requestId = sess.requestId;
  const exit =
    sess.shellConfig?.callbacks.onWalletSendSuccessExit ?? sess.shellConfig?.callbacks.onClose;
  if (sess.expiryTimer != null) {
    window.clearTimeout(sess.expiryTimer);
    sess.expiryTimer = null;
  }
  sess.requestEnded = true;
  sess.sendStatusPhase = "confirmed";
  hideAll();
  sess.viewSign.hidden = false;
  setSendStatusChrome(true);
  sess.signDock.hidden = true;
  sess.signError.hidden = true;
  setPopoutWindowTitle("approval.approved");
  sess.signPageTitle.textContent = tr("approval.approved");
  const card = ensureSendStatusCard();
  card.classList.remove("is-pending", "is-failed");
  card.classList.add("is-confirmed");
  card.querySelector(".send-status-actions")?.remove();
  card.querySelector(".send-fail-details")?.remove();
  const mark = card.querySelector<HTMLElement>(".send-status-mark")!;
  mark.replaceChildren();
  mark.style.color = "";
  const check = document.createElement("span");
  check.className = "send-status-check";
  check.innerHTML = SEND_STATUS_CHECK_SVG;
  mark.append(check);
  const title = card.querySelector(".send-status-title")!;
  title.textContent = tr("approval.approved");
  const lead = card.querySelector<HTMLElement>(".send-status-lead")!;
  lead.hidden = true;
  lead.textContent = "";
  const sigEl = card.querySelector<HTMLElement>(".send-status-sig")!;
  if (signature) {
    sigEl.hidden = false;
    sigEl.textContent = shortSignature(signature);
  } else {
    sigEl.hidden = true;
    sigEl.textContent = "";
  }
  if (requestId && exit) {
    scheduleWalletSendConfirmedDismiss(requestId, exit);
  }
}
