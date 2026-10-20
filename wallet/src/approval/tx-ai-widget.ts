/**
 * In-flow AI row card on the sign shell (under title, above simulation).
 * Does not start assess or rerun on simulation refresh.
 */
import { sendExtensionRequest } from "../shared/protocol";
import { mountTxAiMarkdown } from "../shared/tx-ai";
import type { TxAiAssessState, TxAiLevel } from "../shared/tx-ai";
import { t, type UiLocale } from "../shared/i18n";
import type { MessageKey } from "../shared/i18n";

let watchId = "";
let slotEl: HTMLElement | null = null;
let scrollHost: HTMLElement | null = null;
let overlayOpen = false;
let latest: TxAiAssessState = { status: "idle" };
let idlePolls = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let locale: UiLocale = "zh-Hant";
let paintedKey = "";

const REPORT_ICON = `<path d="M7 4.5h7l3.5 3.5V19.5H7z"/><path d="M14 4.5V8h3.5"/><path d="M9.5 12h5"/><path d="M9.5 15h5"/>`;

/** Bot — AI row mark (stroke paths, 24×24). */
const BOT_ICON = `<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>`;

const BACK_TOP_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>';

function levelOf(state: TxAiAssessState): TxAiLevel | "running" | "hidden" {
  if (state.status === "idle") return "hidden";
  if (state.status === "running") return "running";
  if (state.status === "error") return "unknown";
  return state.level;
}

function riskIndexKey(level: TxAiLevel): MessageKey {
  return `approval.txAi.riskIndex.${level}`;
}

function reportText(state: TxAiAssessState): string {
  if (state.status === "done") return state.reportText;
  if (state.status === "error") return state.reportText ?? "";
  return "";
}

function hasReportBody(state: TxAiAssessState): boolean {
  return reportText(state).trim().length > 0;
}

function isTimedOutError(state: TxAiAssessState): boolean {
  return (
    state.status === "error" &&
    (state.message === "timeout" || state.message === "bridge_timeout")
  );
}

function reportEmptyMessageKey(state: TxAiAssessState): MessageKey {
  if (state.status === "error") {
    if (state.message === "timeout") return "approval.txAi.reportTimeout";
    if (state.message === "bridge_timeout") return "approval.txAi.reportSlow";
    return "approval.txAi.failed";
  }
  return "approval.txAi.reportEmpty";
}

function rowResultKey(state: TxAiAssessState, level: TxAiLevel | "running" | "hidden"): MessageKey {
  if (state.status === "error") {
    return isTimedOutError(state) ? "approval.txAi.rowTimedOut" : "approval.txAi.failed";
  }
  const riskLevel: TxAiLevel = level === "unknown" ? "unknown" : level === "running" || level === "hidden" ? "unknown" : level;
  return riskIndexKey(riskLevel);
}

function overlayTitleKey(state: TxAiAssessState, level: TxAiLevel | "running" | "hidden"): MessageKey {
  if (state.status === "error") {
    return isTimedOutError(state) ? "approval.txAi.rowTimedOut" : "approval.txAi.failed";
  }
  const riskLevel: TxAiLevel = level === "unknown" ? "unknown" : level === "running" || level === "hidden" ? "unknown" : level;
  return riskIndexKey(riskLevel);
}

function scrollPane(host: HTMLElement): HTMLElement | null {
  return (
    host.querySelector<HTMLElement>(".approval-sign-scroll") ??
    host.querySelector<HTMLElement>(".screen-body")
  );
}

/** Sign shell root (not the scrolling pane); overlay must cover the visible viewport. */
function overlayRoot(host: HTMLElement): HTMLElement {
  return host;
}

function removeVeil(host: HTMLElement): void {
  overlayRoot(host).querySelector(".ai-veil")?.remove();
  scrollPane(host)?.querySelector(".ai-veil")?.remove();
}

function visualKey(): string {
  const err = latest.status === "error" ? latest.message : "";
  return `${latest.status}|${levelOf(latest)}|${err}|${reportText(latest)}|${locale}`;
}

function svgIcon(paths: string, className: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add(className);
  svg.innerHTML = paths;
  return svg;
}

function openReport(): void {
  if (!hasReportBody(latest)) return;
  overlayOpen = true;
  paintOverlay();
}

