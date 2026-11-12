/**
 * Holds merge groups that still need a proof after the one batch approval.
 * Cleared on lock. Does not store shielded secrets.
 */
type Batch = { accountId: string; asset: string; groups: string[][] };

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
