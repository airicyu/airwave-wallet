/**
 * Fee card, transaction details, and CU apply controls for the sign shell.
 * DOM is built imperatively by approval-shell-runtime (renderFeeCard / renderTxDetails)
 * and mounted into the sign-tx-body fee and details slots.
 */

export type ApprovalFeeDetailsProps = {
  /** Reserved for a future React port; runtime paints fee UI today. */
  readonly _runtimePainted?: true;
};
