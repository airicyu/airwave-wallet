/**
 * test-web only: build unsigned demo transactions from mainnet fixture pubkeys
 * and run bubble-harness tool loop. Not the wallet approval path.
 */
import { AccountRole, type Instruction } from "@solana/instructions";
import {
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  createTransactionMessage,
  getCompiledTransactionMessageEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
} from "@solana/kit";
import bs58 from "bs58";
import {
  applyOwnerMismatch,
  CONTEXT,
  parseV0Message,
  staticFlagsFromMessage,
  staticFlagsFromRpcJsonMessage,
  SYSTEM,
  TOKEN,
  type Flag,
  type LoadedAddresses,
  type RpcJsonMessage,
  type StaticFlags,
} from "./sign-risk-decode";
import { fetchChainAccounts, fetchTransaction, type ChainAccount } from "./sign-risk-rpc";
import {
  DECISIONS_MODELS,
  DECISIONS_SAMPLES,
  DEFAULT_DECISIONS_MODEL,
  formatDecisionsView,
  gradeWithDecisions,
} from "./sign-risk-decisions";
import { formatLoopEvent, runSignRiskHarness } from "./sign-risk-harness";
import { runSignRiskPreflight } from "./sign-risk-preflight";

const SESSION_RPC_KEY = "airwave.sign-risk.rpc";
const SESSION_API_KEY = "airwave.sign-risk.openrouterKey";

function loadSessionField(id: "risk-rpc" | "risk-key"): void {
  const stored = sessionStorage.getItem(id === "risk-rpc" ? SESSION_RPC_KEY : SESSION_API_KEY);
  if (!stored) return;
  el<HTMLInputElement>(id).value = stored;
}

function persistSessionFields(): void {
  sessionStorage.setItem(SESSION_RPC_KEY, el<HTMLInputElement>("risk-rpc").value);
  sessionStorage.setItem(SESSION_API_KEY, el<HTMLInputElement>("risk-key").value);
}

const BLOCKHASH = "11111111111111111111111111111111" as Blockhash;
const RECENT_BLOCKHASHES = "SysvarRecentB1ockHashes11111111111111111111";
const U64_MAX = 18446744073709551615n;

type ScenarioId =
  | "sol-transfer"
  | "durable-nonce"
  | "unknown-program"
  | "set-authority"
  | "approve"
  | "unlimited-approve"
  | "close-account"
  | "system-assign";
type WireForm = "message" | "masked-wire";

type Built = {
  wireForm: WireForm | "rpc-wire";
  transactionBase64: string;
  staticFlags: StaticFlags;
  loaded?: LoadedAddresses;
  chainAccounts?: ChainAccount[];
  /** Set for RPC loads so harness decode skips v1-incompatible binary peel. */
  rpcJsonMessage?: RpcJsonMessage;
};

type DemoKeys = {
  payer: Address;
  other: Address;
  /** Real mainnet token account (WSOL ATA) so get_accounts can find mint/owner. */
  tokenAccount: Address;
  /** Real system account used as AdvanceNonceAccount target in the durable-nonce sample. */
  nonceAccount: Address;
  unknownProgram: Address;
};

/**
 * Public mainnet addresses (not keys we control). Draft txs only — for RPC
 * get_accounts to return found:true. Verified 2026-10-10 against public RPC:
 * Raydium authority + its WSOL ATA; counterparty wallets with SOL.
 */
function mainnetFixtureKeys(): DemoKeys {
  return {
    payer: address("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"),
    other: address("54VRaFqHRqbjE3pY6kHvtS42sPoFPFvkzKpSzfKwfUCr"),
    tokenAccount: address("DQyrAcCrDXQ7NeoqGgDCZwBvWDcYmFCjSb9JtteuvPpz"),
    nonceAccount: address("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"),
    // Synthetic program id so unknown_program still fires (not in LABELED).
    unknownProgram: address("DecafSo1111111111111111111111111111111111111"),
  };
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

function bytesBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function instruction(program: string, accounts: Array<{ pubkey: Address; role: AccountRole }>, data?: Uint8Array): Instruction {
  return {
    programAddress: address(program),
    accounts: accounts.map((item) => ({ address: item.pubkey, role: item.role })),
    ...(data ? { data } : null),
  };
}

function compileMessage(payer: Address, instructions: Instruction[]): Uint8Array {
  let message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(payer, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: BLOCKHASH, lastValidBlockHeight: 0n },
        m,
      ),
  );
  for (const item of instructions) {
    message = appendTransactionMessageInstruction(item, message as never) as typeof message;
  }
  const compiled = compileTransactionMessage(message);
  return new Uint8Array(getCompiledTransactionMessageEncoder().encode(compiled));
}

