/**
 * This file holds the flow page ids and the stack entry that pairs a page with a pending request id.
 */
export type FlowPageId = "connect" | "sign-message" | "sign-transaction";

export type FlowEntry = {
  pageId: FlowPageId;
  requestId: string;
};
