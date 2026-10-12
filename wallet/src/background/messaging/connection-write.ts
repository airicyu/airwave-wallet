/**
 * Serializes connection-map updates in this service worker.
 * Callers already inside a step must not call this again; they finish the step inline.
 */
let tail: Promise<void> = Promise.resolve();

export function runConnectionWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(() => fn());
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
