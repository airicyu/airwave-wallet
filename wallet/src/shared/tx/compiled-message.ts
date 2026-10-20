import type { CompiledTransactionMessage } from "@solana/kit";

export type NormalizedCompiledIx = {
  programAddressIndex: number;
  accountIndices: number[];
  data: Uint8Array;
};

export function normalizedCompiledInstructions(
  message: CompiledTransactionMessage,
): NormalizedCompiledIx[] {
  if (message.version === 1) {
    const out: NormalizedCompiledIx[] = [];
    for (let i = 0; i < message.numInstructions; i++) {
      const h = message.instructionHeaders[i];
      const p = message.instructionPayloads[i];
      out.push({
        programAddressIndex: h.programAccountIndex,
        accountIndices: [...p.instructionAccountIndices],
        data: new Uint8Array(p.instructionData),
      });
    }
    return out;
  }
  return message.instructions.map((ix) => ({
    programAddressIndex: ix.programAddressIndex,
    accountIndices: [...(ix.accountIndices ?? [])],
    data: new Uint8Array(ix.data ?? []),
  }));
}

export function compiledAddressTableLookups(
  message: CompiledTransactionMessage,
): readonly { lookupTableAddress: string; writableIndexes: readonly number[]; readonlyIndexes: readonly number[] }[] {
  if (message.version !== 0) return [];
  return message.addressTableLookups ?? [];
}

export function messageBytesToUint8Array(messageBytes: ArrayLike<number>): Uint8Array {
  return Uint8Array.from(messageBytes);
}
