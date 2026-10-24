/**
 * Starts one queued sandbox assess per pending signature and grades the report.
 * Does not render approval UI or persist the report.
 */
import type { PendingRecord } from "../../shared/protocol";
import { buildAssessPrompt } from "../../shared/tx-ai";
import { TX_AI_BRIDGE_KIND, type TxAiBridgeMessage } from "../../shared/tx-ai";
import {
  effectiveDecisionsModelChain,
  effectiveReportModelChain,
  isTxAiKind,
  TX_AI_WALL_MS,
  assessLevelWithoutChain,
  type TxAiAssessState,
  type TxAiFlag,
} from "../../shared/tx-ai";
import { getPending } from "../pending/pending";
import { getWorkingTx } from "../pending/sign-tx-pending-state";
import { readSettings } from "../storage";
import { openRouterApiUrlForCall } from "../../shared/rpc";
import { stripWireSignatures } from "../../shared/tx";
import { formatTxAiPreflightForPrompt, pubkeysFromTxAiDecode, runTxAiPreflight } from "./preflight";
import { gradeReport } from "./openrouter";
import {
  activeTxAiRequestId,
  claimNextTxAi,
  getTxAiSession,
  hasTxAiQueue,
  noteDecodedPubkeys,
  txAiBusy,
  onTxAiDiscard,
  releaseActiveTxAi,
  rememberTxAiSession,
  setTxAiState,
  type TxAiSession,
} from "./runtime";

type LoopResult = { ok: true; reportText: string } | { ok: false; message: string };

const loopWaiters = new Map<string, (result: LoopResult) => void>();
const startClaims = new Set<string>();
let offscreenOpening: Promise<void> | null = null;
let pumping = false;

function snapshotBytes(requestId: string, record: PendingRecord): Uint8Array | null {
  let raw: Uint8Array | null = null;
  const working = getWorkingTx(requestId);
  if (working && working.byteLength > 0) raw = working.slice();
  else {
    const payload = record.payload as { transaction?: unknown };
    if (!Array.isArray(payload.transaction) || payload.transaction.length === 0) return null;
    if (!payload.transaction.every((part) => typeof part === "number")) return null;
    raw = Uint8Array.from(payload.transaction as number[]);
  }
  try {
    return stripWireSignatures(raw);
  } catch {
    return null;
  }
}

export function installTxAiAssess(): void {
  onTxAiDiscard((requestId) => {
    const waiter = loopWaiters.get(requestId);
    loopWaiters.delete(requestId);
    waiter?.({ ok: false, message: "aborted" });
    if (!txAiBusy()) void closeOffscreenIfIdle();
  });
}

export function maybeStartTxAi(requestId: string): void {
  const record = getPending(requestId);
  if (!record || !isTxAiKind(record.kind)) return;
  if (getTxAiSession(requestId)) return;
  const snapshot = snapshotBytes(requestId, record);
  if (!snapshot) return;
  void startIfConfigured(requestId, record.kind, snapshot);
}

async function startIfConfigured(
  requestId: string,
  kind: TxAiSession["kind"],
  snapshot: Uint8Array,
): Promise<void> {
  if (startClaims.has(requestId) || getTxAiSession(requestId)) return;
  startClaims.add(requestId);
  if (!getPending(requestId)) return;
  const settings = await readSettings();
  if (!getPending(requestId) || getTxAiSession(requestId)) return;
  if (!settings.txAiAnalysisEnabled || !settings.openRouterApiKey.trim()) return;
  rememberTxAiSession({
    requestId,
    kind,
    snapshot,
    abort: new AbortController(),
    decodedPubkeys: [],
    reportModelChain: effectiveReportModelChain(settings),
    state: { status: "running", startedAt: Date.now() },
  });
  void pump();
}

export function resolveTxAiLoop(requestId: string, result: LoopResult): void {
  const waiter = loopWaiters.get(requestId);
  if (!waiter) return;
  loopWaiters.delete(requestId);
  waiter(result);
}

export function rememberDecodePubkeys(requestId: string, pubkeys: string[]): void {
  noteDecodedPubkeys(requestId, pubkeys);
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    const session = claimNextTxAi();
    if (!session) {
      await closeOffscreenIfIdle();
      return;
    }
    await runSession(session);
  } finally {
    pumping = false;
    if (hasTxAiQueue() && activeTxAiRequestId() == null) void pump();
  }
}

