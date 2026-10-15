/**
 * Transaction AI levels, model allowlists, flags floor, and host-tool admission.
 * Does not call OpenRouter, read settings, or touch the sandbox.
 */
import type { UiLocale } from "./storage-keys";

export type TxAiLevel = "low" | "watch" | "high" | "unknown";

export type TxAiFlag = { id: string; detail?: string };

export type TxAiAssessState =
  | { status: "idle" }
  | { status: "running"; startedAt: number; reportModelUsed?: string }
  | {
      status: "done";
      level: TxAiLevel;
      decisionsLevel: TxAiLevel;
      reportText: string;
      flags: TxAiFlag[];
      reportModelUsed?: string;
    }
  | { status: "error"; message: string; reportText?: string };

export type TxAiModelMode = "default" | "custom";

export const DEFAULT_REPORT_MODEL_CHAIN = [
  "inclusionai/ling-3.0-flash",
  "nvidia/nemotron-3.5-lightning",
  "~deepseek/deepseek-flash-latest",
] as const;

export const DEFAULT_DECISIONS_MODEL_CHAIN = ["liquid/d1", "nace-ai/drex-v1.5"] as const;

/** 0.39 migrate reference; never write to storage. */
export const LEGACY_039_DEFAULT_REPORT_MODEL = "apodex/apodex-1.1-mini:free";
export const LEGACY_039_DEFAULT_DECISIONS_MODEL = "liquid/d1";

export const DEFAULT_REPORT_MODEL = DEFAULT_REPORT_MODEL_CHAIN[0];
export const DEFAULT_DECISIONS_MODEL = DEFAULT_DECISIONS_MODEL_CHAIN[0];

/** @deprecated 0.44 uses model chains; kept for type compat only. */
export const REPORT_PRESETS = DEFAULT_REPORT_MODEL_CHAIN;
export const REPORT_MODELS = REPORT_PRESETS;
export const DECISIONS_PRESETS = DEFAULT_DECISIONS_MODEL_CHAIN;
export const DECISIONS_MODELS = DECISIONS_PRESETS;

export const TX_AI_KINDS = ["signTransaction", "signAndSendTransaction", "walletSend"] as const;

export type TxAiKind = (typeof TX_AI_KINDS)[number];

export const TX_AI_MAX_STEPS = 8;
/** Sandbox harness loop wall clock (offscreen assess.start → assess.done); not preflight or Decisions. */
export const TX_AI_WALL_MS = 60_000;
/** Per llm.chat or tool round-trip through the sandbox bridge (must stay ≤ wall). */
export const TX_AI_LLM_BRIDGE_MS = 55_000;

export const HOST_TOOL_NAMES = [
  "decode_message",
  "get_accounts",
  "simulate",
  "rpc_get_balance",
  "rpc_get_account_info",
  "rpc_get_multiple_accounts",
  "rpc_get_token_accounts_by_owner",
  "rpc_get_signatures_for_address",
  "rpc_get_transaction",
  "rpc_get_latest_blockhash",
] as const;

export type HostToolName = (typeof HOST_TOOL_NAMES)[number];

const HOST_TOOL_SET = new Set<string>(HOST_TOOL_NAMES);

const BANNED_RPC_METHODS = ["sendTransaction", "sendRawTransaction", "requestAirdrop"];

export function isTxAiKind(kind: string): kind is TxAiKind {
  return (TX_AI_KINDS as readonly string[]).includes(kind);
}

export function isLegalOpenRouterModelId(raw: string): boolean {
  const id = raw.trim();
  if (!id || id.length > 256) return false;
  if (/[\s\u0000-\u001F\u007F]/.test(id)) return false;
  return true;
}

export function normalizeModelChain(raw: unknown, max = 5): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || !isLegalOpenRouterModelId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

export type TxAiModelSettingsSlice = {
  openRouterReportModelMode?: TxAiModelMode;
  openRouterReportModelChain?: string[];
  openRouterDecisionsModelMode?: TxAiModelMode;
  openRouterDecisionsModelChain?: string[];
};

