import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import {
  CU_LIMIT_MAX,
  estimateCuLimitFromCompiledIxs,
  hasDuplicateCbDisc,
  isTransactionSigned,
  isValidCuLimit,
  isValidCuPrice,
  parseCuFromMessage,
  suggestedLimitFromPhase1,
  writeCuToTransactionBytes,
  type WriteCuResult,
} from "./compute-budget-tx";
import {
  runPhase2Simulation,
  SimDeadline,
  simulateTransactionRpc,
  type Phase2SimContext,
} from "./simulate-pending-tx";
import {
  acceptSimulateRequest,
  getWorkingTx,
  hasWorkingTx,
  tryCommitWorkingTx,
} from "../pending";
import type { SimulatePendingTxResult } from "../../shared/simulate-pending-tx-types";

const CU_WRITE_FAIL_MSG = "無法寫入計算預算";

export type SimulateSignTxPayload = {
  cuLimit?: number;
  cuPrice?: number;
};

export type SimulateSignTxOutcome =
  | { ok: true; result: SimulatePendingTxResult; seq: number }
  | { ok: false; code: "INVALID_PAYLOAD" | "NOT_FOUND"; message: string };

/** 鏈上優先費：ceil(limit × price / 1_000_000) lamports。price 為 micro-lamports／CU。 */
function priorityFeeLamports(cuLimit: number, cuPrice: number): number {
  const micro = BigInt(cuLimit) * BigInt(cuPrice);
  return Number((micro + 999_999n) / 1_000_000n);
}

function attachFees(
  result: SimulatePendingTxResult,
  tx: VersionedTransaction,
  cuLimit: number | null,
  cuPrice: number | null,
  cuEditable: boolean,
  cuWriteError?: string,
): SimulatePendingTxResult {
  const sigFee = 5_000 * tx.message.header.numRequiredSignatures;
  const priority =
    cuLimit != null && cuPrice != null ? priorityFeeLamports(cuLimit, cuPrice) : null;
  const total = priority != null ? sigFee + priority : null;
  return {
    ...result,
    sigFeeLamports: sigFee,
    priorityLamports: priority,
    totalFeeLamports: total,
    cuLimit,
    cuPrice,
    cuEditable,
    cuWriteError,
  };
}

function writeErrorFromResult(w: WriteCuResult): string | undefined {
  if (w.ok) return undefined;
  return CU_WRITE_FAIL_MSG;
}

async function simulatePhase1ForLimit(
  ctx: Phase2SimContext,
  txBytes: Uint8Array,
  originalLimit: number | null,
): Promise<number> {
  let baseMsg: VersionedTransaction;
  try {
    baseMsg = VersionedTransaction.deserialize(txBytes);
  } catch {
    return originalLimit ?? CU_LIMIT_MAX;
  }

  const probe = await writeCuToTransactionBytes(txBytes, CU_LIMIT_MAX, 0, ctx.connection);
  const probeBytes = probe.ok ? probe.bytes : txBytes;
  let probeMsg: VersionedTransaction;
  try {
    probeMsg = VersionedTransaction.deserialize(probeBytes);
  } catch {
    return originalLimit ?? estimateCuLimitFromCompiledIxs(baseMsg.message);
  }

  const deadline = new SimDeadline();
  try {
    const value = await simulateTransactionRpc(ctx.rpcUrl, probeMsg, deadline);
    if (!value.err && typeof value.unitsConsumed === "number") {
      return suggestedLimitFromPhase1(value.unitsConsumed, originalLimit);
    }
  } catch {
    /* fall through */
  }

  if (originalLimit != null) return originalLimit;
  return estimateCuLimitFromCompiledIxs(probeMsg.message);
}

async function runPhase2WithFees(
  ctx: Phase2SimContext,
  txBytes: Uint8Array,
  signer: PublicKey,
  cuLimit: number | null,
  cuPrice: number | null,
  cuEditable: boolean,
  cuWriteError?: string,
): Promise<SimulatePendingTxResult> {
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(txBytes);
  } catch {
    return {
      outcome: "unparseable",
      reason: "無法解析交易",
      instructions: [],
      sigFeeLamports: null,
      priorityLamports: null,
      totalFeeLamports: null,
      cuLimit,
      cuPrice,
      cuWriteError,
    };
  }
  const base = await runPhase2Simulation(ctx, txBytes, signer);
  return attachFees(base, tx, cuLimit, cuPrice, cuEditable, cuWriteError);
}

