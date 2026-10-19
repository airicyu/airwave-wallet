import type { JSX } from "react";
import { sendExtensionRequest } from "../../shared/ext-api";
import { IconX } from "../components/StrokeIcon";
import { apiErrorMessage } from "../../shared/ui-i18n";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import type { State } from "../types";

export function ConnectedSites({ wallet }: { wallet: State }): JSX.Element {
  const { clearError, showError, refresh } = usePopupContext();
  const { t, locale } = useT();
  return (
    <>
      <ul id="connected-list" className="connected-list">
        {wallet.connections.map((c) => (
          <li key={c.origin} className="connected-row">
            <span>{c.origin}</span>
            <button
              type="button"
              className="icon-btn"
              title={t("accounts.disconnect")}
              aria-label={t("accounts.disconnect")}
              onClick={async () => {
                clearError();
                const res = await sendExtensionRequest("wallet.disconnectOrigin", { origin: c.origin });
                if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.disconnectFailed"));
                else await refresh();
              }}
            >
              <IconX />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="block-btn"
        id="btn-disconnect-all"
        onClick={async () => {
          clearError();
          const res = await sendExtensionRequest("wallet.disconnectAllOrigins");
          if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.disconnectFailed"));
          else await refresh();
        }}
      >
        {t("common.allDisconnect")}
      </button>
    </>
  );
}
