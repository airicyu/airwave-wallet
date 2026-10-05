import { parsePublicKeyBase58 } from "../shared/accounts";
import { sendExtensionRequest } from "../shared/ext-api";
import { solReserveLamports, amountUiToRaw, formatRawToAmountUi } from "../shared/wallet-send-amount";
import { NATIVE_SOL_ID, type HomeTokenRow } from "./home-tokens";
import { el, elSendAmount, elSendBalanceValue, elSendFormError, elSendHalf, elSendMax, elSendRecipient } from "./dom";
import { navigateTo, session, syncShellDock } from "./session";
import type { State } from "./types";

export function findTokenRowById(tokenId: string): HomeTokenRow | undefined {
  return session.lastSuccessfulTokenRows.find((r) => r.id === tokenId);
}

export function clearSendForm(): void {
  elSendAmount.value = "";
  elSendRecipient.value = "";
  elSendFormError.hidden = true;
  elSendFormError.textContent = "";
}

function tokenBalanceRaw(row: HomeTokenRow): bigint | null {
  return amountUiToRaw(row.uiAmountLabel.replace(/,/g, ""), row.decimals);
}

export function syncSendQuickFill(state: State): void {
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
  if (!row || !state.unlocked) {
    elSendBalanceValue.textContent = "—";
    elSendHalf.disabled = true;
    elSendMax.disabled = true;
    return;
  }
  elSendBalanceValue.textContent = `${row.uiAmountLabel} ${row.symbol}`;
  const raw = tokenBalanceRaw(row);
  if (raw == null || raw === 0n) {
    elSendHalf.disabled = true;
    elSendMax.disabled = true;
    return;
  }
  elSendHalf.disabled = raw / 2n === 0n;
  if (row.id === NATIVE_SOL_ID) {
    const reserve = solReserveLamports(state.settings.defaultCuPrice);
    elSendMax.disabled = raw <= reserve;
    return;
  }
  elSendMax.disabled = false;
}

export function renderTokenSendScreen(state: State): void {
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
  el.subpageTitle.textContent = row ? `送出 ${row.symbol}` : "送出";
  syncSendQuickFill(state);
}

export function sendFormValid(state: State): boolean {
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
  if (!row) return false;
  const amount = elSendAmount.value.trim();
  const recipient = elSendRecipient.value.trim();
  if (!amount || !recipient) return false;
  if (parsePublicKeyBase58(recipient) == null) return false;
  if (!/^\d+(\.\d+)?$/.test(amount)) return false;
  const frac = amount.split(".")[1] ?? "";
  if (frac.length > row.decimals) return false;
  if (row.id === NATIVE_SOL_ID) {
    const reserve = solReserveLamports(state.settings.defaultCuPrice);
    const raw = tokenBalanceRaw(row);
    if (raw == null || raw <= reserve) return false;
  }
  return true;
}

export function applyHalfSendAmount(): void {
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
  if (!row) return;
  const raw = tokenBalanceRaw(row);
  if (raw == null) return;
  const half = raw / 2n;
  if (half === 0n) return;
  elSendAmount.value = formatRawToAmountUi(half, row.decimals);
}

export function applyMaxSendAmount(state: State): void {
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
  if (!row) return;
  const raw = tokenBalanceRaw(row);
  if (raw == null) return;
  if (row.id === NATIVE_SOL_ID) {
    const reserve = solReserveLamports(state.settings.defaultCuPrice);
    if (raw <= reserve) return;
    elSendAmount.value = formatRawToAmountUi(raw - reserve, row.decimals);
    return;
  }
  elSendAmount.value = formatRawToAmountUi(raw, row.decimals);
}

export async function submitTokenSend(): Promise<void> {
  if (!session.lastState || !session.detailTokenId) return;
  elSendFormError.hidden = true;
  if (!sendFormValid(session.lastState)) return;
  const res = await sendExtensionRequest("wallet.beginSend", {
    tokenId: session.detailTokenId,
    amountUi: elSendAmount.value.trim(),
    recipient: elSendRecipient.value.trim(),
  });
  if (!res.ok) {
    elSendFormError.hidden = false;
    elSendFormError.textContent = res.error?.message ?? "無法建立交易";
    return;
  }
  const { requestId } = res.result as { requestId: string };
  session.activeWalletSendRequestId = requestId;
  navigateTo("send-approval");
}

export function bindSendFormEvents(): void {
  elSendAmount.addEventListener("input", () => syncShellDock());
  elSendRecipient.addEventListener("input", () => syncShellDock());
  elSendHalf.addEventListener("click", () => {
    applyHalfSendAmount();
    syncShellDock();
  });
  elSendMax.addEventListener("click", () => {
    if (session.lastState) applyMaxSendAmount(session.lastState);
    syncShellDock();
  });
}
