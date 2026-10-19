/**
 * Sign-transaction body: simulation RPC, delta paint, and fee-slot refresh.
 * Does not resolve pending or paint wallet-send status cards.
 */
import { sendExtensionRequest } from "../../shared/ext-api";
import type { SimulatePendingTxResult } from "../../shared/simulate-pending-tx-types";
import {
  disposeSignTxBody,
  getSignTxBodyRefs,
  mountSignTxBodyShell,
  deltaDisplayFingerprint,
  deltaDisplayPaintFingerprint,
  paintDeltaInner,
  startAutoSim,
  stopAutoSim,
  syncInspectorUrl,
  syncRetryDisabled,
  updateFeeTotalEl,
} from "../sign-tx-body";
import { renderFeeCard, renderTxDetails } from "../dom/fee-details";
import { sess } from "./session";
import { hasCuPair, localTotalFeeLamports, retrySimDisabled } from "./cu";
import { isSendStatusLocked, setSignButtons } from "./dom";
import { isSignTxKind } from "./kinds";
import { progressUserMessage, tr } from "./locale";
import { showGone } from "./gone";

export function applyApproveFromSimulation(sim: SimulatePendingTxResult | null): void {
  if (sess.approveHoldTimer != null) return;
  if (sess.resolving) return;
  if (sim?.outcome === "unparseable") {
    setSignButtons({ approve: true });
    return;
  }
  if (sess.cuDirty || sess.cuApplyBusy) {
    setSignButtons({ approve: true });
    return;
  }
  setSignButtons({ approve: false });
}

function refreshFeeTotal(sim: SimulatePendingTxResult | null, loading: boolean): void {
  const totalEl = sess.signBody.querySelector<HTMLElement>('[data-part="fee"] .fee-total');
  if (!totalEl) return;
  updateFeeTotalEl(totalEl, {
    loading,
    cuWriteError: sim?.cuWriteError,
    totalLamports: localTotalFeeLamports(sim),
    estimating: !hasCuPair() && sess.txCuEditable && !sim?.cuWriteError,
    progressUserMessage,
    tr,
  });
}

function paintDeltaOnly(sim: SimulatePendingTxResult | null, loading: boolean): void {
  const r = getSignTxBodyRefs();
  if (!r) return;
  if (loading && sess.lastSim) {
    syncRetryDisabled(retrySimDisabled());
    return;
  }
  if (!loading && sim) {
    const fp = deltaDisplayFingerprint(sim);
    const paintFp = deltaDisplayPaintFingerprint(sim);
    if (
      fp === sess.lastDeltaFingerprint &&
      paintFp === sess.lastDeltaPaintFingerprint &&
      r.deltaInner.childElementCount > 0
    ) {
      syncInspectorUrl(sim.inspectorUrl);
      syncRetryDisabled(retrySimDisabled());
      return;
    }
    paintDeltaInner(r.deltaInner, sim, false, sess.shellLocale);
    sess.lastDeltaFingerprint = fp;
    sess.lastDeltaPaintFingerprint = paintFp;
  } else {
    paintDeltaInner(r.deltaInner, sim, loading, sess.shellLocale);
    if (!loading && sim) {
      sess.lastDeltaFingerprint = deltaDisplayFingerprint(sim);
      sess.lastDeltaPaintFingerprint = deltaDisplayPaintFingerprint(sim);
    } else if (!loading) {
      sess.lastDeltaFingerprint = "";
      sess.lastDeltaPaintFingerprint = "";
    }
  }
  syncInspectorUrl(sim?.inspectorUrl ?? sess.lastSim?.inspectorUrl);
  syncRetryDisabled(retrySimDisabled());
}

