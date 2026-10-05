/** 串行化所有寫入 `airwave.vault.v1` 與改密路徑，避免交錯覆寫。 */
let chain: Promise<void> = Promise.resolve();

export function runVaultWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(() => fn());
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
