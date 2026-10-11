/**
 * test-web only: OpenRouter Decisions API client + canned risk samples +
 * deterministic flags floor. Product host path will mirror this; not harness.
 */

export type TxAiLevel = "low" | "watch" | "high" | "unknown";

export type DecisionsSample = {
  id: string;
  label: string;
  /** Expected Decisions choice (human check; not enforced). */
  expect?: TxAiLevel;
  flags: string[];
  kind: string;
  locale: string;
  reportText: string;
};

/** Align with 0.30.0 Settings `openRouterDecisionsModel` allowlist. */
export const DECISIONS_MODELS = [
  { id: "liquid/d1", label: "LiquidAI d1（預設）" },
  { id: "nace-ai/drex-v1.5", label: "Nace.AI Drex v1.5" },
] as const;

export const DEFAULT_DECISIONS_MODEL = "liquid/d1";

const LEVEL_CRITERIA: Record<TxAiLevel, string> = {
  low: "Ordinary transfer or common DEX swap; no authority handoff, unlimited approve, owner mismatch, or external close; user retains control of funds/accounts.",
  watch:
    "Needs user attention: unlimited or large approve, authority change, system assign, external close destination, unfamiliar program with privilege surface, or ambiguous intent—but not a clear ownership/theft pattern.",
  high: "Clear privilege or fund-control risk: owner mismatch, account ownership handed to outsider, permanent delegate / mint authority to untrusted party, or report describes theft/drain pattern.",
  unknown:
    "Insufficient facts in report+flags to choose low/watch/high; missing account data, undecodable instructions, or contradictory notes. Prefer unknown over guessing low.",
};

export function levelQuestion() {
  return {
    level: {
      type: "choice" as const,
      instructions:
        "Grade Solana wallet sign-risk for a non-expert user. Use reportText and flags only. Do not invent on-chain facts. Prefer unknown when evidence is thin.",
      criteria: LEVEL_CRITERIA,
    },
  };
}

/** HOW flags floor: only raise, never lower. unknown does not participate in raise. */
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

export function applyFlagsFloor(decisionsLevel: TxAiLevel, flags: string[]): TxAiLevel {
  let floor: TxAiLevel | null = null;
  for (const flag of flags) {
    const next = FLOOR[flag];
    if (!next) continue;
    if (!floor || RANK[next] > RANK[floor]) floor = next;
  }
  if (!floor) return decisionsLevel;
  if (decisionsLevel === "unknown") return floor;
  return RANK[floor] > RANK[decisionsLevel] ? floor : decisionsLevel;
}

export const DECISIONS_SAMPLES: DecisionsSample[] = [
  {
    id: "sol-transfer-low",
    label: "SOL 轉帳（預期 low）",
    expect: "low",
    flags: [],
    kind: "signTransaction",
    locale: "zh-Hant",
    reportText:
      "這筆在做什麼：付費者把少量 SOL 轉給另一個系統帳戶，屬一般 System Transfer。\n點出 flags：無危險旗標。\n缺什麼資料：無。\n等級：低",
  },
  {
    id: "jupiter-swap-low",
    label: "常見 swap 白話（預期 low／watch）",
    expect: "low",
    flags: [],
    kind: "signAndSendTransaction",
    locale: "zh-Hant",
    reportText:
      "這筆在做什麼：透過已標名的 DEX 聚合器交換代幣；指令含 ComputeBudget 與已知 swap program。\n點出 flags：無 authority／approve／owner 相關旗標。\n缺什麼資料：未查池子流動性，但不影響權限判斷。\n等級：低",
  },
  {
    id: "unlimited-approve-watch",
    label: "無限額 Approve（預期 watch+）",
    expect: "watch",
    flags: ["unlimited_approve"],
    kind: "signTransaction",
    locale: "zh-Hant",
    reportText:
      "這筆在做什麼：Token Approve，授權數量為 u64 最大值（等同無限額）。\n點出 flags：unlimited_approve。\n缺什麼資料：未確認 delegate 是否為信任協議。\n等級：留意",
  },
  {
    id: "set-authority-watch",
    label: "SetAuthority AccountOwner（預期 watch+）",
    expect: "watch",
    flags: ["authority_change"],
    kind: "signTransaction",
    locale: "zh-Hant",
    reportText:
      "這筆在做什麼：Token SetAuthority，把代幣帳戶 AccountOwner 交給另一個地址。\n點出 flags：authority_change。\n缺什麼資料：新 owner 是否為本人其他錢包未知。\n等級：留意",
  },
  {
    id: "owner-mismatch-high",
    label: "owner_mismatch（預期 high；下限）",
    expect: "high",
    flags: ["owner_mismatch"],
    kind: "signTransaction",
    locale: "zh-Hant",
    reportText:
      "這筆在做什麼：操作某個代幣帳戶，但鏈上 token owner 與簽署者不一致。\n點出 flags：owner_mismatch。\n缺什麼資料：無。\n等級：高",
  },
  {
    id: "system-assign-watch",
    label: "System Assign（預期 watch+）",
    expect: "watch",
    flags: ["system_assign"],
    kind: "signTransaction",
    locale: "zh-Hant",
    reportText:
      "這筆在做什麼：System Assign，把帳戶 owner program 改成另一個 program。\n點出 flags：system_assign。\n缺什麼資料：新 owner program 用途未查。\n等級：留意",
  },
  {
    id: "thin-unknown",
    label: "資料不足（預期 unknown）",
    expect: "unknown",
    flags: ["unknown_program"],
    kind: "signTransaction",
    locale: "zh-Hant",
    reportText:
      "這筆在做什麼：呼叫一個本頁標籤表沒有的 program；指令 data 未解。\n點出 flags：unknown_program（僅代表解碼器不認得）。\n缺什麼資料：帳戶餘額、owner、模擬 logs 皆未取得，無法判斷是否權限外送。\n等級：未知",
  },
  {
    id: "optimistic-vs-floor",
    label: "報告偏樂觀 + unlimited（測下限抬級）",
    expect: "watch",
    flags: ["unlimited_approve"],
    kind: "walletSend",
    locale: "en",
    reportText:
      "What it does: token approve for a DEX helper.\nFlags: unlimited_approve is present but may be routine.\nMissing: none.\nLevel: low",
  },
];

