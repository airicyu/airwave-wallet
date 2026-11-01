/**
 * Resolves Settings heliusApiUrl into an enhanced-tx REST origin and optional key.
 * Accepts https origins and http://127.0.0.1 or http://localhost for a local mock.
 * Does not fetch Helius or treat this URL as JSON-RPC.
 */

export const OFFICIAL_HELIUS_API_ORIGIN = "https://api.helius.xyz";

export type HeliusApiTarget = {
  origin: string;
  apiKey: string | null;
};

function queryApiKey(u: URL): string | null {
  const dashed = u.searchParams.get("api-key")?.trim();
  if (dashed) return dashed;
  const camel = u.searchParams.get("apiKey")?.trim();
  return camel || null;
}

function isOfficialHeliusHost(host: string): boolean {
  return host === "api.helius.xyz" || host === "mainnet.helius-rpc.com" || host.endsWith(".helius-rpc.com");
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

function isLocalHttp(url: string): boolean {
  if (!url.startsWith("http://")) return false;
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

export function resolveHeliusApiTarget(heliusApiUrl: string): HeliusApiTarget | null {
  const t = heliusApiUrl.trim();
  if (!t) return null;

  if (t.startsWith("https://") || isLocalHttp(t)) {
    let u: URL;
    try {
      u = new URL(t);
    } catch {
      return null;
    }
    const apiKey = queryApiKey(u);
    if (isOfficialHeliusHost(u.hostname)) {
      if (!apiKey) return null;
      return { origin: OFFICIAL_HELIUS_API_ORIGIN, apiKey };
    }
    const path = u.pathname === "/" ? "" : stripTrailingSlash(u.pathname);
    return { origin: stripTrailingSlash(`${u.origin}${path}`), apiKey };
  }

  if (t.startsWith("77")) {
    return { origin: OFFICIAL_HELIUS_API_ORIGIN, apiKey: t };
  }

  return null;
}
