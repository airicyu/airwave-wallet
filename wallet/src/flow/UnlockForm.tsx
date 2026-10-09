/**
 * Vault password form shown on a website-request page while locked.
 * Does not resolve pending or persist vault ciphertext.
 */
import type { JSX } from "react";
import { useState } from "react";
import { BrandMark } from "../popup/components/BrandMark";
import { WalletPasswordInput } from "../popup/components/WalletPasswordInput";
import { sendExtensionRequest } from "../shared/ext-api";
import type { UiLocale } from "../shared/storage-keys";
import { apiErrorMessage, t } from "../shared/ui-i18n";

export function UnlockForm({
  locale,
  onUnlocked,
}: {
  locale: UiLocale;
  onUnlocked: () => void;
}): JSX.Element {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await sendExtensionRequest("wallet.unlock", { password });
    if (!res.ok) {
      setBusy(false);
      setPassword("");
      setError(apiErrorMessage(locale, res.error, "error.unlockFailed"));
      document.getElementById("connect-unlock-password")?.focus();
      return;
    }
    onUnlocked();
  };

  return (
    <section className="unlock-screen">
      <BrandMark />
      <h1>Airwave</h1>
      <p className="unlock-lead">{t(locale, "unlock.lead")}</p>
      <div className="unlock-form">
        <WalletPasswordInput
          id="connect-unlock-password"
          autoFocus
          placeholder={t(locale, "unlock.passwordPlaceholder")}
          value={password}
          onChange={setPassword}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              void submit();
            }
          }}
        />
        {error ? <p className="inline-error">{error}</p> : null}
        <button
          type="button"
          className="primary-btn"
          disabled={busy}
          onClick={() => void submit()}
        >
          {t(locale, "unlock.submit")}
        </button>
      </div>
    </section>
  );
}
