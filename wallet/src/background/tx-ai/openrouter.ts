/**
 * OpenRouter chat and Decisions calls made only by the service worker.
 * Does not run inside the sandbox and does not persist the API key.
 */
import {
  applyFlagsFloor,
  isTxAiLevel,
  normalizeDecisionsModel,
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

export async function openRouterChat(args: {
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
  const json = (await response.json()) as {
    choices?: { message?: ChatResult }[];
  };
  const message = json.choices?.[0]?.message;
  if (!message) throw new Error("chat_empty");
  return {
    content: typeof message.content === "string" ? message.content : message.content ?? null,
    tool_calls: Array.isArray(message.tool_calls) ? message.tool_calls : undefined,
  };
}

export async function gradeReport(args: {
  apiKey: string;
  model: string;
  reportText: string;
  flags: TxAiFlag[];
  kind: string;
  locale: string;
  signal: AbortSignal;
}): Promise<{ decisionsLevel: TxAiLevel; level: TxAiLevel }> {
  const model = normalizeDecisionsModel(args.model);
  const decisionsLevel = await requestDecisionsLevel(args, model);
  return { decisionsLevel, level: applyFlagsFloor(decisionsLevel, args.flags) };
}

async function requestDecisionsLevel(
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
  try {
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
    if (!response.ok) return "unknown";
    const json = (await response.json()) as {
      answers?: { level?: { type?: string; choice?: unknown } };
    };
    const level = json.answers?.level;
    if (level?.type === "choice" && isTxAiLevel(level.choice)) return level.choice;
    return "unknown";
  } catch {
    return "unknown";
  }
}
