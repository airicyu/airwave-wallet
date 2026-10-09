/**
 * Estimates compute units via RPC decompile, and writes a local Compute Budget patch into unsigned bytes.
 * Does not submit transactions or fetch lookup tables while producing workingTx.
 */
import {
  type Address,
  type CompiledTransactionMessage,
  type CompiledTransactionMessageWithLifetime,
  decompileTransactionMessageFetchingLookupTables,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  type GetMultipleAccountsApi,
  type Rpc,
} from "@solana/kit";
import {
  compiledAddressTableLookups,
  messageBytesToUint8Array,
  normalizedCompiledInstructions,
} from "../../shared/compiled-message";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { decodeWireTransaction, encodeWireTransaction } from "../../shared/tx-wire";

export const CU_LIMIT_MIN = 1;
export const CU_LIMIT_MAX = 1_400_000;
export const CU_PRICE_MIN = 0;
export const CU_PRICE_MAX = 1_000_000_000;
export const DEFAULT_CU_PRICE = 25_000;

const CB_PID = "ComputeBudget111111111111111111111111111111";

const BUILTIN_PROGRAM_IDS = new Set([
  "11111111111111111111111111111111",
  "Vote111111111111111111111111111111111111111",
  "Stake11111111111111111111111111111111111111",
  "ComputeBudget111111111111111111111111111111",
  "Config1111111111111111111111111111111111111",
  "AddressLookupTab1e1111111111111111111111111",
  "BPFLoaderUpgradeab1e11111111111111111111111",
  "BPFLoader2111111111111111111111111111111111",
  "BPFLoader1111111111111111111111111111111111",
  "Ed25519SigVerify111111111111111111111111111",
  "KeccakSecp256k11111111111111111111111111111",
  "NativeLoader1111111111111111111111111111111",
]);

export function isValidCuLimit(n: number): boolean {
  return Number.isInteger(n) && n >= CU_LIMIT_MIN && n <= CU_LIMIT_MAX;
}

export function isValidCuPrice(n: number): boolean {
  return Number.isInteger(n) && n >= CU_PRICE_MIN && n <= CU_PRICE_MAX;
}

export function normalizeDefaultCuPrice(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_CU_PRICE;
  const i = Math.trunc(n);
  if (!isValidCuPrice(i)) {
    return Math.min(CU_PRICE_MAX, Math.max(CU_PRICE_MIN, i));
  }
  return i;
}

function decodeCompiledMessage(bytes: Uint8Array): CompiledTransactionMessage & CompiledTransactionMessageWithLifetime {
  return getCompiledTransactionMessageDecoder().decode(bytes) as CompiledTransactionMessage &
    CompiledTransactionMessageWithLifetime;
}

export function isTransactionSigned(txBytes: Uint8Array): boolean {
  let tx;
  try {
    tx = decodeWireTransaction(txBytes);
  } catch {
    return false;
  }
  for (const sig of Object.values(tx.signatures)) {
    if (!sig) continue;
    if (sig.length !== 64) return true;
    let nonzero = false;
    for (let i = 0; i < 64; i++) {
      if (sig[i] !== 0) {
        nonzero = true;
        break;
      }
    }
    if (nonzero) return true;
  }
  return false;
}

function cbDiscCount(message: CompiledTransactionMessage, disc: number): number {
  const keys = message.staticAccounts;
  let n = 0;
  for (const ix of normalizedCompiledInstructions(message)) {
    const pid = keys[ix.programAddressIndex];
    if (pid !== CB_PID) continue;
    if (ix.data[0] === disc) n++;
  }
  return n;
}

export function hasDuplicateCbDisc(message: CompiledTransactionMessage): boolean {
  return cbDiscCount(message, 2) > 1 || cbDiscCount(message, 3) > 1;
}

export function parseCuFromMessage(message: CompiledTransactionMessage): {
  limit: number | null;
  price: number | null;
} {
  const keys = message.staticAccounts;
  let limit: number | null = null;
  let price: number | null = null;
  for (const ix of normalizedCompiledInstructions(message)) {
    const pid = keys[ix.programAddressIndex];
    if (pid !== CB_PID) continue;
    const data = ix.data;
    if (data[0] === 2 && data.length >= 5) {
      limit =
        (data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24)) >>> 0;
    }
    if (data[0] === 3 && data.length >= 9) {
      const lo =
        (data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24)) >>> 0;
      const hi =
        (data[5] | (data[6] << 8) | (data[7] << 16) | (data[8] << 24)) >>> 0;
      price = hi * 0x1_0000_0000 + lo;
    }
  }
  return { limit, price };
}

