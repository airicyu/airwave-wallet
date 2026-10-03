import { sendExtensionRequest } from "../shared/ext-api";
import type { PendingRecord, SignMessagePayload, SignTransactionPayload } from "../shared/commands";
import type { SimulatePendingTxResult } from "../shared/simulate-pending-tx-types";
import type { AccountMeta } from "../shared/storage-keys";
import { SESSION_UNLOCKED } from "../shared/storage-keys";

const params = new URLSearchParams(location.search);
const requestId = params.get("requestId");

const viewUnlock = document.getElementById("view-unlock")!;
const viewGone = document.getElementById("view-gone")!;
const viewLegacy = document.getElementById("view-legacy")!;
const viewSign = document.getElementById("view-sign")!;

const unlockPassword = document.getElementById("unlock-password") as HTMLInputElement;
const unlockError = document.getElementById("unlock-error")!;
const btnUnlock = document.getElementById("btn-unlock")!;

const legacyOrigin = document.getElementById("legacy-origin")!;
const legacyKind = document.getElementById("legacy-kind")!;
const legacyDetail = document.getElementById("legacy-detail")!;
const legacyError = document.getElementById("legacy-error")!;

const signOrigin = document.getElementById("sign-origin")!;
const signBody = document.getElementById("sign-body")!;
const signError = document.getElementById("sign-error")!;
const signPageTitle = document.getElementById("sign-page-title")!;
const signAvatar = document.getElementById("sign-avatar")!;
const signLabel = document.getElementById("sign-label")!;
const signAddr = document.getElementById("sign-addr")!;
const btnCopyPk = document.getElementById("btn-copy-pk")!;
const signReject = document.getElementById("sign-reject") as HTMLButtonElement;
const signApprove = document.getElementById("sign-approve") as HTMLButtonElement;
const legacyReject = document.getElementById("legacy-reject") as HTMLButtonElement;
const legacyApprove = document.getElementById("legacy-approve") as HTMLButtonElement;

let pending: PendingRecord | null = null;
let frozenPk = "";
let resolving = false;
let approveHoldTimer: ReturnType<typeof setTimeout> | null = null;
let lastSim: SimulatePendingTxResult | null = null;
let simulating = false;
let txRawHex = "";

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
    if (pending.kind === "signTransaction") {
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
  setSignButtons({ approve: false });
}

function showGone(): void {
  hideAll();
  document.title = "Airwave — 審批";
  viewGone.hidden = false;
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

function renderTxDetails(sim: SimulatePendingTxResult | null): HTMLElement {
  const details = document.createElement("details");
  details.className = "tx-details";
  details.open = false;
  const summary = document.createElement("summary");
  summary.textContent = "交易明細";
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
      inner.append(row);
    });
  }

  const feeLine = document.createElement("p");
  feeLine.className = "fee-line";
  const payer = sim?.feePayerShort;
  const fee = sim?.feeLamports;
  if (payer && fee != null) {
    feeLine.textContent = `費用付款人 ${payer} · 預估手續費 ${(fee / 1e9).toString()} SOL`;
  } else if (payer) {
    feeLine.textContent = `費用付款人 ${payer} · 預估手續費 未知`;
  } else {
    feeLine.textContent = "預估手續費 未知";
  }
  inner.append(feeLine);

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
  signBody.innerHTML = "";
  const notice = renderSimulationNotice(sim);
  if (notice) signBody.append(notice);
  signBody.append(renderDeltaCard(sim, loading));
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
  if (!requestId || !pending || pending.kind !== "signTransaction") return;
  simulating = true;
  renderSignTransactionBody(lastSim, true);
  const res = await sendExtensionRequest("ui.simulatePendingTx", { requestId });
  simulating = false;
  if (!res.ok) {
    lastSim = { outcome: "rpc", reason: res.error?.message ?? "RPC 錯誤", feeLamports: null };
  } else {
    lastSim = res.result as SimulatePendingTxResult;
  }
  renderSignTransactionBody(lastSim, false);
  applyApproveFromSimulation(lastSim);
}

async function renderSignShell(
  p: PendingRecord,
  holdAfterUnlock: boolean,
  mode: "signMessage" | "signTransaction",
): Promise<void> {
  hideAll();
  document.title = mode === "signTransaction" ? "Airwave — 簽署交易" : "Airwave — 簽署訊息";
  signPageTitle.textContent = mode === "signTransaction" ? "簽署交易" : "簽署訊息";
  viewSign.hidden = false;
  setSignButtons({ approveLabel: "批准" });

  const stateRes = await sendExtensionRequest("wallet.getState", {});
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

  signOrigin.textContent = p.origin;
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
  } else if (pending.kind === "signTransaction") {
    await renderSignShell(pending, holdAfterUnlock, "signTransaction");
  }
}

async function loadPending(): Promise<void> {
  if (!requestId) {
    showGone();
    return;
  }
  const res = await sendExtensionRequest("ui.getPending", { requestId });
  if (!res.ok) {
    showGone();
    return;
  }
  pending = res.result as PendingRecord;

  if (pending.kind === "connect") {
    showLegacyConnect(pending);
    return;
  }

  const stateRes = await sendExtensionRequest("wallet.getState", {});
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
  } else if (pending.kind === "signTransaction") {
    await renderSignShell(pending, false, "signTransaction");
  }
}

async function resolve(decision: "approve" | "reject"): Promise<void> {
  if (!requestId || resolving) return;
  resolving = true;
  if (pending?.kind === "signMessage" || pending?.kind === "signTransaction") {
    setSignButtons({ reject: true, approve: true, approveLabel: "批准中" });
  } else {
    legacyReject.disabled = true;
    legacyApprove.disabled = true;
  }
  const res = await sendExtensionRequest("ui.resolvePending", { requestId, decision });
  if (!res.ok) {
    resolving = false;
    const msg = res.error?.message ?? "失敗";
    if (pending?.kind === "signMessage" || pending?.kind === "signTransaction") {
      signError.hidden = false;
      signError.textContent = msg;
      const approveOff =
        pending.kind === "signMessage" && pending.messageLooksLikeTx === true;
      setSignButtons({
        reject: false,
        approve: approveOff,
        approveLabel: "批准",
      });
      if (pending.kind === "signTransaction") applyApproveFromSimulation(lastSim);
    } else {
      legacyError.hidden = false;
      legacyError.textContent = msg;
      legacyReject.disabled = false;
      legacyApprove.disabled = false;
    }
    return;
  }
  window.close();
}

btnUnlock.addEventListener("click", async () => {
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
});

unlockPassword.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    ev.preventDefault();
    btnUnlock.click();
  }
});

btnCopyPk.addEventListener("click", () => {
  if (frozenPk) void copyText(frozenPk);
});

signReject.addEventListener("click", () => void resolve("reject"));
signApprove.addEventListener("click", () => void resolve("approve"));
legacyReject.addEventListener("click", () => void resolve("reject"));
legacyApprove.addEventListener("click", () => void resolve("approve"));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "session") return;
  if (!(SESSION_UNLOCKED in changes)) return;
  if (!pending || (pending.kind !== "signMessage" && pending.kind !== "signTransaction")) return;
  if (viewUnlock.hidden) return;
  void refreshAfterUnlock(false);
});

hardenWalletPasswordInput(unlockPassword);
void loadPending();

window.addEventListener("beforeunload", () => {
  unlockPassword.value = "";
});
