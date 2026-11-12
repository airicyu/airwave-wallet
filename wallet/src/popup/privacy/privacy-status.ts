/**
 * One read of wallet.privacyStatus for the private-balance screens.
 * Callers decide whether they need the registration kind, the rows, or one mint.
 * This file does not register a wallet or build a transaction.
 *
 * A native SOL id matches the shielded SOL mint. Other mints match exactly.
 */
import { NATIVE_SOL_ID } from "../../shared/home";
import { SOL_MINT } from "@heliuslabs/spr/transaction";
import { sendExtensionRequest } from "../../shared/protocol";

export type PrivacyNote = { id: string; amount: string; amountRaw: string; mergeable?: boolean };

export type PrivacyRow = {
  mint: string;
  amount: string;
  amountRaw?: string;
  notes: PrivacyNote[];
  usdLabel?: string;
};

export type PrivacyStatus =
  | { kind: "unavailable" }
  | { kind: "unregistered"; canPayFee: boolean }
  | { kind: "registered"; rows: PrivacyRow[] }
  | { kind: "error" };

export async function loadPrivacyStatus(): Promise<PrivacyStatus> {
  const res = await sendExtensionRequest("wallet.privacyStatus", {});
  if (!res.ok) return { kind: "error" };
  const body = res.result as { kind?: string; canPayFee?: boolean; rows?: PrivacyRow[] };
  if (body.kind === "unavailable") return { kind: "unavailable" };
  if (body.kind === "unregistered") return { kind: "unregistered", canPayFee: body.canPayFee === true };
  if (body.kind === "registered") return { kind: "registered", rows: body.rows ?? [] };
  return { kind: "error" };
}

export function privacyRowForMint(rows: PrivacyRow[], mint: string): PrivacyRow | undefined {
  return rows.find((item) => item.mint === mint || (mint === NATIVE_SOL_ID && item.mint === SOL_MINT));
}
