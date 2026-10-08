/**
 * Mutates members and main address on an existing combined account.
 * Does not create new combined accounts.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import {
  findCombinedById,
  isCombinedAccountId,
  parsePublicKeyBase58,
} from "../../../../shared/accounts";
import { notifyAccountChangedForConnectionAccount } from "../../../messaging";
import { respond } from "../../../messaging";
import {
  readAccounts,
  readActiveAccountId,
  writeAccounts,
} from "../../../storage";

export async function handleAddCombinedSub(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { combinedId, publicKeyBase58: rawPk } = req.payload as {
    combinedId: string;
    publicKeyBase58: string;
  };
  const accounts = await readAccounts();
  const combined = findCombinedById(accounts, combinedId);
  if (!combined) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_NOT_FOUND", message: "Combined account not found" },
    });
  }
  if (isCombinedAccountId(accounts, rawPk?.trim() ?? "")) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PUBLIC_KEY", message: "Invalid public key" },
    });
  }
  const pk = parsePublicKeyBase58(rawPk ?? "");
  if (!pk) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PUBLIC_KEY", message: "Invalid public key" },
    });
  }
  if (combined.subPubkeys.includes(pk)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { account: combined },
    });
  }
  combined.subPubkeys = [...combined.subPubkeys, pk];
  await writeAccounts(accounts);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { account: combined },
  });
}

export async function handleRemoveCombinedSub(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { combinedId, publicKeyBase58: rawPk } = req.payload as {
    combinedId: string;
    publicKeyBase58: string;
  };
  const pk = parsePublicKeyBase58(rawPk ?? "");
  const accounts = await readAccounts();
  const combined = findCombinedById(accounts, combinedId);
  if (!combined) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_NOT_FOUND", message: "Combined account not found" },
    });
  }
  if (!pk || !combined.subPubkeys.includes(pk)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_NOT_FOUND", message: "Member not in combined account" },
    });
  }
  if (combined.subPubkeys.length === 1) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "LAST_SUB_ACCOUNT", message: "Cannot remove the last member" },
    });
  }
  const nextSubs = combined.subPubkeys.filter((s) => s !== pk);
  const wasMain = combined.mainPubkey === pk;
  combined.subPubkeys = nextSubs;
  if (wasMain) {
    combined.mainPubkey = nextSubs[0];
  }
  await writeAccounts(accounts);
  const activeId = await readActiveAccountId();
  if (activeId === combinedId && wasMain) {
    await notifyAccountChangedForConnectionAccount(combinedId, combined.mainPubkey);
  }
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { account: combined },
  });
}

export async function handleSetCombinedMain(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { combinedId, mainPubkey: rawMain } = req.payload as {
    combinedId: string;
    mainPubkey: string;
  };
  const mainPubkey = parsePublicKeyBase58(rawMain ?? "");
  const accounts = await readAccounts();
  const combined = findCombinedById(accounts, combinedId);
  if (!combined) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_NOT_FOUND", message: "Combined account not found" },
    });
  }
  if (!mainPubkey || !combined.subPubkeys.includes(mainPubkey)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PUBLIC_KEY", message: "mainPubkey must be a member" },
    });
  }
  combined.mainPubkey = mainPubkey;
  await writeAccounts(accounts);
  const activeId = await readActiveAccountId();
  if (activeId === combinedId) {
    await notifyAccountChangedForConnectionAccount(combinedId, mainPubkey);
  }
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { account: combined },
  });
}
