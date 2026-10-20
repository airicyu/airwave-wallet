/**
 * Executes the fixed transaction-AI tool allowlist against the assess snapshot.
 * Does not accept sandbox flags as the grade input and does not call Decisions.
 */
import { decodeWireTransaction } from "../../shared/tx";
import { simulateTransactionRpc } from "../simulate/simulate-rpc";
import { SimDeadline } from "../simulate/sim-deadline";
import { hostToolVerdict, mentionsBannedRpc, type TxAiFlag } from "../../shared/tx-ai";
import {
  applyOwnerMismatch,
  decodeWireTransaction as decodeForFlags,
  resolvedAccountPubkeysForPrefetch,
  type TxAiDecode,
} from "./local-flags";
import { fetchPrefetchAccounts, lamportsFromBalanceRpc, PREFETCH_ACCOUNTS_MAX } from "./prefetch-accounts";
import { rpcRead, tokenOwnerFromParsedAccount } from "./rpc-read";

const PUBKEY_CAP = 20;

const PREFETCH_DUPLICATE_NOTE =
  "Already in preflight getMultipleAccounts; use the Preflight accounts section in the user message.";

function asRecord(args: unknown): Record<string, unknown> {
  if (args && typeof args === "object" && !Array.isArray(args)) return args as Record<string, unknown>;
  return {};
}

