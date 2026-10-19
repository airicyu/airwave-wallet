/**
 * DOM and chrome.runtime listeners for one approval-shell mount.
 * Does not load pending on its own.
 */
import { SESSION_UNLOCKED } from "../../shared/storage-keys";
import { sendExtensionRequest } from "../../shared/ext-api";
import { copyPublicKeyWithFeedback } from "../../shared/copy-pk-feedback";
import { sess } from "./session";
import { closeHost, hardenWalletPasswordInput } from "./dom";
import { isBroadcastAfterApproveKind, isSignTxKind } from "./kinds";
import { progressUserMessage, tr } from "./locale";
import { refreshAfterUnlock, resolvePending } from "./flow";
import {
  enterWalletSendConfirmedPage,
  enterWalletSendFailedPage,
} from "../dom/send-status";

let storageUnlockListener: ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void) | null =
  null;
let runtimeMessageListener: ((message: unknown) => void) | null = null;
let shellEventsAbort: AbortController | null = null;

export function wireShellEvents(): void {
  shellEventsAbort?.abort();
  shellEventsAbort = new AbortController();
  const { signal } = shellEventsAbort;

  sess.btnCloseExpired.addEventListener("click", () => closeHost(), { signal });

  sess.btnUnlock.addEventListener(
    "click",
    async () => {
      sess.unlockError.hidden = true;
      const password = sess.unlockPassword.value;
      const res = await sendExtensionRequest("wallet.unlock", { password });
      if (!res.ok) {
        sess.unlockError.hidden = false;
        sess.unlockError.textContent =
          res.error?.code === "INVALID_PASSWORD"
            ? tr("error.code.INVALID_PASSWORD")
            : progressUserMessage(res.error?.code ?? "");
        sess.unlockPassword.value = "";
        sess.unlockPassword.focus();
        return;
      }
      sess.unlockPassword.value = "";
      await refreshAfterUnlock(true);
    },
    { signal },
  );

  sess.unlockPassword.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        sess.btnUnlock.click();
      }
    },
    { signal },
  );

  sess.btnCopyPk.addEventListener(
    "click",
    () => {
      if (sess.frozenPk) void copyPublicKeyWithFeedback(sess.btnCopyPk, sess.frozenPk, sess.shellLocale);
    },
    { signal },
  );

  if (sess.btnCopySite) {
    const COPY_SVG = sess.btnCopySite.querySelector("svg")?.outerHTML ?? "";
    const CHECK_SVG =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>';
    sess.btnCopySite.addEventListener(
      "click",
      () => {
        if (!sess.pendingOriginFull) return;
        void navigator.clipboard.writeText(sess.pendingOriginFull).then(() => {
          sess.btnCopySite!.innerHTML = CHECK_SVG;
          window.setTimeout(() => {
            if (sess.btnCopySite) sess.btnCopySite.innerHTML = COPY_SVG;
          }, 1600);
        });
      },
      { signal },
    );
  }

  sess.signReject.addEventListener("click", () => void resolvePending("reject"), { signal });
  sess.signApprove.addEventListener("click", () => void resolvePending("approve"), { signal });

  storageUnlockListener = (changes, area) => {
    if (area !== "session") return;
    if (!(SESSION_UNLOCKED in changes)) return;
    if (
      !sess.pending ||
      (sess.pending.kind !== "connect" &&
        sess.pending.kind !== "signMessage" &&
        !isSignTxKind(sess.pending.kind))
    )
      return;
    if (sess.viewUnlock.hidden) return;
    void refreshAfterUnlock(false);
  };
  chrome.storage.onChanged.addListener(storageUnlockListener);

  runtimeMessageListener = (message) => {
    if (!message || typeof message !== "object") return;
    const rec = message as Record<string, unknown>;
    if (rec.requestId !== sess.requestId) return;
    if (rec.kind === "airwave-wallet-send-progress" && typeof rec.error === "string") {
      if (!sess.pending || !isBroadcastAfterApproveKind(sess.pending.kind)) {
        return;
      }
      sess.resolving = false;
      enterWalletSendFailedPage(rec.error, {
        detail: typeof rec.detail === "string" ? rec.detail : undefined,
        landed: rec.landed === true ? true : rec.landed === false ? false : undefined,
        signature: typeof rec.signature === "string" ? rec.signature : undefined,
      });
      return;
    }
    if (rec.kind === "airwave-wallet-send-settled" && rec.ok === true) {
      if (!sess.pending || !isBroadcastAfterApproveKind(sess.pending.kind)) {
        return;
      }
      const sig = typeof rec.signature === "string" ? rec.signature : undefined;
      enterWalletSendConfirmedPage(sig);
    }
  };
  chrome.runtime.onMessage.addListener(runtimeMessageListener);

  hardenWalletPasswordInput(sess.unlockPassword);
}

export function unwireShellEvents(): void {
  if (sess.approveHoldTimer != null) {
    clearTimeout(sess.approveHoldTimer);
    sess.approveHoldTimer = null;
  }
  shellEventsAbort?.abort();
  shellEventsAbort = null;
  if (storageUnlockListener) {
    chrome.storage.onChanged.removeListener(storageUnlockListener);
    storageUnlockListener = null;
  }
  if (runtimeMessageListener) {
    chrome.runtime.onMessage.removeListener(runtimeMessageListener);
    runtimeMessageListener = null;
  }
}
