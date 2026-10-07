/** 持倉／RPC 速率限制時給使用者看的短句 */
export const RPC_RATE_LIMIT_USER_MESSAGE = "RPC 速率限制，請稍後再試";

export function isLikelyRpcRateLimitMessage(text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes("8100002")) return true;
  if (t.includes("rate limit") || t.includes("rate-limit") || t.includes("ratelimit")) return true;
  if (/\b429\b/.test(text)) return true;
  if (t.includes("too many requests")) return true;
  if (text.includes("速率限制")) return true;
  return false;
}

function rawErrorText(raw: unknown): string {
  if (raw instanceof Error) return raw.message;
  if (typeof raw === "string") return raw;
  return "";
}

/** 將 Kit／Helius 等技術訊息轉成適合畫面的文案；無法辨識則回傳原字串或 fallback。 */
export function friendlyErrorMessage(raw: unknown, fallback = "發生錯誤，請稍後再試"): string {
  const text = rawErrorText(raw).trim();
  if (!text) return fallback;
  if (isLikelyRpcRateLimitMessage(text)) return RPC_RATE_LIMIT_USER_MESSAGE;
  if (text.includes("npx @solana/errors decode") || /^Solana error #\d+/.test(text)) {
    return "RPC 請求失敗，請稍後再試";
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
