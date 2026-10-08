import type { JSX } from "react";
import { memo, useEffect, useMemo, useRef } from "react";
import { mountApprovalShell } from "../../approval/shell";
import { sendExtensionRequest } from "../../shared/ext-api";
import { walletShellSurfaceFromHref } from "../../shared/shell-constants";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { buildApprovalRootHtml } from "./ApprovalHost";

export const DappApprovalHost = memo(function DappApprovalHost({
  requestId,
}: {
  requestId: string;
}): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const api = usePopupContext();
  const apiRef = useRef(api);
  apiRef.current = api;
  const { t, locale } = useT();
  const approvalHtml = useMemo(() => buildApprovalRootHtml(t), [t]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !requestId) return;
    const host = walletShellSurfaceFromHref(window.location.href) === "sidebar" ? "sidebar" : "window";
    const dispose = mountApprovalShell(
      {
        requestId,
        host,
        elementIdPrefix: "appr-",
        callbacks: {
          onClose: () => {
            apiRef.current.setActiveDappApprovalRequestId(null);
            apiRef.current.navigateTo("home-token");
          },
        },
      },
      el,
    );
    return dispose;
  }, [requestId, locale]);

  return (
    <div
      ref={rootRef}
      id="approval-root"
      className="approval-root"
      dangerouslySetInnerHTML={{ __html: approvalHtml }}
    />
  );
});

export function rejectDappApprovalIfOpen(requestId: string | null): void {
  if (!requestId) return;
  void sendExtensionRequest("ui.resolvePending", { requestId, decision: "reject" });
}
