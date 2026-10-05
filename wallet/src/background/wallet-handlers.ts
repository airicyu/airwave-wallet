import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import type { BeginSendPayload, ExtensionRequest, ExtensionResponse } from "../shared/commands";
import {
  findCombinedById,
  getExposedPublicKey,
  getHomeTokenOwners,
  isCombinedAccount,
  isCombinedAccountId,
  normalizeSubPubkeysInput,
  parsePublicKeyBase58,
} from "../shared/accounts";
import { decryptVault, encryptVault } from "../shared/crypto-vault";
import {
  getActivePublicKey,
  readAccounts,
  readActiveAccountId,
  readConnections,
  readSettings,
  readVaultBlob,
  writeAccounts,
  writeActiveAccountId,
  clearActiveAccountId,
  writeConnections,
  writeSettings,
  writeVaultBlob,
  normalizeSettings,
} from "./storage-io";
import { addPending } from "./pending";
import { schedulePendingTimeout } from "./pending-timeout";
import { buildWalletSendTransaction, resolveHomeTokenRowForSend } from "./wallet-begin-send";
import * as session from "./session";
import { runVaultWrite } from "./vault-write-queue";
import { SESSION_UNLOCKED, accountKind, type AccountMeta, type CombinedAccountMeta } from "../shared/storage-keys";
import { getHomeTokensForOwners } from "./home-tokens-service";
import {
  createEnglishMnemonic12,
  keypairFromMnemonic,
  parseMnemonic,
  pathTemplate,
  SEED_PREVIEW_COUNT,
  type SeedPathKind,
} from "../shared/seed-derive";
import { respond } from "./ext-respond";
import { persistVaultFromSession } from "./vault-persist";
import { newAccountId, secretToStored } from "./account-ids";
import {
  notifyAccountChanged,
  notifyAccountChangedForConnectionAccount,
  notifyDisconnected,
  removeConnectionAndNotify,
  disconnectAllConnections,
} from "./origin-notify";
import { pendingTimeoutHandlers } from "./wallet-send-broadcast";
import { getActiveAccountMeta } from "./active-account";
import { keypairForAccountId, pubkeyExists } from "./sign-gates";

