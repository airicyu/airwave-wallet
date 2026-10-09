/**
 * Account record commands: active switch, rename, delete, reorder, and read-only add.
 * Does not generate keys or import secrets.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import { getExposedPublicKey, parsePublicKeyBase58 } from "../../../../shared/accounts";
import {
  parseOptionalAccountLabel,
  parseRequiredAccountLabel,
} from "../../../../shared/account-label";
import { accountKind, type AccountMeta } from "../../../../shared/storage-keys";
import {
  notifyAccountChanged,
  notifyDisconnected,
} from "../../../messaging";
import { respond } from "../../../messaging";
import {
  newAccountId,
  persistVaultFromSession,
  pubkeyExists,
} from "../../../session";
import * as session from "../../../session";
import {
  clearActiveAccountId,
  readAccounts,
  readActiveAccountId,
  readConnections,
  writeAccounts,
  writeActiveAccountId,
  writeConnections,
} from "../../../storage";
import { invalidLabel } from "./invalid-label";

export async function handleSetActiveAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { accountId } = req.payload as { accountId: string };
  const accounts = await readAccounts();
  if (!accounts.some((a) => a.id === accountId)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "NOT_FOUND", message: "Account not found" },
    });
  }
  await writeActiveAccountId(accountId);
  const acc = accounts.find((a) => a.id === accountId)!;
  await notifyAccountChanged(getExposedPublicKey(acc));
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { activeAccountId: accountId },
  });
}

export async function handleRenameAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { accountId, label: rawLabel } = req.payload as { accountId: string; label: string };
  const parsed = parseRequiredAccountLabel(rawLabel);
  if (!parsed.ok) return invalidLabel(req, !(rawLabel?.trim()));
  const label = parsed.label;
  const accounts = await readAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx < 0) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_NOT_FOUND", message: "Account not found" },
    });
  }
  accounts[idx] = { ...accounts[idx], label };
  await writeAccounts(accounts);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { account: accounts[idx] },
  });
}

export async function handleAddReadOnlyAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { publicKeyBase58: rawPk, label } = (req.payload ?? {}) as {
    publicKeyBase58: string;
    label?: string;
  };
  const parsedLabel = parseOptionalAccountLabel(label);
  if (!parsedLabel.ok) return invalidLabel(req, false);
  const publicKeyBase58 = parsePublicKeyBase58(rawPk?.trim() ?? "");
  if (!publicKeyBase58) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PUBLIC_KEY", message: "Invalid public key" },
    });
  }
  const accounts = await readAccounts();
  if (pubkeyExists(accounts, publicKeyBase58)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_EXISTS", message: "Account with this public key already exists" },
    });
  }
  const id = newAccountId();
  const meta: AccountMeta = {
    id,
    label: parsedLabel.label ?? `Watch ${publicKeyBase58.slice(0, 6)}…`,
    publicKeyBase58,
    kind: "readOnly",
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

export async function handleDeleteAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { accountId } = req.payload as { accountId: string };
  const accounts = await readAccounts();
  const target = accounts.find((a) => a.id === accountId);
  if (!target) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_NOT_FOUND", message: "Account not found" },
    });
  }
  if (accountKind(target) === "signing" && !session.isUnlocked()) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet to delete signing account" },
    });
  }

  const connections = await readConnections();
  const disconnectPairs: { origin: string; tabIds: number[] }[] = [];
  for (const [origin, rec] of Object.entries(connections)) {
    if (rec.accountId === accountId) {
      disconnectPairs.push({ origin, tabIds: [...rec.tabIds] });
      delete connections[origin];
    }
  }

  const nextAccounts = accounts.filter((a) => a.id !== accountId);
  await writeAccounts(nextAccounts);
  await writeConnections(connections);

  if (accountKind(target) === "signing" && session.isUnlocked()) {
    const secrets = session.getVaultSecrets();
    if (secrets) {
      delete secrets.secrets[accountId];
      await session.setVaultSecrets(secrets);
      await persistVaultFromSession();
    }
  }

  for (const { origin, tabIds } of disconnectPairs) {
    await notifyDisconnected(tabIds, origin);
  }

  const activeId = await readActiveAccountId();
  if (activeId === accountId) {
    if (nextAccounts.length > 0) {
      await writeActiveAccountId(nextAccounts[0].id);
      await notifyAccountChanged(getExposedPublicKey(nextAccounts[0]));
    } else {
      await clearActiveAccountId();
    }
  }

  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { deleted: true },
  });
}

export async function handleReorderAccounts(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { orderedIds } = (req.payload ?? {}) as { orderedIds?: unknown };
  const accounts = await readAccounts();
  const invalid = respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code: "INVALID_ORDER", message: "Invalid account order" },
  });
  if (!Array.isArray(orderedIds) || orderedIds.length !== accounts.length) return invalid;
  if (!orderedIds.every((id) => typeof id === "string")) return invalid;
  const unique = new Set(orderedIds);
  if (unique.size !== accounts.length) return invalid;
  const byId = new Map(accounts.map((a) => [a.id, a]));
  for (const id of orderedIds) {
    if (!byId.has(id)) return invalid;
  }
  const next = orderedIds.map((id) => byId.get(id)!);
  await writeAccounts(next);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { accounts: next },
  });
}
