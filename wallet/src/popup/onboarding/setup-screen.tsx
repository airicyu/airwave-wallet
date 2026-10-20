/**
 * First-run vault password setup screen inside the popup shell.
 * Does not unlock an existing vault or run the multi-step SetupFlow wrapper.
 */
import type { JSX } from "react";
import { useState } from "react";
import { sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { FirstRunBrand } from "../components/FirstRunBrand";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { shouldShowRpcGuide } from "../lib/rpc-guide";

export function SetupScreen(): JSX.Element {
  const { clearError, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  return (
    <section id="setup" className="unlock-screen first-run-page">
      <FirstRunBrand />
      <div className="first-run-main">
        <p className="first-run-lead">{t("setup.passwordLead")}</p>
      <div className="unlock-form">
        <WalletPasswordInput
          id="setup-password"
          placeholder={t("unlock.passwordPlaceholder")}
          value={password}
          onChange={setPassword}
        />
        <WalletPasswordInput
          id="setup-password-2"
          placeholder={t("onboarding.passwordAgain")}
          value={password2}
          onChange={setPassword2}
        />
        <button
          id="btn-create"
          className="primary-btn"
          type="button"
          onClick={async () => {
            clearError();
            if (!password || password.length < 8) {
              showError(t("error.passwordTooShort"));
              return;
            }
            if (password !== password2) {
              showError(t("error.passwordMismatch"));
              return;
            }
            const res = await sendExtensionRequest("wallet.createVault", { password, empty: true });
            if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.createFailed"));
            else {
              const state = await refresh();
              navigateTo(shouldShowRpcGuide(state) ? "rpc-guide" : "add-account");
            }
          }}
        >
          {t("onboarding.start")}
        </button>
      </div>
      </div>
    </section>
  );
}
