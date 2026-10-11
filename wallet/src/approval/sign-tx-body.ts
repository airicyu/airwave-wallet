/**
 * Persistent sign-transaction body: delta card shell, inner content paint, and auto-sim timer.
 * Does not run RPC simulation or resolve pending requests.
 */
import type { SimulatePendingTxResult } from "../shared/simulate-pending-tx-types";
import { messageForErrorCode, t, type UiLocale } from "../shared/ui-i18n";
import type { MessageKey } from "../shared/ui-messages";
import { formatSolFromLamports } from "./format";

const EXPLORER_INSPECTOR_PREFIX = "https://explorer.solana.com/tx/inspector";

const EXPLORER_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

const RETRY_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>';

export type SignTxBodyRefs = {
  deltaCard: HTMLElement;
  deltaInner: HTMLElement;
  retryBtn: HTMLButtonElement;
  inspectorBtn: HTMLButtonElement;
  feeSlot: HTMLElement;
  detailsSlot: HTMLElement;
};

export type SignTxBodyDeps = {
  locale: UiLocale;
  tr: (key: MessageKey, vars?: Record<string, string>) => string;
  onRetry: () => void;
  retryDisabled: () => boolean;
};

const MANUAL_RETRY_COOLDOWN_MS = 1000;
const RETRY_SPIN_MS = 325;

let refs: SignTxBodyRefs | null = null;
let autoSimTimer: ReturnType<typeof setInterval> | null = null;
let logicalRetryDisabled = false;
let manualCooldownUntil = 0;
let retryFeedbackTimers: number[] = [];

function clearRetryFeedbackTimers(): void {
  for (const id of retryFeedbackTimers) window.clearTimeout(id);
  retryFeedbackTimers = [];
}

function updateRetryButtonState(): void {
  if (!refs) return;
  const onCooldown = Date.now() < manualCooldownUntil;
  refs.retryBtn.disabled = logicalRetryDisabled || onCooldown;
}

function beginManualRetryFeedback(): void {
  if (!refs) return;
  const btn = refs.retryBtn;
  clearRetryFeedbackTimers();
  manualCooldownUntil = Date.now() + MANUAL_RETRY_COOLDOWN_MS;
  btn.classList.add("is-spinning");
  updateRetryButtonState();
  retryFeedbackTimers.push(
    window.setTimeout(() => {
      btn.classList.remove("is-spinning");
      updateRetryButtonState();
    }, RETRY_SPIN_MS),
  );
  retryFeedbackTimers.push(
    window.setTimeout(() => {
      manualCooldownUntil = 0;
      updateRetryButtonState();
    }, MANUAL_RETRY_COOLDOWN_MS),
  );
}

function validInspectorUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(EXPLORER_INSPECTOR_PREFIX)) return null;
  return url;
}

function simReasonText(locale: UiLocale, reason: string | undefined, fallback: string): string {
  if (!reason) return t(locale, fallback as MessageKey);
  const mapped = messageForErrorCode(locale, reason);
  return mapped !== reason ? mapped : reason;
}

export function disposeSignTxBody(): void {
  stopAutoSim();
  clearRetryFeedbackTimers();
  manualCooldownUntil = 0;
  logicalRetryDisabled = false;
  if (refs) refs.retryBtn.classList.remove("is-spinning");
  refs = null;
}

export function stopAutoSim(): void {
  if (autoSimTimer != null) {
    clearInterval(autoSimTimer);
    autoSimTimer = null;
  }
}

export function startAutoSim(tick: () => void, shouldSkip: () => boolean): void {
  stopAutoSim();
  autoSimTimer = setInterval(() => {
    if (shouldSkip()) return;
    tick();
  }, 3000);
}

export function getSignTxBodyRefs(): SignTxBodyRefs | null {
  return refs;
}

export function mountSignTxBodyShell(
  signBody: HTMLElement,
  deps: SignTxBodyDeps,
  feeCard: HTMLElement,
  txDetails: HTMLElement,
): SignTxBodyRefs {
  signBody.replaceChildren();
  const deltaCard = document.createElement("div");
  deltaCard.className = "card";
  const head = document.createElement("div");
  head.className = "sim-head";
  const label = document.createElement("h3");
  label.textContent = deps.tr("approval.expectedDelta");
  const tools = document.createElement("div");
  tools.className = "sim-tools";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "icon-btn sim-retry-btn";
  retry.title = deps.tr("approval.retrySim");
  retry.setAttribute("aria-label", deps.tr("approval.retrySim"));
  retry.innerHTML = RETRY_ICON_SVG;
  retry.addEventListener("click", () => {
    if (logicalRetryDisabled || Date.now() < manualCooldownUntil) return;
    beginManualRetryFeedback();
    deps.onRetry();
  });
  const inspector = document.createElement("button");
  inspector.type = "button";
  inspector.className = "icon-btn explorer";
  inspector.title = deps.tr("approval.simExplorer");
  inspector.setAttribute("aria-label", deps.tr("approval.simExplorer"));
  inspector.innerHTML = EXPLORER_ICON_SVG;
  inspector.disabled = true;
  tools.append(retry, inspector);
  head.append(label, tools);
  const deltaInner = document.createElement("div");
  deltaInner.className = "delta-inner";
  deltaCard.append(head, deltaInner);

  const feeSlot = document.createElement("div");
  feeSlot.dataset.part = "fee";
  feeSlot.append(feeCard);
  const detailsSlot = document.createElement("div");
  detailsSlot.dataset.part = "details";
  detailsSlot.append(txDetails);

  signBody.append(deltaCard, feeSlot, detailsSlot);
  refs = { deltaCard, deltaInner, retryBtn: retry, inspectorBtn: inspector, feeSlot, detailsSlot };
  syncRetryDisabled(deps.retryDisabled());
  return refs;
}

