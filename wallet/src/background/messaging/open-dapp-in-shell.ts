import { DAPP_APPROVAL_IN_SHELL_MSG } from "../../shared/dapp-approval-notice";

/** @returns whether any extension page acknowledged the notice */
async function notifySidebarDappApproval(requestId: string): Promise<boolean> {
  const notice = { kind: DAPP_APPROVAL_IN_SHELL_MSG, requestId };
  const delays = [0, 80, 160, 320, 480];
  for (const delayMs of delays) {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      await chrome.runtime.sendMessage(notice);
      return true;
    } catch {
      /* side panel document may not be listening yet */
    }
  }
  return false;
}

/** `settings.shell === "sidebar"`：開側欄並通知殼進審批 view。禁止 `openPopout`。 */
export async function openDappApprovalInSidebarShell(
  requestId: string,
  tabId: number,
): Promise<boolean> {
  const tab = await chrome.tabs.get(tabId);
  if (tab.windowId == null) return false;

  let opened = false;
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    opened = true;
  } catch {
    /* Panel may already be open; SW also cannot open without an extension-page user gesture */
  }

  const notified = await notifySidebarDappApproval(requestId);
  return opened || notified;
}
