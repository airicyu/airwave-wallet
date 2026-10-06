import type { JSX } from "react";
import { memo, useEffect, useRef } from "react";
import { mountApprovalShell } from "../../approval/shell";
import { sendExtensionRequest } from "../../shared/ext-api";
import { session, navigateTo, bumpUi } from "../lib/session";

/** Markup matches today's popup #approval-root; mountApprovalShell queries these ids. */
export const APPROVAL_ROOT_HTML = `
              <section id="appr-view-unlock" class="unlock-screen" hidden>
                <p>錢包已鎖定</p>
                <input id="appr-unlock-password" type="text" class="wallet-pwd-masked" placeholder="密碼" autocomplete="off" />
                <p id="appr-unlock-error" class="inline-error" hidden></p>
                <button id="appr-btn-unlock" type="button" class="primary-btn">解鎖</button>
              </section>
              <section id="appr-view-gone" class="expired-screen" hidden>
                <p id="appr-gone-lead">這筆請求已不能繼續。</p>
                <button id="appr-btn-close-expired" type="button" class="primary-btn">返回</button>
              </section>
              <div id="appr-view-sign" class="approval-sign-shell" hidden>
                <div class="approval-sign-scroll">
                  <div class="site-row">
                    <span class="site-label">站點</span>
                    <span class="site-chip" id="appr-sign-origin"></span>
                  </div>
                  <h2 class="page-title" id="appr-sign-page-title">簽署交易</h2>
                  <div class="bar-wallet-group compact">
                    <div class="bar-wallet static-wallet">
                      <span class="avatar" id="appr-sign-avatar" aria-hidden="true">A</span>
                      <span class="bar-wallet-text">
                        <span class="bar-wallet-name" id="appr-sign-label">Account</span>
                        <span class="bar-wallet-addr" id="appr-sign-addr"></span>
                      </span>
                    </div>
                    <button type="button" class="icon-btn ghost-inline" id="appr-btn-copy-pk" title="Copy public key" aria-label="Copy public key">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                  <div id="appr-sign-body"></div>
                  <p id="appr-sign-error" class="inline-error" hidden></p>
                </div>
                <footer class="approval-dock" id="appr-sign-dock">
                  <button id="appr-sign-reject" type="button" class="ghost-btn">拒絕</button>
                  <button id="appr-sign-approve" type="button" class="primary-btn">批准</button>
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

export const ApprovalHost = memo(function ApprovalHost({ requestId }: { requestId: string }): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !requestId) return;
    const dispose = mountApprovalShell(
      {
        requestId,
        host: "popup",
        elementIdPrefix: "appr-",
        callbacks: {
          onClose: () => navigateTo("token-send"),
          onWalletSendReject: () => {
            session.activeWalletSendRequestId = null;
            navigateTo("token-send");
          },
          onWalletSendSuccessExit: () => {
            session.activeWalletSendRequestId = null;
            session.sendAmount = "";
            session.sendRecipient = "";
            session.sendFormError = "";
            session.detailTokenId = null;
            session.homeAssetsForce = true;
            navigateTo("home-token");
            bumpUi();
          },
        },
      },
      el,
    );
    return dispose;
  }, [requestId]);

  return (
    <div
      ref={rootRef}
      id="approval-root"
      className="approval-root"
      dangerouslySetInnerHTML={{ __html: APPROVAL_ROOT_HTML }}
    />
  );
});

export function abortWalletSendOnPopupUnload(): void {
  if (!session.activeWalletSendRequestId) return;
  void sendExtensionRequest("ui.abortPending", { requestId: session.activeWalletSendRequestId });
  session.activeWalletSendRequestId = null;
}
