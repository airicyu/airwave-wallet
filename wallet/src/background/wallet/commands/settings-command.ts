/**
 * Patches persisted wallet settings and notifies connected tabs when the active pubkey changes.
 * Does not unlock the vault or modify account records.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../../shared/commands";
import { applyToolbarForShell } from "../../shell";
import { notifyAccountChanged } from "../../messaging";
import { respond } from "../../messaging";
import {
  getActivePublicKey,
  normalizeSettings,
  readSettings,
  writeSettings,
} from "../../storage";

export async function handlePatchSettings(req: ExtensionRequest): Promise<ExtensionResponse> {
  const patch = req.payload as Partial<import("../../../shared/storage-keys").Settings>;
  const settings = await readSettings();
  const next = normalizeSettings({ ...settings, ...patch });
  await writeSettings(next);
  await applyToolbarForShell(next.shell);
  const patchKeys = Object.keys(patch) as (keyof typeof patch)[];
  const shellOnly = patchKeys.length === 1 && patchKeys[0] === "shell";
  const pubkey = await getActivePublicKey();
  if (pubkey && !shellOnly) await notifyAccountChanged(pubkey);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { settings: next },
  });
}
