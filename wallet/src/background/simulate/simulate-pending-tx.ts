import {
  address,
  type AddressesByLookupTableAddress,
  type Address,
  type CompiledTransactionMessage,
  type CompiledTransactionMessageWithLifetime,
  fetchAddressesForLookupTables,
  getCompiledTransactionMessageDecoder,
  type Transaction,
} from "@solana/kit";
import type {
  SimulatePendingTxResult,
  SimulateTxDelta,
  SimulateTxInstruction,
} from "../../shared/simulate-pending-tx-types";
import {
  compiledAddressTableLookups,
  messageBytesToUint8Array,
  normalizedCompiledInstructions,
} from "../../shared/compiled-message";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { decodeWireTransaction, encodeWireTransaction } from "../../shared/tx-wire";
import { decodeCompiledIx } from "./decode-compiled-ix";
import type { Cluster } from "../../shared/storage-keys";

const SIM_TIMEOUT_MS = 15_000;

const PROGRAM_NAMES: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token Program",
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: "Token-2022",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "Associated Token Account",
  ComputeBudget111111111111111111111111111111: "Compute Budget",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo",
};

type RpcTokenAmount = {
  amount?: string;
  decimals?: number;
};

type RpcTokenBalance = {
  accountIndex?: number;
  mint?: string;
  owner?: string;
  uiTokenAmount?: RpcTokenAmount;
};

type RpcLoadedAddresses = {
  writable?: string[];
  readonly?: string[];
};

type RpcSimulateValue = {
  err?: unknown;
  logs?: string[] | null;
  unitsConsumed?: number;
  fee?: number;
  preBalances?: number[];
  postBalances?: number[];
  preTokenBalances?: RpcTokenBalance[] | null;
  postTokenBalances?: RpcTokenBalance[] | null;
  loadedAddresses?: RpcLoadedAddresses | null;
};

type CompiledMessage = CompiledTransactionMessage & CompiledTransactionMessageWithLifetime;

function decodeCompiledMessage(bytes: Uint8Array): CompiledMessage {
  return getCompiledTransactionMessageDecoder().decode(bytes) as CompiledMessage;
}

function shortPk(pk: string): string {
  if (pk.length <= 8) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function programLabel(programId: string): string {
  return PROGRAM_NAMES[programId] ?? shortPk(programId);
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ixAccounts(
  accountKeys: (string | undefined)[],
  indexes: number[],
): { short: string; unresolved?: boolean }[] {
  return indexes.map((i) => {
    const k = accountKeys[i];
    if (!k) return { short: "未解析", unresolved: true };
    return { short: shortPk(k) };
  });
}

export class SimDeadline {
  private readonly endsAt = Date.now() + SIM_TIMEOUT_MS;

  remainingMs(): number {
    return Math.max(0, this.endsAt - Date.now());
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    const ms = this.remainingMs();
    if (ms <= 0) throw new Error("SIM_TIMEOUT");
    return Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("SIM_TIMEOUT")), ms);
      }),
    ]);
  }
}

function tailLogs(logs: string[] | null | undefined, maxLines = 20): string[] | undefined {
  if (!logs?.length) return undefined;
  return logs.length <= maxLines ? logs : logs.slice(-maxLines);
}

function reasonFromFail(logs: string[] | undefined, err: unknown): string | undefined {
  if (logs) {
    for (let i = logs.length - 1; i >= 0; i--) {
      const line = logs[i];
      const idx = line.indexOf("Error:");
      if (idx >= 0) {
        const slice = line.slice(idx).trim();
        return slice.length > 120 ? `${slice.slice(0, 117)}…` : slice;
      }
    }
  }
  if (err != null) {
    const s = JSON.stringify(err);
    if (s && s !== "{}") {
      return s.length > 80 ? `${s.slice(0, 77)}…` : s;
    }
  }
  return undefined;
}

