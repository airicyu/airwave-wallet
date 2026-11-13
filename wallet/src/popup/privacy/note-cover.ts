/**
 * Orders private notes for Send and Unshield, largest amount first, then by id.
 * coverAmount walks that order and takes a prefix whose sum covers the target.
 * Merge sorts notes the other way and does not use this helper.
 *
 * The walk stops once the running sum covers the target. It does not skip a larger note to leave less change. The ids it returns are the notes confirm sends into the proof.
 */
export type SpendNote = { id: string; amount: string; amountRaw: string };

export function notesByAmountDesc(notes: SpendNote[]): SpendNote[] {
  return [...notes].sort((a, b) => {
    const amount = BigInt(b.amountRaw) - BigInt(a.amountRaw);
    if (amount !== 0n) return amount > 0n ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function coverAmount(notes: SpendNote[], target: bigint): string[] {
  let sum = 0n;
  const ids: string[] = [];
  for (const note of notes) {
    if (sum >= target) break;
    ids.push(note.id);
    sum += BigInt(note.amountRaw);
  }
  return ids;
}
