/**
 * Checks a recipient's registry record and builds one private transfer with its proof.
 * Does not turn a missing record into a public withdrawal.
 */
import { address } from "@solana/kit";
import { privacyClient } from "./client";
import { SOL_MINT, Wallet } from "@heliuslabs/spr/transaction";
import { buildTransferTransaction, fetchUserRecord, syncWallet } from "@heliuslabs/spr/wallet";
import { parsePublicKeyBase58 } from "../../shared/accounts";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { NATIVE_SOL_ID } from "../../shared/home";
import { parseAmountUiToRaw } from "../../shared/send";
import { encodeWireTransaction } from "../../shared/tx";
import { walletShellSurfaceFromHref } from "../../shared/shell";
import { respond } from "../messaging";
import { addPending, pendingInsertError, schedulePendingTimeout } from "../pending";
import { pendingTimeoutHandlers } from "../send/wallet-send-broadcast";
import { getHomeTokensForOwners } from "../home-tokens";
import { readAccounts, readActiveAccountId, readSettings } from "../storage";
import { getLoadedAccount, isUnlocked } from "../session";
import { walletKeysFor } from "./keys";
import { privacyRpcUrl, signingTarget } from "./target";

function fail(req: ExtensionRequest, code: string): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code, message: code },
  });
}

async function context(req: ExtensionRequest) {
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  const accounts = await readAccounts();
  const target = signingTarget(accounts, await readActiveAccountId());
  if (!rpcUrl || target === "watch" || target === "missing") return fail(req, "PRIVACY_UNAVAILABLE");
  const loaded = getLoadedAccount(target.accountId);
  if (!isUnlocked() || !loaded) return fail(req, "WALLET_LOCKED");
  return { settings, rpcUrl, target };
}

export async function handlePrivacyRecipient(req: ExtensionRequest): Promise<ExtensionResponse> {
  const owner = (req.payload as { address?: string }).address?.trim() ?? "";
  if (!parsePublicKeyBase58(owner)) return fail(req, "INVALID_ADDRESS");
  const ready = await context(req);
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
  const body = req.payload as { mint?: string; amountUi?: string; recipient?: string };
  const mint = body.mint?.trim() ?? "";
  const amountUi = body.amountUi?.trim() ?? "";
  const recipient = body.recipient?.trim() ?? "";
  if (!mint || !amountUi || !parsePublicKeyBase58(recipient)) return fail(req, "INVALID_PAYLOAD");
  const ready = await context(req);
  if ("kind" in ready) return ready;
  const asset = mint === NATIVE_SOL_ID || mint === SOL_MINT ? SOL_MINT : mint;
  const { rows } = await getHomeTokensForOwners([ready.target.address], ready.settings);
  const row = rows.find((item) => item.id === (asset === SOL_MINT ? NATIVE_SOL_ID : asset));
  const decimals = asset === SOL_MINT ? 9 : row?.decimals;
  if (decimals == null) return fail(req, "INVALID_PAYLOAD");
  const amount = parseAmountUiToRaw(amountUi, decimals);
  if (amount == null || amount <= 0n) return fail(req, "INVALID_PAYLOAD");
  try {
    const client = privacyClient(ready.rpcUrl, ready.settings.cluster);
    const record = await fetchUserRecord({ rpc: client, owner: address(recipient) });
    if (!record) return fail(req, "RECIPIENT_UNREGISTERED");
    const keys = await walletKeysFor(ready.target.accountId, client.proofService);
    const wallet = new Wallet({ identity: keys.address() });
    await syncWallet({ wallet, keys, client });
    const tx = await buildTransferTransaction({
      client,
      wallet,
      keys,
      feePayer: address(ready.target.address),
      recipient: address(recipient),
      asset: address(asset),
      amount,
    });
    const requestId = crypto.randomUUID();
    const url = sender.url ?? sender.tab?.url ?? "";
    const reserved = addPending(requestId, {
      kind: "walletSend",
      tabId: 0,
      frameId: 0,
      origin: "airwave:wallet",
      payload: { transaction: Array.from(encodeWireTransaction(tx)) },
      createdAt: Date.now(),
      signAccountId: ready.target.accountId,
      uiHost: walletShellSurfaceFromHref(url) === "sidebar" ? "sidebar" : "window",
    });
    if (!reserved) return fail(req, pendingInsertError(requestId));
    schedulePendingTimeout(requestId, pendingTimeoutHandlers);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { requestId },
    });
  } catch {
    return fail(req, "PRIVACY_SEND_FAILED");
  }
}
