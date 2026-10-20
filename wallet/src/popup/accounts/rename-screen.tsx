import type { JSX } from "react";
import { useState } from "react";
import { getExposedPublicKey } from "../../shared/accounts";
import { ACCOUNT_LABEL_MAX } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import type { State } from "../types";

export function RenameScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, clearError, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const [renameLabel, setRenameLabel] = useState(acc?.label ?? "");
  useRegisterDock({
    label: t("common.confirm"),
    disabled: false,
    onPrimary: async () => {
      clearError();
      if (!focusAccountId || !renameLabel.trim()) return;
      const res = await sendExtensionRequest("wallet.renameAccount", {
        accountId: focusAccountId,
        label: renameLabel,
      });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.renameFailed"));
      else {
        await refresh();
        navigateTo("accounts");
      }
    },
  });

  return (
    <>
      <p id="rename-addr-hint" className="muted addr-hint">
        {acc ? shortAddr(getExposedPublicKey(acc)) : ""}
      </p>
      <div className="field">
        <label htmlFor="rename-label">{t("common.name")}</label>
        <input
          id="rename-label"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          placeholder={t("accounts.newNamePlaceholder")}
          value={renameLabel}
          onChange={(e) => setRenameLabel(e.target.value)}
        />
      </div>
    </>
  );
}
