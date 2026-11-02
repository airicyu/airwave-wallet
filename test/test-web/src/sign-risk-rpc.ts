/**
 * test-web sign-risk POC: JSON-RPC via Vite proxy, token-account layout, and
 * allowlisted rpc_read for the harness agent. Does not call OpenRouter.
 */
import bs58 from "bs58";
import { TOKEN, TOKEN_2022 } from "./sign-risk-decode";

/** Planned host rpc_read allowlist (brainstorm; POC enforces this set). */
export const RPC_READ_ALLOWLIST = [
  "getBalance",
  "getMultipleAccounts",
  "getAccountInfo",
  "getTokenAccountsByOwner",
  "getSignaturesForAddress",
  "getTransaction",
  "simulateTransaction",
  "getLatestBlockhash",
] as const;

export type RpcReadMethod = (typeof RPC_READ_ALLOWLIST)[number];

const RPC_READ_SET = new Set<string>(RPC_READ_ALLOWLIST);

export type ChainAccount = {
  pubkey: string;
  found: boolean;
  lamports?: string;
  ownerProgram?: string;
  token?: {
    mint: string;
    owner: string;
    amount: string;
    delegate: string | null;
    delegatedAmount: string;
  };
};

function u64(data: Uint8Array, offset: number): string {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true).toString();
}

function u32(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, true);
}

function parseTokenAccount(ownerProgram: string, raw: Uint8Array): ChainAccount["token"] | undefined {
  if (ownerProgram !== TOKEN && ownerProgram !== TOKEN_2022) return undefined;
  if (raw.length < 165) return undefined;
  const mint = bs58.encode(raw.subarray(0, 32));
  const owner = bs58.encode(raw.subarray(32, 64));
  const amount = u64(raw, 64);
  const hasDelegate = u32(raw, 72) === 1;
  const delegate = hasDelegate ? bs58.encode(raw.subarray(76, 108)) : null;
  const delegatedAmount = u64(raw, 121);
  return { mint, owner, amount, delegate, delegatedAmount };
}

export async function solanaRpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch("/solana-rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Solana-Rpc": rpcUrl,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await response.json()) as { error?: { message?: string }; result?: T };
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Shrink huge base64 blobs so tool results fit the harness tool-result byte cap. */
function compactRpcJson(value: unknown, depth = 0): unknown {
  if (depth > 10) return "[max depth]";
  if (typeof value === "string") {
    if (value.length > 160) return `${value.slice(0, 48)}…(${value.length} chars)`;
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((item) => compactRpcJson(item, depth + 1));
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = compactRpcJson(child, depth + 1);
  }
  return out;
}

function normalizeRpcReadParams(method: RpcReadMethod, params: unknown[]): unknown[] {
  if (method === "getMultipleAccounts") {
    const keys = params[0];
    if (!Array.isArray(keys) || !keys.every((k) => typeof k === "string")) {
      throw new Error("getMultipleAccounts params[0] must be string[]");
    }
    const unique = [...new Set(keys)].slice(0, 100);
    const opts: Record<string, unknown> = isPlainObject(params[1]) ? { ...params[1] } : {};
    if (opts.encoding === undefined) opts.encoding = "base64";
    return [unique, opts];
  }
  if (method === "getAccountInfo") {
    if (typeof params[0] !== "string") throw new Error("getAccountInfo params[0] must be pubkey string");
    const opts: Record<string, unknown> = isPlainObject(params[1]) ? { ...params[1] } : {};
    if (opts.encoding === undefined) opts.encoding = "base64";
    return [params[0], opts];
  }
  if (method === "getBalance") {
    if (typeof params[0] !== "string") throw new Error("getBalance params[0] must be pubkey string");
    return params.slice(0, 2);
  }
  if (method === "getTokenAccountsByOwner") {
    if (typeof params[0] !== "string") throw new Error("getTokenAccountsByOwner params[0] must be owner pubkey");
    if (!isPlainObject(params[1])) throw new Error("getTokenAccountsByOwner params[1] must be filter object");
    const opts: Record<string, unknown> = isPlainObject(params[2]) ? { ...params[2] } : {};
    if (opts.encoding === undefined) opts.encoding = "jsonParsed";
    return [params[0], params[1], opts];
  }
  if (method === "getSignaturesForAddress") {
    if (typeof params[0] !== "string") throw new Error("getSignaturesForAddress params[0] must be pubkey string");
    const opts: Record<string, unknown> = isPlainObject(params[1]) ? { ...params[1] } : {};
    const limit = typeof opts.limit === "number" ? opts.limit : 10;
    opts.limit = Math.min(Math.max(1, limit), 25);
    return [params[0], opts];
  }
  if (method === "getTransaction") {
    if (typeof params[0] !== "string") throw new Error("getTransaction params[0] must be signature string");
    const opts: Record<string, unknown> = isPlainObject(params[1]) ? { ...params[1] } : {};
    if (opts.encoding === undefined) opts.encoding = "json";
    if (opts.maxSupportedTransactionVersion === undefined) opts.maxSupportedTransactionVersion = 1;
    return [params[0], opts];
  }
  if (method === "simulateTransaction") {
    if (typeof params[0] !== "string") throw new Error("simulateTransaction params[0] must be base64 wire");
    const opts: Record<string, unknown> = isPlainObject(params[1]) ? { ...params[1] } : {};
    if (opts.encoding === undefined) opts.encoding = "base64";
    if (opts.sigVerify === undefined) opts.sigVerify = false;
    if (opts.replaceRecentBlockhash === undefined) opts.replaceRecentBlockhash = true;
    return [params[0], opts];
  }
  if (method === "getLatestBlockhash") {
    return params.slice(0, 1);
  }
  return params;
}

