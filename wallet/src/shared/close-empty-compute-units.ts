/** Agave max per transaction. */
const MAX_COMPUTE_UNIT_LIMIT = 1_400_000;

/**
 * Kit `estimateResourceLimitsFactory` simulates the closes-only message (no Compute Budget
 * program instructions) and returns `unitsConsumed` with no margin. The wire tx adds
 * SetComputeUnitLimit + SetComputeUnitPrice before close ixs — reserve headroom for both.
 */
const COMPUTE_BUDGET_PROGRAM_IX_HEADROOM = 6_000;

/** Avoid tiny limits when sim returns very small consumption (single close ~100–300 CU). */
const MIN_CLOSE_EMPTY_CU_LIMIT = 10_000;

/**
 * Final SetComputeUnitLimit for close-empty txs. Aligns with 0.11 sign-tx margin (×1.25)
 * plus explicit budget for the two CB instructions omitted from the estimate message.
 */
export function computeCloseEmptyUnitLimit(simulatedUnitsConsumed: number): number {
  if (!Number.isFinite(simulatedUnitsConsumed) || simulatedUnitsConsumed < 0) {
    return MIN_CLOSE_EMPTY_CU_LIMIT;
  }
  const withMargin =
    Math.ceil(simulatedUnitsConsumed * 1.25) + COMPUTE_BUDGET_PROGRAM_IX_HEADROOM;
  return Math.min(MAX_COMPUTE_UNIT_LIMIT, Math.max(MIN_CLOSE_EMPTY_CU_LIMIT, withMargin));
}
