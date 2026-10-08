/**
 * Local signing key generate, import, and export wallet commands.
 * Does not handle mnemonic derivation or read-only watch accounts.
 */
import bs58 from "bs58";
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import { parseOptionalAccountLabel } from "../../../../shared/account-label";
import { decryptVault } from "../../../../shared/crypto-vault";
import {
  generateRandomLoadedAccount,
  loadedAccountFromSecretBytes,
  type LoadedAccountKeys,
} from "../../../../shared/keypair-bytes";
import { accountKind, type AccountMeta } from "../../../../shared/storage-keys";
import { respond } from "../../../messaging";
import {
  newAccountId,
  persistVaultFromSession,
  pubkeyExists,
  secretToStored,
} from "../../../session";
import * as session from "../../../session";
import { readAccounts, readVaultBlob, writeAccounts } from "../../../storage";
import { invalidLabel } from "./invalid-label";

async function loadedFromSecretRaw(secretRaw: string): Promise<LoadedAccountKeys | null> {
  try {
    let bytes: Uint8Array;
    if (secretRaw.startsWith("[")) {
      const arr = JSON.parse(secretRaw) as unknown;
      if (
        !Array.isArray(arr) ||
        arr.length < 32 ||
        !arr.every((n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 255)
      ) {
        throw new Error("bad bytes");
      }
      bytes = Uint8Array.from(arr as number[]);
    } else {
      bytes = bs58.decode(secretRaw);
    }
    return await loadedAccountFromSecretBytes(bytes);
  } catch {
    return null;
  }
}

export async function handleGenerateAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
  if (!session.isUnlocked()) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "請先解鎖錢包" },
    });
  }
  const { label } = (req.payload ?? {}) as { label?: string };
  const parsedLabel = parseOptionalAccountLabel(label);
  if (!parsedLabel.ok) return invalidLabel(req, false);
  const accounts = await readAccounts();
  const kp = await generateRandomLoadedAccount();
  const publicKeyBase58 = kp.address;
  if (pubkeyExists(accounts, publicKeyBase58)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_EXISTS", message: "Account with this public key already exists" },
    });
  }
  const id = newAccountId();
  const secrets = session.getVaultSecrets() ?? { secrets: {} };
  secrets.secrets[id] = secretToStored(kp);
  await session.setVaultSecrets(secrets);
  await persistVaultFromSession();
  const meta: AccountMeta = {
    id,
    label: parsedLabel.label ?? `Account ${accounts.length + 1}`,
    publicKeyBase58,
    kind: "signing",
  };
  accounts.push(meta);
  await writeAccounts(accounts);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { account: meta },
  });
}

export async function handleImportAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
  if (!session.isUnlocked()) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "請先解鎖錢包" },
    });
  }
  const { secret, secretBase58, label } = req.payload as {
    secret?: string;
    secretBase58?: string;
    label?: string;
  };
  const parsedLabel = parseOptionalAccountLabel(label);
  if (!parsedLabel.ok) return invalidLabel(req, false);
  const secretRaw = (secret ?? secretBase58 ?? "").trim();
  const kp = await loadedFromSecretRaw(secretRaw);
  if (!kp) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "BAD_SECRET", message: "Invalid private key" },
    });
  }
  const accounts = await readAccounts();
  const publicKeyBase58 = kp.address;
  if (pubkeyExists(accounts, publicKeyBase58)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_EXISTS", message: "Account with this public key already exists" },
    });
  }
  const id = newAccountId();
  const secrets = session.getVaultSecrets() ?? { secrets: {} };
  secrets.secrets[id] = secretToStored(kp);
  await session.setVaultSecrets(secrets);
  await persistVaultFromSession();
  const meta: AccountMeta = {
    id,
    label: parsedLabel.label ?? `Imported ${accounts.length + 1}`,
    publicKeyBase58,
    kind: "signing",
  };
  accounts.push(meta);
  await writeAccounts(accounts);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { account: meta },
  });
}

export async function handleExportAccountSecret(req: ExtensionRequest): Promise<ExtensionResponse> {
  if (!session.isUnlocked()) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet first" },
    });
  }
  const { accountId, password } = req.payload as { accountId: string; password: string };
  const blob = await readVaultBlob();
  if (!blob) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "NO_VAULT", message: "Create a wallet first" },
    });
  }
  let decrypted: Awaited<ReturnType<typeof decryptVault>>;
  try {
    decrypted = await decryptVault(password, blob);
  } catch {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PASSWORD", message: "密碼錯誤" },
    });
  }
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
  if (accountKind(target) === "combined") {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_READ_ONLY", message: "Read-only account has no secret" },
    });
  }
  if (accountKind(target) !== "signing") {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_READ_ONLY", message: "Read-only account has no secret" },
    });
  }
  const secretBase58 = decrypted.secrets.secrets[accountId];
  if (!secretBase58) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_NOT_FOUND", message: "Secret not found for account" },
    });
  }
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { secretBase58 },
  });
}
