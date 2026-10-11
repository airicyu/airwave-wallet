/**
 * In-memory transaction-AI sessions for the current service worker lifetime.
 * Does not open the offscreen document or call OpenRouter.
 */
import type { TxAiAssessState, TxAiKind } from "../../shared/tx-ai";
import type { TxAiPreflightEnriched } from "./preflight";

export type TxAiSession = {
  requestId: string;
  kind: TxAiKind;
  snapshot: Uint8Array;
  abort: AbortController;
  decodedPubkeys: string[];
  preflightEnriched?: TxAiPreflightEnriched;
  preflightManifest?: ReadonlySet<string>;
  preflightFeePayer?: string;
  preflightFeePayerBalanceLamports?: string;
  state: TxAiAssessState;
};

const sessions = new Map<string, TxAiSession>();
const queue: string[] = [];
let activeId: string | null = null;
const discardListeners = new Set<(requestId: string) => void>();

export function onTxAiDiscard(listener: (requestId: string) => void): void {
  discardListeners.add(listener);
}

export function getTxAiSession(requestId: string): TxAiSession | undefined {
  return sessions.get(requestId);
}

export function getTxAiAssessState(requestId: string): TxAiAssessState | undefined {
  return sessions.get(requestId)?.state;
}

export function rememberTxAiSession(session: TxAiSession): void {
  if (sessions.has(session.requestId) || queue.includes(session.requestId)) return;
  sessions.set(session.requestId, session);
  queue.push(session.requestId);
}

export function setTxAiState(requestId: string, state: TxAiAssessState): void {
  const session = sessions.get(requestId);
  if (session) session.state = state;
}

export function noteDecodedPubkeys(requestId: string, pubkeys: string[]): void {
  const session = sessions.get(requestId);
  if (session) session.decodedPubkeys = pubkeys;
}

export function activeTxAiRequestId(): string | null {
  return activeId;
}

export function claimNextTxAi(): TxAiSession | undefined {
  if (activeId) return undefined;
  while (queue.length > 0) {
    const requestId = queue.shift();
    if (!requestId) break;
    const session = sessions.get(requestId);
    if (!session) continue;
    if (session.abort.signal.aborted) continue;
    activeId = requestId;
    return session;
  }
  return undefined;
}

export function releaseActiveTxAi(requestId: string): void {
  if (activeId === requestId) activeId = null;
}

export function hasTxAiQueue(): boolean {
  return queue.length > 0;
}

export function txAiBusy(): boolean {
  return activeId != null || queue.length > 0;
}

export function discardTxAi(requestId: string): void {
  const session = sessions.get(requestId);
  const index = queue.indexOf(requestId);
  if (index >= 0) queue.splice(index, 1);
  if (session) session.abort.abort();
  sessions.delete(requestId);
  if (activeId === requestId) activeId = null;
  for (const listener of discardListeners) listener(requestId);
}
