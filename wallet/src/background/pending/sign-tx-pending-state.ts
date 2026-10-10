/** signTransaction pending: service-worker memory only; not persisted. */
export type SignTxPendingState = {
  workingTx?: Uint8Array;
  writeSeq: number;
  committedWriteSeq: number;
};

const signTxState = new Map<string, SignTxPendingState>();

function getOrCreate(requestId: string): SignTxPendingState {
  let s = signTxState.get(requestId);
  if (!s) {
    s = { writeSeq: 0, committedWriteSeq: 0 };
    signTxState.set(requestId, s);
  }
  return s;
}

export function acceptSimulateRequest(requestId: string): number {
  const s = getOrCreate(requestId);
  s.writeSeq += 1;
  return s.writeSeq;
}

export function tryCommitWorkingTx(requestId: string, seq: number, bytes: Uint8Array): boolean {
  const s = signTxState.get(requestId);
  if (!s) return false;
  if (seq < s.writeSeq) return false;
  if (seq < s.committedWriteSeq) return false;
  s.workingTx = bytes;
  s.committedWriteSeq = seq;
  return true;
}

export function getWorkingTx(requestId: string): Uint8Array | undefined {
  return signTxState.get(requestId)?.workingTx;
}

export function hasWorkingTx(requestId: string): boolean {
  return signTxState.get(requestId)?.workingTx != null;
}

export function clearSignTxState(requestId: string): void {
  signTxState.delete(requestId);
}
