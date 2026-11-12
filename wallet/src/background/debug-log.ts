/**
 * Writes a command failure to the service-worker console only while debug mode is on.
 * The page, content script, and dApp never receive this line. Payloads, secrets, and API keys are not logged.
 */
import { readSettings } from "./storage";

function inServiceWorker(): boolean {
  const workerScope = (globalThis as { ServiceWorkerGlobalScope?: new () => object }).ServiceWorkerGlobalScope;
  return typeof workerScope === "function" && globalThis instanceof workerScope;
}

const SECRET_WORD = /password|mnemonic|private[_ ]?key|secret|credential|viewing_sk|nullifier_secret/i;
const API_KEY = /api-key=[^&\s]+/gi;
const LONG_KEY = /\b[1-9A-HJ-NP-Za-km-z]{64,}\b/g;

function scrub(text: string): string {
  if (SECRET_WORD.test(text)) return "redacted";
  return text.replace(API_KEY, "api-key=redacted").replace(LONG_KEY, "redacted");
}

export async function debugLogFailure(command: string, code: string, message: string): Promise<void> {
  if (!inServiceWorker()) return;
  const settings = await readSettings().catch(() => null);
  if (!settings?.debugModeEnabled) return;
  console.info("[airwave]", command, "failed", code, scrub(message));
}