function paintRow(): void {
  const slot = slotEl;
  if (!slot) return;
  const nextKey = visualKey();
  if (paintedKey === nextKey && slot.querySelector(".ai-card")) return;
  paintedKey = nextKey;
  slot.replaceChildren();
  const level = levelOf(latest);
  if (level === "hidden") {
    slot.hidden = true;
    return;
  }
  slot.hidden = false;

  const running = level === "running";
  const failed = latest.status === "error";
  const card = document.createElement("div");
  card.className = "ai-card";
  card.dataset.level = failed ? "failed" : level;
  if (running) card.setAttribute("role", "status");

  const row = document.createElement("div");
  row.className = "ai-row";
  const mark = document.createElement("span");
  mark.className = "ai-mark";
  mark.append(svgIcon(BOT_ICON, "ai-mark-icon"));
  const label = document.createElement("span");
  label.className = "ai-label";
  label.textContent = t(locale, "approval.txAi.rowLabel");
  row.append(mark, label);
  if (running) {
    const status = document.createElement("span");
    status.className = "ai-status ai-status--running";
    status.textContent = t(locale, "approval.txAi.running");
    row.append(status);
  } else {
    const result = document.createElement("span");
    result.className = "ai-result";
    result.textContent = t(locale, rowResultKey(latest, level));
    row.append(result);
    if (hasReportBody(latest)) {
      const reportBtn = document.createElement("button");
      reportBtn.type = "button";
      reportBtn.className = "ai-report-btn";
      reportBtn.title = t(locale, "approval.txAi.openReport");
      reportBtn.setAttribute("aria-label", t(locale, "approval.txAi.openReport"));
      reportBtn.append(svgIcon(REPORT_ICON, "ai-report-icon"));
      reportBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openReport();
      });
      row.append(reportBtn);
    }
  }
  card.append(row);
  if (running) {
    const track = document.createElement("div");
    track.className = "ai-track";
    track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    track.append(bar);
    card.append(track);
  }
  slot.append(card);
}

function paintOverlay(): void {
  const host = scrollHost;
  if (!host) return;
  const pane = scrollPane(host);
  const mount = overlayRoot(host);
  removeVeil(host);
  if (!overlayOpen) {
    if (pane) pane.style.overflowY = "";
    return;
  }
  const level = levelOf(latest);
  if (level === "hidden" || level === "running") {
    overlayOpen = false;
    return;
  }
  const report = reportText(latest).trim();
  if (pane) pane.style.overflowY = "hidden";
  const veil = document.createElement("div");
  veil.className = "ai-veil";
  const sheet = document.createElement("div");
  sheet.className = "ai-sheet";
  const head = document.createElement("div");
  head.className = "ai-sheet-head";
  const title = document.createElement("h3");
  title.textContent = t(locale, overlayTitleKey(latest, level));
  const close = document.createElement("button");
  close.type = "button";
  close.className = "ai-sheet-close";
  close.setAttribute("aria-label", t(locale, "approval.txAi.closeReport"));
  close.textContent = "×";
  close.addEventListener("click", () => {
    overlayOpen = false;
    paintOverlay();
  });
  veil.addEventListener("click", (event) => {
    if (event.target === veil) {
      overlayOpen = false;
      paintOverlay();
    }
  });
  head.append(title, close);
  const disclaimer = document.createElement("p");
  disclaimer.className = "ai-report-disclaimer";
  disclaimer.textContent = t(locale, "approval.txAi.reportDisclaimer");
  const body = document.createElement("div");
  body.className = "ai-report";
  if (report) mountTxAiMarkdown(body, report);
  else {
    const empty = document.createElement("p");
    empty.className = "ai-report-empty";
    empty.textContent = t(locale, reportEmptyMessageKey(latest));
    body.append(empty);
  }
  const foot = document.createElement("div");
  foot.className = "ai-sheet-foot";
  const toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "icon-btn ai-to-top";
  toTop.setAttribute("aria-label", t(locale, "approval.txAi.backToTop"));
  toTop.innerHTML = BACK_TOP_SVG;
  toTop.addEventListener("click", (event) => {
    event.stopPropagation();
    body.scrollTop = 0;
    veil.scrollTop = 0;
  });
  foot.append(toTop);
  sheet.append(head, disclaimer, body, foot);
  veil.append(sheet);
  mount.append(veil);
}

async function poll(): Promise<void> {
  if (!watchId) return;
  const res = await sendExtensionRequest("ui.getPending", { requestId: watchId });
  if (!watchId) return;
  if (!res.ok) {
    latest = { status: "idle" };
    overlayOpen = false;
    paintRow();
    paintOverlay();
    stopTimer();
    return;
  }
  const txAi = (res.result as { txAi?: TxAiAssessState } | undefined)?.txAi;
  latest = txAi ?? { status: "idle" };
  if (latest.status === "error" && !hasReportBody(latest)) overlayOpen = false;
  if (latest.status === "idle") {
    idlePolls += 1;
    if (idlePolls >= 4) stopTimer();
  } else {
    idlePolls = 0;
  }
  paintRow();
  if (overlayOpen) paintOverlay();
  if (latest.status === "done" || latest.status === "error") stopTimer();
}

function stopTimer(): void {
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
}

export function attachTxAiToSignShell(host: HTMLElement, requestId: string, nextLocale: UiLocale): void {
  locale = nextLocale;
  scrollHost = host;
  const slot = host.querySelector<HTMLElement>(".sign-ai-slot");
  if (!slot) return;
  slotEl = slot;
  if (watchId === requestId) {
    paintRow();
    return;
  }
  watchId = requestId;
  overlayOpen = false;
  idlePolls = 0;
  latest = { status: "idle" };
  paintedKey = "";
  stopTimer();
  void poll();
  timer = setInterval(() => {
    void poll();
  }, 1200);
  paintRow();
}

export function stopTxAiWatch(): void {
  if (scrollHost) removeVeil(scrollHost);
  watchId = "";
  slotEl = null;
  scrollHost = null;
  overlayOpen = false;
  paintedKey = "";
  stopTimer();
  latest = { status: "idle" };
}
