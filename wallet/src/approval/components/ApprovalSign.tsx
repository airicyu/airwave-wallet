import type { JSX, Ref } from "react";
import type { MessageKey } from "../../shared/ui-messages";

export type ApprovalSignRefs = {
  shellRef: Ref<HTMLDivElement>;
  originRef: Ref<HTMLElement>;
  pageTitleRef: Ref<HTMLHeadingElement | null>;
  bodyRef: Ref<HTMLDivElement | null>;
  errorRef: Ref<HTMLParagraphElement | null>;
  avatarRef: Ref<HTMLElement>;
  labelRef: Ref<HTMLElement>;
  addrRef: Ref<HTMLElement>;
  copyPkRef: Ref<HTMLButtonElement>;
  copySiteRef: Ref<HTMLButtonElement>;
  rejectRef: Ref<HTMLButtonElement>;
  approveRef: Ref<HTMLButtonElement>;
  dockRef: Ref<HTMLElement>;
};

const COPY_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export function ApprovalSign({
  t,
  refs,
}: {
  t: (key: MessageKey) => string;
  refs: ApprovalSignRefs;
}): JSX.Element {
  return (
    <div ref={refs.shellRef} className="approval-sign-shell">
      <div className="approval-sign-scroll">
        <div className="bar-wallet-group compact">
          <div className="bar-wallet static-wallet">
            <span ref={refs.avatarRef} className="avatar" aria-hidden="true">A</span>
            <span className="bar-wallet-text">
              <span ref={refs.labelRef} className="bar-wallet-name">Account</span>
              <span ref={refs.addrRef} className="bar-wallet-addr" />
            </span>
            <button
              ref={refs.copyPkRef}
              type="button"
              className="icon-btn ghost-inline"
              title={t("common.copy")}
              aria-label={t("common.copy")}
            >
              {COPY_ICON}
            </button>
          </div>
        </div>
        <hr className="account-rule" aria-hidden="true" />
        <div className="site-row site-row-centered">
          <div className="site-card">
            <span className="site-label">{t("approval.site")}</span>
            <span ref={refs.originRef} className="site-v" id="sign-origin" />
          </div>
          <button
            ref={refs.copySiteRef}
            type="button"
            className="icon-btn site-copy"
            title={t("approval.copySite")}
            aria-label={t("approval.copySite")}
          >
            {COPY_ICON}
          </button>
        </div>
        <h2 ref={refs.pageTitleRef} className="page-title">{t("approval.signTx")}</h2>
        <div id="sign-ai-slot" className="sign-ai-slot" hidden />
        <div ref={refs.bodyRef} id="sign-body" />
        <p ref={refs.errorRef} className="inline-error" hidden />
      </div>
      <footer ref={refs.dockRef} className="approval-dock" id="sign-dock">
        <button ref={refs.rejectRef} id="sign-reject" type="button" className="ghost-btn">
          {t("approval.reject")}
        </button>
        <button ref={refs.approveRef} id="sign-approve" type="button" className="primary-btn">
          {t("approval.approve")}
        </button>
      </footer>
    </div>
  );
}
