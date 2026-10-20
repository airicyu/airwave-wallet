import { useCallback } from "react";
import { t, type UiLocale } from "../../shared/i18n";
import type { MessageKey } from "../../shared/i18n";
import { usePopupContext } from "./PopupContext";

export function useT(): {
  locale: UiLocale;
  t: (key: MessageKey, vars?: Record<string, string>) => string;
} {
  const { wallet } = usePopupContext();
  const locale = wallet?.settings.locale ?? "zh-Hant";
  const translate = useCallback(
    (key: MessageKey, vars?: Record<string, string>) => t(locale, key, vars),
    [locale],
  );
  return { locale, t: translate };
}
