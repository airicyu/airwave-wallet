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

function shortPk(pk: PublicKey | string): string {
  const s = typeof pk === "string" ? pk : pk.toBase58();
  if (s.length <= 8) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function programLabel(programId: PublicKey): string {
  return PROGRAM_NAMES[programId.toBase58()] ?? shortPk(programId);
}

class SimDeadline {
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

function readU64LE(data: Uint8Array, offset: number): bigint {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return view.getBigUint64(0, true);
}

function parseTokenAccount(data: Uint8Array): { mint: PublicKey; owner: PublicKey; amount: bigint } | null {
  if (data.length < 72) return null;
  return {
    mint: new PublicKey(data.slice(0, 32)),
    owner: new PublicKey(data.slice(32, 64)),
    amount: readU64LE(data, 64),
  };
}

function formatAmount(amount: bigint, decimals: number): string {
  if (decimals <= 0) return amount.toString();
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const frac = amount % base;
  let fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

function accountDataBytes(
  info: { data: Uint8Array | string[] } | null | undefined,
): Uint8Array | null {
  if (!info) return null;
  const d = info.data;
  if (d instanceof Uint8Array) return d;
  if (Array.isArray(d) && d[0]) return Uint8Array.from(atob(d[0]), (c) => c.charCodeAt(0));
  return null;
}

function isTokenProgram(owner: PublicKey): boolean {
  return owner.equals(TOKEN_PROGRAM_ID) || owner.equals(TOKEN_2022_PROGRAM_ID);
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
      out.push({ program: "?", unresolved: true });
      continue;
    }
    const desc = instructionDesc(programId, ix.data);
    const unresolved = ix.accountKeyIndexes.some((i) => accountKeys[i] === undefined);
    out.push({
      program: programLabel(programId),
      desc,
      unresolved: unresolved || undefined,
    });
  }
  return out;
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

async function resolveAccountKeys(
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
    const fromLu = lookups
      ? [...lookups.writable, ...lookups.readonly]
      : [];
    return [...keys.staticAccountKeys, ...fromLu];
  } catch (e) {
    if (e instanceof Error && e.message === "SIM_TIMEOUT") return "timeout";
    return "rpc";
  }
}

export async function simulatePendingTx(
  rpcUrl: string,
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
      feeLamports: null,
    };
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const message = tx.message;
  const deadline = new SimDeadline();

  const keysResult = await resolveAccountKeys(connection, message, deadline);
  if (keysResult === "rpc") {
    return {
      outcome: "rpc",
      reason: "無法載入 address lookup table",
      feeLamports: null,
      feePayerShort: shortPk(message.staticAccountKeys[0]),
    };
  }
  if (keysResult === "timeout") {
    return { outcome: "rpc", reason: "逾時", feeLamports: null };
  }

  const accountKeys = keysResult;
  const instructions = buildInstructions(message, accountKeys);
  const feePayer = accountKeys[0];
  const feePayerShort = feePayer ? shortPk(feePayer) : undefined;

  let feeLamports: number | null = null;
  try {
    const fee = await deadline.run(() => connection.getFeeForMessage(message));
    if (fee.value != null) feeLamports = fee.value;
  } catch (e) {
    if (e instanceof Error && e.message === "SIM_TIMEOUT") {
      return { outcome: "rpc", reason: "逾時", instructions, feeLamports: null, feePayerShort };
    }
    feeLamports = null;
  }

  const tokenAccountsForSigner: PublicKey[] = [];
  for (const key of accountKeys) {
    if (!key || key.equals(signerPubkey)) continue;
    if (deadline.remainingMs() <= 0) {
      return { outcome: "rpc", reason: "逾時", instructions, feeLamports, feePayerShort };
    }
    try {
      const info = await deadline.run(() => connection.getAccountInfo(key));
      if (!info || !isTokenProgram(info.owner)) continue;
      const parsed = parseTokenAccount(new Uint8Array(info.data));
      if (parsed?.owner.equals(signerPubkey)) tokenAccountsForSigner.push(key);
    } catch {
      /* skip */
    }
  }

  const addresses: PublicKey[] = [signerPubkey];
  const seen = new Set([signerPubkey.toBase58()]);
  for (const ta of tokenAccountsForSigner) {
    const k = ta.toBase58();
    if (!seen.has(k)) {
      seen.add(k);
      addresses.push(ta);
    }
  }

  let preInfos: Awaited<ReturnType<Connection["getMultipleAccountsInfo"]>>;
  try {
    preInfos = await deadline.run(() => connection.getMultipleAccountsInfo(addresses));
  } catch (e) {
    const reason = e instanceof Error && e.message === "SIM_TIMEOUT" ? "逾時" : "RPC 錯誤";
    return { outcome: "rpc", reason, instructions, feeLamports, feePayerShort };
  }

  let simRes: Awaited<ReturnType<Connection["simulateTransaction"]>>;
  try {
    simRes = await deadline.run(() =>
      connection.simulateTransaction(tx, {
        sigVerify: false,
        replaceRecentBlockhash: true,
        accounts: {
          encoding: "base64",
          addresses: addresses.map((a) => a.toBase58()),
        },
      }),
    );
  } catch (e) {
    const reason = e instanceof Error && e.message === "SIM_TIMEOUT" ? "逾時" : "RPC 錯誤";
    return { outcome: "rpc", reason, instructions, feeLamports, feePayerShort };
  }

  const value = simRes.value;
  const logs = tailLogs(value.logs ?? undefined);
  const postAccounts = value.accounts;

  if (!postAccounts || postAccounts.length !== addresses.length) {
    if (value.err) {
      return {
        outcome: "fail",
        err: value.err,
        logs,
        reason: reasonFromFail(logs, value.err),
        instructions,
        feeLamports,
        feePayerShort,
      };
    }
    return {
      outcome: "rpc",
      reason: "模擬回傳帳戶對不上",
      instructions,
      feeLamports,
      feePayerShort,
    };
  }

  let nativeDiff = 0;
  const splDiffByMint = new Map<string, bigint>();

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    const pre = preInfos[i];
    const post = postAccounts[i];

    if (addr.equals(signerPubkey)) {
      const preLam = pre?.lamports ?? 0;
      const postLam = post?.lamports ?? 0;
      nativeDiff = postLam - preLam;
      continue;
    }

    const preBytes = accountDataBytes(pre);
    const postBytes = accountDataBytes(post);
    const preTok = preBytes?.length ? parseTokenAccount(preBytes) : null;
    const postTok = postBytes?.length ? parseTokenAccount(postBytes) : null;
    const preAmt = preTok?.amount ?? 0n;
    const postAmt = postTok?.amount ?? 0n;
    const mint = (postTok ?? preTok)?.mint;
    if (!mint) continue;
    const diff = postAmt - preAmt;
    if (diff === 0n) continue;
    const mintKey = mint.toBase58();
    splDiffByMint.set(mintKey, (splDiffByMint.get(mintKey) ?? 0n) + diff);
  }

  const deltas: SimulateTxDelta[] = [];
  if (nativeDiff !== 0) {
    deltas.push({
      symbol: "SOL",
      amount: (Math.abs(nativeDiff) / 1e9).toString(),
      sign: nativeDiff > 0 ? "plus" : "minus",
    });
  }

  for (const [mintKey, diff] of splDiffByMint) {
    if (diff === 0n) continue;
    let decimals = 0;
    try {
      const mintInfo = await deadline.run(() =>
        connection.getAccountInfo(new PublicKey(mintKey)),
      );
      if (mintInfo && mintInfo.data.length >= 45) decimals = mintInfo.data[44];
    } catch {
      /* default 0 */
    }
    const abs = diff < 0n ? -diff : diff;
    deltas.push({
      symbol: shortPk(mintKey),
      amount: formatAmount(abs, decimals),
      sign: diff > 0n ? "plus" : "minus",
    });
  }

  if (value.err) {
    return {
      outcome: "fail",
      err: value.err,
      logs,
      reason: reasonFromFail(logs, value.err),
      deltas,
      instructions,
      feeLamports,
      feePayerShort,
    };
  }

  return {
    outcome: "ok",
    deltas,
    instructions,
    feeLamports,
    feePayerShort,
  };
}
