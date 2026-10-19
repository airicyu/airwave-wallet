import type { JSX, Ref } from "react";
import { brandIconUrl } from "../shared/brand-icon";
import type { MessageKey } from "../shared/ui-messages";

export type ApprovalUnlockRefs = {
  sectionRef: Ref<HTMLElement>;
  passwordRef: Ref<HTMLInputElement>;
  errorRef: Ref<HTMLParagraphElement | null>;
  unlockBtnRef: Ref<HTMLButtonElement | null>;
};

export function ApprovalUnlock({
  t,
  refs,
}: {
  t: (key: MessageKey) => string;
  refs: ApprovalUnlockRefs;
}): JSX.Element {
  return (
    <section ref={refs.sectionRef} className="unlock-screen">
      <img
        className="brand-mark"
        src={brandIconUrl()}
        width={64}
        height={64}
        alt=""
        aria-hidden="true"
      />
      <h1>Airwave</h1>
      <p className="unlock-lead">{t("unlock.lead")}</p>
      <div className="unlock-form">
        <input
          ref={refs.passwordRef}
          type="text"
          className="wallet-pwd-masked"
          placeholder={t("unlock.passwordPlaceholder")}
          autoComplete="off"
        />
        <p ref={refs.errorRef} className="inline-error" hidden />
        <button ref={refs.unlockBtnRef} type="button" className="primary-btn">
          {t("unlock.submit")}
        </button>
      </div>
    </section>
  );
}