function formatAmount(amount: bigint, decimals: number): string {
  if (decimals <= 0) return amount.toString();
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const frac = amount % base;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function buildInspectorUrl(messageBytes: Uint8Array, cluster: Cluster): string {
  const clusterParam = cluster === "devnet" ? "devnet" : "mainnet-beta";
  const b64 = bytesToBase64(messageBytes);
  return `https://explorer.solana.com/tx/inspector?cluster=${clusterParam}&message=${encodeURIComponent(b64)}`;
}

function buildInstructions(
  message: CompiledMessage,
  accountKeys: (string | undefined)[],
): SimulateTxInstruction[] {
  const out: SimulateTxInstruction[] = [];
  for (const ix of normalizedCompiledInstructions(message)) {
    const programId = accountKeys[ix.programAddressIndex];
    const accountKeyIndexes = ix.accountIndices;
    const data = ix.data;
    if (!programId) {
      out.push({
        program: "?",
        unresolved: true,
        accounts: ixAccounts(accountKeys, accountKeyIndexes),
        dataHex: bytesToHex(data),
      });
      continue;
    }
    const decoded = decodeCompiledIx(programId, data, accountKeys, accountKeyIndexes);
    if (decoded.decoded) {
      out.push({
        program: programLabel(programId),
        name: decoded.name,
        decoded: true,
        fields: decoded.fields,
      });
      continue;
    }
    const unresolved = accountKeyIndexes.some((i) => accountKeys[i] === undefined);
    out.push({
      program: programLabel(programId),
      unresolved: unresolved || undefined,
      accounts: ixAccounts(accountKeys, accountKeyIndexes),
      dataHex: bytesToHex(data),
    });
  }
  return out;
}

function keysFromLoaded(
  message: CompiledMessage,
  loaded: RpcLoadedAddresses | null | undefined,
): (string | undefined)[] {
  const staticKeys = [...message.staticAccounts];
  if (message.version === "legacy") return staticKeys;
  const writable = loaded?.writable ?? [];
  const readonly = loaded?.readonly ?? [];
  return [...staticKeys, ...writable, ...readonly];
}

function v0LookupCount(message: CompiledMessage): number {
  if (message.version === "legacy") return 0;
  let n = 0;
  for (const lu of compiledAddressTableLookups(message)) {
    n += lu.writableIndexes.length + lu.readonlyIndexes.length;
  }
  return n;
}

function expandV0AccountKeys(
  message: CompiledMessage,
  byTable: AddressesByLookupTableAddress,
): Address[] | null {
  if (message.version === "legacy") return [...message.staticAccounts];
  const keys = [...message.staticAccounts];
  for (const lookup of compiledAddressTableLookups(message)) {
    const addrs = byTable[lookup.lookupTableAddress as Address];
    if (!addrs) return null;
    for (const i of lookup.writableIndexes) {
      if (i >= addrs.length) return null;
      keys.push(addrs[i]);
    }
    for (const i of lookup.readonlyIndexes) {
      if (i >= addrs.length) return null;
      keys.push(addrs[i]);
    }
  }
  return keys;
}

async function resolveAccountKeysFromTables(
  rpcUrl: string,
  message: CompiledMessage,
  deadline: SimDeadline,
): Promise<(Address | undefined)[] | "rpc" | "timeout"> {
  if (message.version === "legacy") {
    return [...message.staticAccounts];
  }
  try {
    const lookupAddrs = compiledAddressTableLookups(message).map((l) => l.lookupTableAddress);
    const byTable =
      lookupAddrs.length > 0
        ? await deadline.run(() =>
            fetchAddressesForLookupTables(
              lookupAddrs as Address[],
              solanaRpcForUrl(rpcUrl),
            ),
          )
        : {};
    const keys = expandV0AccountKeys(message, byTable);
    if (!keys) return "rpc";
    return keys;
  } catch (e) {
    if (e instanceof Error && e.message === "SIM_TIMEOUT") return "timeout";
    return "rpc";
  }
}

export async function simulateTransactionRpc(
  rpcUrl: string,
  tx: Transaction,
  deadline: SimDeadline,
): Promise<RpcSimulateValue> {
  const encoded = bytesToBase64(encodeWireTransaction(tx));
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "simulateTransaction",
    params: [
      encoded,
      {
        encoding: "base64",
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: "confirmed",
      },
    ],
  };
  const json = (await deadline.run(async () => {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("RPC_HTTP");
    return res.json() as Promise<{
      error?: { message?: string };
      result?: { value?: RpcSimulateValue };
    }>;
  })) as {
    error?: { message?: string };
    result?: { value?: RpcSimulateValue };
  };
  if (json.error) {
    throw new Error(json.error.message || "RPC_ERROR");
  }
  const value = json.result?.value;
  if (!value) throw new Error("RPC_EMPTY");
  return value;
}