export function syncRetryDisabled(disabled: boolean): void {
  logicalRetryDisabled = disabled;
  updateRetryButtonState();
}

/** Stable key for whether expected-delta *content* changed (ignores inspector URL, fees, seq). */
export function deltaDisplayFingerprint(sim: SimulatePendingTxResult): string {
  if (sim.outcome === "unparseable" || sim.outcome === "rpc") {
    return `${sim.outcome}:${sim.reason ?? ""}`;
  }
  if (sim.outcome === "fail") {
    const errPart = sim.err != null ? JSON.stringify(sim.err) : "";
    const logsPart = sim.logs?.join("\n") ?? "";
    return `fail:${sim.reason ?? ""}:${errPart}:${logsPart}`;
  }
  const deltas = sim.deltas ?? [];
  if (deltas.length === 0) return "ok:none";
  return `ok:${deltas.map((d) => `${d.symbol}:${d.sign}:${d.amount}`).join("|")}`;
}

export function syncInspectorUrl(url: string | null | undefined): void {
  if (!refs) return;
  const valid = validInspectorUrl(url);
  const btn = refs.inspectorBtn;
  btn.disabled = !valid;
  btn.onclick = valid
    ? (e) => {
        e.preventDefault();
        void chrome.tabs.create({ url: valid });
      }
    : null;
}

export function paintDeltaInner(
  inner: HTMLElement,
  sim: SimulatePendingTxResult | null,
  loading: boolean,
  locale: UiLocale,
): void {
  inner.replaceChildren();
  if (loading) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = t(locale, "approval.querying");
    inner.append(p);
    return;
  }
  if (!sim) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = t(locale, "approval.querying");
    inner.append(p);
    return;
  }
  if (sim.outcome === "unparseable" || sim.outcome === "rpc") {
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = t(locale, "sim.cannotSimulate");
    const reason = document.createElement("p");
    reason.className = "notice-reason";
    reason.textContent = simReasonText(
      locale,
      sim.reason,
      sim.outcome === "unparseable" ? "error.code.TX_UNPARSEABLE" : "error.code.SIM_RPC",
    );
    inner.append(title, reason);
    return;
  }
  if (sim.outcome === "fail") {
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = t(locale, "sim.willFail");
    inner.append(title);
    if (sim.reason) {
      const reason = document.createElement("p");
      reason.className = "notice-reason";
      reason.textContent = sim.reason;
      inner.append(reason);
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
    inner.append(details);
    const muted = document.createElement("p");
    muted.className = "muted-center";
    muted.textContent = t(locale, "approval.cannotEstimateDelta");
    inner.append(muted);
    return;
  }

  const deltas = sim.deltas;
  if (!deltas) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = t(locale, "approval.cannotEstimateDelta");
    inner.append(p);
    return;
  }
  if (deltas.length === 0) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = t(locale, "approval.noBalanceChange");
    inner.append(p);
    return;
  }
  for (const d of deltas) {
    const row = document.createElement("div");
    row.className = "delta-row";
    const sym = document.createElement("span");
    sym.textContent = d.symbol;
    const amt = document.createElement("span");
    amt.className = `delta-amount ${d.sign}`;
    amt.textContent = `${d.sign === "plus" ? "+" : "−"}${d.amount} ${d.symbol}`;
    row.append(sym, amt);
    inner.append(row);
  }
}

export function updateFeeTotalEl(
  totalEl: HTMLElement,
  opts: {
    loading: boolean;
    cuWriteError?: string;
    totalLamports: number | null;
    estimating: boolean;
    progressUserMessage: (code: string) => string;
    tr: (key: MessageKey) => string;
  },
): void {
  if (opts.loading || opts.estimating) {
    totalEl.textContent = opts.tr("approval.estimating");
    return;
  }
  if (opts.cuWriteError) {
    totalEl.textContent = opts.progressUserMessage(opts.cuWriteError);
    return;
  }
  if (opts.totalLamports != null) {
    totalEl.textContent = formatSolFromLamports(opts.totalLamports);
    return;
  }
  totalEl.textContent = opts.tr("approval.unknown");
}
