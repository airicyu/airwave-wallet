/**
 * Default Jupiter and OpenRouter API bases, and the URL a call should use.
 * Does not read settings or perform HTTP.
 */

export const DEFAULT_JUPITER_API_URL = "https://api.jup.ag";
export const DEFAULT_OPENROUTER_API_URL = "https://openrouter.ai";

function httpsBase(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    if (!parsed.hostname) return false;
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:") {
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    }
    return false;
  } catch {
    return false;
  }
}

/** Empty, debug off, or not an http(s) base: the built-in Jupiter origin. */
export function effectiveJupiterApiUrl(stored: string | undefined): string {
  const t = (stored ?? "").trim().replace(/\/+$/, "");
  if (!t || !httpsBase(t)) return DEFAULT_JUPITER_API_URL;
  return t;
}

/** Empty, debug off, or not an http(s) base: the built-in OpenRouter origin. */
export function effectiveOpenRouterApiUrl(stored: string | undefined): string {
  const t = (stored ?? "").trim().replace(/\/+$/, "");
  if (!t || !httpsBase(t)) return DEFAULT_OPENROUTER_API_URL;
  return t;
}

export function jupiterApiUrlForCall(settings: { debugModeEnabled: boolean; jupiterApiUrl: string }): string {
  if (!settings.debugModeEnabled) return DEFAULT_JUPITER_API_URL;
  return effectiveJupiterApiUrl(settings.jupiterApiUrl);
}

export function openRouterApiUrlForCall(settings: { debugModeEnabled: boolean; openRouterApiUrl: string }): string {
  if (!settings.debugModeEnabled) return DEFAULT_OPENROUTER_API_URL;
  return effectiveOpenRouterApiUrl(settings.openRouterApiUrl);
}

/** True when a settings patch may store this vendor base (empty keeps the runtime default). */
export function isVendorApiUrlDraft(url: string): boolean {
  const t = url.trim();
  if (!t) return true;
  return httpsBase(t);
}
