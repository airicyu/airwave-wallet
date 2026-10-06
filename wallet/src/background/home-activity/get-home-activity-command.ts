import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { getExposedPublicKey } from "../../shared/accounts";
import { respond } from "../messaging";
import { getActiveAccountMeta } from "../session";
import { readSettings } from "../storage";
import { getHomeActivity } from "./home-activity-service";

export async function handleGetHomeActivity(req: ExtensionRequest): Promise<ExtensionResponse> {
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
  const result = await getHomeActivity(getExposedPublicKey(active), settings);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result,
  });
}
