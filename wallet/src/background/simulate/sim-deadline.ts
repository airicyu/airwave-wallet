/**
 * Simulation RPC timeout budget with remaining time and raced async work.
 * Does not call RPC or compute balance deltas.
 */

const SIM_TIMEOUT_MS = 15_000;

export class SimDeadline {
  private readonly endsAt = Date.now() + SIM_TIMEOUT_MS;

  remainingMs(): number {
    return Math.max(0, this.endsAt - Date.now());
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    const ms = this.remainingMs();
    if (ms <= 0) throw new Error("SIM_TIMEOUT");
    return Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("SIM_TIMEOUT")), ms);
      }),
    ]);
  }
}
