import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const CU_LIMIT_MIN = 1;
export const CU_LIMIT_MAX = 1_400_000;
export const CU_PRICE_MIN = 0;
export const CU_PRICE_MAX = 1_000_000_000;
export const DEFAULT_CU_PRICE = 25_000;

const CB_PID = ComputeBudgetProgram.programId;

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

export function isTransactionSigned(tx: VersionedTransaction): boolean {
  for (const sig of tx.signatures) {
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

function readU32LE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)) >>> 0
  );
}

function readU64LE(data: Uint8Array, offset: number): number {
  const lo = readU32LE(data, offset);
  const hi = readU32LE(data, offset + 4);
  return hi * 0x1_0000_0000 + lo;
}

function cbDiscCount(message: VersionedMessage, disc: number): number {
  const keys = message.staticAccountKeys;
  let n = 0;
  for (const ix of message.compiledInstructions) {
    const pid = keys[ix.programIdIndex];
    if (!pid?.equals(CB_PID)) continue;
    if (ix.data[0] === disc) n++;
  }
  return n;
}

export function hasDuplicateCbDisc(message: VersionedMessage): boolean {
  return cbDiscCount(message, 2) > 1 || cbDiscCount(message, 3) > 1;
}

export function parseCuFromMessage(message: VersionedMessage): {
  limit: number | null;
  price: number | null;
} {
  const keys = message.staticAccountKeys;
  let limit: number | null = null;
  let price: number | null = null;
  for (const ix of message.compiledInstructions) {
    const pid = keys[ix.programIdIndex];
    if (!pid?.equals(CB_PID)) continue;
    const data = ix.data;
    if (data[0] === 2 && data.length >= 5) {
      limit = readU32LE(data, 1);
    }
    if (data[0] === 3 && data.length >= 9) {
      price = readU64LE(data, 1);
    }
  }
  return { limit, price };
}

export function estimateCuLimitFromCompiledIxs(message: VersionedMessage): number {
  const keys = message.staticAccountKeys;
  let sum = 0;
  for (const ix of message.compiledInstructions) {
    const pid = keys[ix.programIdIndex]?.toBase58() ?? "";
    sum += BUILTIN_PROGRAM_IDS.has(pid) ? 3_000 : 200_000;
  }
  const scaled = Math.ceil(sum * 1.25);
  return Math.min(CU_LIMIT_MAX, Math.max(CU_LIMIT_MIN, scaled));
}

function replaceOrInsertCb(
  ixs: TransactionInstruction[],
  limit: number,
  price: number,
): TransactionInstruction[] {
  const limitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: limit });
  const priceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price });

  let limitIdx = -1;
  let priceIdx = -1;
  for (let i = 0; i < ixs.length; i++) {
    if (!ixs[i].programId.equals(CB_PID)) continue;
    const d = ixs[i].data[0];
    if (d === 2 && limitIdx < 0) limitIdx = i;
    if (d === 3 && priceIdx < 0) priceIdx = i;
  }

  const out = [...ixs];
  if (limitIdx >= 0) {
    out[limitIdx] = limitIx;
  } else {
    out.unshift(limitIx);
    if (priceIdx >= 0) priceIdx += 1;
  }
  if (priceIdx >= 0) {
    out[priceIdx] = priceIx;
  } else {
    const insertAt = limitIdx >= 0 ? limitIdx + 1 : 1;
    out.splice(insertAt, 0, priceIx);
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

export type WriteCuResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: "duplicate_cb" | "cannot_write" };

export async function writeCuToTransactionBytes(
  txBytes: Uint8Array,
  limit: number,
  price: number,
  connection: Connection,
): Promise<WriteCuResult> {
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(txBytes);
  } catch {
    return { ok: false, reason: "cannot_write" };
  }

  if (hasDuplicateCbDisc(tx.message)) {
    return { ok: false, reason: "duplicate_cb" };
  }

  let lookupTables: AddressLookupTableAccount[] = [];
  if (tx.message.version !== "legacy") {
    const loaded = await loadLookupTables(connection, tx.message);
    if (!loaded) return { ok: false, reason: "cannot_write" };
    lookupTables = loaded;
  }

  let decompiled: TransactionMessage;
  try {
    decompiled = TransactionMessage.decompile(tx.message, {
      addressLookupTableAccounts: lookupTables,
    });
  } catch {
    return { ok: false, reason: "cannot_write" };
  }

  const ixs = replaceOrInsertCb(decompiled.instructions, limit, price);
  const payerKey = decompiled.payerKey;
  const recentBlockhash = decompiled.recentBlockhash;

  let newMessage: VersionedMessage;
  try {
    const msgArgs = { payerKey, recentBlockhash, instructions: ixs };
    newMessage =
      tx.message.version === "legacy"
        ? new TransactionMessage(msgArgs).compileToLegacyMessage()
        : new TransactionMessage(msgArgs).compileToV0Message(lookupTables);
  } catch {
    return { ok: false, reason: "cannot_write" };
  }

  const newTx = new VersionedTransaction(newMessage);
  newTx.signatures = tx.signatures.map((s) => new Uint8Array(s));

  try {
    const serialized = newTx.serialize();
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
