import { disposeApprovalShell, mountApprovalShell } from "../approval/shell";
import { sendExtensionRequest } from "../shared/ext-api";
import type { WalletSendSettledNotice } from "../shared/commands";
import { elApprovalRoot, elSendFormError } from "./dom";
import { clearSendForm } from "./send-flow";
import { navigateTo, session } from "./session";
import { refreshHomeAssets } from "./tokens-ui";

let approvalShellDispose: (() => void) | null = null;

export function teardownApprovalShell(): void {
  approvalShellDispose?.();
  approvalShellDispose = null;
}

export function mountPopupApprovalShell(): void {
  if (!session.activeWalletSendRequestId) return;
  teardownApprovalShell();
  approvalShellDispose = mountApprovalShell(
    {
      requestId: session.activeWalletSendRequestId,
      host: "popup",
      elementIdPrefix: "appr-",
      callbacks: {
        onClose: () => navigateTo("token-send"),
        onWalletSendReject: () => {
          session.activeWalletSendRequestId = null;
          teardownApprovalShell();
          navigateTo("token-send");
        },
        onWalletSendSuccessExit: () => {
          session.activeWalletSendRequestId = null;
          teardownApprovalShell();
          clearSendForm();
          session.detailTokenId = null;
          navigateTo("home-token");
          if (session.lastState) void refreshHomeAssets(session.lastState, true);
        },
      },
    },
    elApprovalRoot,
  );
}

export function abortWalletSendOnPopupUnload(): void {
  if (!session.activeWalletSendRequestId) return;
  void sendExtensionRequest("ui.abortPending", { requestId: session.activeWalletSendRequestId });
  teardownApprovalShell();
  session.activeWalletSendRequestId = null;
}

export function bindWalletSendSettledListener(): void {
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;
    const notice = message as WalletSendSettledNotice;
    if (notice.kind !== "airwave-wallet-send-settled") return;
    if (!session.activeWalletSendRequestId || notice.requestId !== session.activeWalletSendRequestId) return;
    if (notice.ok) return;
    const wasApproval = session.currentView === "send-approval";
    session.activeWalletSendRequestId = null;
    teardownApprovalShell();
    if (wasApproval) navigateTo("token-send");
    elSendFormError.hidden = false;
    elSendFormError.textContent = notice.error ?? "已取消";
  });
}
