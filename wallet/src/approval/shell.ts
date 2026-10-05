import { sendExtensionRequest } from "../shared/ext-api";
import {
  PENDING_TIMEOUT_MS,
  type PendingRecord,
  type SignMessagePayload,
  type SignTransactionPayload,
  type UiHost,
} from "../shared/commands";
import type { SimulatePendingTxResult } from "../shared/simulate-pending-tx-types";
import type { AccountMeta } from "../shared/storage-keys";
import { SESSION_UNLOCKED } from "../shared/storage-keys";

export type ApprovalShellCallbacks = {
  onClose: () => void;
  onWalletSendReject?: () => void;
  onWalletSendSuccessExit?: () => void;
};

export type ApprovalShellConfig = {
  requestId: string;
  host: UiHost;
  callbacks: ApprovalShellCallbacks;
  /** Popup 內掛載時加前綴，避免與 popup 既有 id 衝突 */
  elementIdPrefix?: string;
};

let shellConfig: ApprovalShellConfig | null = null;
let requestId: string | null = null;
let mountRoot: ParentNode | null = null;

let viewUnlock!: HTMLElement;
let viewGone!: HTMLElement;
let goneLead!: HTMLElement;
let viewLegacy!: HTMLElement;
let viewSign!: HTMLElement;
let unlockPassword!: HTMLInputElement;
let unlockError!: HTMLElement;
let btnUnlock!: HTMLElement;
let legacyOrigin!: HTMLElement;
let legacyKind!: HTMLElement;
let legacyDetail!: HTMLElement;
let legacyError!: HTMLElement;
let signOrigin!: HTMLElement;
let signBody!: HTMLElement;
let signError!: HTMLElement;
let signPageTitle!: HTMLElement;
let signAvatar!: HTMLElement;
let signLabel!: HTMLElement;
let signAddr!: HTMLElement;
let btnCopyPk!: HTMLElement;
let signReject!: HTMLButtonElement;
let signApprove!: HTMLButtonElement;
let signDock!: HTMLElement;
let legacyReject!: HTMLButtonElement;
let legacyApprove!: HTMLButtonElement;
let btnCloseExpired!: HTMLElement;
let shellDomBound = false;

function closeHost(): void {
  shellConfig?.callbacks.onClose();
}

function walletSendRejectExit(): void {
  const cb = shellConfig?.callbacks.onWalletSendReject ?? shellConfig?.callbacks.onClose;
  cb?.();
}

function elementId(base: string): string {
  return `${shellConfig?.elementIdPrefix ?? ""}${base}`;
}

function q<T extends HTMLElement>(root: ParentNode, baseId: string): T {
  const id = elementId(baseId);
  const el =
    root instanceof Document
      ? root.getElementById(id)
      : (root as Element).querySelector(`#${CSS.escape(id)}`);
  if (!el) throw new Error(`approval shell: missing #${id}`);
  return el as T;
}

let pending: PendingRecord | null = null;
let frozenPk = "";
let resolving = false;
let approveHoldTimer: ReturnType<typeof setTimeout> | null = null;
let lastSim: SimulatePendingTxResult | null = null;
let simulating = false;
let txRawHex = "";
let simGen = 0;
let lastAcceptedSimSeq = 0;
let localCuLimit: number | null = null;
let localCuPrice: number | null = null;
let txCuEditable = false;
let cuDirty = false;
let draftLimitStr = "";
let draftPriceStr = "";
let cuApplyBusy = false;
let feeDetailsOpen = false;
/** pending／confirmed 時禁止模擬／loadPending 把審批內容蓋回轉圈畫面 */
let sendStatusPhase: "idle" | "pending" | "confirmed" = "idle";
let confirmedTimer: ReturnType<typeof setTimeout> | null = null;
let storageUnlockListener: ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void) | null =
  null;
let runtimeMessageListener: ((message: unknown) => void) | null = null;
let shellEventsAbort: AbortController | null = null;

const CU_LIMIT_MIN = 1;
const CU_LIMIT_MAX = 1_400_000;
const CU_PRICE_MIN = 0;
const CU_PRICE_MAX = 1_000_000_000;

function formatSolFromLamports(lamports: number): string {
  const sol = lamports / 1e9;
  return `${sol.toFixed(9).replace(/\.?0+$/, "") || "0"} SOL`;
}

function hasCuPair(): boolean {
  return localCuLimit != null && localCuPrice != null;
}

function cuPairInBounds(limit: number | null, price: number | null): boolean {
  return (
    limit != null &&
    price != null &&
    limit >= CU_LIMIT_MIN &&
    limit <= CU_LIMIT_MAX &&
    price >= CU_PRICE_MIN &&
    price <= CU_PRICE_MAX
  );
}

function draftsAreDirty(limitRaw: string, priceRaw: string): boolean {
  const committedL = localCuLimit == null ? "" : String(localCuLimit);
  const committedP = localCuPrice == null ? "" : String(localCuPrice);
  return limitRaw.trim() !== committedL || priceRaw.trim() !== committedP;
}