async function runSession(session: TxAiSession): Promise<void> {
  const { requestId } = session;
  setTxAiState(requestId, { status: "running", startedAt: Date.now() });
  let wall: ReturnType<typeof setTimeout> | undefined;
  try {
    const settings = await readSettings();
    const preflight = await runTxAiPreflight(session.snapshot, settings.rpcUrl, session.abort.signal);
    if (!getTxAiSession(requestId)) return;
    session.preflightEnriched = preflight.enriched;
    const manifestList = preflight.enriched.accountsRead?.preflightPubkeys ?? [];
    session.preflightManifest = manifestList.length ? new Set(manifestList) : undefined;
    session.preflightFeePayer = preflight.enriched.decode.feePayer || undefined;
    session.preflightFeePayerBalanceLamports = preflight.enriched.accountsRead?.feePayerBalanceLamports;
    noteDecodedPubkeys(
      requestId,
      manifestList.length > 0 ? manifestList : pubkeysFromTxAiDecode(preflight.enriched.decode),
    );
    await ensureOffscreen();
    const prompt = buildAssessPrompt(
      settings.locale,
      session.kind,
      formatTxAiPreflightForPrompt(preflight),
    );
    wall = setTimeout(() => session.abort.abort(), TX_AI_WALL_MS);
    const started = await sendToOffscreen(
      {
        kind: TX_AI_BRIDGE_KIND,
        op: "assess.start",
        requestId,
        systemMessage: prompt.systemMessage,
        userMessage: prompt.userMessage,
      },
      8,
    );
    if (!started) throw new Error("offscreen");
    const loop = await waitForLoop(session);
    if (wall !== undefined) {
      clearTimeout(wall);
      wall = undefined;
    }
    if (!getTxAiSession(requestId)) return;
    if (!loop.ok) {
      setTxAiState(requestId, { status: "error", message: loop.message });
      return;
    }
    const reportText = loop.reportText.trim();
    if (!reportText) {
      setTxAiState(requestId, { status: "error", message: "empty" });
      return;
    }
    const enriched = session.preflightEnriched;
    if (!enriched) {
      setTxAiState(requestId, { status: "error", message: "assess_failed" });
      return;
    }
    if (!getTxAiSession(requestId)) return;
    const chainBlocked = !settings.rpcUrl.trim() || enriched.chainRead === "failed" || session.abort.signal.aborted;
    if (chainBlocked) {
      publishWithoutChain(requestId, reportText, enriched.flags);
      return;
    }
    const graded = await gradeReport({
      apiKey: settings.openRouterApiKey,
      apiUrl: openRouterApiUrlForCall(settings),
      chain: effectiveDecisionsModelChain(settings),
      reportText,
      flags: enriched.flags,
      kind: session.kind,
      locale: settings.locale,
      signal: session.abort.signal,
    });
    if (!getTxAiSession(requestId)) return;
    if (session.abort.signal.aborted) {
      publishWithoutChain(requestId, reportText, enriched.flags);
      return;
    }
    const done: TxAiAssessState = {
      status: "done",
      level: graded.level,
      decisionsLevel: graded.decisionsLevel,
      reportText,
      flags: enriched.flags,
      reportModelUsed: session.reportModelUsed,
    };
    setTxAiState(requestId, done);
  } catch {
    if (!getTxAiSession(requestId)) return;
    setTxAiState(requestId, {
      status: "error",
      message: session.abort.signal.aborted ? "timeout" : "assess_failed",
    });
  } finally {
    if (wall !== undefined) clearTimeout(wall);
    releaseActiveTxAi(requestId);
    await sendToOffscreen({ kind: TX_AI_BRIDGE_KIND, op: "assess.abort", requestId });
    if (!txAiBusy()) await closeOffscreenIfIdle();
  }
}

function publishWithoutChain(requestId: string, reportText: string, flags: TxAiFlag[]): void {
  const graded = assessLevelWithoutChain(flags);
  const session = getTxAiSession(requestId);
  setTxAiState(requestId, {
    status: "done",
    level: graded.level,
    decisionsLevel: graded.decisionsLevel,
    reportText,
    flags,
    reportModelUsed: session?.reportModelUsed,
  });
}

function waitForLoop(session: TxAiSession): Promise<LoopResult> {
  return new Promise((resolve) => {
    const finish = (result: LoopResult): void => {
      loopWaiters.delete(session.requestId);
      resolve(result);
    };
    if (session.abort.signal.aborted) {
      finish({ ok: false, message: "timeout" });
      return;
    }
    session.abort.signal.addEventListener("abort", () => finish({ ok: false, message: "timeout" }), { once: true });
    loopWaiters.set(session.requestId, finish);
  });
}

async function offscreenContexts(): Promise<{ length: number }> {
  const getContexts = chrome.runtime.getContexts as (filter: {
    contextTypes: string[];
  }) => Promise<{ length: number }>;
  return getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
}

async function ensureOffscreen(): Promise<void> {
  if (!offscreenOpening) {
    offscreenOpening = (async () => {
      const existing = await offscreenContexts();
      if (existing.length > 0) return;
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL("src/offscreen/index.html"),
        reasons: ["IFRAME_SCRIPTING" as chrome.offscreen.Reason],
        justification: "Embed the transaction analysis sandbox for the current signature request.",
      });
    })().finally(() => {
      offscreenOpening = null;
    });
  }
  await offscreenOpening;
}

async function closeOffscreenIfIdle(): Promise<void> {
  if (txAiBusy()) return;
  try {
    const existing = await offscreenContexts();
    if (existing.length === 0) return;
    await chrome.offscreen.closeDocument();
  } catch {
    /* already closed */
  }
}

async function sendToOffscreen(message: TxAiBridgeMessage, attempts = 1): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await chrome.runtime.sendMessage(message);
      return true;
    } catch {
      if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  return false;
}