function tokenAmt(row: RpcTokenBalance | undefined): bigint {
  const a = row?.uiTokenAmount?.amount;
  if (!a) return 0n;
  try {
    return BigInt(a);
  } catch {
    return 0n;
  }
}

function tokenDecimals(row: RpcTokenBalance | undefined): number {
  const d = row?.uiTokenAmount?.decimals;
  return typeof d === "number" && d >= 0 ? d : 0;
}

function buildDeltas(
  signer: string,
  accountKeys: (string | undefined)[],
  value: RpcSimulateValue,
): SimulateTxDelta[] | "incomplete" {
  const preB = value.preBalances;
  const postB = value.postBalances;
  if (!Array.isArray(preB) || !Array.isArray(postB)) return "incomplete";
  if (preB.length === 0 && accountKeys.length > 0) return "incomplete";

  const signer58 = signer;
  let nativeDiff = 0;
  const n = Math.min(preB.length, postB.length, accountKeys.length);
  for (let i = 0; i < n; i++) {
    const key = accountKeys[i];
    if (!key || key !== signer58) continue;
    nativeDiff += (postB[i] ?? 0) - (preB[i] ?? 0);
  }

  const preTok = new Map<number, RpcTokenBalance>();
  const postTok = new Map<number, RpcTokenBalance>();
  for (const row of value.preTokenBalances ?? []) {
    if (typeof row.accountIndex === "number") preTok.set(row.accountIndex, row);
  }
  for (const row of value.postTokenBalances ?? []) {
    if (typeof row.accountIndex === "number") postTok.set(row.accountIndex, row);
  }

  const indexes = new Set<number>([...preTok.keys(), ...postTok.keys()]);
  const spl = new Map<string, { diff: bigint; decimals: number }>();
  for (const idx of indexes) {
    const pre = preTok.get(idx);
    const post = postTok.get(idx);
    const owner = post?.owner ?? pre?.owner;
    if (owner !== signer58) continue;
    const mint = post?.mint ?? pre?.mint;
    if (!mint) continue;
    const diff = tokenAmt(post) - tokenAmt(pre);
    if (diff === 0n) continue;
    const decimals = tokenDecimals(post ?? pre);
    const cur = spl.get(mint);
    if (cur) {
      cur.diff += diff;
    } else {
      spl.set(mint, { diff, decimals });
    }
  }

  const deltas: SimulateTxDelta[] = [];
  if (nativeDiff !== 0) {
    deltas.push({
      symbol: "SOL",
      amount: (Math.abs(nativeDiff) / 1e9).toString(),
      sign: nativeDiff > 0 ? "plus" : "minus",
    });
  }
  for (const [mint, { diff, decimals }] of spl) {
    if (diff === 0n) continue;
    const abs = diff < 0n ? -diff : diff;
    deltas.push({
      symbol: shortPk(mint),
      amount: formatAmount(abs, decimals),
      sign: diff > 0n ? "plus" : "minus",
    });
  }
  return deltas;
}

