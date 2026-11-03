/**
 * Fee-card simulation for a v1 message: config priority fee, no ComputeBudget append.
 * Does not build wallet-originated transactions.
 */
import { getCompiledTransactionMessageDecoder } from "@solana/kit";
import { isValidCuLimit, isTransactionSigned } from "./compute-budget-tx";
import { readV1Budget, writeV1Budget } from "./v1-config-tx";
import { enrichSimulateDeltas } from "./delta-display-enrich";
import { runPhase2Simulation, type Phase2SimContext } from "./phase2-deltas";
import {
  getWorkingTx,
  hasWorkingTx,
  tryCommitWorkingTx,
} from "../pending";
import type { SimulatePendingTxResult } from "../../shared/tx";
import type { Cluster } from "../../shared/protocol";
import { parsePriorityFeeLamports } from "../../shared/protocol";
import { decodeWireTransaction, messageBytesToUint8Array } from "../../shared/tx";

export type V1SimulatePayload = {
  cuLimit?: number;
  priorityFeeLamports?: string;
};

export type V1SimulateOutcome =
  | { ok: true; result: SimulatePendingTxResult; seq: number }
  | { ok: false; code: "INVALID_PAYLOAD" | "NOT_FOUND"; message: string };

const CU_WRITE_FAIL_CODE = "CU_WRITE_FAILED";

function fees(
  result: SimulatePendingTxResult,
  txBytes: Uint8Array,
  cuLimit: number | null,
  priorityFee: bigint | null,
  cuEditable: boolean,
  cuWriteError?: string,
): SimulatePendingTxResult {
  const tx = decodeWireTransaction(txBytes);
  const compiledMsg = getCompiledTransactionMessageDecoder().decode(
    messageBytesToUint8Array(tx.messageBytes),
  );
  const signers = compiledMsg.header.numSignerAccounts;
  const sigFee = 5_000 * signers;
  const priority = priorityFee == null ? 0 : Number(priorityFee);
  return {
    ...result,
    sigFeeLamports: sigFee,
    priorityLamports: priority,
    totalFeeLamports: sigFee + priority,
    cuLimit,
    cuPrice: null,
    priorityFeeLamports: priorityFee == null ? null : priorityFee.toString(),
    messageVersion: 1,
    cuEditable,
    cuWriteError,
  };
}

async function phase2(
  ctx: Phase2SimContext,
  txBytes: Uint8Array,
  signer: string,
  cluster: Cluster,
  cuLimit: number | null,
  priorityFee: bigint | null,
  cuEditable: boolean,
  jupiterApiKey: string,
  jupiterApiUrl: string,
  cuWriteError?: string,
): Promise<SimulatePendingTxResult> {
  const base = await runPhase2Simulation(ctx, txBytes, signer, cluster);
  const withFees = fees(base, txBytes, cuLimit, priorityFee, cuEditable, cuWriteError);
  return enrichSimulateDeltas(withFees, cluster, jupiterApiKey, jupiterApiUrl);
}

export async function simulateV1Sign(args: {
  ctx: Phase2SimContext;
  requestId: string;
  seq: number;
  originalBytes: Uint8Array;
  signerPubkey: string;
  cluster: Cluster;
  defaultPriorityFeeLamports: string;
  jupiterApiKey: string;
  jupiterApiUrl: string;
  payload: V1SimulatePayload;
}): Promise<V1SimulateOutcome> {
  const {
    ctx,
    requestId,
    seq,
    originalBytes,
    signerPubkey,
    cluster,
    defaultPriorityFeeLamports,
    jupiterApiKey,
    jupiterApiUrl,
    payload,
  } = args;

  const signed = isTransactionSigned(originalBytes);
  if (signed) {
    const budget = readV1Budget(originalBytes);
    const result = await phase2(
      ctx,
      originalBytes,
      signerPubkey,
      cluster,
      budget?.cuLimit ?? null,
      budget?.priorityFeeLamports ?? null,
      false,
      jupiterApiKey,
      jupiterApiUrl,
    );
    return { ok: true, result, seq };
  }

  const hasLimit = payload.cuLimit !== undefined;
  const hasFee = payload.priorityFeeLamports !== undefined;
  if (hasLimit !== hasFee) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "cuLimit and priorityFeeLamports must both be set" };
  }
  if (hasLimit && hasFee) {
    const fee = parsePriorityFeeLamports(payload.priorityFeeLamports!);
    if (!isValidCuLimit(payload.cuLimit!) || fee == null) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "v1 fee out of bounds" };
    }
    const written = writeV1Budget(originalBytes, {
      cuLimit: payload.cuLimit,
      priorityFeeLamports: fee,
    });
    const simBytes = written.ok ? written.bytes : originalBytes;
    if (written.ok) tryCommitWorkingTx(requestId, seq, written.bytes);
    const result = await phase2(
      ctx,
      simBytes,
      signerPubkey,
      cluster,
      payload.cuLimit!,
      fee,
      true,
      jupiterApiKey,
      jupiterApiUrl,
      written.ok ? undefined : CU_WRITE_FAIL_CODE,
    );
    return { ok: true, result, seq };
  }

  if (hasWorkingTx(requestId)) {
    const working = getWorkingTx(requestId)!;
    const budget = readV1Budget(working);
    const result = await phase2(
      ctx,
      working,
      signerPubkey,
      cluster,
      budget?.cuLimit ?? null,
      budget?.priorityFeeLamports ?? null,
      true,
      jupiterApiKey,
      jupiterApiUrl,
    );
    return { ok: true, result, seq };
  }

  const budget = readV1Budget(originalBytes);
  let simBytes = originalBytes;
  let fee = budget?.priorityFeeLamports ?? null;
  let cuWriteError: string | undefined;
  if (fee == null) {
    const filled = parsePriorityFeeLamports(defaultPriorityFeeLamports) ?? 5000n;
    const written = writeV1Budget(originalBytes, { priorityFeeLamports: filled });
    if (written.ok) {
      simBytes = written.bytes;
      fee = filled;
      tryCommitWorkingTx(requestId, seq, written.bytes);
    } else {
      cuWriteError = CU_WRITE_FAIL_CODE;
    }
  }
  const shown = readV1Budget(simBytes);
  const result = await phase2(
    ctx,
    simBytes,
    signerPubkey,
    cluster,
    shown?.cuLimit ?? null,
    fee,
    true,
    jupiterApiKey,
    jupiterApiUrl,
    cuWriteError,
  );
  return { ok: true, result, seq };
}
