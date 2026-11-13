/**
 * One read of wallet.privacyStatus for the private-balance screens.
 * Callers decide whether they need the registration kind, the rows, or one mint.
 * This file does not register a wallet or build a transaction.
 *
 * A native SOL id matches the shielded SOL mint. Other mints match exactly.
 */
import { parsePublicKeyBase58 } from "../../shared/accounts";
import { NATIVE_SOL_ID } from "../../shared/home";
import { SOL_MINT } from "../../shared/privacy/sol-mint";
import { sendExtensionRequest } from "../../shared/protocol";

export { SOL_MINT };

export type PrivacyNote = { id: string; amount: string; amountRaw: string; mergeable?: boolean };

export type PrivacyMember = {
  pubkey: string;
  amount: string;
  amountRaw: string;
  percent: number;
  notes: PrivacyNote[];
};

export type PrivacyRow = {
  mint: string;
  amount: string;
  amountRaw?: string;
  decimals?: number;
  notes: PrivacyNote[];
  members?: PrivacyMember[];
  usdLabel?: string;
};

export type PrivacyStatus =
  | { kind: "unavailable"; reason?: string }
  | { kind: "unregistered"; canPayFee: boolean }
  | { kind: "registered"; rows: PrivacyRow[] }
  | { kind: "error"; code?: string };

export async function loadPrivacyStatus(): Promise<PrivacyStatus> {
  const res = await sendExtensionRequest("wallet.privacyStatus", {});
  if (!res.ok) return { kind: "error", code: res.error?.code };
  const body = res.result as {
    kind?: string;
    canPayFee?: boolean;
    rows?: PrivacyRow[];
    reason?: string;
  };
  if (body.kind === "unavailable") return { kind: "unavailable", reason: body.reason };
  if (body.kind === "unregistered") return { kind: "unregistered", canPayFee: body.canPayFee === true };
  if (body.kind === "registered") return { kind: "registered", rows: body.rows ?? [] };
  return { kind: "error" };
}

export function privacyRowForMint(rows: PrivacyRow[], mint: string): PrivacyRow | undefined {
  return rows.find((item) => item.mint === mint || (mint === NATIVE_SOL_ID && item.mint === SOL_MINT));
}

function samePubkey(left: string, right: string): boolean {
  const a = parsePublicKeyBase58(left) ?? left;
  const b = parsePublicKeyBase58(right) ?? right;
  return a === b;
}

/** Combined private detail is the main wallet slice only. */
export function privacyMainDetailRow(row: PrivacyRow, mainPubkey: string): PrivacyRow {
  const member = row.members?.find((item) => samePubkey(item.pubkey, mainPubkey));
  if (!member) {
    return {
      mint: row.mint,
      amount: "0",
      amountRaw: "0",
      decimals: row.decimals,
      notes: [],
      usdLabel: "",
    };
  }
  return {
    mint: row.mint,
    amount: member.amount,
    amountRaw: member.amountRaw,
    decimals: row.decimals,
    notes: member.notes,
    usdLabel: "",
  };
}
