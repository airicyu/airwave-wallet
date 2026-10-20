/**
 * Popup locked vault screen: password unlock and refresh on success.
 * Does not create a vault or show first-run setup.
 */
import type { JSX } from "react";
import { useState } from "react";
import { sendExtensionRequest } from "../../shared/protocol";
import { messageForErrorCode } from "../../shared/i18n";
import { BrandMark } from "../components/BrandMark";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";

export function LockedScreen(): JSX.Element {
  const { clearError, showError, refresh } = usePopupContext();
  const { t, locale } = useT();
  const [password, setPassword] = useState("");

  const submit = async () => {
    clearError();
    const res = await sendExtensionRequest("wallet.unlock", { password });
    if (!res.ok) {
      const code = res.error?.code;
      showError(code ? messageForErrorCode(locale, code) : t("error.unlockFailed"));
      document.getElementById("unlock-password")?.focus();
    }
    else {
      await refresh();
    }
  };

  return (
    <section id="locked" className="unlock-screen">
      <BrandMark />
      <h1>Airwave</h1>
      <p className="unlock-lead">{t("unlock.lead")}</p>
      <div className="unlock-form">
        <WalletPasswordInput
          id="unlock-password"
          autoFocus
          placeholder={t("unlock.passwordPlaceholder")}
          value={password}
          onChange={setPassword}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              void submit();
            }
          }}
        />
        <button id="btn-unlock" className="primary-btn" type="button" onClick={() => void submit()}>
          {t("unlock.submit")}
        </button>
      </div>
    </section>
  );
}