/**
 * Allowlisted JSON-RPC for the harness agent. Returns compacted JSON-safe result
 * (unwraps common `{ context, value }` where helpful via leaving shape intact but
 * truncating huge strings).
 */
export async function rpcRead(
  rpcUrl: string,
  method: string,
  params: unknown,
): Promise<{ ok: true; method: RpcReadMethod; result: unknown } | { ok: false; error: string }> {
  if (!RPC_READ_SET.has(method)) {
    return {
      ok: false,
      error: `method not allowed: ${method}. allowlist: ${RPC_READ_ALLOWLIST.join(", ")}`,
    };
  }
  if (!Array.isArray(params)) {
    return { ok: false, error: "params must be a JSON array (Solana JSON-RPC params)" };
  }
  try {
    const typed = method as RpcReadMethod;
    const normalized = normalizeRpcReadParams(typed, params);
    const result = await solanaRpc<unknown>(rpcUrl, typed, normalized);
    return { ok: true, method: typed, result: compactRpcJson(result) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export type FetchedTx = {
  wire: Uint8Array;
  loaded?: { writable: string[]; readonly: string[] };
  /** Prefer for decode — v1 binary layout is not the same as v0. */
  jsonMessage: {
    accountKeys: Array<string | { pubkey: string }>;
    header: {
      numRequiredSignatures: number;
      numReadonlySignedAccounts: number;
      numReadonlyUnsignedAccounts: number;
    };
    instructions: Array<{
      programIdIndex: number;
      accounts: number[];
      data: string;
    }>;
  };
};

function wireFromGetTransaction(transaction: unknown): Uint8Array {
  // encoding=base64 → [base64, "base64"]
  if (Array.isArray(transaction) && typeof transaction[0] === "string") {
    const binary = atob(transaction[0]);
    const wire = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) wire[i] = binary.charCodeAt(i);
    return wire;
  }
  throw new Error("getTransaction: expected base64 tuple [string, \"base64\"]");
}

export async function fetchTransaction(rpcUrl: string, signature: string): Promise<FetchedTx> {
  const opts = { maxSupportedTransactionVersion: 1, commitment: "confirmed" as const };
  const [b64Result, jsonResult] = await Promise.all([
    solanaRpc<{
      transaction: unknown;
      meta?: { loadedAddresses?: { writable?: string[]; readonly?: string[] } };
    } | null>(rpcUrl, "getTransaction", [signature, { encoding: "base64", ...opts }]),
    solanaRpc<{
      transaction?: {
        message?: FetchedTx["jsonMessage"];
      };
      meta?: { loadedAddresses?: { writable?: string[]; readonly?: string[] } };
    } | null>(rpcUrl, "getTransaction", [signature, { encoding: "json", ...opts }]),
  ]);
  if (!b64Result || !jsonResult) throw new Error("找不到這筆交易（cluster 或 commitment 不對）");
  const jsonMessage = jsonResult.transaction?.message;
  if (!jsonMessage?.accountKeys || !jsonMessage.header || !jsonMessage.instructions) {
    throw new Error("getTransaction json message missing accountKeys/header/instructions");
  }
  const wire = wireFromGetTransaction(b64Result.transaction);
  const writable = b64Result.meta?.loadedAddresses?.writable ?? jsonResult.meta?.loadedAddresses?.writable ?? [];
  const readonly = b64Result.meta?.loadedAddresses?.readonly ?? jsonResult.meta?.loadedAddresses?.readonly ?? [];
  const loaded = writable.length + readonly.length > 0 ? { writable, readonly } : undefined;
  return { wire, loaded, jsonMessage };
}

type RpcAccountInfo = {
  lamports: number;
  owner: string;
  data: [string, string];
};

/** Solana JSON-RPC wraps account lists as `{ context, value }`, not a bare array. */
export async function fetchChainAccounts(rpcUrl: string, pubkeys: string[]): Promise<ChainAccount[]> {
  const unique = [...new Set(pubkeys)].slice(0, 100);
  if (unique.length === 0) return [];
  const result = await solanaRpc<{ value: Array<RpcAccountInfo | null> } | Array<RpcAccountInfo | null>>(
    rpcUrl,
    "getMultipleAccounts",
    [unique, { encoding: "base64" }],
  );
  const list = Array.isArray(result) ? result : result?.value;
  if (!Array.isArray(list)) {
    throw new Error("getMultipleAccounts: unexpected RPC shape (expected value[])");
  }
  return unique.map((pubkey, i) => {
    const item = list[i];
    if (!item) return { pubkey, found: false };
    const rawB64 = item.data[0];
    const binary = atob(rawB64);
    const raw = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j += 1) raw[j] = binary.charCodeAt(j);
    return {
      pubkey,
      found: true,
      lamports: String(item.lamports),
      ownerProgram: item.owner,
      token: parseTokenAccount(item.owner, raw),
    };
  });
}
