import type { JSX } from "react";
import type { PublicSettings, UiLocale } from "../../shared/storage-keys";
import { LOCALE_ENDONYM, UI_LOCALES } from "../../shared/ui-i18n";
import { useT } from "../state/useT";
import { patchSettingsPartial, useSettingsIo } from "./settings-logic";

export function LocaleScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale, t } = useT();
  return (
    <div className="network-pick-list" role="radiogroup" aria-label={t("settings.locale.title")}>
      {UI_LOCALES.map((loc) => (
        <label key={loc} className="network-pick-row">
          <input
            type="radio"
            name="settings-locale"
            value={loc}
            checked={settings.locale === loc}
            onChange={() => {
              if (loc === settings.locale) return;
              void patchSettingsPartial({ locale: loc as UiLocale }, io, locale);
            }}
          />
          <span className="network-pick-meta">
            <span className="network-pick-title">{LOCALE_ENDONYM[loc]}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