const CU_CHECK_SVG =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>';


function parseCuFieldInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function hideAll(): void {
  viewUnlock.hidden = true;
  viewGone.hidden = true;
  viewLegacy.hidden = true;
  viewSign.hidden = true;
}

function hardenSensitiveTextInput(el: HTMLInputElement): void {
  el.autocomplete = "off";
  el.setAttribute("autocapitalize", "off");
  el.setAttribute("autocorrect", "off");
  el.setAttribute("spellcheck", "false");
  el.setAttribute("aria-autocomplete", "none");
  el.setAttribute("data-lpignore", "true");
  el.setAttribute("data-1p-ignore", "");
  el.setAttribute("data-form-type", "other");
  el.removeAttribute("name");
  el.readOnly = true;
  el.addEventListener("focus", () => {
    el.readOnly = false;
  });
}

function hardenWalletPasswordInput(inp: HTMLInputElement): void {
  inp.type = "text";
  inp.classList.add("wallet-pwd-masked");
  hardenSensitiveTextInput(inp);
}

function shortPk(pk: string): string {
  if (pk.length <= 8) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function avatarLetter(label: string): string {
  const t = label.trim();
  return (t[0] ?? "A").toUpperCase();
}

function bytesFromSignMessage(p: PendingRecord): Uint8Array {
  const { message } = p.payload as SignMessagePayload;
  return Uint8Array.from(message);
}

function bytesFromSignTransaction(p: PendingRecord): Uint8Array {
  const { transaction } = p.payload as SignTransactionPayload;
  return Uint8Array.from(transaction);
}

function displayOrigin(origin: string): string {
  return origin === "airwave:wallet" ? "Airwave" : origin;
}

function isSignTxKind(kind: PendingRecord["kind"]): boolean {
  return kind === "signTransaction" || kind === "walletSend";
}

function setSendStatusChrome(on: boolean): void {
  viewSign.classList.toggle("send-status-mode", on);
}

const SEND_STATUS_CHECK_SVG =
  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

function ensureSendStatusCard(): HTMLElement {
  let card = signBody.querySelector<HTMLElement>(".send-status-card");
  if (card) return card;
  signBody.replaceChildren();
  card = document.createElement("div");
  card.className = "card send-status-card";
  const mark = document.createElement("div");
  mark.className = "send-status-mark";
  mark.setAttribute("aria-hidden", "true");
  const title = document.createElement("p");
  title.className = "send-status-title";
  const sigEl = document.createElement("p");
  sigEl.className = "send-status-sig";
  sigEl.hidden = true;
  card.append(mark, title, sigEl);
  signBody.append(card);
  return card;
}

function isSendStatusLocked(): boolean {
  return sendStatusPhase !== "idle";
}

function enterWalletSendConfirming(): void {
  sendStatusPhase = "pending";
  simGen += 1;
  signDock.hidden = true;
  setSendStatusChrome(true);
  document.title = "Airwave — 確認中";
  signPageTitle.textContent = "確認中";
  signError.hidden = true;
  const card = ensureSendStatusCard();
  card.classList.remove("is-confirmed");
  card.classList.add("is-pending");
  const mark = card.querySelector(".send-status-mark")!;
  mark.replaceChildren();
  const spin = document.createElement("span");
  spin.className = "send-status-spin";
  mark.append(spin);
  const title = card.querySelector(".send-status-title")!;
  title.textContent = "確認中";
  const sigEl = card.querySelector<HTMLElement>(".send-status-sig")!;
  sigEl.hidden = true;
  sigEl.textContent = "";
}

function shortSignature(sig: string): string {
  if (sig.length <= 8) return sig;
  return `${sig.slice(0, 4)}…${sig.slice(-4)}`;
}

function restoreWalletSendReviewAfterError(): void {
  sendStatusPhase = "idle";
  setSendStatusChrome(false);
  signDock.hidden = false;
  document.title = "Airwave — 簽署交易";
  signPageTitle.textContent = "簽署交易";
  if (lastSim) {
    renderSignTransactionBody(lastSim, false);
    applyApproveFromSimulation(lastSim);
  } else {
    renderSignTransactionBody(null, true);
    setSignButtons({ reject: false, approve: true, approveLabel: "批准" });
  }
}

function enterWalletSendConfirmedPage(signature?: string): void {
  if (confirmedTimer != null) {
    clearTimeout(confirmedTimer);
    confirmedTimer = null;
  }
  if (expiryTimer != null) {
    window.clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  requestEnded = true;
  sendStatusPhase = "confirmed";
  viewUnlock.hidden = true;
  viewGone.hidden = true;
  viewLegacy.hidden = true;
  viewSign.hidden = false;
  setSendStatusChrome(true);
  signDock.hidden = true;
  signError.hidden = true;
  document.title = "Airwave — 已確認";
  signPageTitle.textContent = "已確認";
  const card = ensureSendStatusCard();
  card.classList.remove("is-pending");
  card.classList.add("is-confirmed");
  const mark = card.querySelector(".send-status-mark")!;
  mark.replaceChildren();
  const check = document.createElement("span");
  check.className = "send-status-check";
  check.innerHTML = SEND_STATUS_CHECK_SVG;
  mark.append(check);
  const title = card.querySelector(".send-status-title")!;
  title.textContent = "已確認";
  const sigEl = card.querySelector<HTMLElement>(".send-status-sig")!;
  if (signature) {
    sigEl.hidden = false;
    sigEl.textContent = shortSignature(signature);
  } else {
    sigEl.hidden = true;
    sigEl.textContent = "";
  }
  confirmedTimer = setTimeout(() => {
    confirmedTimer = null;
    const exit = shellConfig?.callbacks.onWalletSendSuccessExit ?? shellConfig?.callbacks.onClose;
    exit?.();
  }, 500);
}

function hexGrouped(bytes: Uint8Array): string {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.replace(/(.{2})/g, "$1 ").trim();
}

function hexCompact(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isDisplayableUtf8(bytes: Uint8Array): { ok: true; text: string } | { ok: false } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\0")) return { ok: false };
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) return { ok: false };
    }
    if (text.replace(/\s/g, "").length === 0) return { ok: false };
    return { ok: true, text };
  } catch {
    return { ok: false };
  }
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

