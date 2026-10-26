/**
 * This file handles the get-home-tokens command. It checks that an RPC URL is set, resolves the owners for the active account, and returns the token rows from the home-tokens service. Fetching balances and Jupiter metadata stays in that service.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { getHomeTokenOwners, isCombinedAccount } from "../../shared/accounts";
import { respond } from "../messaging";
import { getActiveAccountMeta } from "../session";
import { jsonRpcMissing } from "../../shared/protocol";
import { readSettings } from "../storage";
import { getHomeTokensForOwners } from "./home-tokens-service";

export async function handleGetHomeTokens(req: ExtensionRequest): Promise<ExtensionResponse> {
  const payload = (req.payload ?? {}) as { force?: boolean };
  const settings = await readSettings();
  if (jsonRpcMissing(settings)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "MAINNET_RPC_UNSET", message: "Mainnet RPC is not set" },
    });
  }
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

