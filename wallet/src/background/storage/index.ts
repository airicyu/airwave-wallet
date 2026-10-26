/**
 * This file re-exports the public surface of the storage folder: the chrome.storage readers and writers, and the local migration entry.
 */
export * from "./storage-io";
export { ensureLocalMigrated } from "./migrate-local";
