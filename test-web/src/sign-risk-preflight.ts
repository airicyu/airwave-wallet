/**
 * Host preflight for the sign-risk page, matching the wallet report step:
 * decode, simulate with this transaction's blockhash, batched account reads.
 * Does not call OpenRouter or assign a risk level.
 */
import {
  applyOwnerMismatch,
  LABELED,
  messageBytesFromWire,
  staticFlagsFromMessage,
  staticFlagsFromRpcJsonMessage,
  SYSTEM,
  TOKEN,
  TOKEN_2022,
  type LoadedAddresses,
  type RpcJsonMessage,
  type StaticFlags,
} from "./sign-risk-decode";
import { rpcRead } from "./sign-risk-rpc";

const PREFLIGHT_JSON_MAX = 8_000;
const BATCH = 20;
const MAX_PUBKEYS = 60;

const SKIP = new Set<string>([
  SYSTEM,
  TOKEN,
  TOKEN_2022,
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "ComputeBudget111111111111111111111111111111",
  ...Object.keys(LABELED),
]);

export const PREFETCH_DUPLICATE_NOTE =
  "Already in preflight getMultipleAccounts; use the Preflight accounts section in the user message.";

const USER_LEAD =
  "下方主機預檢含 decode、simulate（本交易 blockhash）、分批 getMultipleAccounts（見 preflightPubkeys）及 fee payer 餘額（若有）。請據此直接寫報告；勿對 preflightPubkeys 內地址再查。僅對未列入的 pubkey 使用工具。";

export type SignRiskSession = {
  transactionBase64: string;
  wireForm: string;
  loaded?: LoadedAddresses;
  rpcUrl: string;
  rpcJsonMessage?: RpcJsonMessage;
};

export type SignRiskPreflight = {
  decode: StaticFlags;
  userMessage: string;
  manifest: ReadonlySet<string>;
  feePayer?: string;
  feePayerBalanceLamports?: string;
};

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function messageBytes(session: SignRiskSession): Uint8Array {
  const bytes = base64ToBytes(session.transactionBase64);
  if (session.wireForm === "message") return bytes;
  return messageBytesFromWire(bytes);
}

function decodeSession(session: SignRiskSession): StaticFlags {
  if (session.rpcJsonMessage) return staticFlagsFromRpcJsonMessage(session.rpcJsonMessage, session.loaded);
  return staticFlagsFromMessage(messageBytes(session), session.loaded);
}

/** Signers and writables first, same order as the wallet prefetch list. */
export function prefetchPubkeys(summary: StaticFlags, cap = MAX_PUBKEYS): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (pubkey: string | undefined): void => {
    if (!pubkey || pubkey === "未解析" || SKIP.has(pubkey) || seen.has(pubkey)) return;
    seen.add(pubkey);
    ordered.push(pubkey);
  };
  for (const ix of summary.instructions) {
    if (ix.program !== "Token" && ix.program !== "Token-2022") continue;
    add(ix.accounts.find((account) => account.ixRole === "source")?.pubkey);
    add(ix.accounts.find((account) => account.ixRole === "owner" || account.ixRole === "currentAuthority")?.pubkey);
  }
  add(summary.feePayer);
  for (const ix of summary.instructions) {
    for (const account of ix.accounts) if (account.signer) add(account.pubkey);
  }
  for (const ix of summary.instructions) {
    for (const account of ix.accounts) if (account.writable) add(account.pubkey);
  }
  for (const ix of summary.instructions) {
    for (const account of ix.accounts) add(account.pubkey);
  }
  return ordered.slice(0, cap);
}

function clipJson(value: unknown): string {
  const raw = JSON.stringify(value);
  return raw.length > PREFLIGHT_JSON_MAX ? `${raw.slice(0, PREFLIGHT_JSON_MAX)}…` : raw;
}

function tokenOwner(account: unknown): string | null {
  if (!account || typeof account !== "object") return null;
  const data = (account as { data?: { parsed?: { info?: { owner?: unknown } } } }).data;
  const owner = data?.parsed?.info?.owner;
  return typeof owner === "string" ? owner : null;
}

function lamportsFromBalance(read: { ok: true; result: unknown } | { ok: false; error: string }): string | undefined {
  if (!read.ok || !read.result || typeof read.result !== "object") return undefined;
  const value = (read.result as { value?: unknown }).value;
  if (typeof value === "number" || typeof value === "string") return String(value);
  return undefined;
}

