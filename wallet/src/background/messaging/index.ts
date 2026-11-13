/**
 * Re-exports the public surface of background messaging: the response helper, origin notify, the approval popout, and the in-shell dApp notice.
 * Callers outside this folder import this file rather than a module inside it.
 */
export * from "./ext-respond";
export * from "./origin-notify";
export * from "./open-popout";
export * from "./open-dapp-in-shell";
