import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { disconnectAllConnections, removeConnectionAndNotify } from "../messaging";
import { respond } from "../messaging";

export async function handleDisconnectOrigin(req: ExtensionRequest): Promise<ExtensionResponse> {
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

export async function handleDisconnectAllOrigins(req: ExtensionRequest): Promise<ExtensionResponse> {
  await disconnectAllConnections();
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { disconnected: true },
  });
}

