/**
 * Popup per-account manage screen for signing, watch, read-only, and combined accounts.
 * Combined rows are a menu: open the member sheet, or remove the account after a confirm. The sheet is account-combined-manage.
 */
import type { JSX } from "react";
import { getExposedPublicKey, isCombinedAccount, isSigningOrWatch } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import { accountKind } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import type { State } from "../types";

export function ManageScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, setFocusAccountId, clearError, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  if (!acc) return <p className="muted">{t("error.accountNotFound")}</p>;
  const combined = isCombinedAccount(acc);
  const ro = !combined && accountKind(acc) === "readOnly";
  return (
    <>
      <p id="manage-name" className="manage-name">
        {acc.label}
      </p>
      <p id="manage-addr" className="manage-addr">
        {combined || isSigningOrWatch(acc) ? getExposedPublicKey(acc) : ""}
      </p>
      <p id="manage-readOnly-badge" className="badge" hidden={!ro}>
        {t("accounts.badgeReadOnly")}
      </p>
      <div className="manage-actions">
        <button
          type="button"
          className="manage-action-row neutral"
          id="btn-go-reveal"
          hidden={combined || ro || !wallet.unlocked}
          onClick={() => navigateTo("account-reveal-key")}
        >
          <span>{t("accounts.revealPrivateKey")}</span>
        </button>
        {combined ? (
          <button
            type="button"
            className="manage-action-row neutral"
            onClick={() => navigateTo("account-combined-manage")}
          >
            <span>{t("accounts.manageCombined")}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="manage-action-row danger"
          id="btn-delete"
          onClick={async () => {
            clearError();
            if (!focusAccountId) return;
            if (!confirm(t(combined ? "accounts.removeCombinedConfirm" : "accounts.removeConfirm"))) return;
            const res = await sendExtensionRequest("wallet.deleteAccount", { accountId: focusAccountId });
            if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.deleteFailed"));
            else {
              setFocusAccountId(null);
              await refresh();
              navigateTo("accounts");
            }
          }}
        >
          {combined ? t("accounts.removeCombined") : t("accounts.removeWalletAccount")}
        </button>
      </div>
    </>
  );
}
