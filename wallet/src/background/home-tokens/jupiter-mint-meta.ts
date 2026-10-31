/**
 * Jupiter tokens v2 search: mint metadata and USD fields on home-token rows.
 * Does not read Solana RPC balances or own the home-token memory cache.
 */
import {
  formatUsdLabel,
  iconLetterForSymbol,
  NATIVE_SOL_ID,
  WRAPPED_SOL_MINT,
  type HomeTokenRow,
} from "../../shared/home";
import { effectiveJupiterApiUrl, sleepAbort } from "../../shared/rpc";

const JUPITER_BATCH_SIZE = 100;
const JUPITER_DELAY_NO_KEY_MS = 2000;
const JUPITER_DELAY_WITH_KEY_MS = 1000;
function jupiterSearchUrl(base: string, query: string): string {
  return `${effectiveJupiterApiUrl(base)}/tokens/v2/search?query=${encodeURIComponent(query)}`;
}

function parseRetryAfterMs(res: Response): number | null {
  const h = res.headers.get("Retry-After");
  if (!h) return null;
  const sec = Number(h);
  if (Number.isFinite(sec) && sec >= 0) return sec * 1000;
  return null;
}

async function fetchWith429Retry(
  input: RequestInfo | URL,
  init: RequestInit,
  signal: AbortSignal,
  maxAttempts = 8,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    let res: Response;
    try {
      res = await fetch(input, { ...init, signal });
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts - 1) {
        await sleepAbort(500 * 2 ** attempt, signal);
        continue;
      }
      throw lastError;
    }
    if (res.status !== 429) return res;
    if (attempt >= maxAttempts - 1) return res;
    const retryMs = parseRetryAfterMs(res) ?? 500 * 2 ** attempt;
    await sleepAbort(retryMs, signal);
  }
  throw lastError ?? new Error("fetch failed");
}

function trimMeta(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function httpsIconUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (!raw.startsWith("https:")) return undefined;
  return raw;
}

type JupiterTokenHit = {
  usdPrice?: number;
  isVerified?: boolean;
  organicScore?: number;
  organicScoreLabel?: string;
  name?: string;
  symbol?: string;
  icon?: string;
};

function parseJupiterSearchArray(json: unknown): Map<string, JupiterTokenHit> {
  const map = new Map<string, JupiterTokenHit>();
  if (!Array.isArray(json)) return map;
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = trimMeta(rec.id);
    if (!id) continue;
    const usdPrice = rec.usdPrice;
    const organicScore = rec.organicScore;
    map.set(id, {
      usdPrice:
        typeof usdPrice === "number" && Number.isFinite(usdPrice) ? usdPrice : undefined,
      isVerified: rec.isVerified === true,
      organicScore:
        typeof organicScore === "number" && Number.isFinite(organicScore)
          ? organicScore
          : undefined,
      organicScoreLabel: trimMeta(rec.organicScoreLabel),
      name: trimMeta(rec.name),
      symbol: trimMeta(rec.symbol),
      icon: httpsIconUrl(rec.icon),
    });
  }
  return map;
}

