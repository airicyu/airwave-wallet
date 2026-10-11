/**
 * JSON messages between the service worker, offscreen document, and sandbox iframe.
 * Does not execute tools or hold API keys.
 */

export const TX_AI_BRIDGE_KIND = "airwave-tx-ai";

export type TxAiChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

export type TxAiBridgeMessage = {
  kind: typeof TX_AI_BRIDGE_KIND;
  op: string;
  requestId?: string;
  correlationId?: string;
  name?: string;
  args?: unknown;
  messages?: TxAiChatMessage[];
  reportText?: string;
  message?: string;
  ok?: boolean;
  body?: unknown;
  systemMessage?: string;
  userMessage?: string;
};
