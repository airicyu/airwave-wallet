/** Serialize every write to `airwave.vault.v1` and password-change paths so they cannot interleave. */
let chain: Promise<void> = Promise.resolve();

export function runVaultWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(() => fn());
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
