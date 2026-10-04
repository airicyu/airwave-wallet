import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import type {
  SimulatePendingTxResult,
  SimulateTxDelta,
  SimulateTxInstruction,
} from "../shared/simulate-pending-tx-types";

const SIM_TIMEOUT_MS = 15_000;

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

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

function shortPk(pk: PublicKey | string): string {
  const s = typeof pk === "string" ? pk : pk.toBase58();
  if (s.length <= 8) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function programLabel(programId: PublicKey): string {
  return PROGRAM_NAMES[programId.toBase58()] ?? shortPk(programId);
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ixAccounts(
  accountKeys: (PublicKey | undefined)[],
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
  let fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
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

function instructionDesc(programId: PublicKey, data: Uint8Array): string | undefined {
  const pid = programId.toBase58();
  if (pid === "11111111111111111111111111111111" && data.length >= 1 && data[0] === 2) {
    return "轉移 SOL";
  }
  if (pid === "ComputeBudget111111111111111111111111111111" && data.length >= 1) {
    if (data[0] === 2) return "設定計算單位上限";
    if (data[0] === 3) return "設定優先費單價";
  }
  if (pid === "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" && data.length >= 1) {
    if (data[0] === 0 || data[0] === 1) return "建立關聯代幣帳戶";
  }
  if (
    (programId.equals(TOKEN_PROGRAM_ID) || programId.equals(TOKEN_2022_PROGRAM_ID)) &&
    data.length >= 1
  ) {
    if (data[0] === 3 || data[0] === 12) return "轉移代幣";
  }
  return undefined;
}

function buildInstructions(
  message: VersionedMessage,
  accountKeys: (PublicKey | undefined)[],
): SimulateTxInstruction[] {
  const out: SimulateTxInstruction[] = [];
  for (const ix of message.compiledInstructions) {
    const programId = accountKeys[ix.programIdIndex];
    if (!programId) {
      out.push({
        program: "?",
        unresolved: true,
        accounts: ixAccounts(accountKeys, ix.accountKeyIndexes),
        dataHex: bytesToHex(ix.data),
      });
      continue;
    }
    const desc = instructionDesc(programId, ix.data);
    const unresolved = ix.accountKeyIndexes.some((i) => accountKeys[i] === undefined);
    out.push({
      program: programLabel(programId),
      desc,
      unresolved: unresolved || undefined,
      accounts: ixAccounts(accountKeys, ix.accountKeyIndexes),
      dataHex: bytesToHex(ix.data),
    });
  }
  return out;
}

function keysFromLoaded(
  message: VersionedMessage,
  loaded: RpcLoadedAddresses | null | undefined,
): PublicKey[] {
  const staticKeys = message.staticAccountKeys.slice();
  if (message.version === "legacy") return staticKeys;
  const writable = (loaded?.writable ?? []).map((s) => new PublicKey(s));
  const readonly = (loaded?.readonly ?? []).map((s) => new PublicKey(s));
  return [...staticKeys, ...writable, ...readonly];
}

function v0LookupCount(message: VersionedMessage): number {
  if (message.version === "legacy") return 0;
  let n = 0;
  for (const lu of message.addressTableLookups) {
    n += lu.writableIndexes.length + lu.readonlyIndexes.length;
  }
  return n;
}

async function loadLookupTables(
  connection: Connection,
  message: VersionedMessage,
): Promise<AddressLookupTableAccount[] | null> {
  if (message.version === "legacy") return [];
  const tables: AddressLookupTableAccount[] = [];
  for (const lookup of message.addressTableLookups) {
    const res = await connection.getAddressLookupTable(lookup.accountKey);
    if (!res.value) return null;
    tables.push(res.value);
  }
  return tables;
}

async function resolveAccountKeysFromTables(
  connection: Connection,
  message: VersionedMessage,
  deadline: SimDeadline,
): Promise<(PublicKey | undefined)[] | "rpc" | "timeout"> {
  if (message.version === "legacy") {
    return message.staticAccountKeys.slice();
  }
  try {
    const tables = await deadline.run(() => loadLookupTables(connection, message));
    if (!tables) return "rpc";
    const keys = message.getAccountKeys({ addressLookupTableAccounts: tables });
    const lookups = keys.accountKeysFromLookups;
    const fromLu = lookups ? [...lookups.writable, ...lookups.readonly] : [];
    return [...keys.staticAccountKeys, ...fromLu];
  } catch (e) {
    if (e instanceof Error && e.message === "SIM_TIMEOUT") return "timeout";
    return "rpc";
  }
}

export async function simulateTransactionRpc(
  rpcUrl: string,
  tx: VersionedTransaction,
  deadline: SimDeadline,
): Promise<RpcSimulateValue> {
  const encoded = bytesToBase64(tx.serialize());
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
  signer: PublicKey,
  accountKeys: (PublicKey | undefined)[],
  value: RpcSimulateValue,
): SimulateTxDelta[] | "incomplete" {
  const preB = value.preBalances;
  const postB = value.postBalances;
  if (!Array.isArray(preB) || !Array.isArray(postB)) return "incomplete";
  if (preB.length === 0 && accountKeys.length > 0) return "incomplete";

  const signer58 = signer.toBase58();
  let nativeDiff = 0;
  const n = Math.min(preB.length, postB.length, accountKeys.length);
  for (let i = 0; i < n; i++) {
    const key = accountKeys[i];
    if (!key || !key.equals(signer)) continue;
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
  connection: Connection;
};

export async function runPhase2Simulation(
  ctx: Phase2SimContext,
  txBytes: Uint8Array,
  signerPubkey: PublicKey,
): Promise<SimulatePendingTxResult> {
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(txBytes);
  } catch {
    return {
      outcome: "unparseable",
      reason: "無法解析交易",
      instructions: [],
    };
  }

  const connection = ctx.connection;
  const message = tx.message;
  const deadline = new SimDeadline();
  const feePayer = message.staticAccountKeys[0];
  const feePayerShort = feePayer ? shortPk(feePayer) : undefined;

  let value: RpcSimulateValue;
  try {
    value = await simulateTransactionRpc(ctx.rpcUrl, tx, deadline);
  } catch (e) {
    const reason = e instanceof Error && e.message === "SIM_TIMEOUT" ? "逾時" : "RPC 錯誤";
    let instructions: SimulateTxInstruction[] | undefined;
    const keysResult = await resolveAccountKeysFromTables(connection, message, deadline);
    if (keysResult !== "rpc" && keysResult !== "timeout") {
      instructions = buildInstructions(message, keysResult);
    }
    return { outcome: "rpc", reason, instructions, feePayerShort };
  }

  const logs = tailLogs(value.logs ?? undefined);
  let accountKeys: (PublicKey | undefined)[] = keysFromLoaded(message, value.loadedAddresses);
  const needLu = v0LookupCount(message);
  const haveLu =
    (value.loadedAddresses?.writable?.length ?? 0) + (value.loadedAddresses?.readonly?.length ?? 0);
  if (needLu > 0 && haveLu < needLu) {
    const keysResult = await resolveAccountKeysFromTables(connection, message, deadline);
    if (keysResult === "timeout") {
      return { outcome: "rpc", reason: "逾時", feePayerShort };
    }
    if (keysResult === "rpc") {
      return {
        outcome: "rpc",
        reason: "無法載入 address lookup table",
        feePayerShort,
      };
    }
    accountKeys = keysResult;
  }

  const instructions = buildInstructions(message, accountKeys);

  const deltasOr = buildDeltas(signerPubkey, accountKeys, value);
  const deltas = deltasOr === "incomplete" ? undefined : deltasOr;

  if (deltasOr === "incomplete" && !value.err) {
    return {
      outcome: "rpc",
      reason: "模擬結果缺少餘額欄位",
      instructions,
      feePayerShort,
    };
  }

  if (value.err) {
    return {
      outcome: "fail",
      err: value.err,
      logs,
      reason: reasonFromFail(logs, value.err),
      deltas,
      instructions,
      feePayerShort,
    };
  }

  return {
    outcome: "ok",
    deltas: deltas ?? [],
    instructions,
    feePayerShort,
  };
}
