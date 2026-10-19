/**
 * Approval shell locale load and static chrome labels on bound DOM refs.
 * Does not run simulation or resolve pending requests.
 */
import { STORAGE, type Settings } from "../../shared/storage-keys";
import { DEFAULT_UI_LOCALE, messageForErrorCode, parseUiLocale, t, type UiLocale } from "../../shared/ui-i18n";
import type { MessageKey } from "../../shared/ui-messages";
import { isInWalletShellHost } from "../../shared/commands";
import { applyWindowChrome } from "../../shared/window-chrome";
import { sess } from "./session";

export function tr(key: MessageKey, vars?: Record<string, string>): string {
  return t(sess.shellLocale, key, vars);
}

export function setPopoutWindowTitle(key: MessageKey): void {
  sess.shellTitleKey = key;
  if (!sess.shellConfig || isInWalletShellHost(sess.shellConfig.host)) return;
  applyWindowChrome(sess.shellLocale, tr(key));
}

export function progressUserMessage(code: string): string {
  const mapped = messageForErrorCode(sess.shellLocale, code);
  return mapped !== code ? mapped : code;
}

export async function loadShellLocale(): Promise<void> {
  try {
    const data = await chrome.storage.local.get(STORAGE.settings);
    const settings = data[STORAGE.settings] as Settings | undefined;
    sess.shellLocale = parseUiLocale(settings?.locale);
  } catch {
    sess.shellLocale = DEFAULT_UI_LOCALE;
  }
}

export function applyShellLocaleToStaticChrome(): void {
  if (!sess.shellDomBound) return;
  const copyLabel = tr("common.copy");
  sess.btnCopyPk.title = copyLabel;
  sess.btnCopyPk.setAttribute("aria-label", copyLabel);
  if (sess.btnCopySite) {
    const siteCopy = tr("approval.copySite");
    sess.btnCopySite.title = siteCopy;
    sess.btnCopySite.setAttribute("aria-label", siteCopy);
  }
  sess.signReject.textContent = tr("approval.reject");
  sess.signApprove.textContent = tr("approval.approve");
  sess.btnCloseExpired.textContent = tr("common.return");
  sess.goneTitle.textContent = tr("approval.expired");
  sess.siteLabel.textContent = tr("approval.site");
  sess.signPageTitle.textContent = tr("approval.signMsg");
  document.documentElement.lang = sess.shellLocale;
  if (sess.shellTitleKey && sess.shellConfig && !isInWalletShellHost(sess.shellConfig.host)) {
    applyWindowChrome(sess.shellLocale, tr(sess.shellTitleKey));
  }
  const unlockLead = sess.viewUnlock.querySelector(".unlock-lead");
  if (unlockLead) unlockLead.textContent = tr("unlock.lead");
  sess.unlockPassword.placeholder = tr("unlock.passwordPlaceholder");
  sess.btnUnlock.textContent = tr("unlock.submit");
}