function asPubkey(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asPubkeys(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const out: string[] = [];
  for (const item of value) {
    const pubkey = asPubkey(item);
    if (!pubkey) return null;
    out.push(pubkey);
  }
  return out;
}

export type ChainRead = "ok" | "failed" | "skipped";

export type PreflightAccountsBlock = {
  preflightPubkeys: string[];
  pubkeys: string[];
  accounts: unknown[];
  feePayerBalanceLamports?: string;
};

function splitPrefetchDuplicates(
  requested: string[],
  manifest: ReadonlySet<string> | undefined,
): { novel: string[]; skipped: string[] } {
  if (!manifest?.size) return { novel: requested, skipped: [] };
  const novel: string[] = [];
  const skipped: string[] = [];
  for (const pubkey of requested) {
    if (manifest.has(pubkey)) skipped.push(pubkey);
    else novel.push(pubkey);
  }
  return { novel, skipped };
}

export async function enrichFlags(
  bytes: Uint8Array,
  rpcUrl: string,
  signal?: AbortSignal,
): Promise<{
  decode: TxAiDecode;
  flags: TxAiFlag[];
  chainRead: ChainRead;
  accountsRead?: PreflightAccountsBlock;
}> {
  let decode: TxAiDecode;
  try {
    decode = decodeForFlags(bytes);
  } catch (error) {
    return {
      decode: { feePayer: "", instructions: [], flags: [], tokenSources: [] },
      flags: [{ id: "decode_failed", detail: error instanceof Error ? error.message : "decode failed" }],
      chainRead: "skipped",
    };
  }
  const prefetchPubkeys = resolvedAccountPubkeysForPrefetch(decode, PREFETCH_ACCOUNTS_MAX);
  let feePayerBalanceLamports: string | undefined;
  if (rpcUrl.trim() && decode.feePayer && decode.feePayer !== "unresolved") {
    const balanceRead = await rpcRead(rpcUrl, "getBalance", [decode.feePayer], signal);
    feePayerBalanceLamports = lamportsFromBalanceRpc(balanceRead);
  }
  if (!rpcUrl.trim() || prefetchPubkeys.length === 0) {
    return {
      decode,
      flags: decode.flags,
      chainRead: "skipped",
      accountsRead: feePayerBalanceLamports
        ? { preflightPubkeys: [], pubkeys: [], accounts: [], feePayerBalanceLamports }
        : undefined,
    };
  }
  const fetched = await fetchPrefetchAccounts(rpcUrl, prefetchPubkeys, signal);
  if (!fetched) return { decode, flags: decode.flags, chainRead: "failed" };
  const owners = new Map<string, string>();
  fetched.pubkeys.forEach((pubkey, index) => {
    const owner = tokenOwnerFromParsedAccount(fetched.accounts[index]);
    if (owner) owners.set(pubkey, owner);
  });
  return {
    decode,
    flags: applyOwnerMismatch(decode, owners),
    chainRead: "ok",
    accountsRead: {
      preflightPubkeys: fetched.preflightPubkeys,
      pubkeys: fetched.pubkeys,
      accounts: fetched.accounts,
      feePayerBalanceLamports,
    },
  };
}

export async function executeHostTool(args: {
  name: string;
  toolArgs: unknown;
  snapshot: Uint8Array;
  rpcUrl: string;
  decodedPubkeys: string[];
  preflightManifest?: ReadonlySet<string>;
  preflightFeePayer?: string;
  preflightFeePayerBalanceLamports?: string;
  signal?: AbortSignal;
}): Promise<unknown> {
  if (hostToolVerdict(args.name) !== "allow" || mentionsBannedRpc(args.toolArgs)) {
    return { ok: false, error: "tool rejected" };
  }
  const input = asRecord(args.toolArgs);
  if (!args.rpcUrl.trim() && args.name !== "decode_message") {
    return { ok: false, error: "MAINNET_RPC_UNSET" };
  }
  if (args.name === "decode_message") {
    const enriched = await enrichFlags(args.snapshot, args.rpcUrl, args.signal);
    return {
      feePayer: enriched.decode.feePayer,
      instructions: enriched.decode.instructions,
      flags: enriched.flags,
    };
  }
  if (args.name === "simulate") {
    try {
      const tx = decodeWireTransaction(args.snapshot);
      const value = await simulateTransactionRpc(args.rpcUrl, tx, new SimDeadline(), {
        replaceRecentBlockhash: true,
      });
      return {
        ok: true,
        err: value.err ?? null,
        unitsConsumed: value.unitsConsumed ?? null,
        logs: (value.logs ?? []).slice(-40),
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "simulate failed" };
    }
  }
  if (args.name === "get_accounts") {
    const requested = asPubkeys(input.pubkeys) ?? args.decodedPubkeys.slice(0, PUBKEY_CAP);
    if (!requested.length) return { ok: false, error: "no pubkeys" };
    const { novel, skipped } = splitPrefetchDuplicates(requested.slice(0, PUBKEY_CAP), args.preflightManifest);
    if (novel.length === 0) {
      return { ok: true, note: PREFETCH_DUPLICATE_NOTE, skipped_prefetch: skipped };
    }
    const read = await rpcRead(
      args.rpcUrl,
      "getMultipleAccounts",
      [novel, { encoding: "jsonParsed" }],
      args.signal,
    );
    if (skipped.length === 0) return read;
    return { read, skipped_prefetch: skipped, note: PREFETCH_DUPLICATE_NOTE };
  }
  if (args.name === "rpc_get_balance") {
    const pubkey = asPubkey(input.pubkey);
    if (!pubkey) return { ok: false, error: "pubkey required" };
    if (
      args.preflightFeePayer &&
      pubkey === args.preflightFeePayer &&
      args.preflightFeePayerBalanceLamports
    ) {
      return { ok: true, result: { value: args.preflightFeePayerBalanceLamports }, note: PREFETCH_DUPLICATE_NOTE };
    }
    return rpcRead(args.rpcUrl, "getBalance", [pubkey], args.signal);
  }
  if (args.name === "rpc_get_account_info") {
    const pubkey = asPubkey(input.pubkey);
    if (!pubkey) return { ok: false, error: "pubkey required" };
    if (args.preflightManifest?.has(pubkey)) {
      return { ok: true, note: PREFETCH_DUPLICATE_NOTE };
    }
    const encoding = input.encoding === "jsonParsed" ? "jsonParsed" : "base64";
    return rpcRead(args.rpcUrl, "getAccountInfo", [pubkey, { encoding }], args.signal);
  }
  if (args.name === "rpc_get_multiple_accounts") {
    const pubkeys = asPubkeys(input.pubkeys);
    if (!pubkeys) return { ok: false, error: "pubkeys required" };
    const { novel, skipped } = splitPrefetchDuplicates(pubkeys.slice(0, 100), args.preflightManifest);
    if (novel.length === 0) {
      return { ok: true, note: PREFETCH_DUPLICATE_NOTE, skipped_prefetch: skipped };
    }
    const encoding = input.encoding === "jsonParsed" ? "jsonParsed" : "base64";
    const read = await rpcRead(args.rpcUrl, "getMultipleAccounts", [novel, { encoding }], args.signal);
    if (skipped.length === 0) return read;
    return { read, skipped_prefetch: skipped, note: PREFETCH_DUPLICATE_NOTE };
  }
  if (args.name === "rpc_get_token_accounts_by_owner") {
    const owner = asPubkey(input.owner);
    const mint = asPubkey(input.mint);
    const programId = asPubkey(input.programId);
    if (!owner || (!mint && !programId)) return { ok: false, error: "owner and mint or programId required" };
    const filter = mint ? { mint } : { programId };
    return rpcRead(args.rpcUrl, "getTokenAccountsByOwner", [owner, filter, { encoding: "jsonParsed" }], args.signal);
  }
  if (args.name === "rpc_get_signatures_for_address") {
    const address = asPubkey(input.address);
    if (!address) return { ok: false, error: "address required" };
    const limit = typeof input.limit === "number" ? Math.min(20, Math.max(1, Math.trunc(input.limit))) : 10;
    return rpcRead(args.rpcUrl, "getSignaturesForAddress", [address, { limit }], args.signal);
  }
  if (args.name === "rpc_get_transaction") {
    const signature = asPubkey(input.signature);
    if (!signature) return { ok: false, error: "signature required" };
    return rpcRead(args.rpcUrl, "getTransaction", [signature, { encoding: "json", maxSupportedTransactionVersion: 0 }], args.signal);
  }
  if (args.name === "rpc_get_latest_blockhash") {
    return rpcRead(args.rpcUrl, "getLatestBlockhash", [{ commitment: "confirmed" }], args.signal);
  }
  return { ok: false, error: "tool rejected" };
}
