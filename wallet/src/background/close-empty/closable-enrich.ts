/**
 * Merges mint symbols and icons into closable token-account entries using home-token and Jupiter metadata.
 * Does not discover closable accounts on-chain or commit close transactions.
 */
import type { ClosableEntry } from "../../shared/close-empty-types";
import {
  WRAPPED_SOL_MINT,
  iconLetterForSymbol,
  shortMint,
  type HomeTokenRow,
} from "../../shared/home-tokens";
import type { Settings } from "../../shared/storage-keys";
import {
  lookupJupiterMintMetadata,
  type MintDisplayMeta,
} from "../home-tokens/home-tokens-service";

function homeRowForMint(mint: string, homeRows: HomeTokenRow[]): HomeTokenRow | undefined {
  return homeRows.find((r) => r.id === mint);
}

function patchFromHomeRow(entry: ClosableEntry, homeRows: HomeTokenRow[]): ClosableEntry {
  if (entry.mint === WRAPPED_SOL_MINT) {
    const w = homeRowForMint(WRAPPED_SOL_MINT, homeRows);
    const symbol = "wSOL";
    return {
      ...entry,
      symbol,
      iconUrl: w?.iconUrl ?? entry.iconUrl,
      iconLetter: w?.iconLetter ?? iconLetterForSymbol(symbol),
    };
  }
  const row = homeRowForMint(entry.mint, homeRows);
  if (!row) return entry;
  const symbol = row.symbol?.trim() || entry.symbol;
  return {
    ...entry,
    symbol,
    iconUrl: row.iconUrl ?? entry.iconUrl,
    iconLetter: row.iconLetter ?? entry.iconLetter ?? iconLetterForSymbol(symbol),
  };
}

function needsRemoteMeta(entry: ClosableEntry, homeRows: HomeTokenRow[]): boolean {
  if (entry.mint === WRAPPED_SOL_MINT) return false;
  const row = homeRowForMint(entry.mint, homeRows);
  const symbolMissing = !row?.symbol && entry.symbol === shortMint(entry.mint);
  const iconMissing = !entry.iconUrl && !row?.iconUrl;
  return symbolMissing || iconMissing;
}

function applyRemoteMeta(
  entry: ClosableEntry,
  remote: Map<string, MintDisplayMeta>,
): ClosableEntry {
  const hit = remote.get(entry.mint);
  if (!hit) return finalizeLetters(entry);
  const symbol = hit.symbol?.trim() || entry.symbol;
  return finalizeLetters({
    ...entry,
    symbol,
    iconUrl: hit.iconUrl ?? entry.iconUrl,
  });
}

function finalizeLetters(entry: ClosableEntry): ClosableEntry {
  if (entry.iconLetter) return entry;
  return { ...entry, iconLetter: iconLetterForSymbol(entry.symbol) };
}

export async function enrichClosableEntries(
  entries: ClosableEntry[],
  homeRows: HomeTokenRow[],
  settings: Settings,
): Promise<ClosableEntry[]> {
  const next = entries.map((e) => patchFromHomeRow(e, homeRows));

  const mintsRemote = new Set<string>();
  for (const e of next) {
    if (!needsRemoteMeta(e, homeRows)) continue;
    mintsRemote.add(e.mint);
  }
  if (mintsRemote.size === 0) {
    return next.map(finalizeLetters);
  }

  const remote = new Map<string, MintDisplayMeta>();
  if (settings.cluster === "mainnet") {
    const jup = await lookupJupiterMintMetadata([...mintsRemote], settings.jupiterApiKey);
    for (const [mint, meta] of jup) {
      remote.set(mint, {
        symbol: meta.symbol,
        iconUrl: meta.iconUrl,
      });
    }
  }

  return next.map((e) => applyRemoteMeta(e, remote));
}
