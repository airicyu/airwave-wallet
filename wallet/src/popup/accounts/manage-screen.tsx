/**
 * Popup per-account manage screen for signing, watch, and read-only accounts.
 * Combined accounts delegate to CombinedManagePanel instead of this layout.
 */
import type { JSX } from "react";
import { isCombinedAccount, isSigningOrWatch } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import { accountKind } from "../../shared/storage-keys";
import { apiErrorMessage } from "../../shared/ui-i18n";
import { CombinedManagePanel } from "./CombinedManage";
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
  if (combined) return <CombinedManagePanel acc={acc} wallet={wallet} />;
  return (
    <>
      <p id="manage-name" className="manage-name">
        {acc.label}
      </p>
      <p id="manage-addr" className="manage-addr">
        {isSigningOrWatch(acc) ? acc.publicKeyBase58 : ""}
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
        <button
          type="button"
          className="manage-action-row danger"
          id="btn-delete"
          onClick={async () => {
            clearError();
            if (!focusAccountId) return;
            if (!confirm(t("accounts.removeConfirm"))) return;
            const res = await sendExtensionRequest("wallet.deleteAccount", { accountId: focusAccountId });
            if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.deleteFailed"));
            else {
              setFocusAccountId(null);
              await refresh();
              navigateTo("accounts");
            }
          }}
        >
          {t("accounts.removeWalletAccount")}
        </button>
      </div>
    </>
  );
}
