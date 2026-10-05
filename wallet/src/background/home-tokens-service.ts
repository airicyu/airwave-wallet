import type { Settings } from "../shared/storage-keys";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  NATIVE_SOL_ID,
  WRAPPED_SOL_MINT,
  fetchNativeAndWrappedSolRows,
  fetchRpcHomeTokenRows,
  formatUsdLabel,
  iconLetterForSymbol,
  shortMint,
  sortHomeTokenRows,
  type HomeTokenMemberShare,
  type HomeTokenRow,
  type TokenProgramKind,
} from "../shared/home-tokens";

export type GetHomeTokensResult = {
  rows: HomeTokenRow[];
  error?: string;
  fromCache?: boolean;
};

const TTL_MS = 45_000;
const WALLET_BALANCES_LIMIT = 100;
const PAGE_DELAY_MS = 500;
const WALLET_API_ORIGIN = "https://api.helius.xyz";
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
      /* 背景刷新失敗保留舊快取 */
    })
    .finally(() => {
      if (backgroundRefreshFingerprint === fingerprint) {
        backgroundRefreshFingerprint = null;
      }
    });
}

function cacheFingerprint(owners: string[], settings: Settings): string {
  const ownersJoin = owners.join("\u001f");
  const rpc = `${settings.rpcByCluster.devnet.active}:${settings.rpcByCluster.devnet.urls.join(",")}|${settings.rpcByCluster.mainnet.active}:${settings.rpcByCluster.mainnet.urls.join(",")}`;
  return `${ownersJoin}|${settings.cluster}|${rpc}|${settings.heliusApiUrl}|${settings.rpcUrl}|${settings.jupiterApiKey}`;
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
  maxAttempts = 3,
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

export function extractHeliusApiKey(heliusApiUrl: string): string | null {
  const t = heliusApiUrl.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    const fromApiKey = u.searchParams.get("api-key")?.trim();
    if (fromApiKey) return fromApiKey;
    const fromApiKeyAlt = u.searchParams.get("apiKey")?.trim();
    return fromApiKeyAlt || null;
  } catch {
    return null;
  }
}

type WalletTokenBalance = {
  mint: string;
  symbol?: string | null;
  name?: string | null;
  balance: number;
  decimals: number;
  pricePerToken?: number | null;
  usdValue?: number | null;
  logoUri?: string | null;
};

type WalletBalancesPage = {
  balances: WalletTokenBalance[];
  hasMore: boolean;
};

function asFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseWalletTokenBalance(raw: unknown): WalletTokenBalance | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const mint = trimMeta(rec.mint);
  if (!mint) return null;
  const balance = asFiniteNumber(rec.balance);
  const decimals = asFiniteNumber(rec.decimals);
  if (balance == null || decimals == null) return null;
  return {
    mint,
    symbol: trimMeta(rec.symbol) ?? null,
    name: trimMeta(rec.name) ?? null,
    balance,
    decimals,
    pricePerToken: asFiniteNumber(rec.pricePerToken) ?? null,
    usdValue: asFiniteNumber(rec.usdValue) ?? null,
    logoUri: trimMeta(rec.logoUri) ?? null,
  };
}

async function fetchWalletBalancesPage(
  apiKey: string,
  owner: string,
  page: number,
  signal: AbortSignal,
): Promise<WalletBalancesPage> {
  const url = new URL(`${WALLET_API_ORIGIN}/v1/wallet/${owner}/balances`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(WALLET_BALANCES_LIMIT));
  url.searchParams.set("showNfts", "false");
  url.searchParams.set("showZeroBalance", "false");
  url.searchParams.set("showNative", "true");

  const res = await fetchWith429Retry(
    url,
    { method: "GET", headers: { "X-Api-Key": apiKey } },
    signal,
  );

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Helius 速率限制（429），請稍後再試");
    }
    throw new Error(`Helius Wallet API 失敗（HTTP ${res.status}）`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Helius Wallet API 回應無法解析");
  }
  if (!json || typeof json !== "object") {
    throw new Error("Helius Wallet API 回應格式錯誤");
  }
  const rec = json as Record<string, unknown>;
  if (!Array.isArray(rec.balances)) {
    throw new Error("Helius Wallet API 回應缺少 balances");
  }
  const balancesRaw = rec.balances;
  const balances: WalletTokenBalance[] = [];
  for (const item of balancesRaw) {
    const parsed = parseWalletTokenBalance(item);
    if (parsed) balances.push(parsed);
  }
  const pagination = rec.pagination as Record<string, unknown> | undefined;
  const hasMore = pagination?.hasMore === true;
  return { balances, hasMore };
}

