import type { Settings } from "../shared/storage-keys";
import {
  NATIVE_SOL_ID,
  WRAPPED_SOL_MINT,
  fetchRpcHomeTokenRows,
  formatUsdLabel,
  iconLetterForSymbol,
  shortMint,
  sortHomeTokenRows,
  type HomeTokenRow,
} from "../shared/home-tokens";

export type GetHomeTokensResult = {
  rows: HomeTokenRow[];
  error?: string;
  fromCache?: boolean;
};

const TTL_MS = 45_000;
const PAGE_LIMIT = 1000;
const PAGE_DELAY_MS = 500;
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
  owner: string,
  settings: Settings,
  fingerprint: string,
): void {
  if (inFlight || backgroundRefreshFingerprint === fingerprint) return;
  backgroundRefreshFingerprint = fingerprint;
  const abort = new AbortController();
  void runRefresh(owner, settings, abort.signal, fingerprint)
    .catch(() => {
      /* 背景刷新失敗保留舊快取 */
    })
    .finally(() => {
      if (backgroundRefreshFingerprint === fingerprint) {
        backgroundRefreshFingerprint = null;
      }
    });
}

function cacheFingerprint(owner: string, settings: Settings): string {
  return `${owner}|${settings.cluster}|${settings.heliusApiUrl}|${settings.rpcUrl}|${settings.jupiterApiKey}`;
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

function dasNameAndSymbol(
  item: Record<string, unknown>,
  tokenInfo: Record<string, unknown>,
  mint: string,
): { name: string; symbol: string } {
  const content = item.content as Record<string, unknown> | undefined;
  const meta = content?.metadata as Record<string, unknown> | undefined;
  const symbol =
    trimMeta(tokenInfo.symbol) ??
    trimMeta(meta?.symbol) ??
    shortMint(mint);
  const name =
    trimMeta(meta?.name) ?? trimMeta(tokenInfo.name) ?? symbol;
  return { name, symbol };
}

function httpsIconUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (!raw.startsWith("https:")) return undefined;
  return raw;
}

function heliusUsd(
  priceInfo: Record<string, unknown> | undefined,
  uiAmount: number,
): { usdLabel: string; usdTotal?: number } {
  if (!priceInfo) return { usdLabel: "—" };
  const total = priceInfo.total_price;
  if (typeof total === "number" && Number.isFinite(total)) {
    return { usdLabel: formatUsdLabel(total), usdTotal: total };
  }
  const ppt = priceInfo.price_per_token;
  if (typeof ppt === "number" && Number.isFinite(ppt)) {
    const t = ppt * uiAmount;
    if (!Number.isFinite(t)) return { usdLabel: "—" };
    return { usdLabel: formatUsdLabel(t), usdTotal: t };
  }
  return { usdLabel: "—" };
}

function isFungibleItem(item: Record<string, unknown>): boolean {
  const iface = String(item.interface ?? "");
  if (iface.includes("NFT") || iface.includes("Nft")) return false;
  if (iface.includes("COMPRESSED")) return false;
  if (iface === "V1_NFT" || iface === "ProgrammableNFT") return false;
  if (item.compressed === true) return false;
  if (item.token_info != null) return true;
  return iface.includes("Fungible") || iface.includes("fungible");
}

type DasPage = {
  items: Record<string, unknown>[];
  nativeLamports: number;
  nativePriceInfo?: Record<string, unknown>;
};

