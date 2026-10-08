/**
 * Builds approval popout notice cards for pending-transaction simulation outcomes (RPC/unparseable/fail/success).
 * Does not run simulation or call Solana RPC itself.
 */
import type { SimulatePendingTxResult } from "../../shared/simulate-pending-tx-types";
import { messageForErrorCode, t, type UiLocale } from "../../shared/ui-i18n";

function simReasonText(locale: UiLocale, reason: string | undefined, fallback: string): string {
  if (!reason) return t(locale, fallback as import("../../shared/ui-messages").MessageKey);
  const mapped = messageForErrorCode(locale, reason);
  return mapped !== reason ? mapped : reason;
}

export function renderSimulationNotice(
  sim: SimulatePendingTxResult | null,
  locale: UiLocale,
): HTMLElement | null {
  if (!sim) return null;
  if (sim.outcome === "unparseable") {
    const card = document.createElement("div");
    card.className = "notice-card warn-neutral";
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = t(locale, "sim.cannotSimulate");
    const reason = document.createElement("p");
    reason.className = "notice-reason";
    reason.textContent = simReasonText(locale, sim.reason, "error.code.TX_UNPARSEABLE");
    card.append(title, reason);
    return card;
  }
  if (sim.outcome === "rpc") {
    const card = document.createElement("div");
    card.className = "notice-card warn-neutral";
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = t(locale, "sim.cannotSimulate");
    const reason = document.createElement("p");
    reason.className = "notice-reason";
    reason.textContent = simReasonText(locale, sim.reason, "error.code.SIM_RPC");
    card.append(title, reason);
    return card;
  }
  if (sim.outcome === "fail") {
    const card = document.createElement("div");
    card.className = "notice-card";
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = t(locale, "sim.willFail");
    card.append(title);
    if (sim.reason) {
      const reason = document.createElement("p");
      reason.className = "notice-reason";
      reason.textContent = sim.reason;
      card.append(reason);
    }
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = t(locale, "sim.failDetails");
    const pre = document.createElement("pre");
    pre.style.fontSize = "0.72rem";
    pre.style.maxHeight = "160px";
    const errPart = sim.err != null ? JSON.stringify(sim.err, null, 2) : "";
    const logsPart = sim.logs?.join("\n") ?? "";
    pre.textContent = [errPart, logsPart].filter(Boolean).join("\n\n");
    details.append(summary, pre);
    card.append(details);
    return card;
  }
  return null;
}
