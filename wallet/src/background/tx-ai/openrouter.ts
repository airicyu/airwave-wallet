/**
 * OpenRouter chat and Decisions calls made only by the service worker.
 * Does not run inside the sandbox and does not persist the API key.
 */
import {
  applyFlagsFloor,
  classifyOpenRouterFailure,
  isTxAiLevel,
  type TxAiFlag,
  type TxAiLevel,
} from "../../shared/tx-ai";

const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";

const LEVEL_CRITERIA: Record<TxAiLevel, string> = {
  low: "Ordinary transfer or common DEX swap. No authority handoff, unlimited approve, owner mismatch, or external close.",
  watch:
    "Needs attention: unlimited approve, authority change, system assign, external close, or ambiguous privilege. Not a clear theft pattern.",
  high: "Clear loss of control: owner mismatch, ownership handed away, or the report describes a drain.",
  unknown: "Thin or contradictory evidence. Prefer unknown over guessing low.",
};

type ChatResult = {
  content?: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function httpStatusFromOpenRouterError(err: unknown): number | null {
  if (!(err instanceof Error)) return null;
  const chat = err.message.match(/^chat_http_(\d+)$/);
  if (chat) return Number(chat[1]);
  const decisions = err.message.match(/^decisions_http_(\d+)$/);
  if (decisions) return Number(decisions[1]);
  return null;
}

export async function callWithModelChain<T>(
  chain: readonly string[],
  invokeOne: (model: string) => Promise<T>,
): Promise<{ modelUsed: string; result: T }> {
  if (chain.length === 0) throw new Error("model_chain_exhausted");
  for (let i = 0; i < chain.length; i += 1) {
    const model = chain[i];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await invokeOne(model);
        return { modelUsed: model, result };
      } catch (err) {
        const kind = classifyOpenRouterFailure(httpStatusFromOpenRouterError(err));
        if (kind === "retry_same" && attempt === 0) {
          await sleep(1000);
          continue;
        }
        if (kind === "try_next" && i < chain.length - 1) break;
        throw err;
      }
    }
  }
  throw new Error("model_chain_exhausted");
}

function parseChatMessage(json: {
  choices?: { message?: ChatResult }[];
}): ChatResult {
  const message = json.choices?.[0]?.message;
  if (!message) throw new Error("chat_empty");
  const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  const tool_calls = rawCalls.length
    ? rawCalls.map((tc, index) => {
        const fn = tc.function;
        const name = typeof fn?.name === "string" ? fn.name : "";
        const args = typeof fn?.arguments === "string" ? fn.arguments : "{}";
        const id =
          typeof tc.id === "string" && tc.id.trim()
            ? tc.id
            : `call_${index}_${name || "tool"}`;
        return { id, type: "function" as const, function: { name, arguments: args } };
      })
    : undefined;
  return {
    content: typeof message.content === "string" ? message.content : message.content ?? null,
    tool_calls,
  };
}

async function openRouterChatOnce(args: {
  apiKey: string;
  model: string;
  messages: unknown;
  tools: unknown;
  signal: AbortSignal;
}): Promise<ChatResult> {
  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://airwave.app",
      "X-Title": "Airwave",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      tools: args.tools,
      temperature: 0.2,
    }),
    signal: args.signal,
  });
  if (!response.ok) {
    throw new Error(`chat_http_${response.status}`);
  }
  const json = (await response.json()) as { choices?: { message?: ChatResult }[] };
  return parseChatMessage(json);
}

export async function openRouterChat(args: {
  apiKey: string;
  model: string;
  messages: unknown;
  tools: unknown;
  signal: AbortSignal;
}): Promise<ChatResult> {
  const { result } = await callWithModelChain([args.model], (model) =>
    openRouterChatOnce({ ...args, model }),
  );
  return result;
}

export async function openRouterChatWithChain(args: {
  apiKey: string;
  chain: readonly string[];
  lockedModel?: string;
  messages: unknown;
  tools: unknown;
  signal: AbortSignal;
}): Promise<{ modelUsed: string; result: ChatResult }> {
  const chain = buildLockedChain(args.chain, args.lockedModel);
  return callWithModelChain(chain, (model) =>
    openRouterChatOnce({ apiKey: args.apiKey, model, messages: args.messages, tools: args.tools, signal: args.signal }),
  );
}

function buildLockedChain(chain: readonly string[], lockedModel?: string): string[] {
  if (!lockedModel?.trim()) return [...chain];
  const trimmed = lockedModel.trim();
  const idx = chain.indexOf(trimmed);
  if (idx < 0) return [trimmed, ...chain];
  return [trimmed, ...chain.slice(idx + 1)];
}

export async function gradeReport(args: {
  apiKey: string;
  chain: readonly string[];
  reportText: string;
  flags: TxAiFlag[];
  kind: string;
  locale: string;
  signal: AbortSignal;
}): Promise<{ decisionsLevel: TxAiLevel; level: TxAiLevel }> {
  let decisionsLevel: TxAiLevel = "unknown";
  try {
    const { result } = await callWithModelChain(args.chain, (model) =>
      requestDecisionsLevelOnce(args, model),
    );
    decisionsLevel = result;
  } catch {
    decisionsLevel = "unknown";
  }
  return { decisionsLevel, level: applyFlagsFloor(decisionsLevel, args.flags) };
}

async function requestDecisionsLevelOnce(
  args: {
    apiKey: string;
    reportText: string;
    flags: TxAiFlag[];
    kind: string;
    locale: string;
    signal: AbortSignal;
  },
  model: string,
): Promise<TxAiLevel> {
  const response = await fetch(DECISIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://airwave.app",
      "X-Title": "Airwave",
    },
    body: JSON.stringify({
      model,
      state: {
        reportText: args.reportText,
        flags: args.flags,
        kind: args.kind,
        locale: args.locale,
      },
      questions: {
        level: {
          type: "choice",
          instructions:
            "Grade Solana wallet sign-risk for a non-expert. Use reportText and flags only. Prefer unknown when evidence is thin.",
          criteria: LEVEL_CRITERIA,
        },
      },
    }),
    signal: args.signal,
  });
  if (!response.ok) {
    throw new Error(`decisions_http_${response.status}`);
  }
  const json = (await response.json()) as {
    answers?: { level?: { type?: string; choice?: unknown } };
  };
  const level = json.answers?.level;
  if (level?.type === "choice" && isTxAiLevel(level.choice)) return level.choice;
  throw new Error("decisions_empty");
}
