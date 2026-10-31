/**
 * Patches persisted wallet settings and notifies connected tabs when the active pubkey changes.
 * Does not unlock the vault or modify account records.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../shared/protocol";
import { notifyAccountChanged } from "../../messaging";
import { respond } from "../../messaging";
import { isAllowedCustomRpc, isPublicClusterRpc, toPublicSettings } from "../../../shared/protocol";
import { isVendorApiUrlDraft } from "../../../shared/rpc";
import { syncIdleLockAlarm } from "../../idle-lock/idle-lock";
import {
  getActivePublicKey,
  isPatchIdleAutoLockMinutesValid,
  normalizeSettings,
  readSettings,
  writeSettings,
} from "../../storage";

function incomingCustomRpcRejected(patch: Partial<import("../../../shared/protocol").Settings>): boolean {
  const check = (url: unknown): boolean => {
    if (typeof url !== "string") return false;
    const t = url.trim();
    if (!t || isPublicClusterRpc(t)) return false;
    return !isAllowedCustomRpc(t);
  };
  if (check(patch.rpcUrl)) return true;
  const by = patch.rpcByCluster;
  if (!by) return false;
  for (const cluster of ["devnet", "mainnet"] as const) {
    const cfg = by[cluster];
    if (!cfg) continue;
    if (check(cfg.active)) return true;
    for (const url of cfg.urls ?? []) {
      if (check(url)) return true;
    }
  }
  return false;
}

export async function handlePatchSettings(req: ExtensionRequest): Promise<ExtensionResponse> {
  const patch = { ...(req.payload as Partial<import("../../../shared/protocol").Settings>) };
  const patchKeys = Object.keys(patch) as (keyof typeof patch)[];
  const shellOnly = patchKeys.length === 1 && patchKeys[0] === "shell";
  delete patch.shell;
  if (shellOnly) {
    const settings = await readSettings();
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { settings: toPublicSettings(settings) },
    });
  }
  if (
    (typeof patch.jupiterApiUrl === "string" && !isVendorApiUrlDraft(patch.jupiterApiUrl)) ||
    (typeof patch.openRouterApiUrl === "string" && !isVendorApiUrlDraft(patch.openRouterApiUrl)) ||
    (typeof patch.mainnetBlockhashRpcUrl === "string" && !isVendorApiUrlDraft(patch.mainnetBlockhashRpcUrl))
  ) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PAYLOAD", message: "Invalid API URL" },
    });
  }
  if (incomingCustomRpcRejected(patch)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_RPC", message: "Invalid RPC URL" },
    });
  }
  if (
    Object.prototype.hasOwnProperty.call(patch, "idleAutoLockMinutes") &&
    !isPatchIdleAutoLockMinutesValid(patch.idleAutoLockMinutes)
  ) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PAYLOAD", message: "Idle lock minutes must be 1–1440" },
    });
  }
  const settings = await readSettings();
  const next = normalizeSettings({ ...settings, ...patch });
  await writeSettings(next);
  if (patch.idleAutoLockEnabled === false) {
    await syncIdleLockAlarm(false);
  } else if (
    patch.idleAutoLockEnabled === true ||
    Object.prototype.hasOwnProperty.call(patch, "idleAutoLockMinutes")
  ) {
    await syncIdleLockAlarm(true);
  }
  const pubkey = await getActivePublicKey();
  if (pubkey) await notifyAccountChanged(pubkey);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { settings: toPublicSettings(next) },
  });
}