export function parseCuFromTxBytes(txBytes: Uint8Array): {
  limit: number | null;
  price: number | null;
} {
  const tx = decodeWireTransaction(txBytes);
  const message = decodeCompiledMessage(messageBytesToUint8Array(tx.messageBytes));
  return parseCuFromMessage(message);
}

export function estimateCuLimitFromCompiledIxs(message: CompiledTransactionMessage): number {
  const keys = message.staticAccounts;
  let sum = 0;
  for (const ix of normalizedCompiledInstructions(message)) {
    const pid = keys[ix.programAddressIndex] ?? "";
    sum += BUILTIN_PROGRAM_IDS.has(pid) ? 3_000 : 200_000;
  }
  const scaled = Math.ceil(sum * 1.25);
  return Math.min(CU_LIMIT_MAX, Math.max(CU_LIMIT_MIN, scaled));
}

export type WriteCuResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: "duplicate_cb" | "cannot_write" };

type LocalCompiled = CompiledTransactionMessage &
  CompiledTransactionMessageWithLifetime & {
    version: "legacy" | 0;
    instructions: {
      programAddressIndex: number;
      accountIndices?: readonly number[];
      data?: Uint8Array;
    }[];
  };

function isLocalCompiled(message: CompiledTransactionMessage): message is LocalCompiled {
  return message.version === "legacy" || message.version === 0;
}

function discData(disc: 2 | 3, value: number): Uint8Array {
  const width = disc === 2 ? 4 : 8;
  const data = new Uint8Array(1 + width);
  data[0] = disc;
  const view = new DataView(data.buffer);
  view.setUint32(1, value >>> 0, true);
  if (disc === 3) view.setUint32(5, Math.floor(value / 0x1_0000_0000), true);
  return data;
}

function pointsAtLookup(
  ixs: { programAddressIndex: number; accountIndices: number[] }[],
  staticLen: number,
): boolean {
  for (const ix of ixs) {
    if (ix.programAddressIndex >= staticLen) return true;
    for (const index of ix.accountIndices) {
      if (index >= staticLen) return true;
    }
  }
  return false;
}

function upsertDisc(
  ixs: { programAddressIndex: number; accountIndices: number[]; data: Uint8Array }[],
  programIndex: number,
  disc: 2 | 3,
  value: number,
): void {
  const data = discData(disc, value);
  const found = ixs.find((ix) => ix.programAddressIndex === programIndex && ix.data[0] === disc);
  if (found) {
    found.data = data;
    return;
  }
  ixs.unshift({ programAddressIndex: programIndex, accountIndices: [], data });
}

