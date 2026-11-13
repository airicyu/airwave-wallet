/**
 * Holds merge transactions that were already proved and are waiting for one confirm.
 * Confirm signs these bytes. It does not build another transaction.
 * Lock clears the stash. The note ids are only the labels shown on the confirm screen.
 */
type Batch = { accountId: string; wires: Uint8Array[]; groups: string[][] };

const batches = new Map<string, Batch>();

export function stashMergeBatch(requestId: string, batch: Batch): void {
  batches.set(requestId, batch);
}

export function takeMergeBatch(requestId: string): Batch | undefined {
  const batch = batches.get(requestId);
  batches.delete(requestId);
  return batch;
}

export function clearMergeBatches(): void {
  batches.clear();
}
