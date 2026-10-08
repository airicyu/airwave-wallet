import type { JSX } from "react";
import { memo, useEffect, useMemo, useRef } from "react";
import { mountApprovalShell } from "../../approval/shell";
import { brandIconUrl } from "../../shared/brand-icon";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { UiHost } from "../../shared/commands";
import { walletShellSurfaceFromHref } from "../../shared/shell-constants";
import type { MessageKey } from "../../shared/ui-messages";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";

/** Markup matches popup #approval-root; mountApprovalShell queries these ids. */
export function buildApprovalRootHtml(t: (key: MessageKey) => string): string {
  return `
              <section id="appr-view-unlock" class="unlock-screen" hidden>
                <img class="brand-mark" src="${brandIconUrl()}" width="64" height="64" alt="" aria-hidden="true" />
                <h1>Airwave</h1>
                <p class="unlock-lead">${t("unlock.lead")}</p>
                <div class="unlock-form">
                  <input id="appr-unlock-password" type="text" class="wallet-pwd-masked" placeholder="${t("unlock.passwordPlaceholder")}" autocomplete="off" />
                  <p id="appr-unlock-error" class="inline-error" hidden></p>
                  <button id="appr-btn-unlock" type="button" class="primary-btn">${t("unlock.submit")}</button>
                </div>
              </section>
              <section id="appr-view-gone" class="expired-screen" hidden>
                <h1>${t("approval.expired")}</h1>
                <p id="appr-gone-lead">${t("approval.goneGeneric")}</p>
                <button id="appr-btn-close-expired" type="button" class="primary-btn">${t("common.return")}</button>
              </section>
              <div id="appr-view-sign" class="approval-sign-shell" hidden>
                <div class="approval-sign-scroll">
                  <div class="site-row">
                    <span class="site-label">${t("approval.site")}</span>
                    <span class="site-chip" id="appr-sign-origin"></span>
                  </div>
                  <h2 class="page-title" id="appr-sign-page-title">${t("approval.signTx")}</h2>
                  <div class="bar-wallet-group compact">
                    <div class="bar-wallet static-wallet">
                      <span class="avatar" id="appr-sign-avatar" aria-hidden="true">A</span>
                      <span class="bar-wallet-text">
                        <span class="bar-wallet-name" id="appr-sign-label">Account</span>
                        <span class="bar-wallet-addr" id="appr-sign-addr"></span>
                      </span>
                      <button type="button" class="icon-btn ghost-inline" id="appr-btn-copy-pk" title="${t("common.copy")}" aria-label="${t("common.copy")}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    </div>
                  </div>
                  <div id="appr-sign-body"></div>
                  <p id="appr-sign-error" class="inline-error" hidden></p>
                </div>
                <footer class="approval-dock" id="appr-sign-dock">
                  <button id="appr-sign-reject" type="button" class="ghost-btn">${t("approval.reject")}</button>
                  <button id="appr-sign-approve" type="button" class="primary-btn">${t("approval.approve")}</button>
                </footer>
              </div>
              <section id="appr-view-legacy" class="flow-screen" hidden>
                <p id="appr-legacy-origin"></p>
                <p id="appr-legacy-kind"></p>
                <pre id="appr-legacy-detail"></pre>
                <button id="appr-legacy-reject" type="button" hidden></button>
                <button id="appr-legacy-approve" type="button" hidden></button>
                <p id="appr-legacy-error" hidden></p>
              </section>
`;
}

function inShellHostFromPage(): UiHost {
  const surface = walletShellSurfaceFromHref(window.location.href);
  return surface === "sidebar" ? "sidebar" : "window";
}

let abortRequestId: string | null = null;

export function syncWalletSendAbortId(id: string | null): void {
  abortRequestId = id;
}

/** 唯一一份 popup 送出 pending abort（pagehide／beforeunload／離開審批 view）。 */
export function abortWalletSendOnPopupUnload(): void {
  const rid = abortRequestId;
  if (!rid) return;
  abortRequestId = null;
  void sendExtensionRequest("ui.abortPending", { requestId: rid });
}

export const ApprovalHost = memo(function ApprovalHost({ requestId }: { requestId: string }): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const api = usePopupContext();
  const apiRef = useRef(api);
  apiRef.current = api;
  const { t, locale } = useT();
  const approvalHtml = useMemo(() => buildApprovalRootHtml(t), [t]);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !requestId) return;
    const dispose = mountApprovalShell(
      {
        requestId,
        host: inShellHostFromPage(),
        elementIdPrefix: "appr-",
        callbacks: {
          onClose: () => apiRef.current.navigateTo("token-send"),
          onWalletSendReject: () => {
            syncWalletSendAbortId(null);
            apiRef.current.setActiveWalletSendRequestId(null);
            apiRef.current.navigateTo("token-send");
          },
          onWalletSendSuccessExit: () => {
            syncWalletSendAbortId(null);
            apiRef.current.setActiveWalletSendRequestId(null);
            apiRef.current.setDetailTokenId(null);
            apiRef.current.setHomeAssetsForce(true);
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
