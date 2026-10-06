import { parsePublicKeyBase58 } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import { amountUiToRaw, formatRawToAmountUi, solReserveLamports } from "../../shared/wallet-send-amount";
import { NATIVE_SOL_ID, type HomeTokenRow } from "../home/home-tokens";
import { bumpUi, navigateTo, session } from "../lib/session";
import type { State } from "../types";

export function findTokenRowById(tokenId: string): HomeTokenRow | undefined {
  return session.lastSuccessfulTokenRows.find((r) => r.id === tokenId);
}

export function tokenBalanceRaw(row: HomeTokenRow): bigint | null {
  return amountUiToRaw(row.uiAmountLabel.replace(/,/g, ""), row.decimals);
}

export function sendFormValid(state: State): boolean {
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
  if (!row) return false;
  const amount = session.sendAmount.trim();
  const recipient = session.sendRecipient.trim();
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
  session.sendAmount = formatRawToAmountUi(half, row.decimals);
  bumpUi();
}

export function applyMaxSendAmount(state: State): void {
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
  if (!row) return;
  const raw = tokenBalanceRaw(row);
  if (raw == null) return;
  if (row.id === NATIVE_SOL_ID) {
    const reserve = solReserveLamports(state.settings.defaultCuPrice);
    if (raw <= reserve) return;
    session.sendAmount = formatRawToAmountUi(raw - reserve, row.decimals);
    bumpUi();
    return;
  }
  session.sendAmount = formatRawToAmountUi(raw, row.decimals);
  bumpUi();
}

export async function submitTokenSend(): Promise<void> {
  if (!session.lastState || !session.detailTokenId) return;
  session.sendFormError = "";
  bumpUi();
  if (!sendFormValid(session.lastState)) return;
  const res = await sendExtensionRequest("wallet.beginSend", {
    tokenId: session.detailTokenId,
    amountUi: session.sendAmount.trim(),
    recipient: session.sendRecipient.trim(),
  });
  if (!res.ok) {
    session.sendFormError = res.error?.message ?? "無法建立交易";
    bumpUi();
    return;
  }
  const { requestId } = res.result as { requestId: string };
  session.activeWalletSendRequestId = requestId;
  navigateTo("send-approval");
}
