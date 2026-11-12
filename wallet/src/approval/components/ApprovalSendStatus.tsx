/**
 * Status cards for a wallet send after approve: confirming, failed, and confirmed.
 * The sign body chooses which card to show from the send result.
 * This file does not submit the transaction or poll the chain.
 */
export {
  enterWalletSendConfirming,
  enterWalletSendConfirmedPage,
  enterWalletSendFailedPage,
  resetSendStatusUiForNewReview,
  restoreWalletSendReviewAfterError,
} from "../dom/send-status";
export type { SendFailUiExtra } from "../dom/send-status";
