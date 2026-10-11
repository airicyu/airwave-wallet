/**
 * test-web sign-risk: wrap local decode/RPC as bubble-harness host tools and run
 * a multi-step OpenRouter loop. Not the wallet approval path.
 */
import {
  createHarness,
  createOpenRouterCallModel,
  runAgentLoop,
  type AgentLoopEvent,
  type AgentLoopEventHandler,
  type HostToolDefinition,
  type RunAgentLoopResult,
} from "../vendor/bubble-harness.js";
import {
  applyOwnerMismatch,
  messageBytesFromWire,
  staticFlagsFromMessage,
  staticFlagsFromRpcJsonMessage,
  type LoadedAddresses,
  type RpcJsonMessage,
  type StaticFlags,
} from "./sign-risk-decode";
import { fetchChainAccounts, rpcRead, type ChainAccount } from "./sign-risk-rpc";
import { buildFlattenedRpcTools } from "./sign-risk-rpc-tools";

export type HarnessSession = {
  transactionBase64: string;
  wireForm: string;
  loaded?: LoadedAddresses;
  rpcUrl: string;
  /** RPC json message — required for Solana tx version 1 binary compatibility. */
  rpcJsonMessage?: RpcJsonMessage;
};

export type HarnessRunView = {
  stopReason: RunAgentLoopResult["stopReason"];
  steps: number;
  finalText: string;
  trace: string;
  lastDecode: StaticFlags | null;
  lastAccounts: ChainAccount[] | null;
};

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/** Local demos store raw message bytes; RPC／masked-wire store full wire. */
function messageBytesFromSession(session: HarnessSession): Uint8Array {
  const bytes = base64ToBytes(session.transactionBase64);
  if (session.wireForm === "message") return bytes;
  return messageBytesFromWire(bytes);
}

/** Skip well-known programs — they clutter RPC results and waste the tool result cap. */
const SKIP_ACCOUNT_LOOKUP = new Set([
  "11111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "ComputeBudget111111111111111111111111111111",
  "So11111111111111111111111111111111111111112",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  "Memo1UhkJRfHyvLMcVucJyeXtyXNSDyzPVsqVQ5m5",
]);

function collectPubkeys(summary: StaticFlags): string[] {
  const keys = [summary.feePayer];
  for (const ix of summary.instructions) {
    for (const account of ix.accounts) keys.push(account.pubkey);
  }
  return [...new Set(keys.filter((k) => k && k !== "未解析" && !SKIP_ACCOUNT_LOOKUP.has(k)))];
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "string")) return null;
  return value;
}

/** Host product shape — not a bubble-harness concern. */
function looksLikeFinalReport(text: string): boolean {
  if (!text) return false;
  if (text.length > 900) return false;
  if (!/等級\s*[：:]\s*(低|留意|高|未知)/.test(text)) return false;
  if (/\b(Hmm|Wait|Anyway|Hold on|Let me|I'll start)\b/i.test(text)) return false;
  return true;
}

function preview(text: string, max = 280): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Build a live-friendly line from a harness onEvent payload. */
export function formatLoopEvent(event: AgentLoopEvent): string | null {
  if (event.type === "step") {
    return `— step ${event.step}/${event.maxSteps}`;
  }
  if (event.type === "assistant") {
    const calls = event.message.tool_calls ?? [];
    if (calls.length > 0) {
      return calls.map((c) => `→ ${c.function.name}(${c.function.arguments})`).join("\n");
    }
    if (event.message.content) {
      return `assistant: ${event.message.content.trim()}`;
    }
    return null;
  }
  if (event.type === "tool") {
    return `← ${event.toolCall.function.name}: ${preview(event.message.content)}`;
  }
  if (event.type === "nudge") {
    return `— nudge (${event.reason}): ${preview(event.message.content ?? "")}`;
  }
  if (event.type === "done") {
    return `— done (${event.stopReason}, ${event.steps} steps)`;
  }
  return null;
}

function buildHostTools(session: HarnessSession, state: {
  lastDecode: StaticFlags | null;
  lastAccounts: ChainAccount[] | null;
}): HostToolDefinition[] {
  return [
    {
      name: "decode_message",
      description:
        "Decode the session transaction bytes into feePayer, instructions, and deterministic risk flags. Call this before judging the tx.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: () => {
        const summary = session.rpcJsonMessage
          ? staticFlagsFromRpcJsonMessage(session.rpcJsonMessage, session.loaded)
          : staticFlagsFromMessage(messageBytesFromSession(session), session.loaded);
        state.lastDecode = summary;
        return {
          ok: true,
          wireForm: session.wireForm,
          decodePath: session.rpcJsonMessage ? "rpc-json" : "binary",
          feePayer: summary.feePayer,
          instructions: summary.instructions,
          flags: summary.flags,
        };
      },
    },
    {
      name: "get_accounts",
      description:
        "Fetch on-chain account data (lamports, owner program, parsed token account fields) via RPC. Omit pubkeys to use keys from the last decode_message.",
      parameters: {
        type: "object",
        properties: {
          pubkeys: {
            type: "array",
            items: { type: "string" },
            description: "Base58 pubkeys; max 100. Omit to use keys from last decode.",
          },
        },
        additionalProperties: false,
      },
      execute: async (args: Record<string, unknown>) => {
        if (!session.rpcUrl) {
          return { ok: false, error: "RPC URL not set in the page" };
        }
        let pubkeys = asStringArray(args.pubkeys);
        if (!pubkeys) {
          if (!state.lastDecode) {
            return { ok: false, error: "Call decode_message first, or pass pubkeys" };
          }
          pubkeys = collectPubkeys(state.lastDecode);
        }
        const chainAccounts = await fetchChainAccounts(session.rpcUrl, pubkeys);
        state.lastAccounts = chainAccounts;
        if (state.lastDecode) {
          const tokenOwner = new Map<string, string>();
          for (const item of chainAccounts) {
            if (item.token) tokenOwner.set(item.pubkey, item.token.owner);
          }
          applyOwnerMismatch(state.lastDecode, tokenOwner);
        }
        const found = chainAccounts.filter((a) => a.found).length;
        return {
          ok: true,
          count: chainAccounts.length,
          found,
          missing: chainAccounts.length - found,
          note: "found:false means the account has no data on this RPC cluster (or was closed). Well-known programs are omitted from the default key list.",
          chainAccounts,
          flags: state.lastDecode?.flags ?? [],
        };
      },
    },
    {
      name: "simulate",
      description:
        "JSON-RPC simulateTransaction for the session wire (replaceRecentBlockhash, no sigVerify). Bare message samples fail. Historical/mainnet wires often fail against current pool/account state (expired blockhash, closed ATA, liquidity changed)—treat err as replay noise unless logs show a clear authority/permission issue; do not raise risk level solely because simulate failed.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        if (!session.rpcUrl) {
          return { ok: false, error: "RPC URL not set in the page" };
        }
        if (session.wireForm === "message") {
          return {
            ok: false,
            error: "Session is a bare message (no signature region); simulate needs full wire or masked-wire",
          };
        }
        return rpcRead(session.rpcUrl, "simulateTransaction", [
          session.transactionBase64,
          {
            encoding: "base64",
            replaceRecentBlockhash: true,
            sigVerify: false,
            commitment: "processed",
          },
        ]);
      },
    },
    ...buildFlattenedRpcTools(session.rpcUrl),
  ];
}

