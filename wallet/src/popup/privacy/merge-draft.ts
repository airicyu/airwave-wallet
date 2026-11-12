/**
 * Remembers that the open approval is a merge batch.
 * Does not store note secrets.
 */
let requestId = "";
let open = false;

export function markMergeApproval(id: string): void {
  requestId = id;
  open = true;
}

export function consumeMergeApproval(): string | null {
  if (!open) return null;
  open = false;
  const id = requestId;
  requestId = "";
  return id;
}

export function mergeApprovalOpen(): boolean {
  return open;
}
