/**
 * Creates a new combined (aggregated) account from member public keys.
 * Does not add or remove members on existing combined accounts.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import {
  normalizeSubPubkeysInput,
  parsePublicKeyBase58,
} from "../../../../shared/accounts";
import { parseOptionalAccountLabel } from "../../../../shared/account-label";
import type { CombinedAccountMeta } from "../../../../shared/storage-keys";
import { respond } from "../../../messaging";
import { newAccountId } from "../../../session";
import {
  readAccounts,
  readActiveAccountId,
  writeAccounts,
  writeActiveAccountId,
} from "../../../storage";

export async function handleCreateCombinedAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { label, subPubkeys: rawSubs, mainPubkey: rawMain } = (req.payload ?? {}) as {
    label?: string;
    subPubkeys?: string[];
    mainPubkey?: string;
  };
  const parsedLabel = parseOptionalAccountLabel(label);
  if (!parsedLabel.ok) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_LABEL", message: "名稱最多 15 字" },
    });
  }
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
    label: parsedLabel.label ?? `Combined ${accounts.length + 1}`,
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
