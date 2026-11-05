/**
 * Builds approval popout notice cards for pending-transaction simulation outcomes (RPC/unparseable/fail/success).
 * Does not run simulation or call Solana RPC itself.
 */
import type { SimulatePendingTxResult } from "../../shared/tx";
import { messageForErrorCode, t, type UiLocale } from "../../shared/i18n";
import { copyPublicKeyWithFeedback, COPY_ICON_SVG } from "../../shared/marks";

function simReasonText(locale: UiLocale, reason: string | undefined, fallback: string): string {
  if (!reason) return t(locale, fallback as import("../../shared/i18n").MessageKey);
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
    summary.style.display = "list-item";
    const summaryRow = document.createElement("span");
    summaryRow.style.display = "inline-flex";
    summaryRow.style.alignItems = "center";
    summaryRow.style.gap = "8px";
    summaryRow.style.width = "calc(100% - 1.25em)";
    summaryRow.style.verticalAlign = "middle";
    const summaryLabel = document.createElement("span");
    summaryLabel.style.flex = "1";
    summaryLabel.textContent = t(locale, "sim.failDetails");
    const errPart = sim.err != null ? JSON.stringify(sim.err, null, 2) : "";
    const logsPart = sim.logs?.join("\n") ?? "";
    const failText = [errPart, logsPart].filter(Boolean).join("\n\n");
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-btn ghost-inline delta-mint-copy";
    const copyLabel = t(locale, "common.copy");
    copyBtn.title = copyLabel;
    copyBtn.setAttribute("aria-label", copyLabel);
    copyBtn.innerHTML = COPY_ICON_SVG;
    copyBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void copyPublicKeyWithFeedback(copyBtn, failText, locale);
    });
    summary.append(summaryRow);
    summaryRow.append(summaryLabel, copyBtn);
    const pre = document.createElement("pre");
    pre.style.fontSize = "0.72rem";
    pre.style.maxHeight = "320px";
    pre.style.overflow = "auto";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordBreak = "break-word";
    pre.textContent = failText;
    details.append(summary, pre);
    card.append(details);
    return card;
  }
  return null;
}