export async function runSignRiskHarness(input: {
  session: HarnessSession;
  systemMessage: string;
  apiKey: string;
  model: string;
  onEvent?: AgentLoopEventHandler;
}): Promise<HarnessRunView> {
  const state = { lastDecode: null as StaticFlags | null, lastAccounts: null as ChainAccount[] | null };
  const kv = new Map<string, string>();
  const traceLines: string[] = [];
  const callModel = createOpenRouterCallModel({
    apiKey: input.apiKey,
    model: input.model,
    baseUrl: `${location.origin}/openrouter/api/v1`,
    referer: location.origin,
    title: "Airwave sign-risk harness poc",
  });
  const harness = createHarness({
    kvStore: {
      get: async (key: string) => kv.get(key) ?? null,
      set: async (key: string, value: string) => {
        kv.set(key, value);
      },
    },
    hostTools: buildHostTools(input.session, state),
    // Deny open web fetch in this POC; use host tools only.
    fetchAllowlist: ["https://__fetch-disabled__/"],
    maxSteps: 12,
    toolResultMaxBytes: 16384,
    callModel,
  });

  const onEvent: AgentLoopEventHandler = async (event) => {
    const line = formatLoopEvent(event);
    if (line) {
      traceLines.push(line);
      console.log("[sign-risk harness]", event.type, event);
    }
    await input.onEvent?.(event);
  };

  const result = await runAgentLoop(harness, {
    systemMessage: input.systemMessage,
    temperature: 0,
    maxTokens: 1200,
    retryEmptyFinal: true,
    emptyFinalUserMessage:
      "工具已結束但上一則沒有可見文字。請只輸出繁體中文四段報告與最後一行等級（低／留意／高／未知），不要再呼叫任何 tool。",
    onEvent,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Analyze this Solana transaction for user-facing security notes.",
          wireForm: input.session.wireForm,
          hasRpc: Boolean(input.session.rpcUrl),
          hint: "Call decode_message first. Use get_accounts / simulate / rpc_get_* when needed. If simulate fails on an rpc-wire session, treat it as stale-state noise—not proof of malice. When finished with tools, your LAST assistant message must be ONLY the Traditional Chinese report (four sections + 等級)—no English preamble, no 'I'll start…'.",
        }),
      },
    ],
  });

  let finalText = result.finalText;

  // Product-format rewrite only (host). Empty/reasoning transport is handled by harness.
  if (finalText && !looksLikeFinalReport(finalText)) {
    traceLines.push("— host rewrite: final text is not the Chinese report shape");
    const nudged = await callModel({
      messages: [
        ...result.messages,
        {
          role: "user",
          content:
            "上一則不是合格報告（禁止英文思考過程）。請重寫：只輸出繁體中文、200 字內、四段（這筆在做什麼／flags／缺什麼資料／最後一行「等級：低|留意|高|未知」）。不要再呼叫 tool。本地樣本的巨額餘額是環境噪音，勿當劇情。",
        },
      ],
      tools: [],
      temperature: 0,
      maxTokens: 600,
    });
    const text = nudged.message.content?.trim() ?? "";
    if (text) {
      finalText = text;
      traceLines.push(`assistant: ${text}`);
    }
  }

  if (!finalText) {
    finalText = `(無最終報告：stopReason=${result.stopReason}，${result.steps} 步)`;
  } else if (!looksLikeFinalReport(finalText)) {
    finalText = `${finalText}\n\n（提醒：上列可能仍是模型思考過程，非正式四段報告）`;
  }

  return {
    stopReason: result.stopReason,
    steps: result.steps,
    finalText,
    trace: traceLines.join("\n\n") || "(no events)",
    lastDecode: state.lastDecode,
    lastAccounts: state.lastAccounts,
  };
}