export function effectiveReportModelChain(settings: TxAiModelSettingsSlice): string[] {
  const mode = settings.openRouterReportModelMode === "custom" ? "custom" : "default";
  if (mode !== "custom") return [...DEFAULT_REPORT_MODEL_CHAIN];
  const chain = normalizeModelChain(settings.openRouterReportModelChain, 5);
  return chain.length > 0 ? chain : [...DEFAULT_REPORT_MODEL_CHAIN];
}

export function effectiveDecisionsModelChain(settings: TxAiModelSettingsSlice): string[] {
  const mode = settings.openRouterDecisionsModelMode === "custom" ? "custom" : "default";
  if (mode !== "custom") return [...DEFAULT_DECISIONS_MODEL_CHAIN];
  const chain = normalizeModelChain(settings.openRouterDecisionsModelChain, 5);
  return chain.length > 0 ? chain : [...DEFAULT_DECISIONS_MODEL_CHAIN];
}

export type OpenRouterFailureClass = "fatal" | "try_next" | "retry_same";

export function classifyOpenRouterFailure(status: number | null): OpenRouterFailureClass {
  if (status === 429) return "retry_same";
  if (status === 400 || status === 401 || status === 402 || status === 403) return "fatal";
  if (status === 404 || status === 502 || status === 503) return "try_next";
  return "fatal";
}

export function normalizeReportModel(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_REPORT_MODEL;
  if (isLegalOpenRouterModelId(raw)) return raw.trim();
  return DEFAULT_REPORT_MODEL;
}

export function normalizeDecisionsModel(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_DECISIONS_MODEL;
  if (isLegalOpenRouterModelId(raw)) return raw.trim();
  return DEFAULT_DECISIONS_MODEL;
}

export function shortenOpenRouterModelId(id: string): string {
  const t = id.trim();
  if (t.length <= 28) return t;
  return `${t.slice(0, 12)}…${t.slice(-10)}`;
}

const FLOOR: Partial<Record<string, TxAiLevel>> = {
  unlimited_approve: "watch",
  authority_change: "watch",
  close_account_external: "watch",
  system_assign: "watch",
  owner_mismatch: "high",
};

const RANK: Record<TxAiLevel, number> = {
  unknown: 0,
  low: 1,
  watch: 2,
  high: 3,
};

/** Raise only. `unknown` does not block a floor of watch or high. */
export function applyFlagsFloor(decisionsLevel: TxAiLevel, flags: readonly { id: string }[]): TxAiLevel {
  let floor: TxAiLevel | null = null;
  for (const flag of flags) {
    const next = FLOOR[flag.id];
    if (!next) continue;
    if (!floor || RANK[next] > RANK[floor]) floor = next;
  }
  if (!floor) return decisionsLevel;
  if (decisionsLevel === "unknown") return floor;
  return RANK[floor] > RANK[decisionsLevel] ? floor : decisionsLevel;
}

/** When chain data is missing, Decisions is not asked. Floor can still raise unknown. */
export function assessLevelWithoutChain(flags: readonly { id: string }[]): {
  decisionsLevel: "unknown";
  level: TxAiLevel;
} {
  return { decisionsLevel: "unknown", level: applyFlagsFloor("unknown", flags) };
}

export function isTxAiLevel(value: unknown): value is TxAiLevel {
  return value === "low" || value === "watch" || value === "high" || value === "unknown";
}

/**
 * Allowlist members pass, including `rpc_get_signatures_for_address`.
 * Any other name, or a name containing vault/sign/storage outside that list, is rejected.
 */
export function hostToolVerdict(name: string): "allow" | "reject" {
  if (!HOST_TOOL_SET.has(name)) return "reject";
  return "allow";
}

export function mentionsBannedRpc(value: unknown): boolean {
  const text = JSON.stringify(value ?? null);
  return BANNED_RPC_METHODS.some((method) => text.includes(method));
}

export function decisionsModelLabelKey(
  model: string,
): "settings.openRouter.decisionsModel.d1" | "settings.openRouter.decisionsModel.drex" {
  if (model === "nace-ai/drex-v1.5") return "settings.openRouter.decisionsModel.drex";
  return "settings.openRouter.decisionsModel.d1";
}

export function replyLanguage(locale: UiLocale): string {
  if (locale === "en") return "English";
  if (locale === "zh-Hans") return "Simplified Chinese";
  return "Traditional Chinese";
}
