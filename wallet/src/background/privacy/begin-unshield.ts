/**
 * Builds one Unshield withdrawal back to the signing address and opens approval.
 * Does not ask for a recipient.
 */
import { address } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { privacyClient } from "./client";
import { SOL_MINT, Wallet } from "@heliuslabs/spr/transaction";
import { buildWithdrawalTransaction, syncWallet } from "@heliuslabs/spr/wallet";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { NATIVE_SOL_ID } from "../../shared/home";
import { parseAmountUiToRaw } from "../../shared/send";
import { respond } from "../messaging";
import { getHomeTokensForOwners } from "../home-tokens";
import { walletKeysFor } from "./keys";
import { queueWalletSend } from "./queue-send";
import { privacyAsset, privacyFail, privacySession } from "./ready";

export async function handleBeginUnshield(
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
  const decimals = asset === SOL_MINT ? 9 : row?.decimals;
  if (decimals == null) return privacyFail(req, "INVALID_PAYLOAD");
  const amount = parseAmountUiToRaw(amountUi, decimals);
  if (amount == null || amount <= 0n) return privacyFail(req, "INVALID_PAYLOAD");
  try {
    const client = privacyClient(ready.rpcUrl, ready.settings.cluster);
    const keys = await walletKeysFor(ready.target.accountId, client.proofService);
    const wallet = new Wallet({ identity: keys.address() });
    await syncWallet({ wallet, keys, client });
    const owner = address(ready.target.address);
    const tx = await buildWithdrawalTransaction({
      client,
      wallet,
      keys,
      feePayer: owner,
      recipient: owner,
      asset: address(asset),
      amount,
      splTokenProgram: asset === SOL_MINT ? undefined : TOKEN_PROGRAM_ADDRESS,
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
    return privacyFail(req, "PRIVACY_UNSHIELD_FAILED");
  }
}
