import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import type { AirwaveBridgeAccountChanged, AirwaveBridgeResult } from "../shared/bridge";
import type {
  ConnectPayload,
  ExtensionRequest,
  ExtensionResponse,
  ResolvePendingPayload,
  SignMessagePayload,
  SignTransactionPayload,
} from "../shared/commands";
import { decryptVault, encryptVault, encryptVaultWithKey } from "../shared/crypto-vault";
import {
  getActivePublicKey,
  readAccounts,
  readActiveAccountId,
  readConnections,
  readSettings,
  readVaultBlob,
  writeAccounts,
  writeActiveAccountId,
  writeConnections,
  writeSettings,
  writeVaultBlob,
} from "./storage-io";
import {
  addPending,
  bindPopoutWindow,
  getPending,
  takePending,
  unbindPopoutByRequest,
  unbindPopoutWindow,
} from "./pending";
import * as session from "./session";
import type { AccountMeta } from "../shared/storage-keys";

function respond(res: ExtensionResponse): ExtensionResponse {
  return res;
}

async function persistVaultFromSession(): Promise<void> {
  const cryptoState = session.getVaultCrypto();
  const secrets = session.getVaultSecrets();
  if (!cryptoState || !secrets) throw new Error("NOT_UNLOCKED");
  const blob = await encryptVaultWithKey(cryptoState.key, cryptoState.saltB64, secrets);
  await writeVaultBlob(blob);
}

function newAccountId(): string {
  return crypto.randomUUID();
}

function secretToStored(kp: Keypair): string {
  return bs58.encode(kp.secretKey);
}

async function sendBridgeResult(
  tabId: number,
  msg: AirwaveBridgeResult,
): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    /* tab closed */
  }
}

async function notifyAccountChanged(publicKeyBase58: string): Promise<void> {
  const connections = await readConnections();
  const settings = await readSettings();
  const msg: AirwaveBridgeAccountChanged = {
    type: "airwave-bridge-account-changed",
    publicKeyBase58,
    cluster: settings.cluster,
  };
  for (const rec of Object.values(connections)) {
    for (const tabId of rec.tabIds) {
      try {
        await chrome.tabs.sendMessage(tabId, msg);
      } catch {
        /* ignore */
      }
    }
  }
}

function looksLikeVersionedTransaction(bytes: Uint8Array): boolean {
  if (bytes.length < 80) return false;
  return bytes[0] === 0x80 || bytes[0] === 0x81;
}

async function openPopout(requestId: string): Promise<void> {
  const url = chrome.runtime.getURL(
    `src/popout/index.html?requestId=${encodeURIComponent(requestId)}`,
  );
  const win = await chrome.windows.create({
    url,
    type: "popup",
    width: 420,
    height: 640,
    focused: true,
  });
  if (win.id != null) bindPopoutWindow(win.id, requestId);
}

const PENDING_TIMEOUT_MS = 120_000;

function schedulePendingTimeout(requestId: string): void {
  setTimeout(() => {
    void (async () => {
      const p = getPending(requestId);
      if (!p) return;
      takePending(requestId);
      unbindPopoutByRequest(requestId);
      await sendBridgeResult(p.tabId, {
        type: "airwave-bridge-result",
        requestId,
        ok: false,
        error: { code: "TIMEOUT", message: "Request timed out" },
      });
    })();
  }, PENDING_TIMEOUT_MS);
}

async function rememberConnectedTab(origin: string, tabId: number, accountId: string): Promise<void> {
  const connections = await readConnections();
  const existing = connections[origin] ?? {
    accountId,
    connectedAt: Date.now(),
    tabIds: [],
  };
  existing.accountId = accountId;
  existing.connectedAt = Date.now();
  if (!existing.tabIds.includes(tabId)) existing.tabIds.push(tabId);
  connections[origin] = existing;
  await writeConnections(connections);
}

async function finishConnect(
  requestId: string,
  tabId: number,
  origin: string,
  approved: boolean,
): Promise<void> {
  const pending = takePending(requestId);
  if (!pending) return;

  if (!approved) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected connection" },
    });
    return;
  }

  const activeId = await readActiveAccountId();
  const pubkey = await getActivePublicKey();
  if (!activeId || !pubkey) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_ACCOUNT", message: "No active account" },
    });
    return;
  }

  await rememberConnectedTab(origin, tabId, activeId);
  const settings = await readSettings();

  await sendBridgeResult(tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: { publicKey: pubkey, cluster: settings.cluster },
  });
}

