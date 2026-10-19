/**
 * Wallet-send status DOM: confirming, failed, and confirmed cards in the sign body.
 */
export {
  enterWalletSendConfirming,
  enterWalletSendConfirmedPage,
  enterWalletSendFailedPage,
  resetSendStatusUiForNewReview,
  restoreWalletSendReviewAfterError,
} from "../dom/send-status";
export type { SendFailUiExtra } from "../dom/send-status";
