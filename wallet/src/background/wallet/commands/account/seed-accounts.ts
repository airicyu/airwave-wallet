/**
 * Mnemonic seed account generate, preview, and import wallet commands.
 * Does not import raw secret-key strings or manage read-only accounts.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import { parseOptionalAccountLabel } from "../../../../shared/account-label";
import {
  createEnglishMnemonic12,
  keypairFromMnemonic,
  parseMnemonic,
  pathTemplate,
  SEED_PREVIEW_COUNT,
  type SeedPathKind,
} from "../../../../shared/seed-derive";
import type { LoadedAccountKeys } from "../../../../shared/keypair-bytes";
import type { AccountMeta } from "../../../../shared/storage-keys";
import { respond } from "../../../messaging";
import {
  newAccountId,
  persistVaultFromSession,
  pubkeyExists,
  secretToStored,
} from "../../../session";
import * as session from "../../../session";
import { readAccounts, writeAccounts } from "../../../storage";
import { invalidLabel } from "./invalid-label";

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
  const parsedLabel = parseOptionalAccountLabel(label);
  if (!parsedLabel.ok) return invalidLabel(req, false);
  const accounts = await readAccounts();
  const mnemonic = createEnglishMnemonic12();
  const kp = await keypairFromMnemonic(mnemonic, "phantom", 0);
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
    result: { account: meta, mnemonic },
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
  const accounts = await Promise.all(
    Array.from({ length: SEED_PREVIEW_COUNT }, async (_, index) => {
      const kp = await keypairFromMnemonic(phrase, kind, index, customPath);
      return { index, publicKeyBase58: kp.address };
    }),
  );
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
  const parsedLabel = parseOptionalAccountLabel(label);
  if (!parsedLabel.ok) return invalidLabel(req, false);
  if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= SEED_PREVIEW_COUNT) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "BAD_INDEX", message: "請選帳戶" },
    });
  }
  let kp: LoadedAccountKeys;
  try {
    const phrase = parseMnemonic(mnemonic ?? "");
    const kind = pathKind ?? "phantom";
    kp = await keypairFromMnemonic(phrase, kind, index as number, customPath);
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
