/**
 * First-run order before a vault exists: pick UI locale, then create the password.
 * Does not add accounts or show the Mainnet RPC guide.
 */
import type { JSX } from "react";
import { useCallback, useState } from "react";
import { sendExtensionRequest } from "../../shared/ext-api";
import { apiErrorMessage, localeFromChromeUi, LOCALE_ENDONYM, t, UI_LOCALES } from "../../shared/ui-i18n";
import type { UiLocale } from "../../shared/storage-keys";
import { FirstRunBrand } from "../components/FirstRunBrand";
import { usePopupContext } from "../state/PopupContext";
import { SetupScreen } from "./OnboardingScreens";

export function SetupFlow(): JSX.Element {
  const [phase, setPhase] = useState<"locale" | "password">("locale");
  if (phase === "password") return <SetupScreen />;
  return <SetupLocaleScreen onContinue={() => setPhase("password")} />;
}

function SetupLocaleScreen({ onContinue }: { onContinue: () => void }): JSX.Element {
  const { clearError, showError, refresh, wallet } = usePopupContext();
  const [selected, setSelected] = useState<UiLocale>(() => {
    const stored = wallet?.settings.locale;
    if (stored === "en" || stored === "zh-Hans") return stored;
    return localeFromChromeUi();
  });

  const onPrimary = useCallback(async () => {
    clearError();
    const res = await sendExtensionRequest("storage.patchSettings", { locale: selected });
    if (!res.ok) {
      showError(apiErrorMessage(selected, res.error, "error.saveSettingsFailed"));
      return;
    }
    await refresh();
    onContinue();
  }, [clearError, onContinue, refresh, selected, showError]);

  return (
    <section id="setup-locale" className="unlock-screen first-run-page">
      <FirstRunBrand />
      <div className="first-run-main">
        <p className="first-run-lead">{t(selected, "setup.pickLanguage")}</p>
        <div className="unlock-form">
          <div className="network-pick-list" role="radiogroup" aria-label={t(selected, "setup.pickLanguage")}>
            {UI_LOCALES.map((loc) => (
              <label key={loc} className="network-pick-row">
                <input
                  type="radio"
                  name="setup-locale"
                  value={loc}
                  checked={selected === loc}
                  onChange={() => setSelected(loc)}
                />
                <span className="network-pick-meta">
                  <span className="network-pick-title">{LOCALE_ENDONYM[loc]}</span>
                </span>
              </label>
            ))}
          </div>
          <button id="btn-setup-locale" className="primary-btn" type="button" onClick={() => void onPrimary()}>
            {t(selected, "common.next")}
          </button>
        </div>
      </div>
    </section>
  );
}
