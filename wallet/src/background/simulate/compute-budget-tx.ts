import {
  type CompiledTransactionMessage,
  type CompiledTransactionMessageWithLifetime,
  compileTransaction,
  decompileTransactionMessageFetchingLookupTables,
  getCompiledTransactionMessageDecoder,
  type GetMultipleAccountsApi,
  type MicroLamports,
  type Rpc,
} from "@solana/kit";
import {
  updateOrAppendSetComputeUnitLimitInstruction,
  updateOrAppendSetComputeUnitPriceInstruction,
} from "@solana-program/compute-budget";
import {
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

function mergeSignatures(
  original: ReturnType<typeof decodeWireTransaction>,
  updated: ReturnType<typeof decodeWireTransaction>,
): ReturnType<typeof decodeWireTransaction> {
  const signatures = { ...updated.signatures };
  for (const [addr, sig] of Object.entries(original.signatures)) {
    if (sig && addr in signatures) {
      signatures[addr as keyof typeof signatures] = sig;
    }
  }
  return { ...updated, signatures };
}

export async function writeCuToTransactionBytes(
  txBytes: Uint8Array,
  limit: number,
  price: number,
  rpcUrl: string,
): Promise<WriteCuResult> {
  let tx: ReturnType<typeof decodeWireTransaction>;
  try {
    tx = decodeWireTransaction(txBytes);
  } catch {
    return { ok: false, reason: "cannot_write" };
  }

  const compiled = decodeCompiledMessage(messageBytesToUint8Array(tx.messageBytes));
  if (hasDuplicateCbDisc(compiled)) {
    return { ok: false, reason: "duplicate_cb" };
  }

  const rpc = solanaRpcForUrl(rpcUrl) as Rpc<GetMultipleAccountsApi>;
  let decompiled;
  try {
    decompiled = await decompileTransactionMessageFetchingLookupTables(compiled, rpc);
  } catch {
    return { ok: false, reason: "cannot_write" };
  }

  let updatedMessage = decompiled;
  updatedMessage = updateOrAppendSetComputeUnitLimitInstruction(limit, updatedMessage);
  updatedMessage = updateOrAppendSetComputeUnitPriceInstruction(
    price as unknown as MicroLamports,
    updatedMessage,
  );

  let newTx: ReturnType<typeof decodeWireTransaction>;
  try {
    const compiledMsg = compileTransaction(updatedMessage);
    newTx = mergeSignatures(tx, compiledMsg);
  } catch {
    return { ok: false, reason: "cannot_write" };
  }

  try {
    const serialized = encodeWireTransaction(newTx);
    if (serialized.length > 1232) return { ok: false, reason: "cannot_write" };
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
