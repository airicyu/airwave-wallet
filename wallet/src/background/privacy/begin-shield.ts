/**
 * Builds one Shield deposit and opens the existing wallet approval pending.
 * Does not request a proof or sign the transaction.
 */
import { address } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { privacyClient } from "./client";
import { buildDepositTransaction, isWalletRegistered } from "@heliuslabs/spr/wallet";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { NATIVE_SOL_ID } from "../../shared/home";
import { SOL_MINT } from "../../shared/privacy/sol-mint";
import { parseAmountUiToRaw } from "../../shared/send";
import { respond } from "../messaging";
import { getHomeTokensForOwners } from "../home-tokens";
import { shieldedKeysFor } from "./keys";
import { queueWalletSend } from "./queue-send";
import { privacyAsset, privacyFail, privacySession } from "./ready";

export async function handleBeginShield(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const body = req.payload as { mint?: string; amountUi?: string };
  const mint = body.mint?.trim() ?? "";
  const amountUi = body.amountUi?.trim() ?? "";
  if (!mint || !amountUi) return privacyFail(req, "INVALID_PAYLOAD");
  const ready = await privacySession(req);
  if ("kind" in ready) return ready;
  const asset = privacyAsset(mint);
  const { rows } = await getHomeTokensForOwners([ready.target.address], ready.settings);
  const row = rows.find((item) => item.id === (asset === SOL_MINT ? NATIVE_SOL_ID : asset));
  if (!row) return privacyFail(req, "INVALID_PAYLOAD");
  const amount = parseAmountUiToRaw(amountUi, row.decimals);
  if (amount == null || amount <= 0n) return privacyFail(req, "INVALID_PAYLOAD");
  try {
    const client = privacyClient(ready.rpcUrl, ready.settings.cluster);
    const owner = address(ready.target.address);
    if (!(await isWalletRegistered({ rpc: client, owner }))) return privacyFail(req, "NOT_REGISTERED");
    const keys = await shieldedKeysFor(ready.target.accountId);
    const spl = asset === SOL_MINT ? null : await findAssociatedTokenPda({ mint: address(asset), owner, tokenProgram: TOKEN_PROGRAM_ADDRESS });
    const tx = await buildDepositTransaction({
      client,
      feePayer: owner,
      depositor: owner,
      recipient: keys.address(),
      asset: address(asset),
      amount,
      splTokenAccount: spl?.[0],
      splTokenProgram: spl ? TOKEN_PROGRAM_ADDRESS : undefined,
    });
    const queued = queueWalletSend(req, sender, ready.target.accountId, tx);
    if ("kind" in queued) return queued;
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { requestId: queued.requestId },
    });
  } catch {
    return privacyFail(req, "PRIVACY_SHIELD_FAILED");
  }
}
