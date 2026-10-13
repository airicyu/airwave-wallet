/**
 * Transaction AI levels, model allowlists, flags floor, and host-tool admission.
 * Does not call OpenRouter, read settings, or touch the sandbox.
 */
import type { UiLocale } from "./storage-keys";

export type TxAiLevel = "low" | "watch" | "high" | "unknown";

export type TxAiFlag = { id: string; detail?: string };

export type TxAiAssessState =
  | { status: "idle" }
  | { status: "running"; startedAt: number }
  | {
      status: "done";
      level: TxAiLevel;
      decisionsLevel: TxAiLevel;
      reportText: string;
      flags: TxAiFlag[];
    }
  | { status: "error"; message: string; reportText?: string };

export const REPORT_PRESETS = [
  "apodex/apodex-1.1-mini:free",
  "~deepseek/deepseek-flash-latest",
] as const;

/** @deprecated Use REPORT_PRESETS */
export const REPORT_MODELS = REPORT_PRESETS;

export const DECISIONS_PRESETS = ["liquid/d1", "nace-ai/drex-v1.5"] as const;

/** @deprecated Use DECISIONS_PRESETS */
export const DECISIONS_MODELS = DECISIONS_PRESETS;

export const DEFAULT_REPORT_MODEL: (typeof REPORT_PRESETS)[number] = "apodex/apodex-1.1-mini:free";
export const DEFAULT_DECISIONS_MODEL: (typeof DECISIONS_PRESETS)[number] = "liquid/d1";

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

export function normalizeReportModel(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_REPORT_MODEL;
  if ((REPORT_PRESETS as readonly string[]).includes(raw)) return raw;
  if (isLegalOpenRouterModelId(raw)) return raw.trim();
  return DEFAULT_REPORT_MODEL;
}

export function normalizeDecisionsModel(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_DECISIONS_MODEL;
  if ((DECISIONS_PRESETS as readonly string[]).includes(raw)) return raw;
  if (isLegalOpenRouterModelId(raw)) return raw.trim();
  return DEFAULT_DECISIONS_MODEL;
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
