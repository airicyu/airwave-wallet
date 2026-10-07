import { address, isAddress } from "@solana/kit";
import {
  homeActivityLimit,
  rowFromSignature,
  rowsFromEnhanced,
  type HomeActivityRow,
} from "../../shared/home-activity";
import type { Settings } from "../../shared/storage-keys";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { extractHeliusApiKey } from "../home-tokens";

const HELIUS_TX_ORIGIN = "https://api.helius.xyz";

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

async function fetchEnhanced(
  owner: string,
  apiKey: string,
): Promise<HomeActivityRow[]> {
  const url = new URL(`${HELIUS_TX_ORIGIN}/v0/addresses/${encodeURIComponent(owner)}/transactions`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("limit", String(homeActivityLimit()));
  url.searchParams.set("token-accounts", "balanceChanged");
  url.searchParams.set("sort-order", "desc");
  url.searchParams.set("commitment", "confirmed");
  const json = await fetchJson(url.toString());
  if (!Array.isArray(json)) throw new Error("activity shape");
  return rowsFromEnhanced(json, owner, "mainnet");
}

async function fetchSignatures(owner: string, settings: Settings): Promise<HomeActivityRow[]> {
  const rpc = solanaRpcForUrl(settings.rpcUrl);
  const sigs = await rpc
    .getSignaturesForAddress(address(owner), { limit: homeActivityLimit() })
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

export async function getHomeActivity(owner: string, settings: Settings): Promise<HomeActivityResult> {
  if (!isAddress(owner)) {
    return { rows: [], error: "unavailable" };
  }
  try {
    const apiKey = extractHeliusApiKey(settings.heliusApiUrl);
    if (settings.cluster === "mainnet" && apiKey) {
      return { rows: await fetchEnhanced(owner, apiKey) };
    }
    return { rows: await fetchSignatures(owner, settings) };
  } catch {
    return { rows: [], error: "unavailable" };
  }
}
