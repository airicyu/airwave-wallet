/**
 * The settings list. Each row opens one settings screen and shows that screen's icon.
 * The individual screens own their fields. This hub does not write settings itself.
 */
import type { JSX } from "react";
import type { PublicSettings } from "../../shared/protocol";
import type { UiLocale } from "../../shared/protocol";
import { LOCALE_ENDONYM, t } from "../../shared/i18n";
import { IconBug, IconCoin, IconGlobe, IconKey, IconLock, IconNetwork, IconSpark } from "../components/StrokeIcon";
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
          <span className="hub-main">
            <span className="hub-ico"><IconGlobe size={18} /></span>
            <span className="hub-label">{t("settings.hub.language")}</span>
          </span>
          <span className="hub-summary" id="hub-summary-locale">
            {LOCALE_ENDONYM[settings.locale]}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-rpc")}>
          <span className="hub-main">
            <span className="hub-ico"><IconNetwork size={18} /></span>
            <span className="hub-label">{t("settings.hub.rpc")}</span>
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-keys")}>
          <span className="hub-main">
            <span className="hub-ico"><IconKey size={18} /></span>
            <span className="hub-label">{t("settings.hub.apiKeys")}</span>
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-tx-ai")}>
          <span className="hub-main">
            <span className="hub-ico"><IconSpark size={18} /></span>
            <span className="hub-label">{t("settings.hub.txAi")}</span>
          </span>
          <span className="hub-summary" id="hub-summary-tx-ai">
            {txAiHubOnOff(settings, locale)}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-tx-fee")}>
          <span className="hub-main">
            <span className="hub-ico"><IconCoin size={18} /></span>
            <span className="hub-label">{t("settings.hub.txFee")}</span>
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-wallet-lock")}>
          <span className="hub-main">
            <span className="hub-ico"><IconLock size={18} /></span>
            <span className="hub-label">{t("settings.hub.walletLock")}</span>
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-debug")}>
          <span className="hub-main">
            <span className="hub-ico"><IconBug size={18} /></span>
            <span className="hub-label">{t("settings.hub.debug")}</span>
          </span>
          <span className="hub-summary" id="hub-summary-debug">
            {settings.debugModeEnabled ? t("settings.txAiAnalysis.enable") : t("settings.txAiAnalysis.off")}
          </span>
        </button>
      </li>
    </ul>
  );
}