async function fetchDasPage(
  heliusApiUrl: string,
  owner: string,
  page: number,
  signal: AbortSignal,
): Promise<DasPage> {
  const body = {
    jsonrpc: "2.0",
    id: "airwave-das",
    method: "getAssetsByOwner",
    params: {
      ownerAddress: owner,
      page,
      limit: PAGE_LIMIT,
      displayOptions: {
        showFungible: true,
        showNativeBalance: true,
      },
    },
  };

  const res = await fetchWith429Retry(
    heliusApiUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    signal,
  );

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Helius 速率限制（429），請稍後再試");
    }
    if (res.status >= 400 && res.status < 500) {
      throw new Error(`Helius 請求失敗（HTTP ${res.status}）`);
    }
    throw new Error(`Helius 請求失敗（HTTP ${res.status}）`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Helius 回應無法解析");
  }

  const result = (json as { result?: Record<string, unknown> }).result;
  if (!result || typeof result !== "object") {
    throw new Error("Helius 回應格式錯誤");
  }

  const items = Array.isArray(result.items)
    ? (result.items as Record<string, unknown>[])
    : [];

  const nativeBalance = result.nativeBalance as Record<string, unknown> | undefined;
  const lamports =
    typeof nativeBalance?.lamports === "number"
      ? nativeBalance.lamports
      : typeof nativeBalance?.lamports === "string"
        ? Number(nativeBalance.lamports)
        : 0;
  const nativeLamports = Number.isFinite(lamports) ? lamports : 0;

  let nativePriceInfo: Record<string, unknown> | undefined;
  if (nativeBalance) {
    const pi = nativeBalance.price_info;
    if (pi && typeof pi === "object") {
      nativePriceInfo = pi as Record<string, unknown>;
    } else if (typeof nativeBalance.price_per_sol === "number") {
      nativePriceInfo = { price_per_token: nativeBalance.price_per_sol };
    }
  }

  return { items, nativeLamports, nativePriceInfo };
}

function mergeDasItems(pages: DasPage[]): HomeTokenRow[] {
  let totalLamports = 0;
  let nativePriceInfo: Record<string, unknown> | undefined;
  const byMint = new Map<
    string,
    {
      raw: bigint;
      decimals: number;
      name: string;
      symbol: string;
      iconUrl?: string;
      priceInfo?: Record<string, unknown>;
    }
  >();

  for (const page of pages) {
    totalLamports = Math.max(totalLamports, page.nativeLamports);
    if (page.nativePriceInfo) nativePriceInfo = page.nativePriceInfo;

    for (const item of page.items) {
      if (!isFungibleItem(item)) continue;
      const tokenInfo = item.token_info as Record<string, unknown> | undefined;
      if (!tokenInfo) continue;

      const mint =
        (tokenInfo.mint as string | undefined) ??
        (item.id as string | undefined) ??
        "";
      if (!mint) continue;

      const balance = tokenInfo.balance as number | string | undefined;
      const decimals =
        typeof tokenInfo.decimals === "number" ? tokenInfo.decimals : 0;
      let raw: bigint;
      if (typeof balance === "string") raw = BigInt(balance);
      else if (typeof balance === "number") raw = BigInt(Math.trunc(balance));
      else continue;

      if (raw === 0n) continue;

      const { name, symbol } = dasNameAndSymbol(item, tokenInfo, mint);
      const iconUrl =
        httpsIconUrl(
          (item.content as Record<string, unknown> | undefined)?.links &&
            ((item.content as { links?: { image?: string } }).links?.image),
        ) ?? httpsIconUrl(tokenInfo.image as string | undefined);

      const priceInfo = tokenInfo.price_info as Record<string, unknown> | undefined;
      const prev = byMint.get(mint);
      if (prev) {
        prev.raw += raw;
        if (priceInfo) prev.priceInfo = priceInfo;
        if (iconUrl && !prev.iconUrl) prev.iconUrl = iconUrl;
        if (name !== symbol && prev.name === prev.symbol) prev.name = name;
        if (symbol !== shortMint(mint) && prev.symbol === shortMint(mint)) {
          prev.symbol = symbol;
        }
      } else {
        byMint.set(mint, { raw, decimals, name, symbol, iconUrl, priceInfo });
      }
    }
  }

  const solAmount = totalLamports / 1e9;
  const solUsd = nativePriceInfo ? heliusUsd(nativePriceInfo, solAmount) : { usdLabel: "—" };

  const rows: HomeTokenRow[] = [
    {
      id: NATIVE_SOL_ID,
      name: "Solana",
      symbol: "SOL",
      uiAmount: solAmount,
      uiAmountLabel: solAmount.toLocaleString(undefined, { maximumFractionDigits: 9 }),
      usdLabel: solUsd.usdLabel,
      usdTotal: solUsd.usdTotal,
      iconLetter: "SO",
    },
  ];

  for (const [mint, { raw, decimals, name, symbol, iconUrl, priceInfo }] of byMint) {
    if (raw === 0n) continue;
    const ui = decimals > 0 ? Number(raw) / 10 ** decimals : Number(raw);
    if (ui === 0) continue;
    const usd = priceInfo ? heliusUsd(priceInfo, ui) : { usdLabel: "—" };
    rows.push({
      id: mint,
      name,
      symbol,
      uiAmount: ui,
      uiAmountLabel: ui.toLocaleString(undefined, {
        maximumFractionDigits: Math.min(decimals, 9),
      }),
      usdLabel: usd.usdLabel,
      usdTotal: usd.usdTotal,
      iconLetter: iconLetterForSymbol(symbol),
      iconUrl,
    });
  }

  return rows;
}

