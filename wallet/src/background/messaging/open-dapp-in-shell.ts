import { DAPP_APPROVAL_IN_SHELL_MSG } from "../../shared/dapp-approval-notice";

/** Notify the live side panel to push the website Page. Does not call sidePanel.open. */
export async function notifySidebarDappApproval(requestId: string): Promise<boolean> {
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
