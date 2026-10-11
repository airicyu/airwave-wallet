/**
 * Floating AI pill on the sign shell, parallel to simulation and approve.
 * Does not start an assess, and is not driven by simulation card rerenders.
 */
import { sendExtensionRequest } from "../shared/ext-api";
import { mountTxAiMarkdown } from "../shared/tx-ai-markdown";
import type { TxAiAssessState, TxAiLevel } from "../shared/tx-ai";
import { t, type UiLocale } from "../shared/ui-i18n";
import type { MessageKey } from "../shared/ui-messages";

let watchId = "";
let slotHost: HTMLElement | null = null;
let overlayOpen = false;
let latest: TxAiAssessState = { status: "idle" };
let idlePolls = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let locale: UiLocale = "zh-Hant";
let alignObserver: ResizeObserver | null = null;
let paintedKey = "";

const REPORT_ICON = `<path d="M7 4.5h7l3.5 3.5V19.5H7z"/><path d="M14 4.5V8h3.5"/><path d="M9.5 12h5"/><path d="M9.5 15h5"/>`;

function levelOf(state: TxAiAssessState): TxAiLevel | "running" | "hidden" {
  if (state.status === "idle") return "hidden";
  if (state.status === "running") return "running";
  if (state.status === "error") return "unknown";
  return state.level;
}

function labelKey(level: TxAiLevel | "running"): MessageKey {
  if (level === "running") return "approval.txAi.running";
  return `approval.txAi.level.${level}`;
}

function reportText(state: TxAiAssessState): string {
  if (state.status === "done") return state.reportText;
  if (state.status === "error") return state.reportText ?? "";
  return "";
}

function scrollPane(host: HTMLElement): HTMLElement | null {
  return (
    host.querySelector<HTMLElement>(".approval-sign-scroll") ??
    host.querySelector<HTMLElement>(".screen-body")
  );
}

function alignFloat(host: HTMLElement): void {
  const float = host.querySelector<HTMLElement>(".ai-float");
  const site = host.querySelector<HTMLElement>(".site-row");
  if (!float || !site) return;
  const pane = scrollPane(host);
  const scrolled = pane ? pane.scrollTop : 0;
  const top = site.getBoundingClientRect().top - host.getBoundingClientRect().top + scrolled;
  float.style.top = `${Math.max(8, top)}px`;
}

function watchAlign(host: HTMLElement): void {
  alignObserver?.disconnect();
  alignObserver = new ResizeObserver(() => alignFloat(host));
  alignObserver.observe(host);
  const site = host.querySelector(".site-row");
  if (site) alignObserver.observe(site);
}

function visualKey(): string {
  return `${levelOf(latest)}|${overlayOpen ? "1" : "0"}|${reportText(latest)}|${locale}`;
}

function paint(host: HTMLElement): void {
  const nextKey = visualKey();
  if (paintedKey === nextKey && host.querySelector("#tx-ai-root")) {
    if (!overlayOpen) alignFloat(host);
    return;
  }
  paintedKey = nextKey;
  host.querySelector("#tx-ai-root")?.remove();
  scrollPane(host)?.querySelector(".ai-veil")?.remove();
  const level = levelOf(latest);
  if (level === "hidden") {
    const pane = scrollPane(host);
    if (pane) pane.style.overflowY = "";
    return;
  }

  const root = document.createElement("div");
  root.id = "tx-ai-root";
  const report = reportText(latest);
  const canOpen = level !== "running" && Boolean(report);

  if (!overlayOpen) {
    const float = document.createElement("div");
    float.className = "ai-float";
    if (level === "running") {
      const chip = document.createElement("span");
      chip.className = "ai-chip";
      chip.dataset.level = "running";
      chip.setAttribute("role", "status");
      chip.setAttribute("aria-label", t(locale, "approval.txAi.running"));
      const mark = document.createElement("span");
      mark.className = "ai-mark";
      const sweep = document.createElement("span");
      sweep.className = "ai-radar-sweep";
      const rings = document.createElement("span");
      rings.className = "ai-radar-rings";
      mark.append(sweep, rings);
      const word = document.createElement("span");
      word.className = "ai-word";
      word.textContent = "AI";
      chip.append(mark, word);
      float.append(chip);
    } else {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ai-chip";
      chip.dataset.level = level;
      chip.setAttribute("aria-label", t(locale, "approval.txAi.openReport"));
      if (!canOpen) chip.disabled = true;
      const mark = document.createElement("span");
      mark.className = "ai-mark ready";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.classList.add("ai-doc");
      svg.innerHTML = REPORT_ICON;
      mark.append(svg);
      const word = document.createElement("span");
      word.className = "ai-word";
      word.textContent = "AI";
      chip.append(mark, word);
      if (canOpen) {
        chip.addEventListener("click", () => {
          overlayOpen = true;
          paint(host);
        });
      }
      float.append(chip);
    }
    root.append(float);
  }

  const pane = scrollPane(host);
  if (overlayOpen && canOpen) {
    if (pane) pane.style.overflowY = "hidden";
    const veil = document.createElement("div");
    veil.className = "ai-veil";
    const sheet = document.createElement("div");
    sheet.className = "ai-sheet";
    const head = document.createElement("div");
    head.className = "ai-sheet-head";
    const title = document.createElement("h3");
    title.textContent = t(locale, labelKey(level));
    const close = document.createElement("button");
    close.type = "button";
    close.className = "ai-sheet-close";
    close.setAttribute("aria-label", t(locale, "approval.txAi.closeReport"));
    close.textContent = "×";
    const closeOverlay = () => {
      overlayOpen = false;
      paint(host);
    };
    close.addEventListener("click", closeOverlay);
    veil.addEventListener("click", (event) => {
      if (event.target === veil) closeOverlay();
    });
    head.append(title, close);
    const body = document.createElement("div");
    body.className = "ai-report";
    mountTxAiMarkdown(body, report);
    sheet.append(head, body);
    veil.append(sheet);
    const mount = pane ?? host;
    mount.append(veil);
  } else if (pane) {
    pane.style.overflowY = "";
  }

  host.append(root);
  if (!overlayOpen) {
    alignFloat(host);
    watchAlign(host);
  }
}

async function poll(): Promise<void> {
  if (!watchId) return;
  const res = await sendExtensionRequest("ui.getPending", { requestId: watchId });
  if (!watchId) return;
  if (!res.ok) {
    latest = { status: "idle" };
    overlayOpen = false;
    if (slotHost?.isConnected) paint(slotHost);
    stopTimer();
    return;
  }
  const txAi = (res.result as { txAi?: TxAiAssessState } | undefined)?.txAi;
  latest = txAi ?? { status: "idle" };
  if (latest.status === "idle") {
    idlePolls += 1;
    if (idlePolls >= 4) stopTimer();
  } else {
    idlePolls = 0;
  }
  if (slotHost?.isConnected) paint(slotHost);
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
  slotHost = host;
  if (watchId === requestId) {
    if (host.isConnected) paint(host);
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
  paint(host);
}

export function stopTxAiWatch(): void {
  const host = slotHost;
  watchId = "";
  slotHost = null;
  overlayOpen = false;
  paintedKey = "";
  stopTimer();
  alignObserver?.disconnect();
  alignObserver = null;
  latest = { status: "idle" };
  host?.querySelector("#tx-ai-root")?.remove();
  host && scrollPane(host)?.querySelector(".ai-veil")?.remove();
}
