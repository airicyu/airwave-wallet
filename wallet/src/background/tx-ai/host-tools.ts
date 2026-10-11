/**
 * Executes the fixed transaction-AI tool allowlist against the assess snapshot.
 * Does not accept sandbox flags as the grade input and does not call Decisions.
 */
import { decodeWireTransaction } from "../../shared/tx-wire";
import { simulateTransactionRpc } from "../simulate/simulate-rpc";
import { SimDeadline } from "../simulate/sim-deadline";
import { hostToolVerdict, mentionsBannedRpc, type TxAiFlag } from "../../shared/tx-ai";
import { applyOwnerMismatch, decodeWireTransaction as decodeForFlags, type TxAiDecode } from "./local-flags";
import { rpcRead, tokenOwnerFromParsedAccount } from "./rpc-read";

const PUBKEY_CAP = 20;

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

export async function enrichFlags(
  bytes: Uint8Array,
  rpcUrl: string,
  signal?: AbortSignal,
): Promise<{ decode: TxAiDecode; flags: TxAiFlag[]; chainRead: ChainRead }> {
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
  const sources = [...new Set(decode.tokenSources.map((row) => row.source))].slice(0, PUBKEY_CAP);
  if (!rpcUrl.trim() || sources.length === 0) return { decode, flags: decode.flags, chainRead: "skipped" };
  const read = await rpcRead(rpcUrl, "getMultipleAccounts", [sources, { encoding: "jsonParsed" }], signal);
  if (!read || typeof read !== "object" || !("result" in read)) {
    return { decode, flags: decode.flags, chainRead: "failed" };
  }
  const value = (read as { result?: { value?: unknown[] } }).result?.value;
  if (!Array.isArray(value)) return { decode, flags: decode.flags, chainRead: "failed" };
  const owners = new Map<string, string>();
  sources.forEach((pubkey, index) => {
    const owner = tokenOwnerFromParsedAccount(value[index]);
    if (owner) owners.set(pubkey, owner);
  });
  return { decode, flags: applyOwnerMismatch(decode, owners), chainRead: "ok" };
}

export async function executeHostTool(args: {
  name: string;
  toolArgs: unknown;
  snapshot: Uint8Array;
  rpcUrl: string;
  decodedPubkeys: string[];
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
      const value = await simulateTransactionRpc(args.rpcUrl, tx, new SimDeadline());
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
    return rpcRead(args.rpcUrl, "getMultipleAccounts", [requested.slice(0, PUBKEY_CAP), { encoding: "jsonParsed" }], args.signal);
  }
  if (args.name === "rpc_get_balance") {
    const pubkey = asPubkey(input.pubkey);
    if (!pubkey) return { ok: false, error: "pubkey required" };
    return rpcRead(args.rpcUrl, "getBalance", [pubkey], args.signal);
  }
  if (args.name === "rpc_get_account_info") {
    const pubkey = asPubkey(input.pubkey);
    if (!pubkey) return { ok: false, error: "pubkey required" };
    const encoding = input.encoding === "jsonParsed" ? "jsonParsed" : "base64";
    return rpcRead(args.rpcUrl, "getAccountInfo", [pubkey, { encoding }], args.signal);
  }
  if (args.name === "rpc_get_multiple_accounts") {
    const pubkeys = asPubkeys(input.pubkeys);
    if (!pubkeys) return { ok: false, error: "pubkeys required" };
    const encoding = input.encoding === "jsonParsed" ? "jsonParsed" : "base64";
    return rpcRead(args.rpcUrl, "getMultipleAccounts", [pubkeys.slice(0, 100), { encoding }], args.signal);
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
