/**
 * Expired-pending UI and expiry timer for the approval shell.
 * Does not resolve pending or load pending records.
 */
import { PENDING_TIMEOUT_MS } from "../../shared/commands";
import { stopAutoSim } from "../sign-tx-body";
import { sess } from "./session";
import { hideAll, isSendStatusLocked } from "./dom";
import { isSignTxKind } from "./kinds";
import { setPopoutWindowTitle, tr } from "./locale";

export function showGone(): void {
  if (isSendStatusLocked()) return;
  stopAutoSim();
  sess.requestEnded = true;
  if (sess.expiryTimer != null) {
    window.clearTimeout(sess.expiryTimer);
    sess.expiryTimer = null;
  }
  hideAll();
  setPopoutWindowTitle("approval.expired");
  sess.goneTitle.textContent = tr("approval.expired");
  if (sess.pending && isSignTxKind(sess.pending.kind)) {
    sess.goneLead.textContent = tr("approval.goneTx");
  } else if (sess.pending?.kind === "signMessage") {
    sess.goneLead.textContent = tr("approval.goneMsg");
  } else {
    sess.goneLead.textContent = tr("approval.goneGeneric");
  }
  sess.viewGone.hidden = false;
}

export function armExpiry(createdAt: number): void {
  if (sess.expiryTimer != null) window.clearTimeout(sess.expiryTimer);
  const remain = createdAt + PENDING_TIMEOUT_MS - Date.now();
  if (remain <= 0) {
    showGone();
    return;
  }
  sess.expiryTimer = window.setTimeout(() => showGone(), remain);
}
