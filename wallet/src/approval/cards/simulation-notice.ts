import type { SimulatePendingTxResult } from "../../shared/simulate-pending-tx-types";

export function renderSimulationNotice(sim: SimulatePendingTxResult | null): HTMLElement | null {
  if (!sim) return null;
  if (sim.outcome === "unparseable") {
    const card = document.createElement("div");
    card.className = "notice-card warn-neutral";
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = "無法模擬";
    const reason = document.createElement("p");
    reason.className = "notice-reason";
    reason.textContent = sim.reason ?? "無法解析交易";
    card.append(title, reason);
    return card;
  }
  if (sim.outcome === "rpc") {
    const card = document.createElement("div");
    card.className = "notice-card warn-neutral";
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = "無法模擬";
    const reason = document.createElement("p");
    reason.className = "notice-reason";
    reason.textContent = sim.reason ?? "RPC 錯誤";
    card.append(title, reason);
    return card;
  }
  if (sim.outcome === "fail") {
    const card = document.createElement("div");
    card.className = "notice-card";
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = "預計交易失敗";
    card.append(title);
    if (sim.reason) {
      const reason = document.createElement("p");
      reason.className = "notice-reason";
      reason.textContent = sim.reason;
      card.append(reason);
    }
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "失敗詳情";
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
