import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { getExposedPublicKey } from "../../shared/accounts";
import { decryptVault } from "../../shared/crypto-vault";
import {
  createEnglishMnemonic12,
  keypairFromMnemonic,
  parseMnemonic,
  pathTemplate,
  SEED_PREVIEW_COUNT,
  type SeedPathKind,
} from "../../shared/seed-derive";
import { accountKind, type AccountMeta } from "../../shared/storage-keys";
import {
  notifyAccountChanged,
  notifyDisconnected,
} from "../messaging";
import { respond } from "../messaging";
import {
  newAccountId,
  persistVaultFromSession,
  pubkeyExists,
  secretToStored,
} from "../session";
import * as session from "../session";
import {
  clearActiveAccountId,
  readAccounts,
  readActiveAccountId,
  readConnections,
  readVaultBlob,
  writeAccounts,
  writeActiveAccountId,
  writeConnections,
} from "../storage";

export async function handleGenerateSeedAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
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

export async function handlePreviewSeedAccounts(req: ExtensionRequest): Promise<ExtensionResponse> {
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

export async function handleImportSeedAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
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

export async function handleAddReadOnlyAccount(req: ExtensionRequest): Promise<ExtensionResponse> {
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

