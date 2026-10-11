/**
 * Sandbox page: runs the tool loop and talks to the parent offscreen frame.
 * Does not use chrome APIs, fetch, or the OpenRouter key.
 */
import { runSandboxLoop } from "../agent-harness/loop";
import { TX_AI_BRIDGE_KIND, type TxAiBridgeMessage, type TxAiChatMessage } from "../shared/tx-ai-protocol";
import { TX_AI_LLM_BRIDGE_MS } from "../shared/tx-ai";

const pending = new Map<string, (message: TxAiBridgeMessage) => void>();
let runAbort: AbortController | null = null;
let activeRequestId = "";

function post(message: TxAiBridgeMessage): void {
  parent.postMessage(message, "*");
}

function request(message: TxAiBridgeMessage): Promise<TxAiBridgeMessage> {
  const correlationId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(correlationId);
      reject(new Error("bridge_timeout"));
    }, TX_AI_LLM_BRIDGE_MS);
    pending.set(correlationId, (response) => {
      clearTimeout(timer);
      if (response.op === "assess.fail" || response.ok === false) {
        reject(new Error(response.message ?? "bridge_failed"));
        return;
      }
      resolve(response);
    });
    post({ ...message, correlationId });
  });
}

async function start(message: TxAiBridgeMessage): Promise<void> {
  runAbort?.abort();
  const controller = new AbortController();
  runAbort = controller;
  activeRequestId = message.requestId ?? "";
  try {
    const reportText = await runSandboxLoop({
      systemMessage: message.systemMessage ?? "",
      userMessage: message.userMessage ?? "",
      signal: controller.signal,
      callModel: async (messages) => {
        const response = await request({
          kind: TX_AI_BRIDGE_KIND,
          op: "llm.chat",
          requestId: activeRequestId,
          messages,
        });
        const body = response.body as TxAiChatMessage | undefined;
        return {
          role: "assistant" as const,
          content: body?.content ?? null,
          tool_calls: body?.tool_calls,
        };
      },
      executeTool: async (name, args) => {
        const response = await request({
          kind: TX_AI_BRIDGE_KIND,
          op: "tool",
          requestId: activeRequestId,
          name,
          args,
        });
        return response.body ?? { ok: false, error: response.message ?? "tool failed" };
      },
    });
    if (controller.signal.aborted) return;
    post({ kind: TX_AI_BRIDGE_KIND, op: "assess.done", requestId: activeRequestId, reportText });
  } catch (error) {
    if (controller.signal.aborted) return;
    post({
      kind: TX_AI_BRIDGE_KIND,
      op: "assess.fail",
      requestId: activeRequestId,
      message: error instanceof Error ? error.message.slice(0, 200) : "loop_failed",
    });
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== parent) return;
  const message = event.data as TxAiBridgeMessage | undefined;
  if (!message || message.kind !== TX_AI_BRIDGE_KIND) return;
  if ((message.op === "tool.result" || message.op === "llm.result") && message.correlationId) {
    const resolve = pending.get(message.correlationId);
    pending.delete(message.correlationId);
    resolve?.(message);
    return;
  }
  if (message.op === "assess.abort") {
    if (!message.requestId || message.requestId === activeRequestId) runAbort?.abort();
    return;
  }
  if (message.op === "assess.start") void start(message);
});

post({ kind: TX_AI_BRIDGE_KIND, op: "sandbox.ready" });
