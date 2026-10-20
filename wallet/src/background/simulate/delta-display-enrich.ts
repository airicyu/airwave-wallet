/**
 * Enriches simulate tx deltas with Jupiter mint display metadata (mainnet only).
 * Does not run RPC simulation or paint approval UI.
 */
import {
  lookupJupiterMintMetadata,
  type MintDisplayMeta,
} from "../home-tokens/home-tokens-service";
import {
  iconLetterForSymbol,
  NATIVE_SOL_ICON_URL,
  shortMint,
  WRAPPED_SOL_MINT,
} from "../../shared/home";
import { formatOrganicScoreLabel } from "../../shared/home";
import { sanitizeSymbol } from "../../shared/home";
import type { SimulatePendingTxResult, SimulateTxDelta } from "../../shared/tx";
import type { Cluster } from "../../shared/protocol";

const JUPITER_ENRICH_TIMEOUT_MS = 2000;

const mintDisplayCache = new Map<string, MintDisplayMeta>();
let cachedJupiterKey = "";

function resetCacheIfKeyChanged(jupiterApiKey: string): void {
  const key = jupiterApiKey.trim();
  if (key === cachedJupiterKey) return;
  cachedJupiterKey = key;
  mintDisplayCache.clear();
}

function nativeDisplay(): SimulateTxDelta["display"] {
  return {
    trust: "verified",
    labelPrimary: "SOL",
    amountSuffix: "SOL",
    iconUrl: NATIVE_SOL_ICON_URL,
    iconLetter: iconLetterForSymbol("SOL"),
  };
}

function splUnverified(mint: string): SimulateTxDelta["display"] {
  const short = shortMint(mint);
  const solFamily = mint === WRAPPED_SOL_MINT;
  return {
    trust: "unverified",
    labelPrimary: short,
    amountSuffix: short,
    iconUrl: solFamily ? NATIVE_SOL_ICON_URL : undefined,
    iconLetter: iconLetterForSymbol(solFamily ? "SOL" : short),
  };
}

function splFromHit(mint: string, hit: MintDisplayMeta): SimulateTxDelta["display"] {
  const cleaned = sanitizeSymbol(hit.symbol);
  if (hit.isVerified === true && cleaned) {
    const scoreLabel = formatOrganicScoreLabel(hit.organicScore);
    return {
      trust: "verified",
      labelPrimary: cleaned,
      labelMintShort: shortMint(mint),
      amountSuffix: cleaned,
      iconUrl:
        hit.iconUrl?.startsWith("https:")
          ? hit.iconUrl
          : mint === WRAPPED_SOL_MINT
            ? NATIVE_SOL_ICON_URL
            : undefined,
      iconLetter: iconLetterForSymbol(cleaned),
      ...(scoreLabel ? { scoreLabel } : {}),
    };
  }
  return splUnverified(mint);
}

async function fetchMintMeta(
  mints: string[],
  jupiterApiKey: string,
): Promise<Map<string, MintDisplayMeta>> {
  const missing = mints.filter((m) => !mintDisplayCache.has(m));
  if (missing.length === 0) return mintDisplayCache;

  const work = lookupJupiterMintMetadata(missing, jupiterApiKey);
  const raced = await Promise.race([
    work,
    new Promise<Map<string, MintDisplayMeta>>((resolve) => {
      setTimeout(() => resolve(new Map()), JUPITER_ENRICH_TIMEOUT_MS);
    }),
  ]);
  for (const [mint, meta] of raced) {
    mintDisplayCache.set(mint, meta);
  }
  return mintDisplayCache;
}

function enrichDelta(
  delta: SimulateTxDelta,
  metaByMint: Map<string, MintDisplayMeta>,
): SimulateTxDelta {
  if (delta.kind === "native") {
    return { ...delta, display: nativeDisplay() };
  }
  const mint = delta.mint;
  if (!mint) return { ...delta, display: splUnverified(delta.symbol) };
  const hit = metaByMint.get(mint);
  const display = hit ? splFromHit(mint, hit) : splUnverified(mint);
  return { ...delta, display };
}

export async function enrichSimulateDeltas(
  result: SimulatePendingTxResult,
  cluster: Cluster,
  jupiterApiKey: string,
): Promise<SimulatePendingTxResult> {
  if (result.outcome !== "ok" || !result.deltas || result.deltas.length === 0) {
    return result;
  }
  resetCacheIfKeyChanged(jupiterApiKey);

  let metaByMint = new Map<string, MintDisplayMeta>();
  if (cluster === "mainnet") {
    const mints = result.deltas
      .filter((d) => d.kind === "spl" && d.mint)
      .map((d) => d.mint as string);
    if (mints.length > 0) {
      metaByMint = await fetchMintMeta(mints, jupiterApiKey);
    }
  }

  const deltas = result.deltas.map((d) => enrichDelta(d, metaByMint));
  return { ...result, deltas };
}