export async function applyJupiterTokensV2(
  rows: HomeTokenRow[],
  jupiterApiKey: string,
  jupiterApiUrl: string,
  signal: AbortSignal,
): Promise<{ rows: HomeTokenRow[]; error?: string }> {
  const mints: string[] = [];
  const seenMint = new Set<string>();
  for (const row of rows) {
    const mint = row.id === NATIVE_SOL_ID ? WRAPPED_SOL_MINT : row.id;
    if (seenMint.has(mint)) continue;
    seenMint.add(mint);
    mints.push(mint);
  }
  if (mints.length === 0) return { rows };

  const byMint = new Map<string, JupiterTokenHit>();
  const key = jupiterApiKey.trim();
  const batchDelay = key ? JUPITER_DELAY_WITH_KEY_MS : JUPITER_DELAY_NO_KEY_MS;
  const headers: Record<string, string> = {};
  if (key) headers["x-api-key"] = key;

  for (let i = 0; i < mints.length; i += JUPITER_BATCH_SIZE) {
    if (i > 0) await sleepAbort(batchDelay, signal);
    const batch = mints.slice(i, i + JUPITER_BATCH_SIZE);
    const url = jupiterSearchUrl(jupiterApiUrl, batch.join(","));
    const res = await fetchWith429Retry(url, { method: "GET", headers }, signal);
    if (res.status === 401 || res.status === 403) {
      return { rows, error: "JUPITER_REFRESH_FAILED" };
    }
    if (!res.ok) {
      if (res.status === 429) throw new Error("Jupiter 速率限制（429）");
      throw new Error(`Jupiter 請求失敗（HTTP ${res.status}）`);
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new Error("Jupiter 回應無法解析");
    }
    for (const [mint, hit] of parseJupiterSearchArray(json)) {
      byMint.set(mint, hit);
    }
  }

  const next = rows.map((row) => {
    const mint = row.id === NATIVE_SOL_ID ? WRAPPED_SOL_MINT : row.id;
    const hit = byMint.get(mint);
    if (!hit) return row;
    const patched: HomeTokenRow = { ...row };
    if (hit.usdPrice != null) {
      const qty = row.uiAmount;
      const total = Number.isFinite(qty) ? hit.usdPrice * qty : hit.usdPrice;
      patched.usdLabel = formatUsdLabel(total);
      patched.usdTotal = Number.isFinite(total) ? total : undefined;
    }
    if (hit.isVerified) patched.isVerified = true;
    if (hit.organicScore != null) patched.organicScore = hit.organicScore;
    if (hit.organicScoreLabel) patched.organicScoreLabel = hit.organicScoreLabel;
    if (hit.icon) patched.iconUrl = hit.icon;
    const lockName =
      row.id === NATIVE_SOL_ID || row.id === WRAPPED_SOL_MINT;
    if (!lockName) {
      if (hit.name) patched.name = hit.name;
      if (hit.symbol) {
        patched.symbol = hit.symbol;
        patched.iconLetter = iconLetterForSymbol(hit.symbol);
      }
    }
    return patched;
  });

  return { rows: next };
}

export type MintDisplayMeta = {
  symbol?: string;
  iconUrl?: string;
  isVerified?: boolean;
  organicScore?: number;
};

/** Mainnet: batch-fetch symbol/icon via Jupiter tokens v2 search. */
export async function lookupJupiterMintMetadata(
  mints: string[],
  jupiterApiKey: string,
  jupiterApiUrl: string,
): Promise<Map<string, MintDisplayMeta>> {
  const out = new Map<string, MintDisplayMeta>();
  if (mints.length === 0) return out;

  const signal = new AbortController().signal;
  const key = jupiterApiKey.trim();
  const batchDelay = key ? JUPITER_DELAY_WITH_KEY_MS : JUPITER_DELAY_NO_KEY_MS;
  const headers: Record<string, string> = {};
  if (key) headers["x-api-key"] = key;

  for (let i = 0; i < mints.length; i += JUPITER_BATCH_SIZE) {
    if (i > 0) await sleepAbort(batchDelay, signal);
    const batch = mints.slice(i, i + JUPITER_BATCH_SIZE);
    const url = jupiterSearchUrl(jupiterApiUrl, batch.join(","));
    try {
      const res = await fetchWith429Retry(url, { method: "GET", headers }, signal);
      if (!res.ok) break;
      const json = (await res.json()) as unknown;
      for (const [mint, hit] of parseJupiterSearchArray(json)) {
        const symbol = hit.symbol?.trim();
        const iconUrl = hit.icon;
        if (!symbol && !iconUrl && hit.isVerified !== true) continue;
        out.set(mint, {
          symbol: symbol || undefined,
          iconUrl,
          isVerified: hit.isVerified === true ? true : undefined,
          organicScore: hit.organicScore,
        });
      }
    } catch {
      break;
    }
  }
  return out;
}