async function fetchDasHomeTokenRows(
  heliusApiUrl: string,
  owner: string,
  signal: AbortSignal,
): Promise<{ rows: HomeTokenRow[]; pageError?: string }> {
  const pages: DasPage[] = [];
  let page = 1;
  for (;;) {
    try {
      const p = await fetchDasPage(heliusApiUrl, owner, page, signal);
      pages.push(p);
      if (p.items.length < PAGE_LIMIT) {
        return { rows: mergeDasItems(pages) };
      }
      page += 1;
      await sleep(PAGE_DELAY_MS, signal);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Helius 請求失敗";
      if (pages.length === 0) throw e;
      return { rows: mergeDasItems(pages), pageError: msg };
    }
  }
}

type JupiterTokenHit = {
  usdPrice?: number;
  isVerified?: boolean;
  organicScore?: number;
  organicScoreLabel?: string;
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
  for (const row of rows) {
    if (row.id === NATIVE_SOL_ID) mints.push(WRAPPED_SOL_MINT);
    else mints.push(row.id);
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
    return patched;
  });

  return { rows: next };
}

async function runRefresh(
  owner: string,
  settings: Settings,
  signal: AbortSignal,
  fingerprint: string,
): Promise<GetHomeTokensResult> {
  const cached =
    memoryCache?.fingerprint === fingerprint ? memoryCache.rows : undefined;

  try {
    let rows: HomeTokenRow[];
    let dasPageError: string | undefined;
    const helius = settings.heliusApiUrl.trim();
    if (helius) {
      const das = await fetchDasHomeTokenRows(helius, owner, signal);
      rows = das.rows;
      dasPageError = das.pageError;
    } else {
      rows = await fetchRpcHomeTokenRows(settings.rpcUrl, owner, signal);
    }

    if (settings.cluster === "mainnet") {
      try {
        const jup = await applyJupiterTokensV2(
          rows,
          settings.jupiterApiKey,
          signal,
        );
        rows = sortHomeTokenRows(jup.rows);
        if (jup.error) {
          memoryCache = { fingerprint, rows, fetchedAt: Date.now() };
          return { rows, error: dasPageError ? `${dasPageError}；${jup.error}` : jup.error };
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
    if (dasPageError) {
      return { rows, error: dasPageError };
    }
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

export async function getHomeTokensForOwner(
  owner: string | null,
  settings: Settings,
  options?: { force?: boolean },
): Promise<GetHomeTokensResult> {
  if (!owner) return { rows: [] };

  const fingerprint = cacheFingerprint(owner, settings);
  const force = options?.force === true;

  if (
    !force &&
    memoryCache &&
    memoryCache.fingerprint === fingerprint &&
    Date.now() - memoryCache.fetchedAt < TTL_MS
  ) {
    scheduleBackgroundRefresh(owner, settings, fingerprint);
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
  const promise = runRefresh(owner, settings, abort.signal, fingerprint);
  inFlight = { fingerprint, abort, promise };
  try {
    return await promise;
  } finally {
    if (inFlight?.promise === promise) inFlight = null;
  }
}
