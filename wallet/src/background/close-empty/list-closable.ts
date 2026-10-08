/**
 * Scans closable empty token accounts and stores the latest list in memory.
 * Does not build transactions or broadcast closes.
 */
import type { ClosableEntry } from "../../shared/close-empty-types";
import { getClosableOwnerTargets } from "../../shared/close-empty-owners";
import type { ParsedOwnerTokenAccount } from "../../shared/parsed-token-accounts";
import { isCombinedAccount } from "../../shared/accounts";
import { getHomeTokenOwners } from "../../shared/accounts";
import * as session from "../session";
import { readAccounts, readSettings } from "../storage";
import { getActiveAccountMeta } from "../session";
import {
  getHomeTokensForOwners,
  homeTokensCacheFingerprint,
  getOwnerParsedTokenAccounts,
} from "../home-tokens";
import { closableCacheKey, getClosableCache, setClosableCache } from "./closable-cache";
import { enrichClosableEntries } from "./closable-enrich";
import {
  scanClosableForOwners,
  scanClosableFromCachedParsed,
} from "./closable-scan";

let lastListEntries: ClosableEntry[] = [];

export function getLastListClosableEntries(): ClosableEntry[] {
  return lastListEntries;
}

export async function listClosableTokenAccounts(options?: {
  force?: boolean;
}): Promise<
  | { ok: true; entries: ClosableEntry[]; partialScan?: boolean }
  | { ok: false; code: "NO_ACCOUNT" | "ACCOUNT_READ_ONLY" | "RPC_ERROR"; message: string }
> {
  const active = await getActiveAccountMeta();
  if (!active) {
    return { ok: false, code: "NO_ACCOUNT", message: "No active account" };
  }
  const accounts = await readAccounts();
  const secrets = session.getVaultSecrets()?.secrets;
  const targets = getClosableOwnerTargets(active, accounts, secrets);
  if (targets.length === 0) {
    return { ok: false, code: "ACCOUNT_READ_ONLY", message: "No signing owner" };
  }

  const settings = await readSettings();
  const cacheKey = closableCacheKey(active.id, settings.cluster, settings.rpcUrl);
  const owners = getHomeTokenOwners(active);
  const home = await getHomeTokensForOwners(owners, settings, {
    withMembers: isCombinedAccount(active),
  });

  if (options?.force !== true) {
    const cached = getClosableCache(cacheKey);
    if (cached) {
      const entries = await enrichClosableEntries(cached.entries, home.rows, settings);
      lastListEntries = entries;
      return {
        ok: true,
        entries,
        partialScan: cached.partialScan ? true : undefined,
      };
    }
  }
  const tokenFp = homeTokensCacheFingerprint(owners, settings);
  const parsedByOwner = new Map<string, ParsedOwnerTokenAccount[]>();
  let cacheComplete = true;
  for (const target of targets) {
    const cached = getOwnerParsedTokenAccounts(tokenFp, target.owner);
    if (!cached) {
      cacheComplete = false;
      break;
    }
    parsedByOwner.set(target.owner, cached);
  }

  let entries: ClosableEntry[];
  let ownerFailures: number;
  if (cacheComplete) {
    entries = scanClosableFromCachedParsed(targets, home.rows, parsedByOwner);
    ownerFailures = 0;
  } else {
    const scanned = await scanClosableForOwners(settings.rpcUrl, targets, home.rows);
    entries = scanned.entries;
    ownerFailures = scanned.ownerFailures;
  }

  if (ownerFailures === targets.length) {
    return { ok: false, code: "RPC_ERROR", message: "CLOSE_EMPTY_SCAN_FAILED" };
  }

  entries = await enrichClosableEntries(entries, home.rows, settings);
  lastListEntries = entries;
  setClosableCache(cacheKey, entries, ownerFailures > 0);
  return {
    ok: true,
    entries,
    partialScan: ownerFailures > 0 ? true : undefined,
  };
}
