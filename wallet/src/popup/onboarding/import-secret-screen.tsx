/**
 * Popup screen for importing an account from a raw secret key (bytes or base58).
 * Does not run seed phrase import or vault setup.
 */
import type { JSX } from "react";
import { useCallback, useState } from "react";
import { ACCOUNT_LABEL_MAX } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { SensitiveTextArea } from "../components/WalletPasswordInput";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import { viewAfterAccountCreated } from "../lib/rpc-guide";
import { detectSecret } from "./import-secret";

export function ImportSecretScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, wallet } = usePopupContext();
  const { t, locale } = useT();
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  const [err, setErr] = useState("");
  const d = detectSecret(secret);
  const fmtClass = d.kind === "empty" ? "fmt" : d.ok ? "fmt ok" : "fmt bad";
  const fmtText =
    d.kind === "empty"
      ? t("onboarding.secretPlaceholder")
      : d.ok
        ? d.kind === "bytes"
          ? t("onboarding.bytesArray")
          : t("onboarding.base58")
        : t("error.unrecognizedSecret");

  const onPrimary = useCallback(async () => {
    clearError();
    const detected = detectSecret(secret);
    if (!detected.ok) {
      setErr(t("error.unrecognizedSecret"));
      return;
    }
    const res = await sendExtensionRequest("wallet.importAccount", {
      secret: secret.trim(),
      label: label.trim() || undefined,
    });
    if (!res.ok) {
      setErr(apiErrorMessage(locale, res.error, "error.importFailed"));
      return;
    }
    const prevCount = wallet?.accounts.length ?? 0;
    const state = await refresh();
    navigateTo(viewAfterAccountCreated(prevCount, state, "accounts"));
  }, [clearError, secret, label, refresh, navigateTo, t, locale, wallet]);

  useRegisterDock({ label: t("common.import"), disabled: !d.ok, onPrimary });

  return (
    <>
      <div className="field">
        <label htmlFor="import-label">{t("common.name")}</label>
        <input
          id="import-label"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          placeholder={t("common.optional")}
          autoComplete="off"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="import-secret">{t("onboarding.secretKey")}</label>
        <SensitiveTextArea
          id="import-secret"
          className="mono-input"
          rows={4}
          placeholder={t("onboarding.secretPlaceholderExample")}
          value={secret}
          onChange={(v) => {
            setSecret(v);
            setErr("");
          }}
        />
        <div id="import-secret-fmt" className={fmtClass}>
          <span className="fmt-dot" aria-hidden="true" />
          <span id="import-secret-fmt-text">{fmtText}</span>
        </div>
      </div>
      <p id="import-secret-err" className="inline-err" aria-live="polite">
        {err}
      </p>
    </>
  );
}