function setSignButtons(opts: { reject?: boolean; approve?: boolean; approveLabel?: string }): void {
  if (opts.reject != null) signReject.disabled = opts.reject;
  if (opts.approve != null) signApprove.disabled = opts.approve;
  if (opts.approveLabel != null) signApprove.textContent = opts.approveLabel;
}

function clearApproveHold(): void {
  if (approveHoldTimer != null) {
    clearTimeout(approveHoldTimer);
    approveHoldTimer = null;
  }
}

function startApproveHold(): void {
  clearApproveHold();
  setSignButtons({ approve: true });
  approveHoldTimer = setTimeout(() => {
    approveHoldTimer = null;
    if (!pending || resolving) return;
    if (pending.kind === "signMessage" && pending.messageLooksLikeTx) return;
    if (pending.kind === "signTransaction" || pending.kind === "walletSend") {
      applyApproveFromSimulation(lastSim);
      return;
    }
    if (pending.kind === "signMessage" && !pending.messageLooksLikeTx) {
      setSignButtons({ approve: false });
    }
  }, 700);
}

function applyApproveFromSimulation(sim: SimulatePendingTxResult | null): void {
  if (approveHoldTimer != null) return;
  if (resolving) return;
  if (sim?.outcome === "unparseable") {
    setSignButtons({ approve: true });
    return;
  }
  if (cuDirty || cuApplyBusy) {
    setSignButtons({ approve: true });
    return;
  }
  setSignButtons({ approve: false });
}

let requestEnded = false;
let expiryTimer: number | null = null;

