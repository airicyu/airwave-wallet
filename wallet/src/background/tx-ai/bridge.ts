/**
 * Service-worker side of the offscreen bridge: allowlisted tools and chat completions.
 * Does not trust the sandbox's flags or level text when grading.
 */
import { SANDBOX_TOOL_SCHEMAS } from "../../agent-harness/loop";
import { TX_AI_BRIDGE_KIND, type TxAiBridgeMessage, type TxAiChatMessage } from "../../shared/tx-ai-protocol";
import { normalizeReportModel } from "../../shared/tx-ai";
import { readSettings } from "../storage";
import { resolveTxAiLoop, rememberDecodePubkeys } from "./assess";
import { executeHostTool } from "./host-tools";
import { openRouterChat } from "./openrouter";
import { activeTxAiRequestId, getTxAiSession } from "./runtime";

export function isTxAiOffscreenSender(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || sender.tab) return false;
  return (sender.url ?? "").includes("offscreen");
}

function chatTools(): unknown[] {
  return SANDBOX_TOOL_SCHEMAS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function sanitizeMessages(raw: unknown): TxAiChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 48) return null;
  const out: TxAiChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    if (role !== "system" && role !== "user" && role !== "assistant" && role !== "tool") return null;
    const contentRaw = (item as { content?: unknown }).content;
    const content = typeof contentRaw === "string" ? contentRaw.slice(0, 12_000) : null;
    const message: TxAiChatMessage = { role, content };
    if (role === "tool") {
      const id = (item as { tool_call_id?: unknown }).tool_call_id;
      if (typeof id !== "string") return null;
      message.tool_call_id = id.slice(0, 80);
      message.content = content ?? "";
    }
    if (role === "assistant" && Array.isArray((item as { tool_calls?: unknown }).tool_calls)) {
      const calls = (item as { tool_calls: unknown[] }).tool_calls.slice(0, 8);
      message.tool_calls = [];
      for (const call of calls) {
        if (!call || typeof call !== "object") continue;
        const id = (call as { id?: unknown }).id;
        const fn = (call as { function?: { name?: unknown; arguments?: unknown } }).function;
        if (typeof id !== "string" || !fn || typeof fn.name !== "string") continue;
        message.tool_calls.push({
          id: id.slice(0, 80),
          type: "function",
          function: {
            name: fn.name.slice(0, 80),
            arguments: typeof fn.arguments === "string" ? fn.arguments.slice(0, 4_000) : "{}",
          },
        });
      }
    }
    out.push(message);
  }
  return out;
}

function pubkeysFromDecode(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const instructions = (body as { instructions?: { accounts?: { pubkey?: string }[] }[] }).instructions;
  if (!Array.isArray(instructions)) return [];
  const keys = new Set<string>();
  for (const ix of instructions) {
    for (const account of ix.accounts ?? []) {
      if (typeof account.pubkey === "string" && account.pubkey !== "unresolved") keys.add(account.pubkey);
    }
  }
  return [...keys];
}

export async function handleTxAiBridge(message: TxAiBridgeMessage): Promise<TxAiBridgeMessage> {
  const requestId = message.requestId ?? "";
  const session = getTxAiSession(requestId);
  if (!session || requestId !== activeTxAiRequestId()) {
    return { kind: TX_AI_BRIDGE_KIND, op: "assess.fail", requestId, message: "rejected" };
  }
  if (message.op === "assess.done") {
    resolveTxAiLoop(requestId, { ok: true, reportText: typeof message.reportText === "string" ? message.reportText : "" });
    return { kind: TX_AI_BRIDGE_KIND, op: "tool.result", correlationId: message.correlationId, ok: true, body: { accepted: true } };
  }
  if (message.op === "assess.fail") {
    resolveTxAiLoop(requestId, {
      ok: false,
      message: typeof message.message === "string" ? message.message.slice(0, 200) : "loop_failed",
    });
    return { kind: TX_AI_BRIDGE_KIND, op: "tool.result", correlationId: message.correlationId, ok: true, body: { accepted: true } };
  }
  if (message.op === "tool") {
    const name = typeof message.name === "string" ? message.name : "";
    const body = await executeHostTool({
      name,
      toolArgs: message.args,
      snapshot: session.snapshot,
      rpcUrl: (await readSettings()).rpcUrl,
      decodedPubkeys: session.decodedPubkeys,
      signal: session.abort.signal,
    });
    if (name === "decode_message") rememberDecodePubkeys(requestId, pubkeysFromDecode(body));
    return { kind: TX_AI_BRIDGE_KIND, op: "tool.result", correlationId: message.correlationId, ok: true, body };
  }
  if (message.op === "llm.chat") {
    const messages = sanitizeMessages(message.messages);
    if (!messages) {
      return {
        kind: TX_AI_BRIDGE_KIND,
        op: "llm.result",
        correlationId: message.correlationId,
        ok: false,
        message: "bad messages",
      };
    }
    const settings = await readSettings();
    const assistant = await openRouterChat({
      apiKey: settings.openRouterApiKey,
      model: normalizeReportModel(settings.openRouterModel),
      messages,
      tools: chatTools(),
      signal: session.abort.signal,
    });
    return {
      kind: TX_AI_BRIDGE_KIND,
      op: "llm.result",
      correlationId: message.correlationId,
      ok: true,
      body: assistant,
    };
  }
  return { kind: TX_AI_BRIDGE_KIND, op: "assess.fail", requestId, message: "rejected" };
}
