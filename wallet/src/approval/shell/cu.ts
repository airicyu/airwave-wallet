import type { SimulatePendingTxResult } from "../../shared/tx";
import { sess } from "./session";

export const CU_LIMIT_MIN = 1;
export const CU_LIMIT_MAX = 1_400_000;
export const CU_PRICE_MIN = 0;
export const CU_PRICE_MAX = 1_000_000_000;

export const CU_CHECK_SVG =
  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>';

export function hasCuPair(): boolean {
  return sess.localCuLimit != null && sess.localCuPrice != null;
}

export function cuPairInBounds(limit: number | null, price: number | null): boolean {
  return (
    limit != null &&
    price != null &&
    limit >= CU_LIMIT_MIN &&
    limit <= CU_LIMIT_MAX &&
    price >= CU_PRICE_MIN &&
    price <= CU_PRICE_MAX
  );
}

export function draftsAreDirty(limitRaw: string, priceRaw: string): boolean {
  const committedL = sess.localCuLimit == null ? "" : String(sess.localCuLimit);
  const committedP = sess.localCuPrice == null ? "" : String(sess.localCuPrice);
  return limitRaw.trim() !== committedL || priceRaw.trim() !== committedP;
}

export function parseCuFieldInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function priorityFeeLamports(cuLimit: number, cuPrice: number): number {
  const micro = BigInt(cuLimit) * BigInt(cuPrice);
  return Number((micro + 999_999n) / 1_000_000n);
}

export function localTotalFeeLamports(sim: SimulatePendingTxResult | null): number | null {
  if (!sim || sim.sigFeeLamports == null) return null;
  if (sess.localCuLimit != null && sess.localCuPrice != null) {
    return sim.sigFeeLamports + priorityFeeLamports(sess.localCuLimit, sess.localCuPrice);
  }
  return sim.totalFeeLamports ?? null;
}

export function retrySimDisabled(): boolean {
  return sess.simulating || sess.cuDirty || (sess.txCuEditable && !hasCuPair());
}
