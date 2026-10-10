/**
 * Orchestrates CU limit/price writes and phase-1/phase-2 simulation for sign-tx pending requests.
 * Does not handle approval UI or vault signing.
 */
import { estimateResourceLimitsFactory, getCompiledTransactionMessageDecoder } from "@solana/kit";
import {
  CU_LIMIT_MAX,
  decompileTxMessageFromBytes,
  estimateCuLimitFromCompiledIxs,
  hasDuplicateCbDisc,
  isTransactionSigned,
  isValidCuLimit,
  isValidCuPrice,
  parseCuFromMessage,
  parseCuFromTxBytes,
  suggestedLimitFromPhase1,
  writeCuToTransactionBytes,
  type WriteCuResult,
} from "./compute-budget-tx";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { SimDeadline } from "./sim-deadline";
import { runPhase2Simulation, type Phase2SimContext } from "./phase2-deltas";
import { simulateTransactionRpc } from "./simulate-rpc";
import {
  acceptSimulateRequest,
  getWorkingTx,
  hasWorkingTx,
  tryCommitWorkingTx,
} from "../pending";
import type { SimulatePendingTxResult } from "../../shared/simulate-pending-tx-types";
import type { Cluster } from "../../shared/storage-keys";
import { messageBytesToUint8Array } from "../../shared/compiled-message";
import { decodeWireTransaction } from "../../shared/tx-wire";

const CU_WRITE_FAIL_CODE = "CU_WRITE_FAILED";

export type SimulateSignTxPayload = {
  cuLimit?: number;
  cuPrice?: number;
};

export type SimulateSignTxOutcome =
  | { ok: true; result: SimulatePendingTxResult; seq: number }
  | { ok: false; code: "INVALID_PAYLOAD" | "NOT_FOUND"; message: string };

/** On-chain priority fee: ceil(limit × price / 1_000_000) lamports. price is micro-lamports per CU. */
function priorityFeeLamports(cuLimit: number, cuPrice: number): number {
  const micro = BigInt(cuLimit) * BigInt(cuPrice);
  return Number((micro + 999_999n) / 1_000_000n);
}

function compiledMessageFromTxBytes(txBytes: Uint8Array) {
  const tx = decodeWireTransaction(txBytes);
  return getCompiledTransactionMessageDecoder().decode(
    messageBytesToUint8Array(tx.messageBytes),
  );
}

function attachFees(
  result: SimulatePendingTxResult,
  txBytes: Uint8Array,
  cuLimit: number | null,
  cuPrice: number | null,
  cuEditable: boolean,
  cuWriteError?: string,
): SimulatePendingTxResult {
  const message = compiledMessageFromTxBytes(txBytes);
  const sigFee = 5_000 * message.header.numSignerAccounts;
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
  return CU_WRITE_FAIL_CODE;
}

async function simulatePhase1ForLimit(
  ctx: Phase2SimContext,
  txBytes: Uint8Array,
  originalLimit: number | null,
): Promise<number> {
  let baseMsg;
  try {
    baseMsg = compiledMessageFromTxBytes(txBytes);
  } catch {
    return originalLimit ?? CU_LIMIT_MAX;
  }

  const probe = await writeCuToTransactionBytes(txBytes, CU_LIMIT_MAX, 0, ctx.rpcUrl);
  const probeBytes = probe.ok ? probe.bytes : txBytes;
  let probeMsg;
  try {
    probeMsg = compiledMessageFromTxBytes(probeBytes);
  } catch {
    return originalLimit ?? estimateCuLimitFromCompiledIxs(baseMsg);
  }

  const deadline = new SimDeadline();
  try {
    const { computeUnitLimit } = await deadline.run(async () => {
      const decompiled = await decompileTxMessageFromBytes(probeBytes, ctx.rpcUrl);
      const estimate = estimateResourceLimitsFactory({ rpc: solanaRpcForUrl(ctx.rpcUrl) });
      return estimate(decompiled, { commitment: "confirmed" });
    });
    if (
      typeof computeUnitLimit === "number" &&
      Number.isFinite(computeUnitLimit) &&
      Number.isInteger(computeUnitLimit) &&
      computeUnitLimit >= 0
    ) {
      return suggestedLimitFromPhase1(computeUnitLimit, originalLimit);
    }
  } catch {
    /* fall through */
  }

  if (originalLimit != null) return originalLimit;
  return estimateCuLimitFromCompiledIxs(probeMsg);
}

