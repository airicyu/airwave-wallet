import type { JSX } from "react";
import { memo } from "react";
import { ApprovalShell } from "../../approval/ApprovalShell";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { UiHost } from "../../shared/commands";
import { walletShellSurfaceFromHref } from "../../shared/shell-constants";
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
          api.navigateTo("token-send");
        },
        onWalletSendSuccessExit: () => {
          syncWalletSendAbortId(null);
          api.setActiveWalletSendRequestId(null);
          api.setDetailTokenId(null);
          api.setHomeAssetsForce(true);
          api.navigateTo("home-token");
        },
      }}
    />
  );
});
