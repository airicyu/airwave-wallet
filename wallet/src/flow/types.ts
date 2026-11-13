/**
 * Flow page ids and the stack entry that pairs a page with one pending request id.
 * The stack module pushes and pops those entries. This file only names them.
 */
export type FlowPageId = "connect" | "sign-message" | "sign-transaction";

export type FlowEntry = {
  pageId: FlowPageId;
  requestId: string;
};
