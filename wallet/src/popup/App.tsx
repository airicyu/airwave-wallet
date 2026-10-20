import type { JSX } from "react";
import { useEffect } from "react";
import { parseUiLocale, t } from "../shared/i18n";
import { applyWindowChrome } from "../shared/shell";
import { PopupMarkup } from "./PopupMarkup";
import { PopupProvider } from "./state/PopupContext";
import { DockProvider } from "./state/dock";
import { usePopupAppState } from "./state/usePopupAppState";

export function App(): JSX.Element {
  const api = usePopupAppState();
  const storedLocale = api.wallet?.settings.locale;
  useEffect(() => {
    if (!storedLocale) return;
    const locale = parseUiLocale(storedLocale);
    applyWindowChrome(locale, t(locale, "window.title.wallet"));
  }, [storedLocale]);
  return (
    <PopupProvider value={api}>
      <DockProvider>
        <div id="app">
          <PopupMarkup />
        </div>
      </DockProvider>
    </PopupProvider>
  );
}
