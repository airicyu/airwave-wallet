/**
 * Builds merge transactions in groups of at most 52 notes.
 * The first group opens one approval. Later groups are signed after that approval.
 */
import { address, getBase64EncodedWireTransaction } from "@solana/kit";
import bs58 from "bs58";
import { privacyClient } from "./client";
import type { Bytes32 } from "@heliuslabs/spr/keypair";
import { SOL_MINT, Wallet } from "@heliuslabs/spr/transaction";
import { buildMergeTransaction, syncWallet } from "@heliuslabs/spr/wallet";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { NATIVE_SOL_ID } from "../../shared/home";
import { solanaRpcForUrl } from "../../shared/rpc";
import { decodeWireTransaction, encodeWireTransaction, partiallySignWireTransaction } from "../../shared/tx";
import { walletShellSurfaceFromHref } from "../../shared/shell";
import { respond } from "../messaging";
import { addPending, pendingInsertError, schedulePendingTimeout } from "../pending";
import { pendingTimeoutHandlers } from "../send/wallet-send-broadcast";
import { readAccounts, readActiveAccountId, readSettings } from "../storage";
import { getLoadedAccount, isUnlocked } from "../session";
import { walletKeysFor } from "./keys";
import { stashMergeBatch, takeMergeBatch } from "./merge-batch";
import { privacyRpcUrl, signingTarget } from "./target";

const GROUP = 52;

function fail(req: ExtensionRequest, code: string): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code, message: code },
  });
}

function chunks(ids: string[]): string[][] {
  const groups: string[][] = [];
  for (let i = 0; i < ids.length; i += GROUP) groups.push(ids.slice(i, i + GROUP));
  return groups;
}

function hashes(ids: string[]): Bytes32[] {
  return ids.map((id) => bs58.decode(id) as Bytes32);
}

export async function handleBeginMerge(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const body = req.payload as { mint?: string; ids?: string[] };
  const mint = body.mint?.trim() ?? "";
  const ids = (body.ids ?? []).filter((id) => typeof id === "string" && id.length > 0);
  if (!mint || ids.length < 2) return fail(req, "INVALID_PAYLOAD");
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  const target = signingTarget(await readAccounts(), await readActiveAccountId());
  if (!rpcUrl || target === "watch" || target === "missing") return fail(req, "PRIVACY_UNAVAILABLE");
  const loaded = getLoadedAccount(target.accountId);
  if (!isUnlocked() || !loaded) return fail(req, "WALLET_LOCKED");
  const asset = mint === NATIVE_SOL_ID || mint === SOL_MINT ? SOL_MINT : mint;
  const groups = chunks(ids);
  try {
    const client = privacyClient(rpcUrl, settings.cluster);
    const keys = await walletKeysFor(target.accountId, client.proofService);
    const wallet = new Wallet({ identity: keys.address() });
    await syncWallet({ wallet, keys, client });
    const tx = await buildMergeTransaction({
      client,
      wallet,
      keys,
      feePayer: address(target.address),
      asset: address(asset),
      inputs: hashes(groups[0]!),
    });
    const requestId = crypto.randomUUID();
    if (groups.length > 1) {
      stashMergeBatch(requestId, { accountId: target.accountId, asset, groups: groups.slice(1) });
    }
    const url = sender.url ?? sender.tab?.url ?? "";
    const reserved = addPending(requestId, {
      kind: "walletSend",
      tabId: 0,
      frameId: 0,
      origin: "airwave:wallet",
      payload: { transaction: Array.from(encodeWireTransaction(tx)) },
      createdAt: Date.now(),
      signAccountId: target.accountId,
      uiHost: walletShellSurfaceFromHref(url) === "sidebar" ? "sidebar" : "window",
    });
    if (!reserved) return fail(req, pendingInsertError(requestId));
    schedulePendingTimeout(requestId, pendingTimeoutHandlers);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { requestId, groups: groups.length },
    });
  } catch {
    return fail(req, "PRIVACY_MERGE_FAILED");
  }
}

export async function handleCancelMergeBatch(req: ExtensionRequest): Promise<ExtensionResponse> {
  const requestId = (req.payload as { requestId?: string }).requestId ?? "";
  takeMergeBatch(requestId);
  return respond({ kind: "airwave-ext-res", requestId: req.requestId, ok: true, result: { cleared: true } });
}

export async function handleFinishMergeBatch(req: ExtensionRequest): Promise<ExtensionResponse> {
  const requestId = (req.payload as { requestId?: string }).requestId ?? "";
  const batch = takeMergeBatch(requestId);
  if (!batch) {
    return respond({ kind: "airwave-ext-res", requestId: req.requestId, ok: true, result: { sent: 0 } });
  }
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  const loaded = getLoadedAccount(batch.accountId);
  if (!rpcUrl || !loaded || !isUnlocked()) return fail(req, "WALLET_LOCKED");
  const chainRpc = settings.rpcUrl.trim() || rpcUrl;
  const client = privacyClient(rpcUrl, settings.cluster);
  const keys = await walletKeysFor(batch.accountId, client.proofService);
  const wallet = new Wallet({ identity: keys.address() });
  let sent = 0;
  for (const group of batch.groups) {
    await syncWallet({ wallet, keys, client });
    const tx = await buildMergeTransaction({
      client,
      wallet,
      keys,
      feePayer: address(loaded.address),
      asset: address(batch.asset),
      inputs: hashes(group),
    });
    const signed = await partiallySignWireTransaction(encodeWireTransaction(tx), loaded.signer);
    const wire = getBase64EncodedWireTransaction(decodeWireTransaction(signed));
    await solanaRpcForUrl(chainRpc).sendTransaction(wire, { encoding: "base64" }).send();
    sent += 1;
  }
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { sent },
  });
}
