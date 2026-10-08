import { parsePublicKeyBase58 } from "../../shared/accounts";
import type {
  ExtensionRequest,
  ExtensionResponse,
  ResolvePendingPayload,
  SignTransactionPayload,
} from "../../shared/commands";
import { getExposedPublicKey } from "../../shared/accounts";
import { getPending, unbindPopoutByRequest } from "../pending";
import { readAccounts, readSettings } from "../storage";
import { respond } from "../messaging";
import { broadcastWalletSendSettled, walletSendNotify } from "../send";
import {
  finishSignAndSendRejected,
  finishSignAndSendWindowClosed,
  finishWalletSendUserAbort,
  runWalletSendAfterApprove,
} from "../send";
import { finishConnect, finishSignMessage, finishSignTransaction } from "../pending";
import { keypairForAccountId, signingErrorForAccountId } from "../session";
import { simulateSignTransaction } from "../simulate";
import * as session from "../session";

export async function handleUiCommand(req: ExtensionRequest): Promise<ExtensionResponse> {
  if (req.command === "ui.getPending") {
    const { requestId } = (req.payload ?? {}) as { requestId: string };
    const p = getPending(requestId);
    if (!p) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_FOUND", message: "Pending not found" },
      });
    }
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: p,
    });
  }

  if (req.command === "ui.resolvePending") {
    const { requestId, decision } = req.payload as ResolvePendingPayload;
    const p = getPending(requestId);
    if (!p) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_FOUND", message: "Pending not found" },
      });
    }
    const approved = decision === "approve";

    if (p.kind === "signAndSendTransaction") {
      if (!approved) {
        await finishSignAndSendRejected(requestId, p.tabId);
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: true,
          result: { done: true },
        });
      }
      if (!session.isUnlocked()) {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
        });
      }
      const signAccountId = p.signAccountId;
      if (!signAccountId) {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: { code: "NOT_FOUND", message: "Pending not found" },
        });
      }
      const accountErr = await signingErrorForAccountId(signAccountId);
      if (accountErr) {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: accountErr,
        });
      }
      const kp = await keypairForAccountId(signAccountId);
      if (!kp) {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: { code: "NO_KEY", message: "Missing key" },
        });
      }
      const settings = await readSettings();
      void runWalletSendAfterApprove(requestId, settings.rpcUrl, kp, walletSendNotify);
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { accepted: true },
      });
    }

    if (p.kind === "walletSend") {
      if (!approved) {
        finishWalletSendUserAbort(requestId, broadcastWalletSendSettled);
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: true,
          result: { done: true },
        });
      }
      if (!session.isUnlocked()) {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
        });
      }
      const signAccountId = p.signAccountId;
      if (!signAccountId) {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: { code: "NOT_FOUND", message: "Pending not found" },
        });
      }
      const accountErr = await signingErrorForAccountId(signAccountId);
      if (accountErr) {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: accountErr,
        });
      }
      const kp = await keypairForAccountId(signAccountId);
      if (!kp) {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: { code: "NO_KEY", message: "Missing key" },
        });
      }
      const settings = await readSettings();
      void runWalletSendAfterApprove(requestId, settings.rpcUrl, kp, walletSendNotify);
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { accepted: true },
      });
    }

    if (p.kind === "connect" && approved && !session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
      });
    }

    unbindPopoutByRequest(requestId);
    if (p.kind === "connect") {
      await finishConnect(requestId, p.tabId, p.origin, approved);
    } else if (p.kind === "signMessage") {
      await finishSignMessage(requestId, p.tabId, approved);
    } else if (p.kind === "signTransaction") {
      await finishSignTransaction(requestId, p.tabId, approved);
    }
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { done: true },
    });
  }

  if (req.command === "ui.abortPending") {
    const { requestId } = (req.payload ?? {}) as { requestId: string };
    if (requestId) {
      const p = getPending(requestId);
      if (p?.kind === "signAndSendTransaction") {
        await finishSignAndSendWindowClosed(requestId);
      } else {
        finishWalletSendUserAbort(requestId, broadcastWalletSendSettled);
      }
    }
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { ok: true },
    });
  }

  if (req.command === "ui.simulatePendingTx") {
    const payload = (req.payload ?? {}) as {
      requestId: string;
      cuLimit?: number;
      cuPrice?: number;
    };
    const { requestId } = payload;
    const p = getPending(requestId);
    if (
      !p ||
      (p.kind !== "signTransaction" &&
        p.kind !== "walletSend" &&
        p.kind !== "signAndSendTransaction")
    ) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_FOUND", message: "Pending not found" },
      });
    }
    const signAccountId = p.signAccountId;
    if (!signAccountId) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_FOUND", message: "Pending not found" },
      });
    }
    const accounts = await readAccounts();
    const meta = accounts.find((a) => a.id === signAccountId);
    if (!meta) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_FOUND", message: "Pending not found" },
      });
    }
    const pubkeyStr = getExposedPublicKey(meta);
    const signerPubkey = parsePublicKeyBase58(pubkeyStr);
    if (!signerPubkey) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_FOUND", message: "Pending not found" },
      });
    }
    const settings = await readSettings();
    const rpcUrl = settings.rpcUrl;
    const { transaction } = p.payload as SignTransactionPayload;
    const sim = await simulateSignTransaction(
      rpcUrl,
      requestId,
      Uint8Array.from(transaction),
      signerPubkey,
      settings.cluster,
      settings.defaultCuPrice,
      { cuLimit: payload.cuLimit, cuPrice: payload.cuPrice },
    );
    if (!sim.ok) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: sim.code, message: sim.message },
      });
    }
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { ...sim.result, seq: sim.seq },
    });
  }

  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code: "UNKNOWN", message: "Unknown ui command" },
  });
}