async function fetchAccountBatches(
  rpcUrl: string,
  pubkeys: string[],
): Promise<{ pubkeys: string[]; accounts: unknown[] } | null> {
  const mergedPubkeys: string[] = [];
  const mergedAccounts: unknown[] = [];
  for (let offset = 0; offset < pubkeys.length; offset += BATCH) {
    const chunk = pubkeys.slice(offset, offset + BATCH);
    const read = await rpcRead(rpcUrl, "getMultipleAccounts", [chunk, { encoding: "jsonParsed" }]);
    if (!read.ok || !read.result || typeof read.result !== "object") return null;
    const value = (read.result as { value?: unknown }).value;
    if (!Array.isArray(value) || value.length !== chunk.length) return null;
    for (let i = 0; i < chunk.length; i += 1) {
      mergedPubkeys.push(chunk[i] ?? "");
      mergedAccounts.push(value[i]);
    }
  }
  return { pubkeys: mergedPubkeys, accounts: mergedAccounts };
}

async function simulateSession(session: SignRiskSession): Promise<unknown> {
  if (!session.rpcUrl.trim()) return { error: "MAINNET_RPC_UNSET" };
  if (session.wireForm === "message") {
    return { error: "bare message has no signature region; use masked-wire or a chain transaction" };
  }
  const read = await rpcRead(session.rpcUrl, "simulateTransaction", [
    session.transactionBase64,
    {
      encoding: "base64",
      replaceRecentBlockhash: false,
      sigVerify: false,
      commitment: "processed",
    },
  ]);
  if (!read.ok) return { error: read.error };
  const envelope = read.result as { value?: { err?: unknown; unitsConsumed?: number | null; logs?: unknown } } | null;
  const value = envelope?.value;
  return {
    err: value?.err ?? null,
    unitsConsumed: value?.unitsConsumed ?? null,
    logs: Array.isArray(value?.logs) ? value.logs.slice(-40) : [],
  };
}

export function splitPrefetchDuplicates(
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

/** Decode and chain reads shared by every model in one click. */
export async function runSignRiskPreflight(session: SignRiskSession): Promise<SignRiskPreflight> {
  const decode = decodeSession(session);
  const keys = prefetchPubkeys(decode);
  let feePayerBalanceLamports: string | undefined;
  if (session.rpcUrl.trim() && decode.feePayer && decode.feePayer !== "未解析") {
    feePayerBalanceLamports = lamportsFromBalance(await rpcRead(session.rpcUrl, "getBalance", [decode.feePayer]));
  }
  let chainRead: "ok" | "failed" | "skipped" = "skipped";
  let accounts: { pubkeys: string[]; accounts: unknown[] } | null = null;
  if (session.rpcUrl.trim() && keys.length > 0) {
    accounts = await fetchAccountBatches(session.rpcUrl, keys);
    chainRead = accounts ? "ok" : "failed";
  }
  if (accounts) {
    const owners = new Map<string, string>();
    accounts.pubkeys.forEach((pubkey, index) => {
      const owner = tokenOwner(accounts?.accounts[index]);
      if (owner) owners.set(pubkey, owner);
    });
    applyOwnerMismatch(decode, owners);
  }
  const accountsBlock = accounts
    ? {
        preflightPubkeys: keys,
        feePayerBalanceLamports,
        pubkeys: accounts.pubkeys,
        accounts: accounts.accounts,
      }
    : {
        note: keys.length === 0 ? "no resolved pubkeys to prefetch" : "accounts read unavailable",
        ...(feePayerBalanceLamports ? { feePayerBalanceLamports } : {}),
      };
  const body = [
    "## Preflight decode (host)",
    clipJson({
      feePayer: decode.feePayer,
      instructions: decode.instructions,
      flags: decode.flags,
      chainRead,
    }),
    "## Preflight simulate (this tx blockhash, no sigVerify)",
    clipJson(await simulateSession(session)),
    "## Preflight accounts (host getMultipleAccounts batches + fee payer balance)",
    clipJson(accountsBlock),
    "Do not call get_accounts or rpc_get_multiple_accounts for pubkeys listed in preflightPubkeys.",
  ].join("\n\n");
  return {
    decode,
    userMessage: `${USER_LEAD}\n\n${body}`,
    manifest: new Set(keys),
    feePayer: decode.feePayer || undefined,
    feePayerBalanceLamports,
  };
}
