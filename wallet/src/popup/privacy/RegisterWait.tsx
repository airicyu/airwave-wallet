/**
 * Full-screen wait while the register transaction confirms.
 * Uses the same aurora card as a wallet send. Does not submit the transaction.
 */
import type { JSX } from "react";
import { SEND_STATUS_AURORA_SVG } from "../../shared/marks";
import { useT } from "../state/useT";

export function RegisterWait(): JSX.Element {
  const { t } = useT();
  return (
    <div className="privacy-register-screen send-status-card is-pending" role="status">
      <p className="send-status-title">{t("privacy.registering")}</p>
      <div className="send-status-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SEND_STATUS_AURORA_SVG }} />
      <p className="send-status-title">{t("approval.confirming")}</p>
      <p className="send-status-lead">{t("approval.waitingChain")}</p>
    </div>
  );
}