function showGone(): void {
  requestEnded = true;
  if (expiryTimer != null) {
    window.clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  hideAll();
  document.title = "Airwave — 請求已過期";
  if (pending?.kind === "signTransaction" || pending?.kind === "walletSend")
    goneLead.textContent = "這筆交易已不能簽署。";
  else if (pending?.kind === "signMessage") goneLead.textContent = "這筆訊息已不能簽署。";
  else goneLead.textContent = "這筆請求已不能繼續。";
  viewGone.hidden = false;
}

function armExpiry(createdAt: number): void {
  if (expiryTimer != null) window.clearTimeout(expiryTimer);
  const remain = createdAt + PENDING_TIMEOUT_MS - Date.now();
  if (remain <= 0) {
    showGone();
    return;
  }
  expiryTimer = window.setTimeout(() => showGone(), remain);
}

function showLegacyConnect(p: PendingRecord): void {
  hideAll();
  document.title = "Airwave — 審批";
  viewLegacy.hidden = false;
  legacyOrigin.textContent = p.origin;
  legacyKind.textContent = "這個網站想連線到你的錢包";
  legacyDetail.hidden = true;
  legacyDetail.textContent = "";
}

function renderSignMessageBody(p: PendingRecord, bytes: Uint8Array): void {
  signBody.innerHTML = "";
  if (p.messageLooksLikeTx) {
    const pEl = document.createElement("p");
    pEl.className = "warn-line";
    pEl.textContent = "不能把交易當成訊息簽署。";
    signBody.appendChild(pEl);
    setSignButtons({ approve: true });
    return;
  }

  const utf8 = isDisplayableUtf8(bytes);
  if (utf8.ok) {
    const card = document.createElement("div");
    card.className = "card";
    const label = document.createElement("p");
    label.className = "card-label";
    label.textContent = "Message payload";
    const pre = document.createElement("p");
    pre.className = "card-text";
    pre.textContent = utf8.text;
    card.append(label, pre);
    signBody.appendChild(card);

    const details = document.createElement("details");
    details.className = "raw-details";
    const summary = document.createElement("summary");
    summary.textContent = "Raw binary payload";
    const inner = document.createElement("div");
    inner.className = "card";
    const head = document.createElement("div");
    head.className = "card-head";
    const rawLabel = document.createElement("span");
    rawLabel.className = "card-label";
    rawLabel.textContent = "Raw binary payload";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "複製";
    copyBtn.addEventListener("click", () => void copyText(hexCompact(bytes)));
    head.append(rawLabel, copyBtn);
    const hexEl = document.createElement("p");
    hexEl.className = "card-hex";
    hexEl.textContent = hexGrouped(bytes);
    inner.append(head, hexEl);
    details.append(summary, inner);
    signBody.appendChild(details);
  } else {
    const card = document.createElement("div");
    card.className = "card";
    const head = document.createElement("div");
    head.className = "card-head";
    const label = document.createElement("span");
    label.className = "card-label";
    label.textContent = "Raw binary payload";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "複製";
    copyBtn.addEventListener("click", () => void copyText(hexCompact(bytes)));
    head.append(label, copyBtn);
    const hexEl = document.createElement("p");
    hexEl.className = "card-hex";
    hexEl.textContent = hexGrouped(bytes);
    card.append(head, hexEl);
    signBody.appendChild(card);
  }

  if (approveHoldTimer == null) {
    setSignButtons({ approve: false });
  }
}

function renderSimulationNotice(sim: SimulatePendingTxResult | null): HTMLElement | null {
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

function renderDeltaCard(sim: SimulatePendingTxResult | null, loading: boolean): HTMLElement {
  const card = document.createElement("div");
  card.className = "card";
  const head = document.createElement("div");
  head.className = "delta-card-head";
  const label = document.createElement("span");
  label.className = "card-label";
  label.textContent = "預期變動";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "icon-btn";
  retry.title = "重新查詢";
  retry.setAttribute("aria-label", "重新查詢");
  retry.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>';
  retry.disabled = simulating || cuDirty || (txCuEditable && !hasCuPair());
  retry.addEventListener("click", () => void runSimulation());
  head.append(label, retry);
  card.append(head);

  if (loading) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = "查詢中";
    card.append(p);
    return card;
  }

  if (!sim || sim.outcome === "unparseable") {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = "無法估計變動";
    card.append(p);
    return card;
  }

  const deltas = sim.deltas;
  if (!deltas || (sim.outcome === "rpc" && deltas.length === 0)) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = "無法估計變動";
    card.append(p);
    return card;
  }

  if (deltas.length === 0) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = "無餘額變動";
    card.append(p);
    return card;
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
    card.append(row);
  }
  return card;
}

