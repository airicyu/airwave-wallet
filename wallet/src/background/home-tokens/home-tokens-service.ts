/**
 * Loads and caches home token balances and mint metadata (RPC, Jupiter) for popup display.
 * Does not sign transfers or manage vault encryption.
 */
import { address } from "@solana/kit";
import type { Settings } from "../../shared/storage-keys";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import {
  NATIVE_SOL_ID,
  WRAPPED_SOL_MINT,
  buildHomeTokenRowsFromOwnerParsed,
  formatUsdLabel,
  iconLetterForSymbol,
  sortHomeTokenRows,
  type HomeTokenMemberShare,
  type HomeTokenRow,
} from "../../shared/home-tokens";
import {
  fetchParsedTokenAccountsForOwner,
  type ParsedOwnerTokenAccount,
} from "../../shared/parsed-token-accounts";
import { isRpcRateLimitError, withRateLimitRetry } from "../../shared/rpc-rate-limit";
import { setOwnerParsedTokenAccounts } from "./owner-parsed-token-cache";

export type GetHomeTokensResult = {
  rows: HomeTokenRow[];
  error?: string;
  fromCache?: boolean;
};

const TTL_MS = 45_000;
/** Skip a background refresh when the cache is still fresh (avoids a second RPC after a force refresh). */
const BACKGROUND_REFRESH_MIN_CACHE_AGE_MS = 10_000;
const OWNER_PIPE_GAP_MS = 250;
const OWNER_RETRY_PASS_GAP_MS = 1500;
const OWNER_RATE_LIMIT_PASSES = 3;
const JUPITER_BATCH_SIZE = 100;
const JUPITER_DELAY_NO_KEY_MS = 2000;
const JUPITER_DELAY_WITH_KEY_MS = 1000;
const JUPITER_BASE = "https://api.jup.ag";

type CacheEntry = {
  fingerprint: string;
  rows: HomeTokenRow[];
  fetchedAt: number;
};

let memoryCache: CacheEntry | null = null;

export type PeekedMintDisplay = {
  iconUrl?: string;
  symbol?: string;
};

/** In-memory home-token icon／symbol only. Does not fetch Jupiter or refresh balances. */
export function peekCachedMintDisplay(mint: string): PeekedMintDisplay {
  const rows = memoryCache?.rows;
  if (!rows) return {};
  const httpsUrl = (url: string | undefined): string | undefined =>
    url && url.startsWith("https:") ? url : undefined;
  const rowForMint = (): HomeTokenRow | undefined => {
    if (mint === WRAPPED_SOL_MINT) {
      return rows.find((row) => row.id === NATIVE_SOL_ID) ?? rows.find((row) => row.id === WRAPPED_SOL_MINT);
    }
    return rows.find((item) => item.id === mint);
  };
  const row = rowForMint();
  if (!row) return {};
  const symbol = row.symbol?.trim();
  return {
    iconUrl: httpsUrl(row.iconUrl),
    symbol: symbol || undefined,
  };
}

type InFlight = {
  fingerprint: string;
  abort: AbortController;
  promise: Promise<GetHomeTokensResult>;
};

let inFlight: InFlight | null = null;
let backgroundRefreshFingerprint: string | null = null;

function scheduleBackgroundRefresh(
  owners: string[],
  settings: Settings,
  fingerprint: string,
  withMembers: boolean,
): void {
  if (inFlight || backgroundRefreshFingerprint === fingerprint) return;
  backgroundRefreshFingerprint = fingerprint;
  const abort = new AbortController();
  void runRefresh(owners, settings, abort.signal, fingerprint, withMembers)
    .catch(() => {
      /* Keep the previous cache if a background refresh fails. */
    })
    .finally(() => {
      if (backgroundRefreshFingerprint === fingerprint) {
        backgroundRefreshFingerprint = null;
      }
    });
}

