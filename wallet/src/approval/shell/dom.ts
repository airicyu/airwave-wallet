/**
 * Small DOM helpers for the approval shell: view visibility, buttons, and input hardening.
 * Does not call the service worker or paint transaction bodies.
 */
import { sess } from "./session";

export function hideAll(): void {
  sess.viewUnlock.hidden = true;
  sess.viewGone.hidden = true;
  sess.viewSign.hidden = true;
}

export function closeHost(): void {
  sess.shellConfig?.callbacks.onClose();
}

export function walletSendRejectExit(): void {
  const cb = sess.shellConfig?.callbacks.onWalletSendReject ?? sess.shellConfig?.callbacks.onClose;
  cb?.();
}

export function setSendStatusChrome(on: boolean): void {
  sess.viewSign.classList.toggle("send-status-mode", on);
}

export function isSendStatusLocked(): boolean {
  return sess.sendStatusPhase !== "idle";
}

export function setSignButtons(opts: { reject?: boolean; approve?: boolean; approveLabel?: string }): void {
  if (opts.reject != null) sess.signReject.disabled = opts.reject;
  if (opts.approve != null) sess.signApprove.disabled = opts.approve;
  if (opts.approveLabel != null) sess.signApprove.textContent = opts.approveLabel;
}

export function hardenSensitiveTextInput(el: HTMLInputElement): void {
  el.autocomplete = "off";
  el.setAttribute("autocapitalize", "off");
  el.setAttribute("autocorrect", "off");
  el.setAttribute("spellcheck", "false");
  el.setAttribute("aria-autocomplete", "none");
  el.setAttribute("data-lpignore", "true");
  el.setAttribute("data-1p-ignore", "");
  el.setAttribute("data-form-type", "other");
  el.removeAttribute("name");
  el.readOnly = true;
  el.addEventListener("focus", () => {
    el.readOnly = false;
  });
}

export function hardenWalletPasswordInput(inp: HTMLInputElement): void {
  inp.type = "text";
  inp.classList.add("wallet-pwd-masked");
  hardenSensitiveTextInput(inp);
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}
