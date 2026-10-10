/** Signature fee: 5000 lamports × numRequiredSignatures (this build: 1 per tx). */
export function signatureFeeLamports(numSigners: number): bigint {
  return 5000n * BigInt(numSigners);
}

/** Priority fee: ceil(cuLimit × cuPrice / 1_000_000); if >0 and <1 lamport, use 1. */
export function priorityFeeLamportsFromCu(cuLimit: number, cuPrice: number): bigint {
  const micro = BigInt(cuLimit) * BigInt(cuPrice);
  let fee = (micro + 999_999n) / 1_000_000n;
  if (fee === 0n && micro > 0n) fee = 1n;
  return fee;
}

export function lamportsDecimalString(v: bigint): string {
  return v.toString(10);
}

export function sumLamportStrings(values: string[]): bigint {
  let sum = 0n;
  for (const s of values) {
    sum += BigInt(s);
  }
  return sum;
}