function withoutCb(
  message: CompiledTransactionMessage,
): { programAddressIndex: number; accountIndices: number[]; data: string }[] {
  const keys = message.staticAccounts;
  const out = [];
  for (const ix of normalizedCompiledInstructions(message)) {
    const pid = keys[ix.programAddressIndex];
    if (pid === CB_PID && (ix.data[0] === 2 || ix.data[0] === 3)) continue;
    out.push({
      programAddressIndex: ix.programAddressIndex,
      accountIndices: [...ix.accountIndices],
      data: [...ix.data].join(","),
    });
  }
  return out;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function decompileTxMessageFromBytes(txBytes: Uint8Array, rpcUrl: string) {
  const tx = decodeWireTransaction(txBytes);
  const compiled = decodeCompiledMessage(messageBytesToUint8Array(tx.messageBytes));
  const rpc = solanaRpcForUrl(rpcUrl) as Rpc<GetMultipleAccountsApi>;
  return decompileTransactionMessageFetchingLookupTables(compiled, rpc);
}

export async function writeCuToTransactionBytes(
  txBytes: Uint8Array,
  limit: number,
  price: number,
  _rpcUrl: string,
): Promise<WriteCuResult> {
  let tx: ReturnType<typeof decodeWireTransaction>;
  try {
    tx = decodeWireTransaction(txBytes);
  } catch {
    return { ok: false, reason: "cannot_write" };
  }

  const compiled = decodeCompiledMessage(messageBytesToUint8Array(tx.messageBytes));
  if (!isLocalCompiled(compiled)) return { ok: false, reason: "cannot_write" };
  if (hasDuplicateCbDisc(compiled)) return { ok: false, reason: "duplicate_cb" };

  const originalIxs = normalizedCompiledInstructions(compiled).map((ix) => ({
    programAddressIndex: ix.programAddressIndex,
    accountIndices: [...ix.accountIndices],
    data: new Uint8Array(ix.data),
  }));
  const staticLen = compiled.staticAccounts.length;
  let programIndex = compiled.staticAccounts.findIndex((a) => a === CB_PID);
  const appended = programIndex < 0;
  let staticAccounts = [...compiled.staticAccounts];
  let header = compiled.header;
  if (appended) {
    if (pointsAtLookup(originalIxs, staticLen)) return { ok: false, reason: "cannot_write" };
    staticAccounts = [...staticAccounts, CB_PID as Address];
    programIndex = staticAccounts.length - 1;
    header = {
      ...compiled.header,
      numReadonlyNonSignerAccounts: compiled.header.numReadonlyNonSignerAccounts + 1,
    };
  }

  const nextIxs = originalIxs.map((ix) => ({
    programAddressIndex: ix.programAddressIndex,
    accountIndices: [...ix.accountIndices],
    data: new Uint8Array(ix.data),
  }));
  upsertDisc(nextIxs, programIndex, 2, limit);
  upsertDisc(nextIxs, programIndex, 3, price);

  const nextCompiled = {
    ...compiled,
    header,
    staticAccounts,
    instructions: nextIxs,
  };

  try {
    const messageBytes = new Uint8Array(
      getCompiledTransactionMessageEncoder().encode(nextCompiled),
    ) as unknown as typeof tx.messageBytes;
    const serialized = encodeWireTransaction({ ...tx, messageBytes });
    if (serialized.length > 1232) return { ok: false, reason: "cannot_write" };
    const written = decodeCompiledMessage(
      messageBytesToUint8Array(decodeWireTransaction(serialized).messageBytes),
    );
    const accountsAfter = appended ? written.staticAccounts.slice(0, -1) : written.staticAccounts;
    if (!sameJson(accountsAfter, compiled.staticAccounts)) return { ok: false, reason: "cannot_write" };
    if (!sameJson(compiledAddressTableLookups(written), compiledAddressTableLookups(compiled))) {
      return { ok: false, reason: "cannot_write" };
    }
    if (written.lifetimeToken !== compiled.lifetimeToken) return { ok: false, reason: "cannot_write" };
    if (!sameJson(withoutCb(written), withoutCb(compiled))) return { ok: false, reason: "cannot_write" };
    if (!appended && !sameJson(written.header, compiled.header)) return { ok: false, reason: "cannot_write" };
    if (written.header.numSignerAccounts !== compiled.header.numSignerAccounts) {
      return { ok: false, reason: "cannot_write" };
    }
    if (written.header.numReadonlySignerAccounts !== compiled.header.numReadonlySignerAccounts) {
      return { ok: false, reason: "cannot_write" };
    }
    if (appended && written.header.numReadonlyNonSignerAccounts !== header.numReadonlyNonSignerAccounts) {
      return { ok: false, reason: "cannot_write" };
    }
    const parsed = parseCuFromMessage(written);
    if (cbDiscCount(written, 2) !== 1 || cbDiscCount(written, 3) !== 1) {
      return { ok: false, reason: "cannot_write" };
    }
    if (parsed.limit !== (limit >>> 0) || parsed.price !== price) {
      return { ok: false, reason: "cannot_write" };
    }
    return { ok: true, bytes: serialized };
  } catch {
    return { ok: false, reason: "cannot_write" };
  }
}

export function suggestedLimitFromPhase1(
  unitsConsumed: number,
  originalLimit: number | null,
): number {
  const fromUsage = Math.ceil(unitsConsumed * 1.1);
  const base = originalLimit != null ? Math.max(fromUsage, originalLimit) : fromUsage;
  return Math.min(CU_LIMIT_MAX, Math.max(CU_LIMIT_MIN, base));
}
