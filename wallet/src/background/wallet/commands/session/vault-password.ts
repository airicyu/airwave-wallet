/**
 * Vault password unlock, initial create, and password change wallet commands.
 * Does not assemble or sign transactions.
 */
import bs58 from "bs58";
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import { parseOptionalAccountLabel } from "../../../../shared/account-label";
import { decryptVault, encryptVault } from "../../../../shared/crypto-vault";
import {
  generateRandomLoadedAccount,
  loadedAccountFromSecretBytes,
} from "../../../../shared/keypair-bytes";
import { SESSION_UNLOCKED, type AccountMeta } from "../../../../shared/storage-keys";
import { respond } from "../../../messaging";
import {
  newAccountId,
  pubkeyExists,
  runVaultWrite,
  secretToStored,
} from "../../../session";
import * as session from "../../../session";
import {
  readAccounts,
  readSettings,
  readVaultBlob,
  writeAccounts,
  writeActiveAccountId,
  writeSettings,
  writeVaultBlob,
} from "../../../storage";

export async function handleUnlock(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { password } = req.payload as { password: string };
  const blob = await readVaultBlob();
  if (!blob) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "NO_VAULT", message: "Create a wallet first" },
    });
  }
  try {
    const { secrets, key } = await decryptVault(password, blob);
    session.setVaultCrypto(key, blob.kdfParams.salt);
    await session.loadSecrets(secrets);
    await session.persistUnlockedSession();
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { unlocked: true },
    });
  } catch {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PASSWORD", message: "密碼錯誤" },
    });
  }
}

export async function handleChangeVaultPassword(req: ExtensionRequest): Promise<ExtensionResponse> {
  return runVaultWrite(async () => {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "請先解鎖錢包" },
      });
    }
    const { currentPassword, newPassword } = req.payload as {
      currentPassword: string;
      newPassword: string;
    };
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WEAK_PASSWORD", message: "新密碼過短" },
      });
    }
    const blob = await readVaultBlob();
    if (!blob) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "VAULT_MISSING", message: "尚未建立錢包" },
      });
    }
    let secrets;
    try {
      const decrypted = await decryptVault(
        typeof currentPassword === "string" ? currentPassword : "",
        blob,
      );
      secrets = decrypted.secrets;
    } catch {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "INVALID_PASSWORD", message: "密碼錯誤" },
      });
    }
    try {
      const { blob: newBlob, key: newKey } = await encryptVault(newPassword, secrets);
      await chrome.storage.session.remove(SESSION_UNLOCKED);
      await writeVaultBlob(newBlob);
      session.setVaultCrypto(newKey, newBlob.kdfParams.salt);
      await session.loadSecrets(secrets);
      await session.persistUnlockedSession();
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { ok: true },
      });
    } catch {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "UNKNOWN", message: "變更密碼失敗" },
      });
    }
  });
}

export async function handleCreateVault(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { password, label, secretBase58, empty } = req.payload as {
    password: string;
    label?: string;
    secretBase58?: string;
    empty?: boolean;
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
  if (!password) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PASSWORD", message: "Password required" },
    });
  }
  if ((await readVaultBlob()) != null) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "VAULT_EXISTS", message: "Vault already exists" },
    });
  }
  const existingAccounts = await readAccounts();
  if (empty && !secretBase58?.trim()) {
    const secrets = { secrets: {} };
    const { blob, key } = await encryptVault(password, secrets);
    await runVaultWrite(async () => {
      await writeVaultBlob(blob);
      session.setVaultCrypto(key, blob.kdfParams.salt);
      await session.loadSecrets(secrets);
      await session.persistUnlockedSession();
    });
    await writeSettings(await readSettings());
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { account: null },
    });
  }
  let kp;
  if (secretBase58?.trim()) {
    try {
      kp = await loadedAccountFromSecretBytes(bs58.decode(secretBase58.trim()));
    } catch {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "BAD_SECRET", message: "Invalid private key" },
      });
    }
  } else {
    kp = await generateRandomLoadedAccount();
  }
  const publicKeyBase58 = kp.address;
  if (pubkeyExists(existingAccounts, publicKeyBase58)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_EXISTS", message: "Account with this public key already exists" },
    });
  }
  const id = newAccountId();
  const secrets = { secrets: { [id]: secretToStored(kp) } };
  const { blob, key } = await encryptVault(password, secrets);
  const meta: AccountMeta = {
    id,
    label: parsedLabel.label ?? "Account 1",
    publicKeyBase58,
    kind: "signing",
  };
  await runVaultWrite(async () => {
    await writeVaultBlob(blob);
    session.setVaultCrypto(key, blob.kdfParams.salt);
    await session.loadSecrets(secrets);
    await session.persistUnlockedSession();
  });
  await writeAccounts([...existingAccounts, meta]);
  await writeActiveAccountId(id);
  await writeSettings(await readSettings());
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { account: meta },
  });
}
