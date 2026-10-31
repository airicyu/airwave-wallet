/**
 * One-shot sign-approval blockhash cluster probe and mismatch card paint.
 * Does not persist results or re-run after Apply CU or auto-simulate.
 */
import type { BlockhashProbeResult } from "../../shared/protocol";
import type { Cluster } from "../../shared/protocol";
import { sendExtensionRequest } from "../../shared/protocol";
import { sess } from "./session";
import { isSendStatusLocked, setSignButtons } from "./dom";
import { isSignTxKind } from "./kinds";
import { tr } from "./locale";
import { showGone } from "./gone";

export function resetBlockhashProbeSession(): void {
  sess.blockhashProbeStarted = false;
  sess.blockhashProbePending = false;
  sess.blockhashProbeMismatch = false;
  sess.blockhashProbeResult = null;
}

export function blockhashProbeBlocksApprove(): boolean {
  return sess.blockhashProbePending || sess.blockhashProbeMismatch;
}

function isProbeMismatch(result: BlockhashProbeResult, cluster: Cluster): boolean {
  const { devnet, mainnet } = result;
  if (devnet === "valid" && mainnet === "invalid") return cluster !== "devnet";
  if (mainnet === "valid" && devnet === "invalid") return cluster !== "mainnet";
  return false;
}

function mismatchBodyKey(cluster: Cluster): "sign.clusterMismatch.devnetWallet" | "sign.clusterMismatch.mainnetWallet" {
  return cluster === "devnet" ? "sign.clusterMismatch.devnetWallet" : "sign.clusterMismatch.mainnetWallet";
}

/** Recompute mismatch and Approve from stored probe sides when settings.cluster changes (no second RPC). */
export function reapplyBlockhashProbeGating(): void {
  if (sess.blockhashProbePending) {
    setSignButtons({ approve: true });
    return;
  }
  if (!sess.blockhashProbeResult) return;
  sess.blockhashProbeMismatch = isProbeMismatch(sess.blockhashProbeResult, sess.settingsCluster);
  syncBlockhashMismatchCard();
  if (sess.blockhashProbeMismatch) {
    setSignButtons({ approve: true });
    return;
  }
  sess.onApplyApproveFromSimulation?.(sess.lastSim);
}

export function syncBlockhashMismatchCard(): void {
  const card = sess.signBody.querySelector(".cluster-mismatch-card");
  if (!sess.blockhashProbeMismatch || !sess.blockhashProbeResult) {
    card?.remove();
    return;
  }
  let el = card as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.className = "notice-card cluster-mismatch-card";
    el.setAttribute("role", "alert");
    const title = document.createElement("p");
    title.className = "notice-title";
    title.dataset.part = "title";
    const body = document.createElement("p");
    body.className = "notice-reason";
    body.dataset.part = "body";
    el.append(title, body);
    sess.signBody.prepend(el);
  }
  const titleEl = el.querySelector<HTMLElement>('[data-part="title"]');
  const bodyEl = el.querySelector<HTMLElement>('[data-part="body"]');
  if (titleEl) titleEl.textContent = tr("sign.clusterMismatch.title");
  if (bodyEl) bodyEl.textContent = tr(mismatchBodyKey(sess.settingsCluster));
}

export function startBlockhashProbeOnce(): void {
  if (sess.blockhashProbeStarted) return;
  if (!sess.requestId || !sess.pending || !isSignTxKind(sess.pending.kind)) return;
  if (isSendStatusLocked()) return;
  sess.blockhashProbeStarted = true;
  sess.blockhashProbePending = true;
  sess.blockhashProbeMismatch = false;
  sess.blockhashProbeResult = null;
  setSignButtons({ approve: true });
  const probeRequestId = sess.requestId;
  void (async () => {
    const res = await sendExtensionRequest("ui.probeSignBlockhash", { requestId: probeRequestId });
    if (sess.requestId !== probeRequestId || isSendStatusLocked()) return;
    if (!res.ok) {
      if (res.error?.code === "NOT_FOUND") {
        showGone();
        return;
      }
      sess.blockhashProbePending = false;
      sess.blockhashProbeResult = { devnet: "unknown", mainnet: "unknown" };
      sess.onApplyApproveFromSimulation?.(sess.lastSim);
      return;
    }
    const result = res.result as BlockhashProbeResult;
    sess.blockhashProbePending = false;
    sess.blockhashProbeResult = result;
    sess.blockhashProbeMismatch = isProbeMismatch(result, sess.settingsCluster);
    if (sess.blockhashProbeMismatch) {
      syncBlockhashMismatchCard();
      setSignButtons({ approve: true });
      return;
    }
    syncBlockhashMismatchCard();
    sess.onApplyApproveFromSimulation?.(sess.lastSim);
  })();
}