function mergeWalletBalances(pages: WalletTokenBalance[][]): HomeTokenRow[] {
  const byMint = new Map<
    string,
    {
      ui: number;
      decimals: number;
      name: string;
      symbol: string;
      iconUrl?: string;
      usdLabel: string;
      usdTotal?: number;
    }
  >();

  for (const page of pages) {
    for (const item of page) {
      if (item.balance === 0) continue;
      if (item.mint === WRAPPED_SOL_MINT) continue;
      if (item.decimals === 0) continue;

      let usdLabel = "—";
      let usdTotal: number | undefined;
      if (item.usdValue != null && Number.isFinite(item.usdValue)) {
        usdLabel = formatUsdLabel(item.usdValue);
        usdTotal = item.usdValue;
      } else if (item.pricePerToken != null) {
        const t = item.pricePerToken * item.balance;
        if (Number.isFinite(t)) {
          usdLabel = formatUsdLabel(t);
          usdTotal = t;
        }
      }

      const symbol = item.symbol || shortMint(item.mint);
      const name = item.name || symbol;
      const iconUrl = httpsIconUrl(item.logoUri);
      const prev = byMint.get(item.mint);
      if (prev) {
        prev.ui += item.balance;
        if (usdTotal != null) {
          prev.usdLabel = usdLabel;
          prev.usdTotal = (prev.usdTotal ?? 0) + usdTotal;
          if (prev.usdTotal != null) prev.usdLabel = formatUsdLabel(prev.usdTotal);
        }
        if (iconUrl && !prev.iconUrl) prev.iconUrl = iconUrl;
        if (item.name) prev.name = item.name;
        if (item.symbol) prev.symbol = item.symbol;
      } else {
        byMint.set(item.mint, {
          ui: item.balance,
          decimals: item.decimals,
          name,
          symbol,
          iconUrl,
          usdLabel,
          usdTotal,
        });
      }
    }
  }

  const rows: HomeTokenRow[] = [];

  for (const [mint, row] of byMint) {
    if (row.ui === 0) continue;
    rows.push({
      id: mint,
      name: row.name,
      symbol: row.symbol,
      uiAmount: row.ui,
      uiAmountLabel: row.ui.toLocaleString(undefined, {
        maximumFractionDigits: Math.min(row.decimals, 9),
      }),
      usdLabel: row.usdLabel,
      usdTotal: row.usdTotal,
      iconLetter: iconLetterForSymbol(row.symbol),
      iconUrl: row.iconUrl,
      decimals: row.decimals,
    });
  }

  return rows;
}

const LEGACY_TOKEN_PROGRAM = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

async function attachTokenProgramsForOwner(
  rpcUrl: string,
  owner: string,
  rows: HomeTokenRow[],
  signal: AbortSignal,
): Promise<HomeTokenRow[]> {
  const needsProgram = rows.some((r) => r.id !== NATIVE_SOL_ID && r.tokenProgram == null);
  if (!needsProgram) return rows;
  const conn = new Connection(rpcUrl, "confirmed");
  const pk = new PublicKey(owner);
  const [legacy, token2022] = await Promise.all([
    conn.getParsedTokenAccountsByOwner(pk, { programId: LEGACY_TOKEN_PROGRAM }),
    conn.getParsedTokenAccountsByOwner(pk, { programId: TOKEN_2022_PROGRAM }),
  ]);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const byMint = new Map<string, TokenProgramKind>();
  for (const { account } of legacy.value) {
    const parsed = account.data.parsed;
    if (parsed?.type !== "account") continue;
    const mint = (parsed.info as { mint?: string })?.mint;
    if (!mint || byMint.has(mint)) continue;
    byMint.set(mint, "spl-token");
  }
  for (const { account } of token2022.value) {
    const parsed = account.data.parsed;
    if (parsed?.type !== "account") continue;
    const mint = (parsed.info as { mint?: string })?.mint;
    if (!mint || byMint.has(mint)) continue;
    byMint.set(mint, "token-2022");
  }
  return rows.map((row) => {
    if (row.id === NATIVE_SOL_ID) return row;
    if (row.tokenProgram) return row;
    const tp = byMint.get(row.id);
    if (!tp) return row;
    return { ...row, tokenProgram: tp };
  });
}