function maskedWire(message: Uint8Array, numSigners: number): Uint8Array {
  const out = new Uint8Array(1 + numSigners * 64 + message.length);
  out[0] = numSigners;
  out.set(message, 1 + numSigners * 64);
  return out;
}

function transferData(lamports: bigint): Uint8Array {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigUint64(4, lamports, true);
  return data;
}

function approveData(amount: bigint): Uint8Array {
  const data = new Uint8Array(9);
  data[0] = 4;
  new DataView(data.buffer).setBigUint64(1, amount, true);
  return data;
}

function buildInstructions(id: ScenarioId, keys: DemoKeys): Instruction[] {
  const payer = { pubkey: keys.payer, role: AccountRole.WRITABLE_SIGNER };
  if (id === "sol-transfer") {
    return [instruction(SYSTEM, [payer, { pubkey: keys.other, role: AccountRole.WRITABLE }], transferData(1_000_000n))];
  }
  if (id === "durable-nonce") {
    const nonceData = new Uint8Array(4);
    new DataView(nonceData.buffer).setUint32(0, 4, true);
    return [
      instruction(
        SYSTEM,
        [
          { pubkey: keys.nonceAccount, role: AccountRole.WRITABLE },
          { pubkey: address(RECENT_BLOCKHASHES), role: AccountRole.READONLY },
          payer,
        ],
        nonceData,
      ),
      instruction(SYSTEM, [payer, { pubkey: keys.other, role: AccountRole.WRITABLE }], transferData(5_000n)),
    ];
  }
  if (id === "unknown-program") {
    return [instruction(keys.unknownProgram, [payer, { pubkey: keys.other, role: AccountRole.WRITABLE }], new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))];
  }
  if (id === "set-authority") {
    const data = new Uint8Array(38);
    data[0] = 6;
    data[1] = 2;
    new DataView(data.buffer).setUint32(2, 1, true);
    data.set(bs58.decode(keys.other), 6);
    return [instruction(TOKEN, [{ pubkey: keys.tokenAccount, role: AccountRole.WRITABLE }, payer], data)];
  }
  if (id === "unlimited-approve") {
    return [
      instruction(TOKEN, [
        { pubkey: keys.tokenAccount, role: AccountRole.WRITABLE },
        { pubkey: keys.other, role: AccountRole.READONLY },
        payer,
      ], approveData(U64_MAX)),
    ];
  }
  if (id === "close-account") {
    return [
      instruction(TOKEN, [
        { pubkey: keys.tokenAccount, role: AccountRole.WRITABLE },
        { pubkey: keys.other, role: AccountRole.WRITABLE },
        payer,
      ], new Uint8Array([9])),
    ];
  }
  if (id === "system-assign") {
    // System Assign: exactly one account, and it must sign. newOwner = synthetic
    // program (not a wallet). Do not use the whale nonceAccount — ambient 10M SOL
    // distracts the model into unrelated history.
    const data = new Uint8Array(36);
    new DataView(data.buffer).setUint32(0, 1, true);
    data.set(bs58.decode(keys.unknownProgram), 4);
    return [
      instruction(SYSTEM, [{ pubkey: keys.other, role: AccountRole.WRITABLE_SIGNER }], data),
    ];
  }
  return [
    instruction(TOKEN, [
      { pubkey: keys.tokenAccount, role: AccountRole.WRITABLE },
      { pubkey: keys.other, role: AccountRole.READONLY },
      payer,
    ], approveData(1n)),
  ];
}

function modelInput(built: Built): {
  feePayer: string;
  instructions: StaticFlags["instructions"];
  flags: Flag[];
  chainAccounts?: ChainAccount[];
} {
  return {
    feePayer: built.staticFlags.feePayer,
    instructions: built.staticFlags.instructions,
    flags: built.staticFlags.flags,
    ...(built.chainAccounts ? { chainAccounts: built.chainAccounts } : {}),
  };
}

function collectPubkeys(summary: StaticFlags): string[] {
  const keys = [summary.feePayer];
  for (const ix of summary.instructions) {
    keys.push(ix.programId);
    for (const account of ix.accounts) keys.push(account.pubkey);
  }
  return keys.filter((k) => k && k !== "未解析");
}

