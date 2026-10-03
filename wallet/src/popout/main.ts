import { sendExtensionRequest } from "../shared/ext-api";
import type { PendingRecord, SignMessagePayload } from "../shared/commands";
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

function bytesFromPending(p: PendingRecord): Uint8Array {
  const { message } = p.payload as SignMessagePayload;
  return Uint8Array.from(message);
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

function setSignButtons(opts: { reject?: boolean; approve?: boolean }): void {
  if (opts.reject != null) signReject.disabled = opts.reject;
  if (opts.approve != null) signApprove.disabled = opts.approve;
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
    if (pending && !pending.messageLooksLikeTx && !resolving) {
      setSignButtons({ approve: false });
    }
  }, 700);
}

function showGone(): void {
  hideAll();
  document.title = "Airwave — 審批";
  viewGone.hidden = false;
}

function showLegacy(p: PendingRecord): void {
  hideAll();
  document.title = "Airwave — 審批";
  viewLegacy.hidden = false;
  legacyOrigin.textContent = p.origin;
  if (p.kind === "connect") {
    legacyKind.textContent = "這個網站想連線到你的錢包";
    legacyDetail.hidden = true;
    legacyDetail.textContent = "";
  } else {
    legacyKind.textContent = "簽署交易";
    legacyDetail.hidden = false;
    legacyDetail.textContent = JSON.stringify(p.payload, null, 2);
  }
}

function renderSignBody(p: PendingRecord, bytes: Uint8Array): void {
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

async function renderSignShell(p: PendingRecord, holdAfterUnlock: boolean): Promise<void> {
  hideAll();
  document.title = "Airwave — 簽署訊息";
  viewSign.hidden = false;

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

  const bytes = bytesFromPending(p);
  renderSignBody(p, bytes);
  setSignButtons({ reject: false });
  if (holdAfterUnlock && !p.messageLooksLikeTx) {
    startApproveHold();
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
  if (!pending || pending.kind !== "signMessage") return;
  await renderSignShell(pending, holdAfterUnlock);
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

  if (pending.kind !== "signMessage") {
    showLegacy(pending);
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
  await renderSignShell(pending, false);
}

async function resolve(decision: "approve" | "reject"): Promise<void> {
  if (!requestId || resolving) return;
  resolving = true;
  if (pending?.kind === "signMessage") {
    setSignButtons({ reject: true, approve: true });
  } else {
    legacyReject.disabled = true;
    legacyApprove.disabled = true;
  }
  const res = await sendExtensionRequest("ui.resolvePending", { requestId, decision });
  if (!res.ok) {
    resolving = false;
    const msg = res.error?.message ?? "失敗";
    if (pending?.kind === "signMessage") {
      signError.hidden = false;
      signError.textContent = msg;
      setSignButtons({ reject: false, approve: pending.messageLooksLikeTx === true });
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
  if (!pending || pending.kind !== "signMessage") return;
  if (viewUnlock.hidden) return;
  void refreshAfterUnlock(false);
});

hardenWalletPasswordInput(unlockPassword);
void loadPending();

window.addEventListener("beforeunload", () => {
  unlockPassword.value = "";
});
