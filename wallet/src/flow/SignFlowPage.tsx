/**
 * Sign-message / sign-transaction page via the existing approval shell session.
 * Does not render connect consent; that is ConnectPage.
 */
import type { JSX } from "react";
import { memo, useRef } from "react";
import { ApprovalShell } from "../approval/ApprovalShell";
import { walletShellSurfaceFromHref } from "../shared/shell-constants";

export const SignFlowPage = memo(function SignFlowPage({
  requestId,
  onFinished,
  paused = false,
}: {
  requestId: string;
  onFinished: () => void;
  paused?: boolean;
}): JSX.Element {
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  const host = walletShellSurfaceFromHref(window.location.href) === "sidebar" ? "sidebar" : "window";

  return (
    <div className="flow-page">
      <ApprovalShell
        requestId={requestId}
        host={host}
        paused={paused}
        callbacks={{
          onClose: () => finishedRef.current(),
          onWalletSendSuccessExit: () => finishedRef.current(),
        }}
      />
    </div>
  );
});