async function attachChain(built: Built, rpcUrl: string): Promise<Built> {
  const chainAccounts = await fetchChainAccounts(rpcUrl, collectPubkeys(built.staticFlags));
  const tokenOwner = new Map<string, string>();
  for (const item of chainAccounts) {
    if (item.token) tokenOwner.set(item.pubkey, item.token.owner);
  }
  applyOwnerMismatch(built.staticFlags, tokenOwner);
  return { ...built, chainAccounts };
}

function buildPayload(id: ScenarioId, wireForm: WireForm, keys: DemoKeys): Built {
  const message = compileMessage(keys.payer, buildInstructions(id, keys));
  const flags = staticFlagsFromMessage(message);
  const numSigners = parseV0Message(message).numSignerAccounts;
  const body = wireForm === "message" ? message : maskedWire(message, numSigners);
  if (wireForm === "masked-wire") {
    const stripped = body.subarray(1 + numSigners * 64);
    const again = staticFlagsFromMessage(stripped);
    if (JSON.stringify(again.flags) !== JSON.stringify(flags.flags)) {
      throw new Error("遮罩 wire 解回的旗標與 message 不一致");
    }
  }
  return {
    wireForm,
    transactionBase64: bytesBase64(body),
    staticFlags: flags,
  };
}

function readScenario(): ScenarioId {
  const value = el<HTMLSelectElement>("risk-scenario").value;
  if (
    value === "sol-transfer" ||
    value === "durable-nonce" ||
    value === "unknown-program" ||
    value === "set-authority" ||
    value === "approve" ||
    value === "unlimited-approve" ||
    value === "close-account" ||
    value === "system-assign"
  ) {
    return value;
  }
  return "sol-transfer";
}

function readWire(): WireForm {
  return el<HTMLSelectElement>("risk-wire").value === "masked-wire" ? "masked-wire" : "message";
}

