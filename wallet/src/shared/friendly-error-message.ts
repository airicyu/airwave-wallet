import { messageForErrorCode, t, type UiLocale } from "./ui-i18n";
import type { MessageKey } from "./ui-messages";

export function isLikelyRpcRateLimitMessage(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.includes("8100002")) return true;
  if (lower.includes("rate limit") || lower.includes("rate-limit") || lower.includes("ratelimit")) return true;
  if (/\b429\b/.test(text)) return true;
  if (lower.includes("too many requests")) return true;
  if (text.includes("速率限制")) return true;
  return false;
}

function rawErrorText(raw: unknown): string {
  if (raw instanceof Error) return raw.message;
  if (typeof raw === "string") return raw;
  return "";
}

/** UI-only：將 code／raw 轉成使用者短句。 */
export function friendlyErrorMessage(
  raw: unknown,
  locale: UiLocale,
  fallbackKey: MessageKey = "error.generic",
): string {
  const text = rawErrorText(raw).trim();
  if (!text) return t(locale, fallbackKey);
  const asCode = messageForErrorCode(locale, text);
  if (asCode !== text) return asCode;
  if (isLikelyRpcRateLimitMessage(text)) return t(locale, "error.rpcRateLimit");
  if (text.includes("npx @solana/errors decode") || /^Solana error #\d+/.test(text)) {
    return t(locale, "error.rpcRequestFailed");
  }
  return text;
}

/** 持倉區不顯示長文，改底部 toast（見 rpc-rate-limit-toast-ux 概念稿）。 */
export function shouldUseRpcTransientToast(raw: string): boolean {
  if (!raw.trim()) return false;
  if (isLikelyRpcRateLimitMessage(raw)) return true;
  if (raw.includes("npx @solana/errors decode")) return true;
  if (/^Solana error #\d+/.test(raw)) return true;
  return false;
}