async function finishSignMessage(
  requestId: string,
  tabId: number,
  approved: boolean,
): Promise<void> {
  const pending = takePending(requestId);
  if (!pending) return;

  if (!approved) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected" },
    });
    return;
  }

  if (!session.isUnlocked()) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Wallet is locked" },
    });
    return;
  }

  const activeId = await readActiveAccountId();
  const kp = activeId ? session.getKeypair(activeId) : undefined;
  if (!kp) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const { message } = pending.payload as SignMessagePayload;
  const msgBytes = Uint8Array.from(message);
  const signature = nacl.sign.detached(msgBytes, kp.secretKey);

  await sendBridgeResult(tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: { signature: Array.from(signature) },
  });
}

async function finishSignTransaction(
  requestId: string,
  tabId: number,
  approved: boolean,
): Promise<void> {
  const pending = takePending(requestId);
  if (!pending) return;

  if (!approved) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected" },
    });
    return;
  }

  if (!session.isUnlocked()) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Wallet is locked" },
    });
    return;
  }

  const activeId = await readActiveAccountId();
  const kp = activeId ? session.getKeypair(activeId) : undefined;
  if (!kp) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const { transaction } = pending.payload as SignTransactionPayload;
  const txBytes = Uint8Array.from(transaction);
  const tx = VersionedTransaction.deserialize(txBytes);
  tx.sign([kp]);

  await sendBridgeResult(tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: { signedTransaction: Array.from(tx.serialize()) },
  });
}

async function handleDappCommand(
  req: ExtensionRequest,
): Promise<ExtensionResponse> {
  const tabId = req.tabId;
  const origin = req.origin;
  if (tabId == null || !origin) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "BAD_CONTEXT", message: "Missing tab or origin" },
    });
  }

  if (req.command === "debug.ping") {
    const p = req.payload as { text?: string } | undefined;
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pong: true, echo: p?.text },
    });
  }

  if (req.command === "dapp.connect") {
    const pubkey = await getActivePublicKey();
    const activeId = await readActiveAccountId();
    if (!pubkey || !activeId) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NO_ACCOUNT", message: "Create a wallet in the extension popup first" },
      });
    }

    const payload = (req.payload ?? {}) as ConnectPayload;
    const connections = await readConnections();
    const trusted = connections[origin];
    if (trusted) {
      await rememberConnectedTab(origin, tabId, activeId);
      const settings = await readSettings();
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { publicKey: pubkey, cluster: settings.cluster },
      });
    }
    if (payload.silent) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_CONNECTED", message: "Origin is not connected" },
      });
    }

    const requestId = req.requestId;
    addPending(requestId, {
      kind: "connect",
      tabId,
      frameId: req.frameId ?? 0,
      origin,
      payload,
      createdAt: Date.now(),
    });
    schedulePendingTimeout(requestId);
    await openPopout(requestId);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pending: true },
    });
  }

  if (req.command === "dapp.signMessage") {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
      });
    }
    const payload = req.payload as SignMessagePayload;
    const msgBytes = Uint8Array.from(payload.message);
    if (looksLikeVersionedTransaction(msgBytes)) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: {
          code: "SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION",
          message: "Message looks like a transaction",
        },
      });
    }
    const requestId = req.requestId;
    addPending(requestId, {
      kind: "signMessage",
      tabId,
      frameId: req.frameId ?? 0,
      origin,
      payload,
      createdAt: Date.now(),
    });
    schedulePendingTimeout(requestId);
    await openPopout(requestId);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pending: true },
    });
  }

  if (req.command === "dapp.signTransaction") {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
      });
    }
    const requestId = req.requestId;
    addPending(requestId, {
      kind: "signTransaction",
      tabId,
      frameId: req.frameId ?? 0,
      origin,
      payload: req.payload as SignTransactionPayload,
      createdAt: Date.now(),
    });
    schedulePendingTimeout(requestId);
    await openPopout(requestId);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pending: true },
    });
  }

  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code: "UNKNOWN", message: "Unknown dapp command" },
  });
}

async function handleUiCommand(req: ExtensionRequest): Promise<ExtensionResponse> {
  if (req.command === "ui.getPending") {
    const { requestId } = (req.payload ?? {}) as { requestId: string };
    const p = getPending(requestId);
    if (!p) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_FOUND", message: "Pending not found" },
      });
    }
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: p,
    });
  }

  if (req.command === "ui.resolvePending") {
    const { requestId, decision } = req.payload as ResolvePendingPayload;
    const p = getPending(requestId);
    if (!p) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_FOUND", message: "Pending not found" },
      });
    }
    const approved = decision === "approve";
    unbindPopoutByRequest(requestId);
    if (p.kind === "connect") {
      await finishConnect(requestId, p.tabId, p.origin, approved);
    } else if (p.kind === "signMessage") {
      await finishSignMessage(requestId, p.tabId, approved);
    } else if (p.kind === "signTransaction") {
      await finishSignTransaction(requestId, p.tabId, approved);
    }
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { done: true },
    });
  }

  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code: "UNKNOWN", message: "Unknown ui command" },
  });
}

