/** On-chain lamports (BigInt or decimal string) → SOL display. Do not add/subtract via number. */
export function formatSolFromLamportsString(lamports: string | bigint): string {
  const v = typeof lamports === "string" ? BigInt(lamports) : lamports;
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const whole = abs / 1_000_000_000n;
  const frac = abs % 1_000_000_000n;
  let fracStr = frac.toString(10).padStart(9, "0");
  fracStr = fracStr.replace(/0+$/, "");
  const body = fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  return `${neg ? "-" : ""}${body} SOL`;
}
