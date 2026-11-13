/**
 * Checks a recipient's registry record and builds one private transfer with its proof.
 * Confirm sends the selected note ids. This file spends those notes and does not choose another set.
 */
import { address } from "@solana/kit";
import { privacyClient } from "./client";
import { Wallet } from "@heliuslabs/spr/transaction";
import { fetchUserRecord, syncWallet } from "@heliuslabs/spr/wallet";
import { parsePublicKeyBase58 } from "../../shared/accounts";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { NATIVE_SOL_ID } from "../../shared/home";
import { SOL_MINT } from "../../shared/privacy/sol-mint";
import { parseAmountUiToRaw } from "../../shared/send";
import { respond } from "../messaging";
import { getHomeTokensForOwners } from "../home-tokens";
import { walletKeysFor } from "./keys";
import { queueWalletSend } from "./queue-send";
import { privacyAsset, privacyFail, privacySession } from "./ready";
import { buildSelectedSpend } from "./spend-notes";

export async function handlePrivacyRecipient(req: ExtensionRequest): Promise<ExtensionResponse> {
  const owner = (req.payload as { address?: string }).address?.trim() ?? "";
  if (!parsePublicKeyBase58(owner)) return privacyFail(req, "INVALID_ADDRESS");
  const ready = await privacySession(req);
  if ("kind" in ready) return ready;
  const client = privacyClient(ready.rpcUrl, ready.settings.cluster);
  const record = await fetchUserRecord({ rpc: client, owner: address(owner) });
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { registered: record != null },
  });
}

export async function handleBeginPrivateSend(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const body = req.payload as { mint?: string; amountUi?: string; recipient?: string; ids?: string[] };
  const mint = body.mint?.trim() ?? "";
  const amountUi = body.amountUi?.trim() ?? "";
  const recipient = body.recipient?.trim() ?? "";
  const ids = (body.ids ?? []).filter((id) => typeof id === "string" && id.length > 0);
  if (!mint || !amountUi || !parsePublicKeyBase58(recipient) || ids.length === 0) return privacyFail(req, "INVALID_PAYLOAD");
  if (ids.length > 40) return privacyFail(req, "TOO_MANY_NOTES");
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
    const record = await fetchUserRecord({ rpc: client, owner: address(recipient) });
    if (!record) return privacyFail(req, "RECIPIENT_UNREGISTERED");
    const keys = await walletKeysFor(ready.target.accountId, client.proofService);
    const wallet = new Wallet({ identity: keys.address() });
    await syncWallet({ wallet, keys, client });
    const tx = await buildSelectedSpend({
      client,
      wallet,
      keys,
      feePayer: ready.target.address,
      asset,
      amount,
      ids,
      kind: "transfer",
      recipient,
    });
    const queued = queueWalletSend(req, sender, ready.target.accountId, tx);
    if ("kind" in queued) return queued;
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { requestId: queued.requestId },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TOO_MANY_NOTES" || code === "UNKNOWN_NOTE" || code === "INSUFFICIENT_NOTES" || code === "INVALID_NOTES" || code === "RECIPIENT_UNREGISTERED") {
      return privacyFail(req, code);
    }
    return privacyFail(req, "PRIVACY_SEND_FAILED");
  }
}