export function renderSignTransactionBody(sim: SimulatePendingTxResult | null, loading: boolean): void {
  if (isSendStatusLocked()) return;
  if (!sess.signTxBodyReady) {
    const feeCard = renderFeeCard(sim, loading);
    mountSignTxBodyShell(
      sess.signBody,
      {
        locale: sess.shellLocale,
        tr,
        onRetry: () => void runSimulation(),
        retryDisabled: retrySimDisabled,
      },
      feeCard,
      renderTxDetails(sim),
    );
    sess.signTxBodyReady = true;
  } else {
    syncRetryDisabled(retrySimDisabled());
    const r = getSignTxBodyRefs();
    if (r && (sess.cuApplyBusy || (!loading && sim != null && !sess.txDetailsReady))) {
      r.detailsSlot.replaceChildren(renderTxDetails(sim));
      if (!loading && sim != null) sess.txDetailsReady = true;
    }
    const rFee = getSignTxBodyRefs();
    if (rFee && (sess.cuApplyBusy || (!loading && sim != null && !sess.feeBreakdownReady))) {
      rFee.feeSlot.replaceChildren(renderFeeCard(sim, loading));
      if (!loading && sim != null) sess.feeBreakdownReady = true;
    }
  }
  paintDeltaOnly(sim, loading);
  if (!sess.feeFrozenForSim || sess.cuApplyBusy) {
    refreshFeeTotal(sim, loading);
    if (!loading && hasCuPair()) sess.feeFrozenForSim = true;
  }
}

export async function runSimulation(): Promise<void> {
  if (!sess.requestId || !sess.pending || !isSignTxKind(sess.pending.kind)) return;
  if (isSendStatusLocked()) return;
  const myGen = ++sess.simGen;
  const forceFull = !sess.signTxBodyReady || sess.cuApplyBusy;
  sess.simulating = true;
  if (forceFull) {
    renderSignTransactionBody(sess.lastSim, true);
  } else {
    paintDeltaOnly(sess.lastSim, true);
  }

  const payload: { requestId: string; cuLimit?: number; cuPrice?: number } = { requestId: sess.requestId };
  if (sess.cuUserOverride && hasCuPair()) {
    payload.cuLimit = sess.localCuLimit!;
    payload.cuPrice = sess.localCuPrice!;
  }

  const res = await sendExtensionRequest("ui.simulatePendingTx", payload);
  if (isSendStatusLocked() || sess.requestEnded || myGen !== sess.simGen) return;
  sess.simulating = false;
  sess.cuApplyBusy = false;
  if (!res.ok) {
    if (res.error?.code === "NOT_FOUND") {
      showGone();
      return;
    }
    sess.lastSim = {
      outcome: "rpc",
      reason: res.error?.code ?? "SIM_RPC",
      sigFeeLamports: null,
      priorityLamports: null,
      totalFeeLamports: null,
    };
  } else {
    const result = res.result as SimulatePendingTxResult;
    const seq = result.seq ?? 0;
    if (seq < sess.lastAcceptedSimSeq) {
      renderSignTransactionBody(sess.lastSim, false);
      applyApproveFromSimulation(sess.lastSim);
      return;
    }
    sess.lastAcceptedSimSeq = seq;
    sess.lastSim = result;
    sess.txCuEditable = result.cuEditable === true;
    if (result.cuLimit != null) sess.localCuLimit = result.cuLimit;
    if (result.cuPrice != null) sess.localCuPrice = result.cuPrice;
  }
  renderSignTransactionBody(sess.lastSim, false);
  applyApproveFromSimulation(sess.lastSim);
}

export function resetSignTxSession(): void {
  stopAutoSim();
  disposeSignTxBody();
  sess.signTxBodyReady = false;
  sess.feeFrozenForSim = false;
  sess.feeBreakdownReady = false;
  sess.txDetailsReady = false;
  sess.lastDeltaFingerprint = "";
  sess.lastDeltaPaintFingerprint = "";
}

export function startSignTxAutoSim(): void {
  startAutoSim(
    () => void runSimulation(),
    () =>
      !sess.requestId ||
      !sess.pending ||
      !isSignTxKind(sess.pending.kind) ||
      sess.simulating ||
      retrySimDisabled() ||
      isSendStatusLocked() ||
      sess.requestEnded,
  );
}
