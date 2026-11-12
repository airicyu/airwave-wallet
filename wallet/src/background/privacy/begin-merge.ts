/**
 * Builds merge transactions in groups of at most 52 notes.
 * The first group is placed on the existing wallet-send approval queue.
 * Later groups stay in memory under that same request id until the approval finishes or the user rejects it.
 * This file does not draw the merge form. The popup sends the selected note ids.
 *
 * After that approval, finish signs each remaining group with the loaded key and submits it without another approval screen. Cancel drops the stored groups. A failed insert of the first approval must not leave a batch behind.
 */
import { address, getBase64EncodedWireTransaction } from "@solana/kit";
import bs58 from "bs58";
import { privacyClient } from "./client";
import type { Bytes32 } from "@heliuslabs/spr/keypair";
import { SOL_MINT, Wallet } from "@heliuslabs/spr/transaction";
import { buildMergeTransaction, syncWallet } from "@heliuslabs/spr/wallet";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { solanaRpcForUrl } from "../../shared/rpc";
import { decodeWireTransaction, encodeWireTransaction, partiallySignWireTransaction } from "../../shared/tx";
import { respond } from "../messaging";
import { readSettings } from "../storage";
import { getLoadedAccount, isUnlocked } from "../session";
import { walletKeysFor } from "./keys";
import { stashMergeBatch, takeMergeBatch } from "./merge-batch";
import { queueWalletSend } from "./queue-send";
import { privacyAsset, privacyFail, privacySession } from "./ready";
import { privacyRpcUrl } from "./target";

const GROUP = 52;

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
  if (!mint || ids.length < 2) return privacyFail(req, "INVALID_PAYLOAD");
  const ready = await privacySession(req);
  if ("kind" in ready) return ready;
  const asset = privacyAsset(mint);
  const groups = chunks(ids);
  try {
    const client = privacyClient(ready.rpcUrl, ready.settings.cluster);
    const keys = await walletKeysFor(ready.target.accountId, client.proofService);
    const wallet = new Wallet({ identity: keys.address() });
    await syncWallet({ wallet, keys, client });
    const tx = await buildMergeTransaction({
      client,
      wallet,
      keys,
      feePayer: address(ready.target.address),
      asset: address(asset),
      inputs: hashes(groups[0]!),
    });
    const queued = queueWalletSend(req, sender, ready.target.accountId, tx);
    if ("kind" in queued) return queued;
    if (groups.length > 1) {
      stashMergeBatch(queued.requestId, { accountId: ready.target.accountId, asset, groups: groups.slice(1) });
    }
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { requestId: queued.requestId, groups: groups.length },
    });
  } catch {
    return privacyFail(req, "PRIVACY_MERGE_FAILED");
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
  if (!rpcUrl || !loaded || !isUnlocked()) return privacyFail(req, "WALLET_LOCKED");
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
