import { parsePublicKeyBase58 } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import { apiErrorMessage, type UiLocale } from "../../shared/ui-i18n";
import { amountUiToRaw, formatRawToAmountUi, solReserveLamports } from "../../shared/wallet-send-amount";
import { NATIVE_SOL_ID, type HomeTokenRow } from "../home/home-tokens";
import type { State } from "../types";

export function findTokenRowById(rows: HomeTokenRow[], tokenId: string): HomeTokenRow | undefined {
  return rows.find((r) => r.id === tokenId);
}

export function tokenBalanceRaw(row: HomeTokenRow): bigint | null {
  return amountUiToRaw(row.uiAmountLabel.replace(/,/g, ""), row.decimals);
}

export function sendFormValid(args: {
  state: State;
  rows: HomeTokenRow[];
  detailTokenId: string | null;
  amount: string;
  recipient: string;
}): boolean {
  const row = args.detailTokenId ? findTokenRowById(args.rows, args.detailTokenId) : undefined;
  if (!row) return false;
  const amount = args.amount.trim();
  const recipient = args.recipient.trim();
  if (!amount || !recipient) return false;
  if (parsePublicKeyBase58(recipient) == null) return false;
  if (!/^\d+(\.\d+)?$/.test(amount)) return false;
  const frac = amount.split(".")[1] ?? "";
  if (frac.length > row.decimals) return false;
  if (row.id === NATIVE_SOL_ID) {
    const reserve = solReserveLamports(args.state.settings.defaultCuPrice);
    const raw = tokenBalanceRaw(row);
    if (raw == null || raw <= reserve) return false;
  }
  return true;
}

export function halfSendAmount(row: HomeTokenRow): string | null {
  const raw = tokenBalanceRaw(row);
  if (raw == null) return null;
  const half = raw / 2n;
  if (half === 0n) return null;
  return formatRawToAmountUi(half, row.decimals);
}

export function maxSendAmount(row: HomeTokenRow, state: State): string | null {
  const raw = tokenBalanceRaw(row);
  if (raw == null) return null;
  if (row.id === NATIVE_SOL_ID) {
    const reserve = solReserveLamports(state.settings.defaultCuPrice);
    if (raw <= reserve) return null;
    return formatRawToAmountUi(raw - reserve, row.decimals);
  }
  return formatRawToAmountUi(raw, row.decimals);
}

export async function beginTokenSend(args: {
  tokenId: string;
  amountUi: string;
  recipient: string;
  locale: UiLocale;
}): Promise<{ ok: true; requestId: string } | { ok: false; error: string }> {
  const res = await sendExtensionRequest("wallet.beginSend", {
    tokenId: args.tokenId,
    amountUi: args.amountUi,
    recipient: args.recipient,
  });
  if (!res.ok) {
    return { ok: false, error: apiErrorMessage(args.locale, res.error, "error.sendBuildFailed") };
  }
  const { requestId } = res.result as { requestId: string };
  return { ok: true, requestId };
}
