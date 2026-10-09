/**
 * Reads wallet snapshot state and locks the in-memory session.
 * Does not decrypt the vault or create a new vault.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import { respond } from "../../../messaging";
import * as session from "../../../session";
import { toPublicSettings } from "../../../../shared/storage-keys";
import {
  readAccounts,
  readActiveAccountId,
  readConnections,
  readSettings,
  readVaultBlob,
} from "../../../storage";

export async function handleGetState(req: ExtensionRequest): Promise<ExtensionResponse> {
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
      settings: toPublicSettings(settings),
      connections: connectionsList,
    },
  });
}

export async function handleReadIntegrationSecrets(req: ExtensionRequest): Promise<ExtensionResponse> {
  const settings = await readSettings();
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: {
      jupiterApiKey: settings.jupiterApiKey,
      heliusApiUrl: settings.heliusApiUrl,
    },
  });
}

export async function handleLock(req: ExtensionRequest): Promise<ExtensionResponse> {
  await session.lock();
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { locked: true },
  });
}
