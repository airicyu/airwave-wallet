/**
 * Reads and writes CU limit and priority fee on a v1 message config.
 * Does not append ComputeBudget instructions or edit legacy or v0 messages.
 */
import {
  compileTransactionMessage,
  decompileTransactionMessage,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getTransactionMessageComputeUnitLimit,
  getTransactionMessagePriorityFeeLamports,
  setTransactionMessageConfig,
  type CompiledTransactionMessage,
  type CompiledTransactionMessageWithLifetime,
} from "@solana/kit";
import { decodeWireTransaction, encodeWireTransaction, messageBytesToUint8Array } from "../../shared/tx";
import type { WriteCuResult } from "./compute-budget-tx";

function compiledFrom(txBytes: Uint8Array) {
  const tx = decodeWireTransaction(txBytes);
  const compiled = getCompiledTransactionMessageDecoder().decode(
    messageBytesToUint8Array(tx.messageBytes),
  ) as CompiledTransactionMessage & CompiledTransactionMessageWithLifetime;
  return { tx, compiled };
}

export function readV1Budget(txBytes: Uint8Array): {
  cuLimit: number | null;
  priorityFeeLamports: bigint | null;
} | null {
  try {
    const { compiled } = compiledFrom(txBytes);
    if (compiled.version !== 1) return null;
    const msg = decompileTransactionMessage(compiled);
    const limit = getTransactionMessageComputeUnitLimit(msg);
    const fee = getTransactionMessagePriorityFeeLamports(msg);
    return {
      cuLimit: limit ?? null,
      priorityFeeLamports: fee ?? null,
    };
  } catch {
    return null;
  }
}

export function writeV1Budget(
  txBytes: Uint8Array,
  patch: { cuLimit?: number; priorityFeeLamports?: bigint },
): WriteCuResult {
  if (patch.cuLimit === undefined && patch.priorityFeeLamports === undefined) {
    return { ok: false, reason: "cannot_write" };
  }
  try {
    const { tx, compiled } = compiledFrom(txBytes);
    if (compiled.version !== 1) return { ok: false, reason: "cannot_write" };
    const msg = decompileTransactionMessage(compiled);
    const next = setTransactionMessageConfig(
      {
        ...(patch.cuLimit !== undefined ? { computeUnitLimit: patch.cuLimit } : {}),
        ...(patch.priorityFeeLamports !== undefined
          ? { priorityFeeLamports: patch.priorityFeeLamports }
          : {}),
      },
      msg,
    );
    const compiledNext = compileTransactionMessage(next);
    const messageBytes = new Uint8Array(
      getCompiledTransactionMessageEncoder().encode(compiledNext),
    ) as unknown as typeof tx.messageBytes;
    return { ok: true, bytes: encodeWireTransaction({ ...tx, messageBytes }) };
  } catch {
    return { ok: false, reason: "cannot_write" };
  }
}

/** Smallest positive multiple of 32768. A measured 0 becomes 32768. */
export function roundLoadedAccountsDataSize(measured: number): number {
  const page = 32768;
  if (!Number.isFinite(measured) || measured <= 0) return page;
  return Math.ceil(measured / page) * page;
}