export async function handleWalletCommand(req: ExtensionRequest): Promise<ExtensionResponse> {
  if (req.command === "wallet.getState") {
    const accounts = await readAccounts();
    const activeAccountId = await readActiveAccountId();
    const settings = await readSettings();
    const vaultExists = (await readVaultBlob()) != null;
    const connections = await readConnections();
    const connectionsList = Object.entries(connections).map(([origin, rec]) => ({
      origin,
      accountId: rec.accountId,
      connectedAt: rec.connectedAt,
    }));
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: {
        vaultExists,
        unlocked: session.isUnlocked(),
        accounts,
        activeAccountId,
        settings,
        connections: connectionsList,
      },
    });
  }

  if (req.command === "wallet.lock") {
    await session.lock();
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { locked: true },
    });
  }

  if (req.command === "wallet.unlock") {
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
      session.loadSecrets(secrets);
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

  if (req.command === "wallet.changeVaultPassword") {
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
        session.loadSecrets(secrets);
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

  if (req.command === "wallet.createVault") {
    const { password, label, secretBase58, empty } = req.payload as {
      password: string;
      label?: string;
      secretBase58?: string;
      empty?: boolean;
    };
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
        session.loadSecrets(secrets);
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
    let kp: Keypair;
    if (secretBase58?.trim()) {
      try {
        kp = Keypair.fromSecretKey(bs58.decode(secretBase58.trim()));
      } catch {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: { code: "BAD_SECRET", message: "Invalid private key" },
        });
      }
    } else {
      kp = Keypair.generate();
    }
    const publicKeyBase58 = kp.publicKey.toBase58();
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
      label: label ?? "Account 1",
      publicKeyBase58,
      kind: "signing",
    };
    await runVaultWrite(async () => {
      await writeVaultBlob(blob);
      session.setVaultCrypto(key, blob.kdfParams.salt);
      session.loadSecrets(secrets);
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

  if (req.command === "wallet.generateSeedAccount") {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "請先解鎖錢包" },
      });
    }
    const { label } = (req.payload ?? {}) as { label?: string };
    const accounts = await readAccounts();
    const mnemonic = createEnglishMnemonic12();
    const kp = keypairFromMnemonic(mnemonic, "phantom", 0);
    const publicKeyBase58 = kp.publicKey.toBase58();
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
    session.setVaultSecrets(secrets);
    await persistVaultFromSession();
    const meta: AccountMeta = {
      id,
      label: label ?? `Account ${accounts.length + 1}`,
      publicKeyBase58,
      kind: "signing",
    };
    accounts.push(meta);
    await writeAccounts(accounts);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { account: meta, mnemonic },
    });
  }

  if (req.command === "wallet.generateAccount") {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "請先解鎖錢包" },
      });
    }
    const { label } = (req.payload ?? {}) as { label?: string };
    const accounts = await readAccounts();
    const kp = Keypair.generate();
    const publicKeyBase58 = kp.publicKey.toBase58();
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
    session.setVaultSecrets(secrets);
    await persistVaultFromSession();
    const meta: AccountMeta = {
      id,
      label: label ?? `Account ${accounts.length + 1}`,
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

  if (req.command === "wallet.importAccount") {
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
    const secretRaw = (secret ?? secretBase58 ?? "").trim();
    let kp: Keypair;
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
      kp = Keypair.fromSecretKey(bytes);
    } catch {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "BAD_SECRET", message: "Invalid private key" },
      });
    }
    const accounts = await readAccounts();
    const publicKeyBase58 = kp.publicKey.toBase58();
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
    session.setVaultSecrets(secrets);
    await persistVaultFromSession();
    const meta: AccountMeta = {
      id,
      label: label ?? `Imported ${accounts.length + 1}`,
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

  if (req.command === "wallet.previewSeedAccounts") {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "請先解鎖錢包" },
      });
    }
    const { mnemonic, pathKind, customPath } = (req.payload ?? {}) as {
      mnemonic?: string;
      pathKind?: SeedPathKind;
      customPath?: string;
    };
    let phrase: string;
    let kind: SeedPathKind;
    try {
      phrase = parseMnemonic(mnemonic ?? "");
      kind = pathKind ?? "phantom";
      if (kind !== "phantom" && kind !== "cli" && kind !== "change" && kind !== "custom") {
        throw new Error("INVALID_PATH");
      }
      pathTemplate(kind, customPath);
    } catch (e) {
      const code = e instanceof Error && (e.message === "INVALID_MNEMONIC" || e.message === "INVALID_PATH")
        ? e.message
        : "INVALID_MNEMONIC";
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: {
          code,
          message: code === "INVALID_PATH" ? "路徑無效" : "助記詞無效",
        },
      });
    }
    const accounts = Array.from({ length: SEED_PREVIEW_COUNT }, (_, index) => {
      const kp = keypairFromMnemonic(phrase, kind, index, customPath);
      return { index, publicKeyBase58: kp.publicKey.toBase58() };
    });
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pathPreview: pathTemplate(kind, customPath), accounts },
    });
  }

  if (req.command === "wallet.importSeedAccount") {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "請先解鎖錢包" },
      });
    }
    const { mnemonic, pathKind, customPath, index, label } = (req.payload ?? {}) as {
      mnemonic?: string;
      pathKind?: SeedPathKind;
      customPath?: string;
      index?: number;
      label?: string;
    };
    if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= SEED_PREVIEW_COUNT) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "BAD_INDEX", message: "請選帳戶" },
      });
    }
    let kp: Keypair;
    try {
      const phrase = parseMnemonic(mnemonic ?? "");
      const kind = pathKind ?? "phantom";
      kp = keypairFromMnemonic(phrase, kind, index as number, customPath);
    } catch (e) {
      const code = e instanceof Error && (e.message === "INVALID_MNEMONIC" || e.message === "INVALID_PATH")
        ? e.message
        : "INVALID_MNEMONIC";
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: {
          code,
          message: code === "INVALID_PATH" ? "路徑無效" : "助記詞無效",
        },
      });
    }
    const accounts = await readAccounts();
    const publicKeyBase58 = kp.publicKey.toBase58();
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
    session.setVaultSecrets(secrets);
    await persistVaultFromSession();
    const meta: AccountMeta = {
      id,
      label: label ?? `Imported ${accounts.length + 1}`,
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

  if (req.command === "wallet.setActiveAccount") {
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

  if (req.command === "wallet.renameAccount") {
    const { accountId, label: rawLabel } = req.payload as { accountId: string; label: string };
    const label = rawLabel?.trim() ?? "";
    if (!label) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "INVALID_LABEL", message: "Label cannot be empty" },
      });
    }
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

  if (req.command === "wallet.exportAccountSecret") {
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

  if (req.command === "wallet.addReadOnlyAccount") {
    const { publicKeyBase58: rawPk, label } = (req.payload ?? {}) as {
      publicKeyBase58: string;
      label?: string;
    };
    const trimmed = rawPk?.trim() ?? "";
    let pk: PublicKey;
    try {
      pk = new PublicKey(trimmed);
    } catch {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "INVALID_PUBLIC_KEY", message: "Invalid public key" },
      });
    }
    const publicKeyBase58 = pk.toBase58();
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
      label: label?.trim() || `Watch ${publicKeyBase58.slice(0, 6)}…`,
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

  if (req.command === "wallet.createCombinedAccount") {
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

  if (req.command === "wallet.addCombinedSub") {
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

  if (req.command === "wallet.removeCombinedSub") {
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

  if (req.command === "wallet.setCombinedMain") {
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

  if (req.command === "wallet.deleteAccount") {
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
        session.setVaultSecrets(secrets);
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

  if (req.command === "wallet.disconnectOrigin") {
    const { origin } = req.payload as { origin: string };
    if (!origin) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "BAD_REQUEST", message: "Origin required" },
      });
    }
    await removeConnectionAndNotify(origin);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { disconnected: true },
    });
  }

  if (req.command === "wallet.disconnectAllOrigins") {
    await disconnectAllConnections();
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { disconnected: true },
    });
  }

  if (req.command === "wallet.beginSend") {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
      });
    }
    const active = await getActiveAccountMeta();
    if (!active) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NO_ACCOUNT", message: "No active account" },
      });
    }
    if (accountKind(active) !== "signing") {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "ACCOUNT_READ_ONLY", message: "Read-only account cannot send" },
      });
    }
    const payload = req.payload as BeginSendPayload;
    const settings = await readSettings();
    const owner = getExposedPublicKey(active);
    const { rows } = await getHomeTokensForOwners([owner], settings);
    const row = await resolveHomeTokenRowForSend(rows, payload.tokenId);
    if (!row) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "INVALID_PAYLOAD", message: "Unknown token" },
      });
    }
    const kp = await keypairForAccountId(active.id);
    if (!kp) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
      });
    }
    const requestId = crypto.randomUUID();
    const built = await buildWalletSendTransaction(
      settings,
      kp,
      row,
      payload.amountUi,
      payload.recipient,
      requestId,
    );
    if ("code" in built) {
      const messages: Record<string, string> = {
        INVALID_ADDRESS: "地址無效",
        INVALID_PAYLOAD: "數量或代幣資料無效",
        INSUFFICIENT_FUNDS: "餘額不足",
      };
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: {
          code: built.code,
          message: messages[built.code] ?? built.code,
        },
      });
    }
    addPending(requestId, {
      kind: "walletSend",
      tabId: 0,
      frameId: 0,
      origin: "airwave:wallet",
      payload: { transaction: Array.from(built.txBytes) },
      createdAt: Date.now(),
      signAccountId: active.id,
      uiHost: "popup",
    });
    schedulePendingTimeout(requestId, pendingTimeoutHandlers);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { requestId },
    });
  }

  if (req.command === "wallet.getHomeTokens") {
    const payload = (req.payload ?? {}) as { force?: boolean };
    const settings = await readSettings();
    const active = await getActiveAccountMeta();
    if (!active) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { rows: [] },
      });
    }
    const owners = getHomeTokenOwners(active);
    const withMembers = isCombinedAccount(active);
    const result = await getHomeTokensForOwners(owners, settings, {
      force: payload.force === true,
      withMembers,
    });
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result,
    });
  }

  if (req.command === "storage.patchSettings") {
    const patch = req.payload as Partial<import("../shared/storage-keys").Settings>;
    const settings = await readSettings();
    const next = normalizeSettings({ ...settings, ...patch });
    await writeSettings(next);
    const pubkey = await getActivePublicKey();
    if (pubkey) await notifyAccountChanged(pubkey);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { settings: next },
    });
  }

  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code: "UNKNOWN", message: "Unknown wallet command" },
  });
}