function renderFeeCard(sim: SimulatePendingTxResult | null, loading: boolean): HTMLElement {
  const card = document.createElement("div");
  card.className = "card fee-card";

  const titleRow = document.createElement("div");
  titleRow.className = "fee-card-head";
  const title = document.createElement("span");
  title.className = "card-label";
  title.textContent = "交易費";
  const totalEl = document.createElement("span");
  totalEl.className = "fee-total";
  titleRow.append(title, totalEl);
  card.append(titleRow);

  if (loading || (sim == null && txCuEditable)) {
    totalEl.textContent = "估計中";
  } else if (sim?.cuWriteError) {
    totalEl.textContent = sim.cuWriteError;
  } else if (sim?.totalFeeLamports != null) {
    totalEl.textContent = formatSolFromLamports(sim.totalFeeLamports);
  } else {
    totalEl.textContent = "未知";
  }

  const details = document.createElement("details");
  details.className = "fee-details";
  const summary = document.createElement("summary");
  summary.textContent = "簽名費 · CU";
  details.append(summary);

  const inner = document.createElement("div");
  inner.className = "fee-details-inner";

  const sigRow = document.createElement("div");
  sigRow.className = "fee-row";
  sigRow.innerHTML = `<span>簽名費</span><span>${sim?.sigFeeLamports != null ? formatSolFromLamports(sim.sigFeeLamports) : "未知"}</span>`;
  inner.append(sigRow);

  const priRow = document.createElement("div");
  priRow.className = "fee-row";
  const priVal =
    sim?.priorityLamports != null ? formatSolFromLamports(sim.priorityLamports) : "未知";
  priRow.innerHTML = `<span>優先費</span><span>${priVal}</span>`;
  inner.append(priRow);

  const cuGrid = document.createElement("div");
  cuGrid.className = "cu-grid";

  const limitWrap = document.createElement("label");
  limitWrap.className = "cu-field";
  limitWrap.textContent = "CU limit";
  const limitInp = document.createElement("input");
  limitInp.type = "text";
  limitInp.inputMode = "numeric";
  limitInp.autocomplete = "off";
  limitInp.disabled = loading || !txCuEditable || sim?.cuWriteError != null;
  const limitShown = cuDirty
    ? draftLimitStr
    : localCuLimit != null
      ? String(localCuLimit)
      : "";
  limitInp.value = limitShown;
  limitWrap.append(limitInp);

  const priceWrap = document.createElement("label");
  priceWrap.className = "cu-field";
  priceWrap.textContent = "CU price";
  const priceInp = document.createElement("input");
  priceInp.type = "text";
  priceInp.inputMode = "numeric";
  priceInp.autocomplete = "off";
  priceInp.disabled = loading || !txCuEditable || sim?.cuWriteError != null;
  const priceShown = cuDirty
    ? draftPriceStr
    : localCuPrice != null
      ? String(localCuPrice)
      : "";
  priceInp.value = priceShown;
  priceWrap.append(priceInp);

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.className = "cu-apply";

  const paintApply = (): void => {
    const dirtyNow = draftsAreDirty(limitInp.value, priceInp.value);
    if (!limitInp.disabled) {
      cuDirty = dirtyNow && txCuEditable;
      draftLimitStr = limitInp.value;
      draftPriceStr = priceInp.value;
    }
    const limit = parseCuFieldInput(limitInp.value);
    const price = parseCuFieldInput(priceInp.value);
    const ok = cuPairInBounds(limit, price);
    applyBtn.classList.remove("pending", "busy");
    applyBtn.innerHTML = "";
    if (cuApplyBusy) {
      applyBtn.classList.add("busy");
      applyBtn.disabled = true;
      applyBtn.title = "套用中";
      applyBtn.setAttribute("aria-label", "套用中");
      const spin = document.createElement("span");
      spin.className = "cu-apply-spin";
      applyBtn.append(spin);
    } else if (cuDirty && ok) {
      applyBtn.classList.add("pending");
      applyBtn.disabled = false;
      applyBtn.title = "套用 CU";
      applyBtn.setAttribute("aria-label", "套用 CU");
      applyBtn.innerHTML = CU_CHECK_SVG;
    } else if (cuDirty && !ok) {
      applyBtn.classList.add("pending");
      applyBtn.disabled = true;
      applyBtn.title = "無法套用";
      applyBtn.setAttribute("aria-label", "無法套用");
      applyBtn.innerHTML = CU_CHECK_SVG;
    } else {
      applyBtn.disabled = true;
      applyBtn.title = "已套用";
      applyBtn.setAttribute("aria-label", "已套用");
      applyBtn.innerHTML = CU_CHECK_SVG;
    }
    applyApproveFromSimulation(lastSim);
  };

  applyBtn.addEventListener("click", () => {
    if (!txCuEditable || !requestId) return;
    const limit = parseCuFieldInput(limitInp.value);
    const price = parseCuFieldInput(priceInp.value);
    if (!cuPairInBounds(limit, price)) return;
    localCuLimit = limit;
    localCuPrice = price;
    cuDirty = false;
    draftLimitStr = String(limit);
    draftPriceStr = String(price);
    cuApplyBusy = true;
    void runSimulation();
  });

  cuGrid.append(limitWrap, priceWrap, applyBtn);
  inner.append(cuGrid);
  details.append(inner);
  details.open = feeDetailsOpen;
  details.addEventListener("toggle", () => {
    feeDetailsOpen = details.open;
  });
  card.append(details);

  if (txCuEditable) {
    limitInp.addEventListener("input", paintApply);
    priceInp.addEventListener("input", paintApply);
  }
  paintApply();

  return card;
}

function renderTxDetails(sim: SimulatePendingTxResult | null): HTMLElement {
  const details = document.createElement("details");
  details.className = "tx-details";
  details.open = false;
  const summary = document.createElement("summary");
  summary.textContent = "交易明細 · 指令";
  details.append(summary);

  const inner = document.createElement("div");
  inner.className = "card";

  const instructions = sim?.instructions ?? [];
  if (!instructions.length) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = "無法列出指令";
    inner.append(p);
  } else {
    instructions.forEach((ix, i) => {
      const row = document.createElement("div");
      row.className = "ix-row";
      const line = document.createElement("div");
      line.textContent = `${i + 1}. ${ix.program}`;
      row.append(line);
      if (ix.desc) {
        const desc = document.createElement("div");
        desc.className = "ix-desc";
        desc.textContent = ix.desc;
        row.append(desc);
      }
      if (ix.unresolved) {
        const u = document.createElement("div");
        u.className = "ix-desc";
        u.textContent = "帳戶未解析";
        row.append(u);
      }
      const accts = ix.accounts ?? [];
      if (accts.length) {
        const ul = document.createElement("ul");
        ul.className = "ix-accounts";
        for (const a of accts) {
          const li = document.createElement("li");
          li.textContent = a.short;
          if (a.unresolved) li.classList.add("unresolved");
          ul.append(li);
        }
        row.append(ul);
      }
      const dataEl = document.createElement("p");
      dataEl.className = "ix-data";
      dataEl.textContent =
        ix.dataHex != null && ix.dataHex.length > 0 ? ix.dataHex : "（空）";
      row.append(dataEl);
      inner.append(row);
    });
  }

  const payer = sim?.feePayerShort;
  if (payer) {
    const feeLine = document.createElement("p");
    feeLine.className = "fee-line";
    feeLine.textContent = `費用付款人 ${payer}`;
    inner.append(feeLine);
  }

  const rawDetails = document.createElement("details");
  rawDetails.className = "raw-details";
  const rawSum = document.createElement("summary");
  rawSum.textContent = "原始交易";
  const hexEl = document.createElement("p");
  hexEl.className = "card-hex";
  hexEl.textContent = txRawHex;
  rawDetails.append(rawSum, hexEl);
  inner.append(rawDetails);

  details.append(inner);
  return details;
}