async function runPhase2WithFees(
  ctx: Phase2SimContext,
  txBytes: Uint8Array,
  signer: string,
  cluster: Cluster,
  cuLimit: number | null,
  cuPrice: number | null,
  cuEditable: boolean,
  cuWriteError?: string,
): Promise<SimulatePendingTxResult> {
  try {
    decodeWireTransaction(txBytes);
  } catch {
    return {
      outcome: "unparseable",
      reason: "TX_UNPARSEABLE",
      instructions: [],
      sigFeeLamports: null,
      priorityLamports: null,
      totalFeeLamports: null,
      cuLimit,
      cuPrice,
      cuWriteError,
    };
  }
  const base = await runPhase2Simulation(ctx, txBytes, signer, cluster);
  return attachFees(base, txBytes, cuLimit, cuPrice, cuEditable, cuWriteError);
}

export async function simulateSignTransaction(
  rpcUrl: string,
  requestId: string,
  originalBytes: Uint8Array,
  signerPubkey: string,
  cluster: Cluster,
  defaultCuPrice: number,
  payload: SimulateSignTxPayload,
): Promise<SimulateSignTxOutcome> {
  const seq = acceptSimulateRequest(requestId);
  const ctx: Phase2SimContext = { rpcUrl };

  let compiledMessage;
  try {
    compiledMessage = compiledMessageFromTxBytes(originalBytes);
  } catch {
    const result: SimulatePendingTxResult = {
      outcome: "unparseable",
      reason: "TX_UNPARSEABLE",
      instructions: [],
      sigFeeLamports: null,
      priorityLamports: null,
      totalFeeLamports: null,
    };
    return { ok: true, result, seq };
  }

  const signed = isTransactionSigned(originalBytes);
  const parsedOriginal = parseCuFromMessage(compiledMessage);

  if (signed) {
    const result = await runPhase2WithFees(
      ctx,
      originalBytes,
      signerPubkey,
      cluster,
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
    if (hasDuplicateCbDisc(compiledMessage)) {
      const result = await runPhase2WithFees(
        ctx,
        originalBytes,
        signerPubkey,
        cluster,
        null,
        null,
        true,
        CU_WRITE_FAIL_CODE,
      );
      return { ok: true, result, seq };
    }
    const written = await writeCuToTransactionBytes(originalBytes, limit, price, rpcUrl);
    const cuErr = writeErrorFromResult(written);
    const simBytes = written.ok ? written.bytes : originalBytes;
    if (written.ok) {
      tryCommitWorkingTx(requestId, seq, written.bytes);
    }
    const result = await runPhase2WithFees(
      ctx,
      simBytes,
      signerPubkey,
      cluster,
      limit,
      price,
      true,
      cuErr,
    );
    return { ok: true, result, seq };
  }

  if (hasWorkingTx(requestId)) {
    const working = getWorkingTx(requestId)!;
    try {
      decodeWireTransaction(working);
    } catch {
      const result = await runPhase2WithFees(
        ctx,
        originalBytes,
        signerPubkey,
        cluster,
        null,
        null,
        true,
      );
      return { ok: true, result, seq };
    }
    const parsed = parseCuFromTxBytes(working);
    const result = await runPhase2WithFees(
      ctx,
      working,
      signerPubkey,
      cluster,
      parsed.limit,
      parsed.price,
      true,
    );
    return { ok: true, result, seq };
  }

  const originalLimit = parsedOriginal.limit;
  const suggestedLimit = await simulatePhase1ForLimit(ctx, originalBytes, originalLimit);
  const price = defaultCuPrice;

  if (hasDuplicateCbDisc(compiledMessage)) {
    const result = await runPhase2WithFees(
      ctx,
      originalBytes,
      signerPubkey,
      cluster,
      null,
      null,
      true,
      CU_WRITE_FAIL_CODE,
    );
    return { ok: true, result, seq };
  }

  const written = await writeCuToTransactionBytes(
    originalBytes,
    suggestedLimit,
    price,
    rpcUrl,
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
    cluster,
    suggestedLimit,
    price,
    true,
    cuErr,
  );
  return { ok: true, result, seq };
}
