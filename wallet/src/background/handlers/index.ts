/**
 * Re-exports the public surface of the background handlers folder: dApp handlers, UI handlers, and wallet command dispatch.
 * Callers outside this folder import this file rather than a module inside it.
 */
export * from "./dapp-handlers";
export * from "./ui-handlers";
export { handleWalletCommand } from "./wallet-dispatch";
