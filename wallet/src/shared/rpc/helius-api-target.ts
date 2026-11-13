/**
 * Turns a stored Helius credential into an API key.
 * A leftover full URL is accepted only long enough to read its api-key query.
 * Does not choose an RPC host or fetch Helius.
 */

export const OFFICIAL_HELIUS_API_ORIGIN = "https://api.helius.xyz";

export function heliusApiKeyFromStored(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("https://") || t.startsWith("http://")) {
    try {
      const u = new URL(t);
      const key = u.searchParams.get("api-key")?.trim() || u.searchParams.get("apiKey")?.trim() || "";
      return key || null;
    } catch {
      return null;
    }
  }
  if (/\s/.test(t)) return null;
  return t;
}

export function heliusRpcUrl(cluster: "devnet" | "mainnet", apiKey: string): string {
  const host = cluster === "devnet" ? "devnet.helius-rpc.com" : "mainnet.helius-rpc.com";
  return `https://${host}/?api-key=${encodeURIComponent(apiKey)}`;
}
