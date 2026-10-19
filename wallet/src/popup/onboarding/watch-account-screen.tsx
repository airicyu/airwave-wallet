/**
 * Popup screen to add a read-only watch address with an optional label.
 * Does not import signing keys or seed phrases.
 */
import type { JSX } from "react";
import { useCallback, useState } from "react";
import { ACCOUNT_LABEL_MAX } from "../../shared/account-label";
import { parsePublicKeyBase58 } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import { apiErrorMessage } from "../../shared/ui-i18n";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import { viewAfterAccountCreated } from "../lib/rpc-guide";

export function WatchAccountScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, showError, wallet } = usePopupContext();
  const { t, locale } = useT();
  const [label, setLabel] = useState("");
  const [pk, setPk] = useState("");
  const [err, setErr] = useState("");
  const parseOk = parsePublicKeyBase58(pk) != null;

  const onPrimary = useCallback(async () => {
    clearError();
    const publicKeyBase58 = pk.trim();
    const name = label.trim();
    if (!parsePublicKeyBase58(publicKeyBase58)) {
      setErr(t("error.invalidAddress"));
      return;
    }
    const res = await sendExtensionRequest("wallet.addReadOnlyAccount", {
      publicKeyBase58,
      label: name || undefined,
    });
    if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.addFailed"));
    else {
      const prevCount = wallet?.accounts.length ?? 0;
      const state = await refresh();
      navigateTo(viewAfterAccountCreated(prevCount, state, "accounts"));
    }
  }, [clearError, pk, label, showError, refresh, navigateTo, t, locale, wallet]);

  useRegisterDock({ label: t("common.create"), disabled: !parseOk, onPrimary });

  return (
    <>
      <div className="field">
        <label htmlFor="watch-label">{t("common.name")}</label>
        <input
          id="watch-label"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          placeholder={t("common.optional")}
          autoComplete="off"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="watch-pk">{t("common.address")}</label>
        <input
          id="watch-pk"
          type="text"
          spellCheck={false}
          placeholder={t("onboarding.solanaPubkey")}
          autoComplete="off"
          value={pk}
          onChange={(e) => {
            setPk(e.target.value);
            setErr("");
          }}
        />
      </div>
      <p id="watch-err" className="inline-err" aria-live="polite">
        {err}
      </p>
    </>
  );
}
