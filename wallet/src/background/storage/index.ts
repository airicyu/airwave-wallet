/**
 * Re-exports chrome.storage readers and writers, and the local migration entry.
 * Callers outside this folder import this file rather than a module inside it.
 */
export * from "./storage-io";
export { ensureLocalMigrated } from "./migrate-local";