function renderSignTransactionBody(sim: SimulatePendingTxResult | null, loading: boolean): void {
  if (isSendStatusLocked()) return;
  signBody.innerHTML = "";
  const notice = renderSimulationNotice(sim);
  if (notice) signBody.append(notice);
  signBody.append(renderDeltaCard(sim, loading));
  signBody.append(renderFeeCard(sim, loading));
  signBody.append(renderTxDetails(sim));
}

function accountMetaForPending(
  accounts: AccountMeta[],
  signAccountId: string | undefined,
): AccountMeta | undefined {
  if (!signAccountId) return undefined;
  return accounts.find((a) => a.id === signAccountId);
}

function exposedPk(meta: AccountMeta): string {
  if (meta.kind === "combined") return meta.mainPubkey;
  return meta.publicKeyBase58;
}

async function runSimulation(): Promise<void> {
  if (!requestId || !pending || !isSignTxKind(pending.kind)) return;
  if (isSendStatusLocked()) return;
  const myGen = ++simGen;
  simulating = true;
  renderSignTransactionBody(lastSim, true);

  const payload: { requestId: string; cuLimit?: number; cuPrice?: number } = { requestId };
  if (hasCuPair()) {
    payload.cuLimit = localCuLimit!;
    payload.cuPrice = localCuPrice!;
  }

  const res = await sendExtensionRequest("ui.simulatePendingTx", payload);
  if (isSendStatusLocked() || requestEnded || myGen !== simGen) return;
  simulating = false;
  cuApplyBusy = false;
  if (!res.ok) {
    if (res.error?.code === "NOT_FOUND") {
      showGone();
      return;
    }
    lastSim = {
      outcome: "rpc",
      reason: res.error?.message ?? "RPC 錯誤",
      sigFeeLamports: null,
      priorityLamports: null,
      totalFeeLamports: null,
    };
  } else {
    const result = res.result as SimulatePendingTxResult;
    const seq = result.seq ?? 0;
    if (seq < lastAcceptedSimSeq) {
      renderSignTransactionBody(lastSim, false);
      applyApproveFromSimulation(lastSim);
      return;
    }
    lastAcceptedSimSeq = seq;
    lastSim = result;
    txCuEditable = result.cuEditable === true;
    if (result.cuLimit != null) localCuLimit = result.cuLimit;
    if (result.cuPrice != null) localCuPrice = result.cuPrice;
  }
  renderSignTransactionBody(lastSim, false);
  applyApproveFromSimulation(lastSim);
}

async function renderSignShell(
  p: PendingRecord,
  holdAfterUnlock: boolean,
  mode: "signMessage" | "signTransaction",
): Promise<void> {
  if (isSendStatusLocked()) return;

  const stateRes = await sendExtensionRequest("wallet.getState", {});
  if (isSendStatusLocked() || requestEnded) return;
  hideAll();
  setSendStatusChrome(false);
  document.title = mode === "signTransaction" ? "Airwave — 簽署交易" : "Airwave — 簽署訊息";
  signPageTitle.textContent = mode === "signTransaction" ? "簽署交易" : "簽署訊息";
  viewSign.hidden = false;
  signDock.hidden = false;
  setSignButtons({ approveLabel: "批准" });

  if (!stateRes.ok) {
    signBody.innerHTML = "";
    const err = document.createElement("p");
    err.className = "warn-line";
    err.textContent = "無法載入帳戶";
    signBody.appendChild(err);
    setSignButtons({ reject: false, approve: true });
    return;
  }

  const state = stateRes.result as {
    accounts: AccountMeta[];
    unlocked: boolean;
  };

  if (!state.unlocked) {
    showUnlockScreen();
    return;
  }

  signOrigin.textContent = displayOrigin(p.origin);
  const meta = accountMetaForPending(state.accounts, p.signAccountId);
  if (!meta) {
    signBody.innerHTML = "";
    const err = document.createElement("p");
    err.className = "warn-line";
    err.textContent = "找不到簽名帳戶";
    signBody.appendChild(err);
    setSignButtons({ reject: false, approve: true });
    return;
  }

  frozenPk = exposedPk(meta);
  signAvatar.textContent = avatarLetter(meta.label);
  signLabel.textContent = meta.label;
  signAddr.textContent = shortPk(frozenPk);

  if (mode === "signMessage") {
    renderSignMessageBody(p, bytesFromSignMessage(p));
  } else {
    txRawHex = hexCompact(bytesFromSignTransaction(p));
    lastSim = null;
    localCuLimit = null;
    localCuPrice = null;
    txCuEditable = false;
    lastAcceptedSimSeq = 0;
    cuDirty = false;
    draftLimitStr = "";
    draftPriceStr = "";
    cuApplyBusy = false;
    feeDetailsOpen = false;
    renderSignTransactionBody(null, true);
    void runSimulation();
  }

  setSignButtons({ reject: false });
  if (holdAfterUnlock) {
    if (mode === "signMessage" && !p.messageLooksLikeTx) {
      startApproveHold();
    } else if (mode === "signTransaction") {
      startApproveHold();
    }
  } else if (mode === "signMessage" && approveHoldTimer == null && !p.messageLooksLikeTx) {
    setSignButtons({ approve: false });
  }
}