async function fetchWalletApiHomeTokenRows(
  apiKey: string,
  owner: string,
  signal: AbortSignal,
): Promise<HomeTokenRow[]> {
  const pages: WalletTokenBalance[][] = [];
  let page = 1;
  for (;;) {
    const p = await fetchWalletBalancesPage(apiKey, owner, page, signal);
    pages.push(p.balances);
    if (!p.hasMore) return mergeWalletBalances(pages);
    page += 1;
    await sleep(PAGE_DELAY_MS, signal);
  }
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
      return { rows, error: `Jupiter 未授權（HTTP ${res.status}）` };
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

async function fetchSingleOwnerRows(
  owner: string,
  settings: Settings,
  signal: AbortSignal,
): Promise<HomeTokenRow[]> {
  const apiKey = extractHeliusApiKey(settings.heliusApiUrl);
  if (apiKey && settings.cluster === "mainnet") {
    const [walletRows, solRows] = await Promise.all([
      fetchWalletApiHomeTokenRows(apiKey, owner, signal),
      fetchNativeAndWrappedSolRows(settings.rpcUrl, owner, signal),
    ]);
    const rest = walletRows.filter(
      (r) => r.id !== NATIVE_SOL_ID && r.id !== WRAPPED_SOL_MINT,
    );
    return sortHomeTokenRows([...solRows, ...rest]);
  }
  return fetchRpcHomeTokenRows(settings.rpcUrl, owner, signal);
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
    for (const owner of owners) {
      let rows = await fetchSingleOwnerRows(owner, settings, signal);
      rows = await attachTokenProgramsForOwner(settings.rpcUrl, owner, rows, signal);
      perOwner.push({ owner, rows });
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
          return { rows, error: jup.error };
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Jupiter 資料更新失敗";
        rows = sortHomeTokenRows(rows);
        memoryCache = { fingerprint, rows, fetchedAt: Date.now() };
        return { rows, error: msg };
      }
    }

    rows = sortHomeTokenRows(rows);
    memoryCache = { fingerprint, rows, fetchedAt: Date.now() };
    return { rows };
  } catch (e) {
    if (signal.aborted) {
      if (cached) return { rows: cached, error: "已取消" };
      return { rows: [], error: "已取消" };
    }
    const msg = e instanceof Error ? e.message : "無法載入持倉";
    if (cached?.length) {
      return { rows: cached, error: msg };
    }
    return { rows: [], error: msg };
  }
}

export async function getHomeTokensForOwners(
  owners: string[],
  settings: Settings,
  options?: { force?: boolean; withMembers?: boolean },
): Promise<GetHomeTokensResult> {
  if (owners.length === 0) return { rows: [] };

  const fingerprint = cacheFingerprint(owners, settings);
  const force = options?.force === true;
  const withMembers = options?.withMembers === true;

  if (
    !force &&
    memoryCache &&
    memoryCache.fingerprint === fingerprint &&
    Date.now() - memoryCache.fetchedAt < TTL_MS
  ) {
    scheduleBackgroundRefresh(owners, settings, fingerprint, withMembers);
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

/** @deprecated 單 owner 路徑；popup 應走 getHomeTokensForOwners */
export async function getHomeTokensForOwner(
  owner: string | null,
  settings: Settings,
  options?: { force?: boolean },
): Promise<GetHomeTokensResult> {
  if (!owner) return { rows: [] };
  return getHomeTokensForOwners([owner], settings, options);
}