export type DecisionsGradeView = {
  model: string;
  resolvedModel?: string;
  provider?: string;
  decisionsLevel: TxAiLevel;
  displayLevel: TxAiLevel;
  floorRaised: boolean;
  confidence?: number;
  probabilities?: Record<string, number>;
  usage?: unknown;
  raw: unknown;
  requestState: Record<string, unknown>;
  error?: string;
};

function isLevel(value: unknown): value is TxAiLevel {
  return value === "low" || value === "watch" || value === "high" || value === "unknown";
}

export async function gradeWithDecisions(input: {
  apiKey: string;
  model: string;
  reportText: string;
  flags: string[];
  kind?: string;
  locale?: string;
}): Promise<DecisionsGradeView> {
  const requestState = {
    reportText: input.reportText,
    flags: input.flags,
    kind: input.kind ?? "signTransaction",
    locale: input.locale ?? "zh-Hant",
  };
  const body = {
    model: input.model,
    state: requestState,
    questions: levelQuestion(),
  };

  let httpStatus = 0;
  let raw: unknown;
  try {
    const response = await fetch(`${location.origin}/openrouter/api/alpha/decisions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": location.origin,
        "X-Title": "Airwave sign-risk decisions poc",
      },
      body: JSON.stringify(body),
    });
    httpStatus = response.status;
    const text = await response.text();
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      raw = { parseError: true, text };
    }
    if (!response.ok) {
      return {
        model: input.model,
        decisionsLevel: "unknown",
        displayLevel: applyFlagsFloor("unknown", input.flags),
        floorRaised: false,
        raw,
        requestState,
        error: `HTTP ${httpStatus}: ${typeof raw === "object" && raw && "error" in raw ? JSON.stringify((raw as { error: unknown }).error) : text.slice(0, 400)}`,
      };
    }
  } catch (error) {
    return {
      model: input.model,
      decisionsLevel: "unknown",
      displayLevel: applyFlagsFloor("unknown", input.flags),
      floorRaised: false,
      raw: null,
      requestState,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answers = obj.answers && typeof obj.answers === "object" ? (obj.answers as Record<string, unknown>) : {};
  const levelAns = answers.level && typeof answers.level === "object" ? (answers.level as Record<string, unknown>) : null;
  let decisionsLevel: TxAiLevel = "unknown";
  let confidence: number | undefined;
  let probabilities: Record<string, number> | undefined;
  if (levelAns?.type === "choice" && isLevel(levelAns.choice)) {
    decisionsLevel = levelAns.choice;
    if (typeof levelAns.confidence === "number") confidence = levelAns.confidence;
    if (levelAns.probabilities && typeof levelAns.probabilities === "object") {
      probabilities = levelAns.probabilities as Record<string, number>;
    }
  }

  const displayLevel = applyFlagsFloor(decisionsLevel, input.flags);
  return {
    model: input.model,
    resolvedModel: typeof obj.model === "string" ? obj.model : undefined,
    provider: typeof obj.provider === "string" ? obj.provider : undefined,
    decisionsLevel,
    displayLevel,
    floorRaised: displayLevel !== decisionsLevel,
    confidence,
    probabilities,
    usage: obj.usage,
    raw,
    requestState,
  };
}

export function formatDecisionsView(view: DecisionsGradeView, sample?: DecisionsSample): string {
  const lines = [
    `model asked: ${view.model}`,
    view.resolvedModel ? `model answered: ${view.resolvedModel}` : null,
    view.provider ? `provider: ${view.provider}` : null,
    sample ? `sample: ${sample.id} (expect ${sample.expect ?? "—"})` : "source: last harness report / custom",
    `Decisions level: ${view.decisionsLevel}`,
    `display level (after flags floor): ${view.displayLevel}${view.floorRaised ? "  ← floor raised" : ""}`,
    view.confidence != null ? `confidence: ${view.confidence}` : null,
    view.probabilities ? `probabilities: ${JSON.stringify(view.probabilities)}` : null,
    view.usage ? `usage: ${JSON.stringify(view.usage)}` : null,
    view.error ? `error: ${view.error}` : null,
    "",
    "--- request state ---",
    JSON.stringify(view.requestState, null, 2),
    "",
    "--- raw response ---",
    JSON.stringify(view.raw, null, 2),
  ];
  return lines.filter((line) => line !== null).join("\n");
}
