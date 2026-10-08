/**
 * Builds INVALID_LABEL extension responses for account command label validation failures.
 * Does not create or modify accounts.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../../shared/commands";
import { respond } from "../../../messaging";

export function invalidLabel(req: ExtensionRequest, empty: boolean): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: {
      code: "INVALID_LABEL",
      message: empty ? "Label cannot be empty" : "名稱最多 15 字",
    },
  });
}