function showUnlockScreen(): void {
  hideAll();
  document.title = "Airwave — 審批";
  viewUnlock.hidden = false;
  unlockPassword.value = "";
  unlockError.hidden = true;
  unlockError.textContent = "";
}

async function refreshAfterUnlock(holdAfterUnlock: boolean): Promise<void> {
  if (!pending) return;
  if (pending.kind === "signMessage") {
    await renderSignShell(pending, holdAfterUnlock, "signMessage");
  } else if (isSignTxKind(pending.kind)) {
    await renderSignShell(pending, holdAfterUnlock, "signTransaction");
  }
}

async function loadPending(): Promise<void> {
  const mountedId = requestId;
  if (!mountedId) {
    showGone();
    return;
  }
  const res = await sendExtensionRequest("ui.getPending", { requestId: mountedId });
  if (isSendStatusLocked() || requestId !== mountedId || requestEnded) return;
  if (!res.ok) {
    showGone();
    return;
  }
  pending = res.result as PendingRecord;
  armExpiry(pending.createdAt);
  if (isSendStatusLocked() || requestEnded || requestId !== mountedId) return;

  if (pending.kind === "connect") {
    showLegacyConnect(pending);
    return;
  }

  const stateRes = await sendExtensionRequest("wallet.getState", {});
  if (isSendStatusLocked() || requestId !== mountedId || requestEnded) return;
  if (!stateRes.ok) {
    showGone();
    return;
  }
  const state = stateRes.result as { unlocked: boolean };
  if (!state.unlocked) {
    showUnlockScreen();
    return;
  }

  if (pending.kind === "signMessage") {
    await renderSignShell(pending, false, "signMessage");
  } else if (isSignTxKind(pending.kind)) {
    await renderSignShell(pending, false, "signTransaction");
  }
}

async function resolve(decision: "approve" | "reject"): Promise<void> {
  if (!requestId || resolving) return;
  if (
    decision === "approve" &&
    pending &&
    isSignTxKind(pending.kind) &&
    (cuDirty || cuApplyBusy)
  ) {
    return;
  }
  resolving = true;
  if (pending?.kind === "walletSend" && decision === "approve") {
    enterWalletSendConfirming();
  } else if (pending?.kind === "signMessage" || (pending && isSignTxKind(pending.kind))) {
    setSignButtons({ reject: true, approve: true, approveLabel: "批准中" });
  } else {
    legacyReject.disabled = true;
    legacyApprove.disabled = true;
  }
  const res = await sendExtensionRequest("ui.resolvePending", { requestId, decision });
  if (!res.ok) {
    if (res.error?.code === "NOT_FOUND") {
      showGone();
      return;
    }
    resolving = false;
    if (pending?.kind === "walletSend" && decision === "approve") {
      restoreWalletSendReviewAfterError();
    }
    const msg = res.error?.message ?? "失敗";
    if (pending?.kind === "signMessage" || (pending && isSignTxKind(pending.kind))) {
      signError.hidden = false;
      signError.textContent = msg;
      const approveOff =
        pending.kind === "signMessage" && pending.messageLooksLikeTx === true;
      setSignButtons({
        reject: false,
        approve: approveOff,
        approveLabel: "批准",
      });
      if (pending && isSignTxKind(pending.kind)) applyApproveFromSimulation(lastSim);
    } else {
      legacyError.hidden = false;
      legacyError.textContent = msg;
      legacyReject.disabled = false;
      legacyApprove.disabled = false;
    }
    return;
  }
  if (pending?.kind === "walletSend") {
    resolving = false;
    if (decision === "reject") {
      walletSendRejectExit();
      return;
    }
    const accepted = (res.result as { accepted?: boolean })?.accepted === true;
    if (accepted) {
      enterWalletSendConfirming();
      return;
    }
  }
  closeHost();
}