export function mountSignRiskPoc(): void {
  const context = el<HTMLTextAreaElement>("risk-context");
  const flagsOut = el<HTMLPreElement>("risk-flags");
  const decisionsOut = el<HTMLPreElement>("risk-decisions-out");
  const status = el<HTMLParagraphElement>("risk-status");
  const ask = el<HTMLButtonElement>("risk-ask");
  const stop = el<HTMLButtonElement>("risk-stop");
  const decisionsModel = el<HTMLSelectElement>("risk-decisions-model");
  const decisionsSample = el<HTMLSelectElement>("risk-decisions-sample");
  const rpcInput = el<HTMLInputElement>("risk-rpc");
  const keyInput = el<HTMLInputElement>("risk-key");
  let harnessAbort: AbortController | null = null;
  context.value = CONTEXT;
  loadSessionField("risk-rpc");
  loadSessionField("risk-key");
  rpcInput.addEventListener("input", persistSessionFields);
  keyInput.addEventListener("input", persistSessionFields);
  document.querySelectorAll<HTMLButtonElement>("[data-risk-model]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.riskModel;
      const targetId = button.closest("[data-risk-target]")?.getAttribute("data-risk-target");
      if (!id || !targetId) return;
      const input = el<HTMLInputElement>(targetId);
      input.value = id;
      input.focus();
    });
  });

  stop.addEventListener("click", () => {
    harnessAbort?.abort();
    status.textContent = "正在停止…";
  });

  for (const model of DECISIONS_MODELS) {
    const opt = document.createElement("option");
    opt.value = model.id;
    opt.textContent = model.label;
    if (model.id === DEFAULT_DECISIONS_MODEL) opt.selected = true;
    decisionsModel.appendChild(opt);
  }
  for (const sample of DECISIONS_SAMPLES) {
    const opt = document.createElement("option");
    opt.value = sample.id;
    opt.textContent = sample.label;
    decisionsSample.appendChild(opt);
  }

  const keys = mainnetFixtureKeys();
  let latest: Built | null = null;
  let lastHarnessReport = "";

  function show(): void {
    if (!latest) return;
    flagsOut.textContent = JSON.stringify(modelInput(latest), null, 2);
  }

  async function refresh(): Promise<void> {
    try {
      latest = buildPayload(readScenario(), readWire(), keys);
      show();
      status.textContent = `組好 mainnet 草稿 ${latest.wireForm}（公開地址；尚未查 RPC）`;
    } catch (error) {
      latest = null;
      flagsOut.textContent = error instanceof Error ? error.message : String(error);
      status.textContent = "組交易失敗";
    }
  }

  el<HTMLSelectElement>("risk-scenario").addEventListener("change", () => void refresh());
  el<HTMLSelectElement>("risk-wire").addEventListener("change", () => void refresh());
  void refresh();

  el<HTMLButtonElement>("risk-load-tx").addEventListener("click", async () => {
    const rpcUrl = el<HTMLInputElement>("risk-rpc").value.trim();
    const signature = el<HTMLInputElement>("risk-sig").value.trim();
    if (!rpcUrl) {
      status.textContent = "先填 RPC URL";
      return;
    }
    if (!signature) {
      status.textContent = "先填交易雜湊";
      return;
    }
    status.textContent = "載入交易…";
    try {
      const { wire, loaded, jsonMessage } = await fetchTransaction(rpcUrl, signature);
      const staticFlags = staticFlagsFromRpcJsonMessage(jsonMessage, loaded);
      latest = {
        wireForm: "rpc-wire",
        transactionBase64: bytesBase64(wire),
        staticFlags,
        loaded,
        rpcJsonMessage: jsonMessage,
      };
      latest = await attachChain(latest, rpcUrl);
      show();
      status.textContent = `已載入鏈上交易（${latest.staticFlags.instructions.length} ix，${latest.chainAccounts?.length ?? 0} 個帳戶）`;
    } catch (error) {
      status.textContent = `載入交易失敗：${error instanceof Error ? error.message : String(error)}`;
    }
  });

  el<HTMLButtonElement>("risk-fetch-accounts").addEventListener("click", async () => {
    const rpcUrl = el<HTMLInputElement>("risk-rpc").value.trim();
    if (!rpcUrl) {
      status.textContent = "先填 RPC URL";
      return;
    }
    if (!latest) {
      status.textContent = "沒有可查的交易";
      return;
    }
    status.textContent = "查帳戶…";
    try {
      latest = await attachChain(latest, rpcUrl);
      show();
      status.textContent = `已查 ${latest.chainAccounts?.length ?? 0} 個帳戶`;
    } catch (error) {
      status.textContent = `查帳戶失敗：${error instanceof Error ? error.message : String(error)}`;
    }
  });

  ask.addEventListener("click", async () => {
    const key = el<HTMLInputElement>("risk-key").value.trim();
    if (!key) {
      status.textContent = "先填 OpenRouter API key";
      return;
    }
    if (!latest) {
      status.textContent = "沒有可送出的交易";
      return;
    }
    persistSessionFields();
    const runs = (["a", "b"] as const)
      .map((slot) => ({ slot, model: el<HTMLInputElement>(`risk-model-${slot}`).value.trim() }))
      .filter((row) => row.model);
    if (runs.length === 0) {
      status.textContent = "先填模型";
      return;
    }
    const rpcUrl = rpcInput.value.trim();
    const session = {
      transactionBase64: latest.transactionBase64,
      wireForm: latest.wireForm,
      loaded: latest.loaded,
      rpcUrl,
      rpcJsonMessage: latest.rpcJsonMessage,
    };
    harnessAbort?.abort();
    harnessAbort = new AbortController();
    ask.disabled = true;
    stop.disabled = false;
    status.textContent = "預檢…";
    let preflight;
    try {
      preflight = await runSignRiskPreflight(session);
    } catch (error) {
      status.textContent = `預檢失敗：${error instanceof Error ? error.message : String(error)}`;
      ask.disabled = false;
      stop.disabled = true;
      return;
    }
    latest = { ...latest, staticFlags: preflight.decode };
    flagsOut.textContent = preflight.userMessage;
    status.textContent = runs.map((row) => row.model).join(" ＋ ");
    const reports: Partial<Record<"a" | "b", string>> = {};
    const signal = harnessAbort.signal;
    for (const slot of ["a", "b"] as const) {
      const active = runs.some((row) => row.slot === slot);
      el<HTMLElement>(`risk-slot-${slot}`).hidden = !active;
      if (!active) continue;
      el<HTMLPreElement>(`risk-trace-${slot}`).textContent = "";
      el<HTMLPreElement>(`risk-answer-${slot}`).textContent = "";
      el<HTMLParagraphElement>(`risk-meta-${slot}`).textContent = "";
    }
    let stopped = false;
    try {
      await Promise.all(
        runs.map(async (row) => {
          const meta = el<HTMLParagraphElement>(`risk-meta-${row.slot}`);
          const traceOut = el<HTMLPreElement>(`risk-trace-${row.slot}`);
          const answerOut = el<HTMLPreElement>(`risk-answer-${row.slot}`);
          const started = performance.now();
          let phase = "分析中";
          const paint = (): void => {
            const seconds = ((performance.now() - started) / 1000).toFixed(1);
            meta.textContent = `${row.model} · ${seconds} 秒 · ${phase}`;
          };
          paint();
          const timer = window.setInterval(paint, 100);
          const live: string[] = [];
          try {
            const view = await runSignRiskHarness({
              session,
              preflight,
              systemMessage: context.value,
              apiKey: key,
              model: row.model,
              signal,
              onEvent: (event) => {
                const line = formatLoopEvent(event);
                if (line) {
                  live.push(line);
                  traceOut.textContent = live.join("\n\n");
                }
                if (event.type === "step") phase = `step ${event.step}/${event.maxSteps}`;
                else if (event.type === "tool") phase = event.toolCall.function.name;
                else if (event.type === "assistant" && event.message.tool_calls?.length) phase = "呼叫 tools";
                paint();
              },
            });
            if (view.lastAccounts && latest) {
              latest = { ...latest, chainAccounts: view.lastAccounts };
            }
            traceOut.textContent = view.trace || "(no events)";
            if (view.aborted) {
              stopped = true;
              answerOut.textContent = "(已停止)";
              phase = "已停止";
            } else {
              reports[row.slot] = view.finalText || "";
              answerOut.textContent = reports[row.slot] || "(empty assistant content)";
              phase = `${view.stopReason}，${view.steps} 步`;
            }
          } catch (error) {
            if (signal.aborted) {
              stopped = true;
              answerOut.textContent = "(已停止)";
              phase = "已停止";
            } else {
              answerOut.textContent = error instanceof Error ? error.message : String(error);
              phase = "失敗";
            }
          } finally {
            window.clearInterval(timer);
            paint();
          }
        }),
      );
      lastHarnessReport = stopped ? "" : (reports.a ?? "").trim() || reports.b || "";
      status.textContent = stopped ? "分析已停止" : "分析結束";
    } finally {
      ask.disabled = false;
      stop.disabled = true;
      harnessAbort = null;
    }
  });

  async function runDecisions(
    source: "sample" | "last",
    btn: HTMLButtonElement,
  ): Promise<void> {
    const key = el<HTMLInputElement>("risk-key").value.trim();
    if (!key) {
      status.textContent = "先填 OpenRouter API key";
      return;
    }
    persistSessionFields();
    const model = decisionsModel.value.trim() || DEFAULT_DECISIONS_MODEL;
    btn.disabled = true;
    decisionsOut.textContent = "";
    try {
      if (source === "sample") {
        const sample = DECISIONS_SAMPLES.find((s) => s.id === decisionsSample.value);
        if (!sample) {
          status.textContent = "找不到 sample";
          return;
        }
        status.textContent = `Decisions → ${model}（${sample.id}）…`;
        const view = await gradeWithDecisions({
          apiKey: key,
          model,
          reportText: sample.reportText,
          flags: sample.flags,
          kind: sample.kind,
          locale: sample.locale,
        });
        decisionsOut.textContent = formatDecisionsView(view, sample);
        status.textContent = view.error
          ? `Decisions 失敗：${view.error}`
          : `Decisions：${view.decisionsLevel} → 顯示 ${view.displayLevel}`;
        return;
      }

      if (!lastHarnessReport.trim()) {
        status.textContent = "尚未有 harness 報告；先跑分析或改打 sample";
        return;
      }
      const flags = (latest?.staticFlags.flags ?? []).map((f) => f.id);
      status.textContent = `Decisions → ${model}（last report）…`;
      const view = await gradeWithDecisions({
        apiKey: key,
        model,
        reportText: lastHarnessReport,
        flags,
        kind: "signTransaction",
        locale: "zh-Hant",
      });
      decisionsOut.textContent = formatDecisionsView(view);
      status.textContent = view.error
        ? `Decisions 失敗：${view.error}`
        : `Decisions：${view.decisionsLevel} → 顯示 ${view.displayLevel}`;
    } catch (error) {
      status.textContent = "Decisions 失敗";
      decisionsOut.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      btn.disabled = false;
    }
  }

  const sampleBtn = el<HTMLButtonElement>("risk-decisions-sample-run");
  const lastBtn = el<HTMLButtonElement>("risk-decisions-last-run");
  sampleBtn.addEventListener("click", () => void runDecisions("sample", sampleBtn));
  lastBtn.addEventListener("click", () => void runDecisions("last", lastBtn));
}
