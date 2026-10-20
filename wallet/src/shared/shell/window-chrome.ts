/**
 * Writes document.lang and document.title from an already-translated string.
 * Does not look up catalog keys or decide which surface owns the title.
 */
import type { UiLocale } from "../protocol";
import { parseUiLocale } from "../i18n";

export function applyWindowChrome(locale: UiLocale, title: string): void {
  document.documentElement.lang = parseUiLocale(locale);
  document.title = title;
}
