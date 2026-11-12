/**
 * Reads registration and private totals, and submits the one-time register transaction.
 * Does not open the generic approval screen or persist shielded secrets.
 */
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
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
import { SOL_MINT, Wallet } from "@heliuslabs/spr/transaction";
import { isWalletRegistered, syncWallet } from "@heliuslabs/spr/wallet";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import bs58 from "bs58";
import type { Signature } from "@solana/keys";
import { solanaRpcForUrl } from "../../shared/rpc";
import { waitForSignatureConfirmed } from "../close-empty/wait-signature-confirmed";
import { decodeWireTransaction, encodeWireTransaction, partiallySignWireTransaction } from "../../shared/tx";
import { respond } from "../messaging";
import { readAccounts, readActiveAccountId, readSettings } from "../storage";
import { getLoadedAccount, isUnlocked } from "../session";
import { shieldedKeysFor } from "./keys";
import { privacyRpcUrl, signingTarget } from "./target";
import { privateUsdByMint } from "./usd";

const FEE_FLOOR = 5_000n;

function fail(req: ExtensionRequest, code: string, message: string): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code, message },
  });
}

function formatAmount(mint: string, amount: bigint): string {
  if (mint !== SOL_MINT) return amount.toString();
  const negative = amount < 0n;
  const value = negative ? -amount : amount;
  const raw = value.toString().padStart(10, "0");
  const whole = raw.slice(0, raw.length - 9);
  const frac = raw.slice(raw.length - 9).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
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
  const target = signingTarget(accounts, activeId);
  if (!rpcUrl || target === "missing") {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { kind: "unavailable" },
    });
  }
  if (target === "watch") {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { kind: "unavailable" },
    });
  }
  if (!isUnlocked() || !getLoadedAccount(target.accountId)) {
    return fail(req, "WALLET_LOCKED", "Wallet is locked");
  }
  try {
    const client = privacyClient(rpcUrl, settings.cluster);
    const owner = address(target.address);
    const registered = await isWalletRegistered({ rpc: client, owner });
    if (!registered) {
      const feeOk = await canPayFee(settings.rpcUrl.trim() || rpcUrl, target.address);
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { kind: "unregistered", canPayFee: feeOk },
      });
    }
    const keys = await shieldedKeysFor(target.accountId);
    const wallet = new Wallet({ identity: keys.address() });
    await syncWallet({ wallet, keys, client });
    const rows = wallet.balances().map((row) => ({
      mint: row.mint,
      amount: formatAmount(row.mint, row.amount),
      amountRaw: row.amount.toString(),
      notes: row.utxos.map((utxo) => {
        const hash = utxo.hash(keys.address().nullifierPublicKey, client.treeId);
        return {
          id: bs58.encode(hash),
          amount: formatAmount(row.mint, utxo.amount),
          amountRaw: utxo.amount.toString(),
          mergeable: (utxo.data.utxoData()?.length ?? 0) === 0,
        };
      }),
    }));
    const usd = await privateUsdByMint(rows, settings);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: {
        kind: "registered",
        rows: rows.map((row) => ({ ...row, usdLabel: usd.get(row.mint) ?? "" })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Privacy read failed";
    return fail(req, "PRIVACY_READ_FAILED", message);
  }
}

export async function handlePrivacyRegister(req: ExtensionRequest): Promise<ExtensionResponse> {
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
    const unsigned = encodeWireTransaction(compiled);
    const signed = await partiallySignWireTransaction(unsigned, loaded.signer);
    const wire = getBase64EncodedWireTransaction(decodeWireTransaction(signed));
    const signature = await rpc
      .sendTransaction(wire, { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed" })
      .send();
    const confirmed = await waitForSignatureConfirmed(chainRpc, signature as Signature);
    if (!confirmed) return fail(req, "PRIVACY_REGISTER_FAILED", "Registration was not confirmed");
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { signature },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return fail(req, "PRIVACY_REGISTER_FAILED", message);
  }
}
