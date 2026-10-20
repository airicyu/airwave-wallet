import type { JSX } from "react";
import type { PublicSettings } from "../../shared/protocol";
import type { UiLocale } from "../../shared/protocol";
import { LOCALE_ENDONYM, t } from "../../shared/i18n";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";

function txAiHubOnOff(settings: PublicSettings, locale: UiLocale): string {
  return settings.txAiAnalysisEnabled
    ? t(locale, "settings.txAiAnalysis.enable")
    : t(locale, "settings.txAiAnalysis.off");
}

export function SettingsHub({ settings }: { settings: PublicSettings }): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t, locale } = useT();
  return (
    <ul className="settings-hub-list" id="settings-hub-list">
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-locale")}>
          <span className="hub-label">{t("settings.hub.language")}</span>
          <span className="hub-summary" id="hub-summary-locale">
            {LOCALE_ENDONYM[settings.locale]}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-rpc")}>
          <span className="hub-label">{t("settings.hub.rpc")}</span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-keys")}>
          <span className="hub-label">{t("settings.hub.apiKeys")}</span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-tx-ai")}>
          <span className="hub-label">{t("settings.hub.txAi")}</span>
          <span className="hub-summary" id="hub-summary-tx-ai">
            {txAiHubOnOff(settings, locale)}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-cu-price")}>
          <span className="hub-label">{t("settings.hub.cuPrice")}</span>
          <span className="hub-summary" id="hub-summary-cu-price">
            {String(settings.defaultCuPrice)}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-wallet-lock")}>
          <span className="hub-label">{t("settings.hub.walletLock")}</span>
        </button>
      </li>
    </ul>
  );
}
