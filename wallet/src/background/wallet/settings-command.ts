import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { notifyAccountChanged } from "../messaging";
import { respond } from "../messaging";
import {
  getActivePublicKey,
  normalizeSettings,
  readSettings,
  writeSettings,
} from "../storage";

export async function handlePatchSettings(req: ExtensionRequest): Promise<ExtensionResponse> {
  const patch = req.payload as Partial<import("../../shared/storage-keys").Settings>;
  const settings = await readSettings();
  const next = normalizeSettings({ ...settings, ...patch });
  await writeSettings(next);
  const pubkey = await getActivePublicKey();
  if (pubkey) await notifyAccountChanged(pubkey);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { settings: next },
  });
}

