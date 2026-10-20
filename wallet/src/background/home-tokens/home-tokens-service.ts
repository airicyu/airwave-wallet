/**
 * Loads and caches home token balances for popup display, then asks Jupiter for mint metadata.
 * Does not sign transfers or manage vault encryption.
 */
import { applyJupiterTokensV2, sleep } from "./jupiter-mint-meta";
import { mergeMultiOwnerRows } from "./home-token-rows";
export { lookupJupiterMintMetadata, type MintDisplayMeta } from "./jupiter-mint-meta";
import { address } from "@solana/kit";
import type { Settings } from "../../shared/protocol";
import { solanaRpcForUrl } from "../../shared/rpc";
import {
  NATIVE_SOL_ID,
  WRAPPED_SOL_MINT,
  buildHomeTokenRowsFromOwnerParsed,
  sortHomeTokenRows,
  type HomeTokenRow,
} from "../../shared/home";
import {
  fetchParsedTokenAccountsForOwner,
  type ParsedOwnerTokenAccount,
} from "../../shared/home";
import { isRpcRateLimitError, withRateLimitRetry } from "../../shared/rpc";
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

/** @deprecated Single-owner path; popup should call getHomeTokensForOwners. */
export async function getHomeTokensForOwner(
  owner: string | null,
  settings: Settings,
  options?: { force?: boolean },
): Promise<GetHomeTokensResult> {
  if (!owner) return { rows: [] };
  return getHomeTokensForOwners([owner], settings, options);
}