function wireShellEvents(): void {
  shellEventsAbort?.abort();
  shellEventsAbort = new AbortController();
  const { signal } = shellEventsAbort;

  btnCloseExpired.addEventListener("click", () => closeHost(), { signal });

  btnUnlock.addEventListener(
    "click",
    async () => {
      unlockError.hidden = true;
      const password = unlockPassword.value;
      const res = await sendExtensionRequest("wallet.unlock", { password });
      if (!res.ok) {
        unlockError.hidden = false;
        unlockError.textContent = res.error?.message ?? "密碼錯誤";
        unlockPassword.value = "";
        return;
      }
      unlockPassword.value = "";
      await refreshAfterUnlock(true);
    },
    { signal },
  );

  unlockPassword.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        btnUnlock.click();
      }
    },
    { signal },
  );

  btnCopyPk.addEventListener(
    "click",
    () => {
      if (frozenPk) void copyText(frozenPk);
    },
    { signal },
  );

  signReject.addEventListener("click", () => void resolve("reject"), { signal });
  signApprove.addEventListener("click", () => void resolve("approve"), { signal });
  legacyReject.addEventListener("click", () => void resolve("reject"), { signal });
  legacyApprove.addEventListener("click", () => void resolve("approve"), { signal });

  storageUnlockListener = (changes, area) => {
    if (area !== "session") return;
    if (!(SESSION_UNLOCKED in changes)) return;
    if (!pending || (pending.kind !== "signMessage" && !isSignTxKind(pending.kind))) return;
    if (viewUnlock.hidden) return;
    void refreshAfterUnlock(false);
  };
  chrome.storage.onChanged.addListener(storageUnlockListener);

  runtimeMessageListener = (message) => {
    if (!message || typeof message !== "object") return;
    const rec = message as Record<string, unknown>;
    if (rec.requestId !== requestId) return;
    if (rec.kind === "airwave-wallet-send-progress" && typeof rec.error === "string") {
      resolving = false;
      restoreWalletSendReviewAfterError();
      signError.hidden = false;
      signError.textContent = rec.error;
      setSignButtons({ reject: false, approve: false, approveLabel: "批准" });
      return;
    }
    if (rec.kind === "airwave-wallet-send-settled" && rec.ok === true) {
      if (pending?.kind === "walletSend") {
        const sig = typeof rec.signature === "string" ? rec.signature : undefined;
        enterWalletSendConfirmedPage(sig);
        return;
      }
      closeHost();
    }
  };
  chrome.runtime.onMessage.addListener(runtimeMessageListener);

  hardenWalletPasswordInput(unlockPassword);
}

export function disposeApprovalShell(): void {
  if (shellDomBound) {
    viewSign.classList.remove("send-status-mode");
  }
  shellDomBound = false;
  if (confirmedTimer != null) {
    clearTimeout(confirmedTimer);
    confirmedTimer = null;
  }
  if (expiryTimer != null) {
    window.clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  if (approveHoldTimer != null) {
    clearTimeout(approveHoldTimer);
    approveHoldTimer = null;
  }
  shellEventsAbort?.abort();
  shellEventsAbort = null;
  if (storageUnlockListener) {
    chrome.storage.onChanged.removeListener(storageUnlockListener);
    storageUnlockListener = null;
  }
  if (runtimeMessageListener) {
    chrome.runtime.onMessage.removeListener(runtimeMessageListener);
    runtimeMessageListener = null;
  }
  shellConfig = null;
  requestId = null;
  mountRoot = null;
  pending = null;
  frozenPk = "";
  resolving = false;
  requestEnded = false;
  sendStatusPhase = "idle";
  lastSim = null;
  simulating = false;
  txRawHex = "";
  simGen = 0;
  lastAcceptedSimSeq = 0;
  localCuLimit = null;
  localCuPrice = null;
  txCuEditable = false;
  cuDirty = false;
  draftLimitStr = "";
  draftPriceStr = "";
  cuApplyBusy = false;
  feeDetailsOpen = false;
}

export function mountApprovalShell(config: ApprovalShellConfig, root: ParentNode): () => void {
  disposeApprovalShell();
  shellConfig = config;
  requestId = config.requestId;
  mountRoot = root;
  requestEnded = false;
  sendStatusPhase = "idle";

  viewUnlock = q(root, "view-unlock");
  viewGone = q(root, "view-gone");
  goneLead = q(root, "gone-lead");
  viewLegacy = q(root, "view-legacy");
  viewSign = q(root, "view-sign");
  unlockPassword = q(root, "unlock-password");
  unlockError = q(root, "unlock-error");
  btnUnlock = q(root, "btn-unlock");
  legacyOrigin = q(root, "legacy-origin");
  legacyKind = q(root, "legacy-kind");
  legacyDetail = q(root, "legacy-detail");
  legacyError = q(root, "legacy-error");
  signOrigin = q(root, "sign-origin");
  signBody = q(root, "sign-body");
  signError = q(root, "sign-error");
  signPageTitle = q(root, "sign-page-title");
  signAvatar = q(root, "sign-avatar");
  signLabel = q(root, "sign-label");
  signAddr = q(root, "sign-addr");
  btnCopyPk = q(root, "btn-copy-pk");
  signReject = q(root, "sign-reject");
  signApprove = q(root, "sign-approve");
  signDock = q(root, "sign-dock");
  legacyReject = q(root, "legacy-reject");
  legacyApprove = q(root, "legacy-approve");
  btnCloseExpired = q(root, "btn-close-expired");
  shellDomBound = true;

  hideAll();
  wireShellEvents();
  void loadPending();

  return disposeApprovalShell;
}
