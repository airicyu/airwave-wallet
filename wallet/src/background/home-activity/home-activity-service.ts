/**
 * Fetches one page of activity (Helius enhanced or signature list), optionally before a cursor, and attaches https token icons.
 * Does not persist history or render popup UI.
 */
import { address, isAddress, type Signature } from "@solana/kit";
import {
  activityDetailWithSymbols,
  homeActivityLimit,
  rowFromSignature,
  rowsFromEnhanced,
  type HomeActivityRow,
} from "../../shared/home-activity";
import { jsonRpcMissing, type Settings } from "../../shared/storage-keys";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { resolveHeliusApiTarget, type HeliusApiTarget } from "../../shared/helius-api-target";
import {
  lookupJupiterMintMetadata,
  peekCachedMintDisplay,
} from "../home-tokens/home-tokens-service";

export type HomeActivityResult =
  | { rows: HomeActivityRow[]; error?: undefined }
  | { rows: []; error: "unavailable" };

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    if (!res.ok) throw new Error("activity http");
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function attachIcons(rows: HomeActivityRow[], settings: Settings): Promise<HomeActivityRow[]> {
  const needed = [...new Set(rows.flatMap((row) => row.mints))];
  if (needed.length === 0) return rows;
  const icons = new Map<string, string>();
  const symbols = new Map<string, string>();
  const missing: string[] = [];
  for (const mint of needed) {
    const cached = peekCachedMintDisplay(mint);
    if (cached.iconUrl) icons.set(mint, cached.iconUrl);
    const ticker = cached.symbol && !cached.symbol.includes("…") && cached.symbol !== mint ? cached.symbol : undefined;
    if (ticker) symbols.set(mint, ticker);
    if (!cached.iconUrl || !ticker) missing.push(mint);
  }
  if (missing.length > 0 && settings.cluster === "mainnet") {
    try {
      const jup = await lookupJupiterMintMetadata(missing, settings.jupiterApiKey);
      for (const [mint, meta] of jup) {
        const url = meta.iconUrl;
        if (url && url.startsWith("https:") && !icons.has(mint)) icons.set(mint, url);
        const symbol = meta.symbol?.trim();
        if (symbol && !symbols.has(mint) && !symbol.includes("…") && symbol !== mint) {
          symbols.set(mint, symbol);
        }
      }
    } catch {
      /* rows still usable without icons／symbols */
    }
  }
  return rows.map((row) => ({
    ...row,
    detail: activityDetailWithSymbols(row.detail, row.mints, symbols),
    icons: row.mints.flatMap((mint) => {
      const iconUrl = icons.get(mint);
      return iconUrl ? [{ mint, iconUrl }] : [];
    }),
  }));
}

async function fetchEnhanced(
  owner: string,
  target: HeliusApiTarget,
  settings: Settings,
  before?: string,
): Promise<HomeActivityRow[]> {
  const url = new URL(`${target.origin}/v0/addresses/${encodeURIComponent(owner)}/transactions`);
  if (target.apiKey) url.searchParams.set("api-key", target.apiKey);
  url.searchParams.set("limit", String(homeActivityLimit()));
  url.searchParams.set("token-accounts", "balanceChanged");
  url.searchParams.set("sort-order", "desc");
  url.searchParams.set("commitment", "confirmed");
  if (before) url.searchParams.set("before", before);
  const json = await fetchJson(url.toString());
  if (!Array.isArray(json)) throw new Error("activity shape");
  return attachIcons(rowsFromEnhanced(json, owner, "mainnet"), settings);
}

async function fetchSignatures(
  owner: string,
  settings: Settings,
  before?: string,
): Promise<HomeActivityRow[]> {
  const rpc = solanaRpcForUrl(settings.rpcUrl);
  const sigs = await rpc
    .getSignaturesForAddress(address(owner), {
      limit: homeActivityLimit(),
      ...(before ? { before: before as Signature } : {}),
    })
    .send();
  return sigs.slice(0, homeActivityLimit()).map((sig) =>
    rowFromSignature(
      sig.signature,
      sig.err,
      typeof sig.blockTime === "number" ? sig.blockTime : null,
      settings.cluster,
    ),
  );
}

export async function getHomeActivity(
  owner: string,
  settings: Settings,
  before?: string,
): Promise<HomeActivityResult> {
  if (!isAddress(owner)) {
    return { rows: [], error: "unavailable" };
  }
  try {
    const helius = resolveHeliusApiTarget(settings.heliusApiUrl);
    if (jsonRpcMissing(settings) && !helius) {
      return { rows: [], error: "unavailable" };
    }
    if (settings.cluster === "mainnet" && helius) {
      return { rows: await fetchEnhanced(owner, helius, settings, before) };
    }
    return { rows: await fetchSignatures(owner, settings, before) };
  } catch {
    return { rows: [], error: "unavailable" };
  }
}
