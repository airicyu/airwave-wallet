/**
 * The expired-approval card inside the sign shell.
 * It shows the title, the lead, and a close button through refs the shell fills.
 * The shell decides when a request is expired. This card does not read pending state.
 */
import type { JSX, Ref } from "react";
import type { MessageKey } from "../../shared/i18n";

export type ApprovalExpiredRefs = {
  sectionRef: Ref<HTMLElement>;
  titleRef: Ref<HTMLHeadingElement>;
  leadRef: Ref<HTMLParagraphElement | null>;
  closeBtnRef: Ref<HTMLButtonElement | null>;
};

export function ApprovalExpired({
  t,
  refs,
}: {
  t: (key: MessageKey) => string;
  refs: ApprovalExpiredRefs;
}): JSX.Element {
  return (
    <section ref={refs.sectionRef} className="expired-screen">
      <h1 ref={refs.titleRef}>{t("approval.expired")}</h1>
      <p ref={refs.leadRef}>{t("approval.goneGeneric")}</p>
      <button ref={refs.closeBtnRef} type="button" className="primary-btn">
        {t("common.return")}
      </button>
    </section>
  );
}