export async function simulateSignTransaction(
  rpcUrl: string,
  requestId: string,
  originalBytes: Uint8Array,
  signerPubkey: PublicKey,
  defaultCuPrice: number,
  payload: SimulateSignTxPayload,
): Promise<SimulateSignTxOutcome> {
  const seq = acceptSimulateRequest(requestId);
  const connection = new Connection(rpcUrl, "confirmed");
  const ctx: Phase2SimContext = { rpcUrl, connection };

  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(originalBytes);
  } catch {
    const result: SimulatePendingTxResult = {
      outcome: "unparseable",
      reason: "無法解析交易",
      instructions: [],
      sigFeeLamports: null,
      priorityLamports: null,
      totalFeeLamports: null,
    };
    return { ok: true, result, seq };
  }

  const signed = isTransactionSigned(tx);
  const parsedOriginal = parseCuFromMessage(tx.message);

  if (signed) {
    const result = await runPhase2WithFees(
      ctx,
      originalBytes,
      signerPubkey,
      parsedOriginal.limit,
      parsedOriginal.price,
      false,
    );
    return { ok: true, result, seq };
  }

  const hasLimit = payload.cuLimit !== undefined;
  const hasPrice = payload.cuPrice !== undefined;
  if (hasLimit !== hasPrice) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "cuLimit and cuPrice must both be set" };
  }

  if (hasLimit && hasPrice) {
    const limit = payload.cuLimit!;
    const price = payload.cuPrice!;
    if (!isValidCuLimit(limit) || !isValidCuPrice(price)) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "CU out of bounds" };
    }
    if (hasDuplicateCbDisc(tx.message)) {
      const result = await runPhase2WithFees(
        ctx,
        originalBytes,
        signerPubkey,
        null,
        null,
        true,
        CU_WRITE_FAIL_MSG,
      );
      return { ok: true, result, seq };
    }
    const written = await writeCuToTransactionBytes(originalBytes, limit, price, connection);
    const cuErr = writeErrorFromResult(written);
    const simBytes = written.ok ? written.bytes : originalBytes;
    if (written.ok) {
      tryCommitWorkingTx(requestId, seq, written.bytes);
    }
    const result = await runPhase2WithFees(
      ctx,
      simBytes,
      signerPubkey,
      limit,
      price,
      true,
      cuErr,
    );
    return { ok: true, result, seq };
  }

  if (hasWorkingTx(requestId)) {
    const working = getWorkingTx(requestId)!;
    let wtx: VersionedTransaction;
    try {
      wtx = VersionedTransaction.deserialize(working);
    } catch {
      const result = await runPhase2WithFees(ctx, originalBytes, signerPubkey, null, null, true);
      return { ok: true, result, seq };
    }
    const parsed = parseCuFromMessage(wtx.message);
    const result = await runPhase2WithFees(
      ctx,
      working,
      signerPubkey,
      parsed.limit,
      parsed.price,
      true,
    );
    return { ok: true, result, seq };
  }

  const originalLimit = parsedOriginal.limit;
  const suggestedLimit = await simulatePhase1ForLimit(ctx, originalBytes, originalLimit);
  const price = defaultCuPrice;

  if (hasDuplicateCbDisc(tx.message)) {
    const result = await runPhase2WithFees(
      ctx,
      originalBytes,
      signerPubkey,
      null,
      null,
      true,
      CU_WRITE_FAIL_MSG,
    );
    return { ok: true, result, seq };
  }

  const written = await writeCuToTransactionBytes(
    originalBytes,
    suggestedLimit,
    price,
    connection,
  );
  const cuErr = writeErrorFromResult(written);
  const simBytes = written.ok ? written.bytes : originalBytes;
  if (written.ok) {
    tryCommitWorkingTx(requestId, seq, written.bytes);
  }
  const result = await runPhase2WithFees(
    ctx,
    simBytes,
    signerPubkey,
    suggestedLimit,
    price,
    true,
    cuErr,
  );
  return { ok: true, result, seq };
}