export function homeTokensCacheFingerprint(owners: string[], settings: Settings): string {
  const ownersJoin = owners.join("\u001f");
  const rpc = `${settings.rpcByCluster.devnet.active}:${settings.rpcByCluster.devnet.urls.join(",")}|${settings.rpcByCluster.mainnet.active}:${settings.rpcByCluster.mainnet.urls.join(",")}`;
  return `${ownersJoin}|${settings.cluster}|${rpc}|${settings.rpcUrl}|${settings.jupiterApiKey}`;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
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
        await sleep(500 * 2 ** attempt, signal);
        continue;
      }
      throw lastError;
    }
    if (res.status !== 429) return res;
    if (attempt >= maxAttempts - 1) return res;
    const retryMs = parseRetryAfterMs(res) ?? 500 * 2 ** attempt;
    await sleep(retryMs, signal);
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

async function applyJupiterTokensV2(
  rows: HomeTokenRow[],
  jupiterApiKey: string,
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
    if (i > 0) await sleep(batchDelay, signal);
    const batch = mints.slice(i, i + JUPITER_BATCH_SIZE);
    const url = `${JUPITER_BASE}/tokens/v2/search?query=${encodeURIComponent(batch.join(","))}`;
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

function finiteUnitPriceFromRow(row: HomeTokenRow): number | undefined {
  if (row.usdTotal == null || !Number.isFinite(row.usdTotal)) return undefined;
  if (row.uiAmount <= 0 || !Number.isFinite(row.uiAmount)) return undefined;
  const unit = row.usdTotal / row.uiAmount;
  return Number.isFinite(unit) ? unit : undefined;
}

function mergedUsdFields(
  perOwner: Map<string, HomeTokenRow>,
  totalUi: number,
): { usdLabel: string; usdTotal?: number } {
  let sum = 0;
  let hasSum = false;
  for (const row of perOwner.values()) {
    if (row.usdTotal != null && Number.isFinite(row.usdTotal)) {
      sum += row.usdTotal;
      hasSum = true;
    }
  }
  if (hasSum) {
    return { usdLabel: formatUsdLabel(sum), usdTotal: sum };
  }
  for (const row of perOwner.values()) {
    const unit = finiteUnitPriceFromRow(row);
    if (unit != null) {
      const total = totalUi * unit;
      if (Number.isFinite(total)) {
        return { usdLabel: formatUsdLabel(total), usdTotal: total };
      }
    }
  }
  return { usdLabel: "—" };
}

function mergeMultiOwnerRows(
  perOwner: { owner: string; rows: HomeTokenRow[] }[],
  ownerOrder: string[],
): HomeTokenRow[] {
  const orderIndex = new Map(ownerOrder.map((o, i) => [o, i]));
  const byId = new Map<
    string,
    {
      template: HomeTokenRow;
      totalUi: number;
      perOwner: Map<string, HomeTokenRow>;
    }
  >();

  for (const { owner, rows } of perOwner) {
    for (const row of rows) {
      let bucket = byId.get(row.id);
      if (!bucket) {
        bucket = { template: { ...row, members: undefined }, totalUi: 0, perOwner: new Map() };
        byId.set(row.id, bucket);
      }
      bucket.totalUi += row.uiAmount;
      bucket.perOwner.set(owner, row);
      if (row.iconUrl && !bucket.template.iconUrl) bucket.template.iconUrl = row.iconUrl;
      if (row.name && bucket.template.name === bucket.template.symbol) {
        bucket.template.name = row.name;
      }
    }
  }

  const merged: HomeTokenRow[] = [];
  for (const [id, bucket] of byId) {
    const total = bucket.totalUi;
    const template = bucket.template;
    const decimalsHint =
      id === NATIVE_SOL_ID ? 9 : Math.min(9, (template.uiAmountLabel.split(".")[1]?.length ?? 0) || 0);

    const members: HomeTokenMemberShare[] = [];
    const sortedOwners = [...bucket.perOwner.keys()].sort(
      (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
    );
    for (const owner of sortedOwners) {
      const row = bucket.perOwner.get(owner)!;
      if (row.uiAmount <= 0) continue;
      members.push({
        pubkey: owner,
        uiAmount: row.uiAmount,
        uiAmountLabel: row.uiAmountLabel,
        percent: total > 0 ? (100 * row.uiAmount) / total : 0,
      });
    }

    const usd = mergedUsdFields(bucket.perOwner, total);
    const mergedRow: HomeTokenRow = {
      ...template,
      id,
      uiAmount: total,
      uiAmountLabel: total.toLocaleString(undefined, {
        maximumFractionDigits: id === NATIVE_SOL_ID ? 9 : decimalsHint,
      }),
      usdLabel: usd.usdLabel,
      usdTotal: usd.usdTotal,
      members: members.length > 0 ? members : undefined,
    };
    if (id !== NATIVE_SOL_ID && total === 0) continue;
    merged.push(mergedRow);
  }

  return sortHomeTokenRows(merged);
}

async function fetchSingleOwnerRowsWithParsed(
  owner: string,
  settings: Settings,
  signal: AbortSignal,
): Promise<{ rows: HomeTokenRow[]; parsed: ParsedOwnerTokenAccount[] }> {
  const rpc = solanaRpcForUrl(settings.rpcUrl);
  const pk = address(owner);
  const lamports = Number(
    (await withRateLimitRetry(
      () => rpc.getBalance(pk, { commitment: "confirmed" }).send(),
      signal,
    )).value,
  );
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const parsed = await fetchParsedTokenAccountsForOwner(settings.rpcUrl, owner, signal);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const rows = buildHomeTokenRowsFromOwnerParsed(lamports, parsed);
  return { rows, parsed };
}

async function runRefresh(
  owners: string[],
  settings: Settings,
  signal: AbortSignal,
  fingerprint: string,
  withMembers: boolean,
): Promise<GetHomeTokensResult> {
  const cached =
    memoryCache?.fingerprint === fingerprint ? memoryCache.rows : undefined;

  if (owners.length === 0) return { rows: [] };

  try {
    const perOwner: { owner: string; rows: HomeTokenRow[] }[] = [];
    let pending = [...owners];
    for (let pass = 0; pass < OWNER_RATE_LIMIT_PASSES && pending.length > 0; pass++) {
      const still: string[] = [];
      for (let i = 0; i < pending.length; i++) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        if (owners.length > 1 && (pass > 0 || i > 0)) {
          await sleep(pass === 0 ? OWNER_PIPE_GAP_MS : OWNER_RETRY_PASS_GAP_MS, signal);
        }
        const owner = pending[i];
        try {
          const { rows, parsed } = await fetchSingleOwnerRowsWithParsed(owner, settings, signal);
          setOwnerParsedTokenAccounts(fingerprint, owner, parsed);
          perOwner.push({ owner, rows });
        } catch (e) {
          if (signal.aborted || (e instanceof DOMException && e.name === "AbortError")) throw e;
          if (isRpcRateLimitError(e)) {
            still.push(owner);
            continue;
          }
          throw e;
        }
      }
      pending = still;
    }
    if (pending.length > 0) {
      if (cached?.length) {
        return { rows: cached, error: "HTTP 429 rate limit" };
      }
      if (perOwner.length === 0) {
        return { rows: [], error: "HTTP 429 rate limit" };
      }
      const rows = withMembers
        ? mergeMultiOwnerRows(perOwner, owners)
        : sortHomeTokenRows(perOwner[0]?.rows ?? []);
      return { rows, error: "HTTP 429 rate limit" };
    }

    let rows = withMembers
        ? mergeMultiOwnerRows(perOwner, owners)
        : sortHomeTokenRows(perOwner[0]?.rows ?? []);

    if (settings.cluster === "mainnet") {
      try {
        const jup = await applyJupiterTokensV2(rows, settings.jupiterApiKey, signal);
        rows = sortHomeTokenRows(jup.rows);
        if (jup.error) {
          memoryCache = { fingerprint, rows, fetchedAt: Date.now() };
          return { rows, error: "JUPITER_REFRESH_FAILED" };
        }
      } catch (e) {
        rows = sortHomeTokenRows(rows);
        memoryCache = { fingerprint, rows, fetchedAt: Date.now() };
        return { rows, error: "JUPITER_REFRESH_FAILED" };
      }
    }

    rows = sortHomeTokenRows(rows);
    memoryCache = { fingerprint, rows, fetchedAt: Date.now() };
    return { rows };
  } catch (e) {
    if (signal.aborted) {
      if (cached) return { rows: cached, error: "CANCELLED" };
      return { rows: [], error: "CANCELLED" };
    }
    const loadError = isRpcRateLimitError(e) ? "HTTP 429 rate limit" : "HOLDINGS_LOAD_FAILED";
    if (cached?.length) {
      return { rows: cached, error: loadError };
    }
    return { rows: [], error: loadError };
  }
}

export async function getHomeTokensForOwners(
  owners: string[],
  settings: Settings,
  options?: { force?: boolean; withMembers?: boolean },
): Promise<GetHomeTokensResult> {
  if (owners.length === 0) return { rows: [] };

  const fingerprint = homeTokensCacheFingerprint(owners, settings);
  const force = options?.force === true;
  const withMembers = options?.withMembers === true;

  if (
    !force &&
    memoryCache &&
    memoryCache.fingerprint === fingerprint &&
    Date.now() - memoryCache.fetchedAt < TTL_MS
  ) {
    const cacheAgeMs = Date.now() - memoryCache.fetchedAt;
    if (cacheAgeMs >= BACKGROUND_REFRESH_MIN_CACHE_AGE_MS) {
      scheduleBackgroundRefresh(owners, settings, fingerprint, withMembers);
    }
    return { rows: memoryCache.rows, fromCache: true };
  }

  if (inFlight) {
    if (inFlight.fingerprint === fingerprint) {
      return inFlight.promise;
    }
    inFlight.abort.abort();
    inFlight = null;
  }

  const abort = new AbortController();
  const promise = runRefresh(owners, settings, abort.signal, fingerprint, withMembers);
  inFlight = { fingerprint, abort, promise };
  try {
    return await promise;
  } finally {
    if (inFlight?.promise === promise) inFlight = null;
  }
}

export type MintDisplayMeta = {
  symbol?: string;
  iconUrl?: string;
};

/** Mainnet: batch-fetch symbol/icon via Jupiter tokens v2 search. */
export async function lookupJupiterMintMetadata(
  mints: string[],
  jupiterApiKey: string,
): Promise<Map<string, MintDisplayMeta>> {
  const out = new Map<string, MintDisplayMeta>();
  if (mints.length === 0) return out;

  const signal = new AbortController().signal;
  const key = jupiterApiKey.trim();
  const batchDelay = key ? JUPITER_DELAY_WITH_KEY_MS : JUPITER_DELAY_NO_KEY_MS;
  const headers: Record<string, string> = {};
  if (key) headers["x-api-key"] = key;

  for (let i = 0; i < mints.length; i += JUPITER_BATCH_SIZE) {
    if (i > 0) await sleep(batchDelay, signal);
    const batch = mints.slice(i, i + JUPITER_BATCH_SIZE);
    const url = `${JUPITER_BASE}/tokens/v2/search?query=${encodeURIComponent(batch.join(","))}`;
    try {
      const res = await fetchWith429Retry(url, { method: "GET", headers }, signal);
      if (!res.ok) break;
      const json = (await res.json()) as unknown;
      for (const [mint, hit] of parseJupiterSearchArray(json)) {
        const symbol = hit.symbol?.trim();
        const iconUrl = hit.icon;
        if (!symbol && !iconUrl) continue;
        out.set(mint, { symbol: symbol || undefined, iconUrl });
      }
    } catch {
      break;
    }
  }
  return out;
}

/** @deprecated Single-owner path; popup should call getHomeTokensForOwners. */
export async function getHomeTokensForOwner(
  owner: string | null,
  settings: Settings,
  options?: { force?: boolean },
): Promise<GetHomeTokensResult> {
  if (!owner) return { rows: [] };
  return getHomeTokensForOwners([owner], settings, options);
}
