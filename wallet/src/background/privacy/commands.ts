/**
 * Reads registration and private totals, and builds the one-time register transaction.
 * Combined accounts aggregate vault members. Register still signs with the main wallet only.
 * The transaction opens the normal approval screen. This file does not sign it.
 * Shielded secrets stay in memory.
 */
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  pipe,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { privacyClient } from "./client";
import {
  getRegisterInstructionAsync,
  getSetMergeEncryptionInstructionAsync,
  MergeEncryptionScheme,
} from "@heliuslabs/spr/instructions";
import { isCombinedAccount } from "../../shared/accounts";
import { accountKind, type ExtensionRequest, type ExtensionResponse } from "../../shared/protocol";
import { solanaRpcForUrl } from "../../shared/rpc";
import { respond } from "../messaging";
import { readAccounts, readActiveAccountId, readSettings } from "../storage";
import { getLoadedAccount, isUnlocked } from "../session";
import { shieldedKeysFor } from "./keys";
import { privacyRpcUrl, signingTarget } from "./target";
import { queueWalletSend } from "./queue-send";
import { debugLogInfo } from "../debug-log";
import { privacyRowsForCombined, privacyRowsForSigning } from "./aggregate-status";

const FEE_FLOOR = 5_000n;

function fail(req: ExtensionRequest, code: string, message: string): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code, message },
  });
}

async function canPayFee(rpcUrl: string, owner: string): Promise<boolean> {
  const rpc = solanaRpcForUrl(rpcUrl);
  const balance = await rpc.getBalance(address(owner)).send();
  return balance.value >= FEE_FLOOR;
}

export async function handlePrivacyStatus(req: ExtensionRequest): Promise<ExtensionResponse> {
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  const accounts = await readAccounts();
  const activeId = await readActiveAccountId();
  const active = accounts.find((account) => account.id === activeId);
  const activeKind = active ? (active.kind === "combined" ? "combined" : accountKind(active)) : "missing";
  if (!rpcUrl) {
    void debugLogInfo("wallet.privacyStatus", `no-helius active=${activeKind}`);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { kind: "unavailable", reason: "no-helius" },
    });
  }
  if (!active || !activeId) {
    void debugLogInfo("wallet.privacyStatus", "missing-account");
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { kind: "unavailable", reason: "missing-account" },
    });
  }
  if (accountKind(active) === "readOnly") {
    void debugLogInfo("wallet.privacyStatus", "watch");
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { kind: "unavailable", reason: "watch" },
    });
  }
  if (!isUnlocked()) {
    void debugLogInfo("wallet.privacyStatus", `locked active=${activeKind}`);
    return fail(req, "WALLET_LOCKED", "Wallet is locked");
  }

  try {
    const client = privacyClient(rpcUrl, settings.cluster);
    const chainRpc = settings.rpcUrl.trim() || rpcUrl;
    if (isCombinedAccount(active)) {
      const combined = await privacyRowsForCombined(accounts, active, client, settings, chainRpc);
      if (combined.kind === "unavailable") {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: true,
          result: { kind: "unavailable", reason: "combined-no-registered-vault" },
        });
      }
      void debugLogInfo("wallet.privacyStatus", `registered active=combined rows=${combined.rows.length}`);
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { kind: "registered", rows: combined.rows },
      });
    }

    const target = signingTarget(accounts, activeId);
    if (target === "watch" || target === "missing") {
      void debugLogInfo("wallet.privacyStatus", `watch-or-missing active=${activeKind}`);
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { kind: "unavailable", reason: "watch-or-missing" },
      });
    }
    if (!getLoadedAccount(target.accountId)) {
      void debugLogInfo("wallet.privacyStatus", `locked target=${target.accountId}`);
      return fail(req, "WALLET_LOCKED", "Wallet is locked");
    }
    const body = await privacyRowsForSigning(
      target.accountId,
      target.address,
      client,
      settings,
      chainRpc,
      () => canPayFee(chainRpc, target.address),
    );
    void debugLogInfo(
      "wallet.privacyStatus",
      body.kind === "registered"
        ? `registered active=${activeKind} rows=${body.rows.length}`
        : `unregistered active=${activeKind} canPayFee=${body.canPayFee ? "1" : "0"}`,
    );
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Privacy read failed";
    return fail(req, "PRIVACY_READ_FAILED", message);
  }
}

export async function handlePrivacyRegister(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  const accounts = await readAccounts();
  const activeId = await readActiveAccountId();
  const target = signingTarget(accounts, activeId);
  if (!rpcUrl || target === "watch" || target === "missing") {
    return fail(req, "PRIVACY_UNAVAILABLE", "Private balances are unavailable");
  }
  const loaded = getLoadedAccount(target.accountId);
  if (!isUnlocked() || !loaded) return fail(req, "WALLET_LOCKED", "Wallet is locked");
  const chainRpc = settings.rpcUrl.trim() || rpcUrl;
  if (!(await canPayFee(chainRpc, target.address))) {
    return fail(req, "FEE_UNAVAILABLE", "Public SOL cannot pay the fee");
  }
  try {
    const client = privacyClient(rpcUrl, settings.cluster);
    const owner = address(target.address);
    const keys = await shieldedKeysFor(target.accountId);
    const shielded = keys.address();
    const registerIx = await getRegisterInstructionAsync({
      owner: loaded.signer,
      nullifierPublicKey: shielded.nullifierPublicKey,
      viewingPublicKey: shielded.viewingPublicKey.toBytes(),
    });
    const mergeIx = await getSetMergeEncryptionInstructionAsync({
      owner: loaded.signer,
      scheme: MergeEncryptionScheme.PoseidonCtrV1,
    });
    const rpc = solanaRpcForUrl(chainRpc);
    const latest = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (current) => setTransactionMessageFeePayer(owner, current),
      (current) =>
        setTransactionMessageLifetimeUsingBlockhash(
          {
            blockhash: latest.value.blockhash,
            lastValidBlockHeight: latest.value.lastValidBlockHeight,
          },
          current,
        ),
      (current) =>
        appendTransactionMessageInstructions([registerIx, mergeIx], current),
      (current) => setTransactionMessageComputeUnitLimit(200_000, current),
    );
    const compiled = compileTransaction(message);
    const queued = queueWalletSend(req, sender, target.accountId, compiled);
    if ("kind" in queued) return queued;
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { requestId: queued.requestId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return fail(req, "PRIVACY_REGISTER_FAILED", message);
  }
}
