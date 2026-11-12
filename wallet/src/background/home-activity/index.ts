/**
 * Re-exports the public surface of the home-activity background folder: the command handler and the activity fetch.
 * Callers outside this folder import this file rather than a module inside it.
 */
export { handleGetHomeActivity } from "./get-home-activity-command";
export { getHomeActivity } from "./home-activity-service";
