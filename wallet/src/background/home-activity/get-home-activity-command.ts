import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { getExposedPublicKey } from "../../shared/accounts";
import { respond } from "../messaging";
import { getActiveAccountMeta } from "../session";
import { jsonRpcMissing } from "../../shared/storage-keys";
import { resolveHeliusApiTarget } from "../../shared/helius-api-target";
import { readSettings } from "../storage";
import { getHomeActivity } from "./home-activity-service";

function payloadBefore(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const before = (payload as { before?: unknown }).before;
  if (typeof before !== "string") return undefined;
  const trimmed = before.trim();
  return trimmed || undefined;
}

export async function handleGetHomeActivity(req: ExtensionRequest): Promise<ExtensionResponse> {
  const settings = await readSettings();
  if (jsonRpcMissing(settings) && !resolveHeliusApiTarget(settings.heliusApiUrl)) {
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
  const result = await getHomeActivity(
    getExposedPublicKey(active),
    settings,
    payloadBefore(req.payload),
  );
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result,
  });
}
