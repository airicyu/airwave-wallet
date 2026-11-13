/**
 * Builds every merge group before anything is signed.
 * Fifty-two notes or fewer open the normal approval for that one transaction.
 * More than 52 notes are proved into separate transactions and held until the merge confirm screen signs those exact transactions.
 * Reject or cancel signs none of them. This file does not choose a different set of notes.
 */
import { address, getBase64EncodedWireTransaction } from "@solana/kit";
import bs58 from "bs58";
import { privacyClient } from "./client";
import type { Bytes32 } from "@heliuslabs/spr/keypair";
import { Wallet } from "@heliuslabs/spr/transaction";
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
    const wires: Uint8Array[] = [];
    for (const group of groups) {
      const tx = await buildMergeTransaction({
        client,
        wallet,
        keys,
        feePayer: address(ready.target.address),
        asset: address(asset),
        inputs: hashes(group),
      });
      wires.push(encodeWireTransaction(tx));
    }
    if (groups.length === 1) {
      const queued = queueWalletSend(req, sender, ready.target.accountId, decodeWireTransaction(wires[0]!));
      if ("kind" in queued) return queued;
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { requestId: queued.requestId },
      });
    }
    const batchId = crypto.randomUUID();
    stashMergeBatch(batchId, { accountId: ready.target.accountId, wires, groups });
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { batchId, groups },
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
  if (!batch) return privacyFail(req, "MERGE_NOT_READY");
  const loaded = getLoadedAccount(batch.accountId);
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  if (!rpcUrl || !loaded || !isUnlocked()) return privacyFail(req, "WALLET_LOCKED");
  const chainRpc = settings.rpcUrl.trim() || rpcUrl;
  let sent = 0;
  for (const wireBytes of batch.wires) {
    const signed = await partiallySignWireTransaction(wireBytes, loaded.signer);
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
