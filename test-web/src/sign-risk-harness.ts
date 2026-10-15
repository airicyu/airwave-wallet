/**
 * test-web sign-risk: follow-up RPC tools and the report-model loop.
 * Decode and simulate already happened in preflight. Not the wallet approval path.
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
import type { StaticFlags } from "./sign-risk-decode";
import { fetchChainAccounts, rpcRead, type ChainAccount } from "./sign-risk-rpc";
import { buildFlattenedRpcTools } from "./sign-risk-rpc-tools";
import {
  PREFETCH_DUPLICATE_NOTE,
  splitPrefetchDuplicates,
  type SignRiskPreflight,
  type SignRiskSession,
} from "./sign-risk-preflight";

export type HarnessSession = SignRiskSession;

export type HarnessRunView = {
  stopReason: RunAgentLoopResult["stopReason"];
  steps: number;
  finalText: string;
  trace: string;
  lastDecode: StaticFlags | null;
  lastAccounts: ChainAccount[] | null;
  aborted?: boolean;
};

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every((item) => typeof item === "string" && item)) return null;
  return value;
}

function asPubkey(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function guardPrefetch(
  name: string,
  args: Record<string, unknown>,
  preflight: SignRiskPreflight,
): unknown | null {
  if (name === "rpc_get_balance") {
    const pubkey = asPubkey(args.pubkey);
    if (
      pubkey &&
      preflight.feePayer &&
      pubkey === preflight.feePayer &&
      preflight.feePayerBalanceLamports
    ) {
      return { ok: true, result: { value: preflight.feePayerBalanceLamports }, note: PREFETCH_DUPLICATE_NOTE };
    }
  }
  if (name === "rpc_get_account_info") {
    const pubkey = asPubkey(args.pubkey);
    if (pubkey && preflight.manifest.has(pubkey)) return { ok: true, note: PREFETCH_DUPLICATE_NOTE };
  }
  if (name === "rpc_get_multiple_accounts") {
    const pubkeys = asStringArray(args.pubkeys);
    if (!pubkeys) return null;
    const { novel, skipped } = splitPrefetchDuplicates(pubkeys.slice(0, 100), preflight.manifest);
    if (novel.length === 0) return { ok: true, note: PREFETCH_DUPLICATE_NOTE, skipped_prefetch: skipped };
    if (skipped.length > 0) return { novel, skipped };
  }
  return null;
}

function buildHostTools(
  session: HarnessSession,
  preflight: SignRiskPreflight,
  state: { lastAccounts: ChainAccount[] | null },
): HostToolDefinition[] {
  const followUps = buildFlattenedRpcTools(session.rpcUrl).map((tool) => ({
    ...tool,
    execute: async (args: Record<string, unknown>) => {
      const blocked = guardPrefetch(tool.name, args, preflight);
      if (blocked && !(blocked as { novel?: string[] }).novel) return blocked;
      if (tool.name === "rpc_get_multiple_accounts" && blocked && (blocked as { novel?: string[] }).novel) {
        const { novel, skipped } = blocked as { novel: string[]; skipped: string[] };
        const read = await rpcRead(session.rpcUrl, "getMultipleAccounts", [
          novel,
          { encoding: typeof args.encoding === "string" ? args.encoding : "base64" },
        ]);
        return { read, skipped_prefetch: skipped, note: PREFETCH_DUPLICATE_NOTE };
      }
      return tool.execute(args);
    },
  }));
  return [
    {
      name: "get_accounts",
      description: "Read account data for pubkeys that are not already in preflightPubkeys.",
      parameters: {
        type: "object",
        properties: {
          pubkeys: {
            type: "array",
            items: { type: "string" },
            description: "Base58 pubkeys not listed in preflightPubkeys. Max 20.",
          },
        },
        additionalProperties: false,
      },
      execute: async (args: Record<string, unknown>) => {
        if (!session.rpcUrl) return { ok: false, error: "RPC URL not set in the page" };
        const requested = asStringArray(args.pubkeys) ?? [...preflight.manifest].slice(0, 20);
        if (!requested.length) return { ok: false, error: "no pubkeys" };
        const { novel, skipped } = splitPrefetchDuplicates(requested.slice(0, 20), preflight.manifest);
        if (novel.length === 0) return { ok: true, note: PREFETCH_DUPLICATE_NOTE, skipped_prefetch: skipped };
        const chainAccounts = await fetchChainAccounts(session.rpcUrl, novel);
        state.lastAccounts = chainAccounts;
        if (skipped.length === 0) return { ok: true, chainAccounts };
        return { ok: true, chainAccounts, skipped_prefetch: skipped, note: PREFETCH_DUPLICATE_NOTE };
      },
    },
    ...followUps,
  ];
}

export async function runSignRiskHarness(input: {
  session: HarnessSession;
  preflight: SignRiskPreflight;
  systemMessage: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
  onEvent?: AgentLoopEventHandler;
}): Promise<HarnessRunView> {
  const state = { lastAccounts: null as ChainAccount[] | null };
  const kv = new Map<string, string>();
  const traceLines: string[] = [];
  const signal = input.signal;
  const fetchImpl: typeof fetch = (url, init) => {
    if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
    return fetch(url, { ...init, signal });
  };
  const callModel = createOpenRouterCallModel({
    apiKey: input.apiKey,
    model: input.model,
    baseUrl: `${location.origin}/openrouter/api/v1`,
    referer: location.origin,
    title: "Airwave sign-risk harness poc",
    fetchImpl,
  });
  const harness = createHarness({
    kvStore: {
      get: async (key: string) => kv.get(key) ?? null,
      set: async (key: string, value: string) => {
        kv.set(key, value);
      },
    },
    hostTools: buildHostTools(input.session, input.preflight, state),
    fetchAllowlist: ["https://__fetch-disabled__/"],
    maxSteps: 8,
    toolResultMaxBytes: 8000,
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

  try {
    const result = await runAgentLoop(harness, {
      systemMessage: input.systemMessage,
      temperature: 0.2,
      retryEmptyFinal: true,
      emptyFinalUserMessage: "Write the report now in the requested language. Do not call tools.",
      onEvent,
      messages: [{ role: "user", content: input.preflight.userMessage }],
    });

    return {
      stopReason: result.stopReason,
      steps: result.steps,
      finalText: result.finalText || `(無最終報告：stopReason=${result.stopReason}，${result.steps} 步)`,
      trace: traceLines.join("\n\n") || "(no events)",
      lastDecode: input.preflight.decode,
      lastAccounts: state.lastAccounts,
    };
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      return {
        stopReason: "max_steps",
        steps: 0,
        finalText: "",
        trace: traceLines.join("\n\n") || "(stopped)",
        lastDecode: input.preflight.decode,
        lastAccounts: state.lastAccounts,
        aborted: true,
      };
    }
    throw error;
  }
}
