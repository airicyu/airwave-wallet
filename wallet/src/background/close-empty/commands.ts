import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { respond } from "../messaging";
import { commitCloseEmpty, listClosableTokenAccounts, planCloseEmpty } from "./close-empty-service";

export async function handleListClosableTokenAccounts(
  req: ExtensionRequest,
): Promise<ExtensionResponse> {
  const payload = (req.payload ?? {}) as { force?: boolean };
  const result = await listClosableTokenAccounts({ force: payload.force === true });
  if (!result.ok) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: result.code, message: result.message },
    });
  }
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { entries: result.entries, partialScan: result.partialScan },
  });
}

export async function handlePlanCloseEmpty(req: ExtensionRequest): Promise<ExtensionResponse> {
  const payload = (req.payload ?? {}) as { tokenAccounts?: string[] };
  const tokenAccounts = payload.tokenAccounts;
  if (!Array.isArray(tokenAccounts)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PAYLOAD", message: "Invalid payload" },
    });
  }
  const result = await planCloseEmpty(tokenAccounts);
  if (!result.ok) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: result.code, message: result.message },
    });
  }
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: result.result,
  });
}

export async function handleCommitCloseEmpty(req: ExtensionRequest): Promise<ExtensionResponse> {
  const payload = (req.payload ?? {}) as { planId?: string };
  if (!payload.planId || typeof payload.planId !== "string") {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PAYLOAD", message: "Missing planId" },
    });
  }
  const result = await commitCloseEmpty(payload.planId);
  if (!result.ok) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: result.code, message: result.message },
    });
  }
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: result.result,
  });
}
