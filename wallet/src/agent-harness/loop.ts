/**
 * Multi-step tool loop copied for the sandbox bundle.
 * Does not fetch, read chrome APIs, or hold an API key. The host performs those calls.
 */
import type { TxAiChatMessage } from "../shared/tx-ai";
import { TX_AI_MAX_STEPS } from "../shared/tx-ai";

export type ToolSchema = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type AssistantMessage = {
  role: "assistant";
  content?: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

const TOOL_RESULT_MAX = 8_000;

function clip(text: string): string {
  return text.length > TOOL_RESULT_MAX ? `${text.slice(0, TOOL_RESULT_MAX)}…` : text;
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    /* model sent non-JSON */
  }
  return {};
}

export const SANDBOX_TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: "decode_message",
    description: "Decode the pending transaction snapshot into instructions and deterministic flags.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_accounts",
    description: "Read account data. Optional pubkeys; omit to use accounts from the last decode.",
    parameters: {
      type: "object",
      properties: { pubkeys: { type: "array", items: { type: "string" } } },
      additionalProperties: false,
    },
  },
  {
    name: "simulate",
    description: "simulateTransaction on the snapshot with replaceRecentBlockhash and no sigVerify.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "rpc_get_balance",
    description: "getBalance for one pubkey.",
    parameters: {
      type: "object",
      properties: { pubkey: { type: "string" } },
      required: ["pubkey"],
      additionalProperties: false,
    },
  },
  {
    name: "rpc_get_account_info",
    description: "getAccountInfo. encoding base64 or jsonParsed.",
    parameters: {
      type: "object",
      properties: { pubkey: { type: "string" }, encoding: { type: "string" } },
      required: ["pubkey"],
      additionalProperties: false,
    },
  },
  {
    name: "rpc_get_multiple_accounts",
    description: "getMultipleAccounts for up to 20 pubkeys.",
    parameters: {
      type: "object",
      properties: {
        pubkeys: { type: "array", items: { type: "string" } },
        encoding: { type: "string" },
      },
      required: ["pubkeys"],
      additionalProperties: false,
    },
  },
  {
    name: "rpc_get_token_accounts_by_owner",
    description: "getTokenAccountsByOwner. Pass mint or programId.",
    parameters: {
      type: "object",
      properties: { owner: { type: "string" }, mint: { type: "string" }, programId: { type: "string" } },
      required: ["owner"],
      additionalProperties: false,
    },
  },
  {
    name: "rpc_get_signatures_for_address",
    description: "getSignaturesForAddress. limit max 20.",
    parameters: {
      type: "object",
      properties: { address: { type: "string" }, limit: { type: "number" } },
      required: ["address"],
      additionalProperties: false,
    },
  },
  {
    name: "rpc_get_transaction",
    description: "getTransaction by signature.",
    parameters: {
      type: "object",
      properties: { signature: { type: "string" } },
      required: ["signature"],
      additionalProperties: false,
    },
  },
  {
    name: "rpc_get_latest_blockhash",
    description: "getLatestBlockhash.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
];

export async function runSandboxLoop(args: {
  systemMessage: string;
  userMessage: string;
  signal: AbortSignal;
  callModel: (messages: TxAiChatMessage[]) => Promise<AssistantMessage>;
  executeTool: (name: string, toolArgs: Record<string, unknown>) => Promise<unknown>;
}): Promise<string> {
  const messages: TxAiChatMessage[] = [
    { role: "system", content: args.systemMessage },
    { role: "user", content: args.userMessage },
  ];
  let nudged = false;
  for (let step = 1; step <= TX_AI_MAX_STEPS; step += 1) {
    if (args.signal.aborted) throw new Error("aborted");
    const assistant = await args.callModel(messages);
    const calls = assistant.tool_calls ?? [];
    messages.push({
      role: "assistant",
      content: assistant.content ?? null,
      ...(calls.length ? { tool_calls: calls } : {}),
    });
    if (calls.length === 0) {
      const text = (assistant.content ?? "").trim();
      if (text) return text;
      if (!nudged && step < TX_AI_MAX_STEPS) {
        nudged = true;
        messages.push({
          role: "user",
          content: "Write the report now in the requested language. Do not call tools.",
        });
        continue;
      }
      return text;
    }
    const toolResults = await Promise.all(
      calls.map(async (call) => {
        if (args.signal.aborted) throw new Error("aborted");
        let body: unknown;
        try {
          body = await args.executeTool(call.function.name, parseArgs(call.function.arguments));
        } catch (error) {
          body = { ok: false, error: error instanceof Error ? error.message : "tool failed" };
        }
        return { call, body };
      }),
    );
    for (const { call, body } of toolResults) {
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: clip(typeof body === "string" ? body : JSON.stringify(body)),
      });
    }
  }
  const last = [...messages].reverse().find((message) => message.role === "assistant" && message.content?.trim());
  return (last?.content ?? "").trim();
}
