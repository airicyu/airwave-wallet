import { messages, type MessageKey } from "./ui-messages";
import type { UiLocale } from "./storage-keys";

export type { UiLocale };

export const UI_LOCALES: readonly UiLocale[] = ["zh-Hant", "zh-Hans", "en"];

export const DEFAULT_UI_LOCALE: UiLocale = "zh-Hant";

/** Endonym for language picker rows (not translated by interface locale). */
export const LOCALE_ENDONYM: Record<UiLocale, string> = {
  "zh-Hant": "繁體中文",
  "zh-Hans": "简体中文",
  en: "English",
};

export function parseUiLocale(v: unknown): UiLocale {
  if (v === "zh-Hant" || v === "zh-Hans" || v === "en") return v;
  return DEFAULT_UI_LOCALE;
}

function interpolate(template: string, vars?: Record<string, string>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

export function t(locale: UiLocale, key: MessageKey, vars?: Record<string, string>): string {
  const loc = parseUiLocale(locale);
  const row = messages[key];
  const template = row[loc];
  return interpolate(template, vars);
}

export function messageForErrorCode(locale: UiLocale, code: string): string {
  const key = `error.code.${code}`;
  if (key in messages) return t(locale, key as MessageKey);
  return code;
}

/** Stored UI error token: catalog key, command code, or rare raw fallback. */
export function displayStoredError(locale: UiLocale, token: string): string {
  if (token in messages) return t(locale, token as MessageKey);
  const fromCode = messageForErrorCode(locale, token);
  if (fromCode !== token) return fromCode;
  return token;
}

/** Map extension API errors to catalog text; `fallbackKey` when nothing else applies. */
export function apiErrorMessage(
  locale: UiLocale,
  error: { code?: string; message?: string } | undefined,
  fallbackKey: MessageKey,
): string {
  if (error?.code) {
    return messageForErrorCode(locale, error.code);
  }
  if (error?.message) {
    const msgKey = `error.code.${error.message}`;
    if (msgKey in messages) return t(locale, msgKey as MessageKey);
    if (/^[A-Z][A-Z0-9_]+$/.test(error.message)) {
      return messageForErrorCode(locale, error.message);
    }
    return error.message;
  }
  return t(locale, fallbackKey);
}

export function ixKindLabel(locale: UiLocale, kind: string): string {
  const key = `ix.${kind}`;
  if (key in messages) return t(locale, key as MessageKey);
  return kind;
}

export function ixRoleLabel(locale: UiLocale, role: string): string {
  const key = `ix.role.${role}`;
  if (key in messages) return t(locale, key as MessageKey);
  return role;
}
