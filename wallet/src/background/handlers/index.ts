/**
 * This file re-exports the public surface of the background handlers folder: dApp handlers, UI handlers, and the wallet command dispatch.
 */
export * from "./dapp-handlers";
export * from "./ui-handlers";
export { handleWalletCommand } from "./wallet-dispatch";
