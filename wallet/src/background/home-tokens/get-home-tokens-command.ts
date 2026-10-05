import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { getHomeTokenOwners, isCombinedAccount } from "../../shared/accounts";
import { respond } from "../messaging";
import { getActiveAccountMeta } from "../session";
import { readSettings } from "../storage";
import { getHomeTokensForOwners } from "./home-tokens-service";

export async function handleGetHomeTokens(req: ExtensionRequest): Promise<ExtensionResponse> {
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

