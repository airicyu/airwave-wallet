/**
 * Serializes every write to the vault record and every password change.
 * Two writes must not interleave, or a later write can store a vault encrypted with a password the user no longer has.
 * Readers do not go through this queue.
 */
let chain: Promise<void> = Promise.resolve();

export function runVaultWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(() => fn());
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
