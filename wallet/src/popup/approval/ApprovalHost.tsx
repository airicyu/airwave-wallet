/**
 * Hosts the shared approval shell for a wallet send opened inside the popup or sidebar.
 * Reject and success return to the form that started the request.
 * Leaving the approval view aborts that pending request once.
 *
 * Privacy flows mark a one-shot flag before opening this host. Reject and success read that flag to choose Shield, Unshield, Send, Merge, or the private-balance tab. A public send has no flag and returns to token send. A merge of more than 52 notes confirms on its own screen and is not finished here.
 */
import type { JSX } from "react";
import { memo } from "react";
import { ApprovalShell } from "../../approval/ApprovalShell";
import { sendExtensionRequest } from "../../shared/protocol";
import { consumeUnshieldApproval } from "../privacy/unshield-draft";
import { consumeMergeApproval } from "../privacy/merge-draft";
import { consumeShieldApproval } from "../privacy/shield-approval";
import { consumePrivateSendApproval } from "../privacy/private-send-draft";
import { consumeRegisterFrom, returnToPrivateTab } from "../privacy/register-return";
import type { UiHost } from "../../shared/protocol";
import { walletShellSurfaceFromHref } from "../../shared/shell";
import { usePopupContext } from "../state/PopupContext";

function inShellHostFromPage(): UiHost {
  const surface = walletShellSurfaceFromHref(window.location.href);
  return surface === "sidebar" ? "sidebar" : "window";
}

let abortRequestId: string | null = null;

export function syncWalletSendAbortId(id: string | null): void {
  abortRequestId = id;
}

/** Single popup abort for in-wallet send pending (pagehide/beforeunload/leaving the approval view). */
export function abortWalletSendOnPopupUnload(): void {
  const rid = abortRequestId;
  if (!rid) return;
  abortRequestId = null;
  void sendExtensionRequest("ui.abortPending", { requestId: rid });
}

export const ApprovalHost = memo(function ApprovalHost({ requestId }: { requestId: string }): JSX.Element {
  const api = usePopupContext();

  return (
    <ApprovalShell
      requestId={requestId}
      host={inShellHostFromPage()}
      callbacks={{
        onClose: () => api.navigateTo("token-send"),
        onWalletSendReject: () => {
          syncWalletSendAbortId(null);
          api.setActiveWalletSendRequestId(null);
          const mergeId = consumeMergeApproval();
          if (mergeId) {
            void sendExtensionRequest("wallet.cancelMergeBatch", { requestId: mergeId });
            api.navigateTo("merge");
            return;
          }
          const registerFrom = consumeRegisterFrom();
          if (registerFrom === "shield") {
            api.navigateTo("shield");
            return;
          }
          if (registerFrom === "tab") {
            returnToPrivateTab();
            api.navigateTo("home-token");
            return;
          }
          api.navigateTo(consumeUnshieldApproval() ? "unshield" : consumePrivateSendApproval() ? "private-send" : consumeShieldApproval() ? "shield" : "token-send");
        },
        onWalletSendSuccessExit: () => {
          syncWalletSendAbortId(null);
          api.setActiveWalletSendRequestId(null);
          const registerFrom = consumeRegisterFrom();
          api.setDetailTokenId(null);
          api.setHomeAssetsForce(true);
          if (registerFrom === "shield") {
            api.navigateTo("shield");
            return;
          }
          if (registerFrom === "tab") returnToPrivateTab();
          api.navigateTo("home-token");
        },
      }}
    />
  );
});
