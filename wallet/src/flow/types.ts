export type FlowPageId = "connect" | "sign-message" | "sign-transaction";

export type FlowEntry = {
  pageId: FlowPageId;
  requestId: string;
};