async function handleWalletCommand(req: ExtensionRequest): Promise<ExtensionResponse> {
  if (req.command === "wallet.getState") {
    const accounts = await readAccounts();
    const activeAccountId = await readActiveAccountId();
    const settings = await readSettings();
    const vaultExists = (await readVaultBlob()) != null;
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
      },
    });
  }

  if (req.command === "wallet.lock") {
    session.lock();
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
        error: { code: "BAD_PASSWORD", message: "Wrong password" },
      });
    }
  }

  if (req.command === "wallet.createVault") {
    const { password, label } = req.payload as { password: string; label?: string };
    if (!password) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "BAD_PASSWORD", message: "Password required" },
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
    const kp = Keypair.generate();
    const id = newAccountId();
    const secrets = { secrets: { [id]: secretToStored(kp) } };
    const { blob, key } = await encryptVault(password, secrets);
    await writeVaultBlob(blob);
    const meta: AccountMeta = {
      id,
      label: label ?? "Account 1",
      publicKeyBase58: kp.publicKey.toBase58(),
    };
    await writeAccounts([meta]);
    await writeActiveAccountId(id);
    await writeSettings(await readSettings());
    session.setVaultCrypto(key, blob.kdfParams.salt);
    session.loadSecrets(secrets);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { account: meta },
    });
  }

  if (req.command === "wallet.generateAccount") {
    if (!session.isUnlocked()) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "WALLET_LOCKED", message: "Unlock first" },
      });
    }
    const { label } = (req.payload ?? {}) as { label?: string };
    const kp = Keypair.generate();
    const id = newAccountId();
    const secrets = session.getVaultSecrets() ?? { secrets: {} };
    secrets.secrets[id] = secretToStored(kp);
    session.setVaultSecrets(secrets);
    await persistVaultFromSession();
    const accounts = await readAccounts();
    const meta: AccountMeta = {
      id,
      label: label ?? `Account ${accounts.length + 1}`,
      publicKeyBase58: kp.publicKey.toBase58(),
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
        error: { code: "WALLET_LOCKED", message: "Unlock first" },
      });
    }
    const { secretBase58, label } = req.payload as {
      secretBase58: string;
      label?: string;
    };
    let kp: Keypair;
    try {
      const raw = bs58.decode(secretBase58.trim());
      kp = Keypair.fromSecretKey(raw);
    } catch {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "BAD_SECRET", message: "Invalid private key" },
      });
    }
    const id = newAccountId();
    const secrets = session.getVaultSecrets() ?? { secrets: {} };
    secrets.secrets[id] = secretToStored(kp);
    session.setVaultSecrets(secrets);
    await persistVaultFromSession();
    const accounts = await readAccounts();
    const meta: AccountMeta = {
      id,
      label: label ?? `Imported ${accounts.length + 1}`,
      publicKeyBase58: kp.publicKey.toBase58(),
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
    await notifyAccountChanged(acc.publicKeyBase58);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { activeAccountId: accountId },
    });
  }

  if (req.command === "storage.patchSettings") {
    const patch = req.payload as Partial<import("../shared/storage-keys").Settings>;
    const settings = await readSettings();
    const next = { ...settings, ...patch };
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

function isExtensionPage(sender: chrome.runtime.MessageSender): boolean {
  const url = sender.url ?? "";
  return url.startsWith(chrome.runtime.getURL(""));
}

async function dispatch(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const isUiOrWallet =
    req.command.startsWith("ui.") ||
    req.command.startsWith("wallet.") ||
    req.command === "storage.patchSettings";
  if (isUiOrWallet && !isExtensionPage(sender)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "FORBIDDEN", message: "Command not allowed from this sender" },
    });
  }
  if (req.command.startsWith("dapp.") || req.command === "debug.ping") {
    return handleDappCommand(req);
  }
  if (req.command.startsWith("ui.")) {
    return handleUiCommand(req);
  }
  return handleWalletCommand(req);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.kind !== "airwave-ext-req") return false;
  const req = message as ExtensionRequest;
  if (req.tabId == null && sender.tab?.id != null) req.tabId = sender.tab.id;
  dispatch(req, sender)
    .then(sendResponse)
    .catch((e: unknown) => {
      const req = message as ExtensionRequest;
      sendResponse(
        respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error: {
            code: "INTERNAL",
            message: e instanceof Error ? e.message : "Internal error",
          },
        }),
      );
    });
  return true;
});

chrome.windows.onRemoved.addListener((windowId) => {
  const requestId = unbindPopoutWindow(windowId);
  if (!requestId) return;
  const p = takePending(requestId);
  if (!p) return;
  void sendBridgeResult(p.tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: false,
    error: { code: "USER_REJECTED", message: "Approval window closed" },
  });
});
