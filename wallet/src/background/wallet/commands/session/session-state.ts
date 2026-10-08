/**
 * Reads wallet snapshot state and locks the in-memory session.
 * Does not decrypt the vault or create a new vault.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import { respond } from "../../../messaging";
import * as session from "../../../session";
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
      settings,
      connections: connectionsList,
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