export type Phase2SimContext = {
  rpcUrl: string;
};

function withInspector(
  result: SimulatePendingTxResult,
  messageBytes: Uint8Array | null,
  cluster: Cluster,
): SimulatePendingTxResult {
  if (!messageBytes) return result;
  return { ...result, inspectorUrl: buildInspectorUrl(messageBytes, cluster) };
}

export async function runPhase2Simulation(
  ctx: Phase2SimContext,
  txBytes: Uint8Array,
  signerPubkey: string,
  cluster: Cluster,
): Promise<SimulatePendingTxResult> {
  let tx: Transaction;
  try {
    tx = decodeWireTransaction(txBytes);
  } catch {
    return {
      outcome: "unparseable",
      reason: "無法解析交易",
      instructions: [],
    };
  }

  const message = decodeCompiledMessage(messageBytesToUint8Array(tx.messageBytes));
  const deadline = new SimDeadline();
  const feePayer = message.staticAccounts[0];
  const feePayerShort = feePayer ? shortPk(feePayer) : undefined;

  let value: RpcSimulateValue;
  try {
    value = await simulateTransactionRpc(ctx.rpcUrl, tx, deadline);
  } catch (e) {
    const reason = e instanceof Error && e.message === "SIM_TIMEOUT" ? "逾時" : "RPC 錯誤";
    let instructions: SimulateTxInstruction[] | undefined;
    const keysResult = await resolveAccountKeysFromTables(ctx.rpcUrl, message, deadline);
    if (keysResult !== "rpc" && keysResult !== "timeout") {
      instructions = buildInstructions(message, keysResult);
    }
    return withInspector(
      { outcome: "rpc", reason, instructions, feePayerShort },
      messageBytesToUint8Array(tx.messageBytes),
      cluster,
    );
  }

  const logs = tailLogs(value.logs ?? undefined);
  let accountKeys: (string | undefined)[] = keysFromLoaded(message, value.loadedAddresses);
  const needLu = v0LookupCount(message);
  const haveLu =
    (value.loadedAddresses?.writable?.length ?? 0) + (value.loadedAddresses?.readonly?.length ?? 0);
  if (needLu > 0 && haveLu < needLu) {
    const keysResult = await resolveAccountKeysFromTables(ctx.rpcUrl, message, deadline);
    if (keysResult === "timeout") {
      return withInspector(
        { outcome: "rpc", reason: "逾時", feePayerShort },
        messageBytesToUint8Array(tx.messageBytes),
        cluster,
      );
    }
    if (keysResult === "rpc") {
      return withInspector(
        {
          outcome: "rpc",
          reason: "無法載入 address lookup table",
          feePayerShort,
        },
        messageBytesToUint8Array(tx.messageBytes),
        cluster,
      );
    }
    accountKeys = keysResult;
  }

  const instructions = buildInstructions(message, accountKeys);

  const deltasOr = buildDeltas(signerPubkey, accountKeys, value);
  const deltas = deltasOr === "incomplete" ? undefined : deltasOr;

  if (deltasOr === "incomplete" && !value.err) {
    return withInspector(
      {
        outcome: "rpc",
        reason: "模擬結果缺少餘額欄位",
        instructions,
        feePayerShort,
      },
      messageBytesToUint8Array(tx.messageBytes),
      cluster,
    );
  }

  if (value.err) {
    return withInspector(
      {
        outcome: "fail",
        err: value.err,
        logs,
        reason: reasonFromFail(logs, value.err),
        deltas,
        instructions,
        feePayerShort,
      },
      messageBytesToUint8Array(tx.messageBytes),
      cluster,
    );
  }

  return withInspector(
    {
      outcome: "ok",
      deltas: deltas ?? [],
      instructions,
      feePayerShort,
    },
    messageBytesToUint8Array(tx.messageBytes),
    cluster,
  );
}
