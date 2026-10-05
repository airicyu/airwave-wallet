import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import {
  findCombinedById,
  isCombinedAccountId,
  normalizeSubPubkeysInput,
  parsePublicKeyBase58,
} from "../../shared/accounts";
import type { CombinedAccountMeta } from "../../shared/storage-keys";
import { notifyAccountChangedForConnectionAccount } from "../messaging";
import { respond } from "../messaging";
import { newAccountId } from "../session";
import {
  readAccounts,
  readActiveAccountId,
  writeAccounts,
  writeActiveAccountId,
} from "../storage";

export async function handleCreateCombinedAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { label, subPubkeys: rawSubs, mainPubkey: rawMain } = (req.payload ?? {}) as {
    label?: string;
    subPubkeys?: string[];
    mainPubkey?: string;
  };
  const accounts = await readAccounts();
  const normalized = normalizeSubPubkeysInput(rawSubs ?? [], accounts);
  if (!normalized.ok) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PUBLIC_KEY", message: "Invalid public key or empty list" },
    });
  }
  const { subPubkeys } = normalized;
  let mainPubkey = subPubkeys[0];
  if (rawMain != null && String(rawMain).trim()) {
    const parsedMain = parsePublicKeyBase58(String(rawMain));
    if (!parsedMain || !subPubkeys.includes(parsedMain)) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "INVALID_PUBLIC_KEY", message: "mainPubkey must be in subPubkeys" },
      });
    }
    mainPubkey = parsedMain;
  }
  const id = newAccountId();
  const meta: CombinedAccountMeta = {
    id,
    label: label?.trim() || `Combined ${accounts.length + 1}`,
    kind: "combined",
    subPubkeys,
    mainPubkey,
  };
  accounts.push(meta);
  await writeAccounts(accounts);
  const activeId = await readActiveAccountId();
  if (!activeId) {
    await writeActiveAccountId(id);
  }
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { account: meta },
  });
}

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

