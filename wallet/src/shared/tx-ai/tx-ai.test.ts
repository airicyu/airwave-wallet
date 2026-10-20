/**
 * Pure checks for the transaction AI floor, model chains, and tool admission.
 * Does not call the network or Chrome APIs.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { toPublicSettings, DEFAULT_SETTINGS } from "../protocol/index.ts";
import { parseTxAiMarkdown } from "./tx-ai-markdown.ts";
import {
  applyFlagsFloor,
  assessLevelWithoutChain,
  classifyOpenRouterFailure,
  effectiveDecisionsModelChain,
  effectiveReportModelChain,
  hostToolVerdict,
  isLegalOpenRouterModelId,
  mentionsBannedRpc,
  normalizeDecisionsModel,
  normalizeModelChain,
  normalizeReportModel,
} from "./tx-ai.ts";

test("model normalize: presets, custom ids, and illegal fallback", () => {
  assert.equal(normalizeDecisionsModel("typesafe/jev-1.13"), "typesafe/jev-1.13");
  assert.equal(normalizeDecisionsModel("nace-ai/drex-v1.5"), "nace-ai/drex-v1.5");
  assert.equal(normalizeDecisionsModel("bad id"), "liquid/d1");
  assert.equal(normalizeReportModel("not-a-model"), "not-a-model");
  assert.equal(normalizeReportModel("custom/vendor-model"), "custom/vendor-model");
  assert.equal(normalizeReportModel("bad id"), "inclusionai/ling-3.0-flash");
  assert.equal(isLegalOpenRouterModelId("  trim-me  "), true);
  assert.equal(isLegalOpenRouterModelId(""), false);
  assert.equal(isLegalOpenRouterModelId("has space"), false);
});

test("model chains: default, custom, normalize", () => {
  assert.deepEqual(effectiveReportModelChain({ openRouterReportModelMode: "default" }), [
    "inclusionai/ling-3.0-flash",
    "nvidia/nemotron-3.5-lightning",
    "~deepseek/deepseek-flash-latest",
  ]);
  assert.deepEqual(
    effectiveReportModelChain({
      openRouterReportModelMode: "custom",
      openRouterReportModelChain: ["a/x", "a/x", "bad id", "b/y"],
    }),
    ["a/x", "b/y"],
  );
  assert.deepEqual(effectiveDecisionsModelChain({ openRouterDecisionsModelMode: "default" }), [
    "liquid/d1",
    "nace-ai/drex-v1.5",
  ]);
  assert.equal(normalizeModelChain([" z ", "", "a", "a", "b", "c", "d", "e", "f", "g"]).length, 5);
});

test("classifyOpenRouterFailure", () => {
  assert.equal(classifyOpenRouterFailure(429), "retry_same");
  assert.equal(classifyOpenRouterFailure(404), "try_next");
  assert.equal(classifyOpenRouterFailure(502), "try_next");
  assert.equal(classifyOpenRouterFailure(401), "fatal");
  assert.equal(classifyOpenRouterFailure(500), "fatal");
  assert.equal(classifyOpenRouterFailure(null), "fatal");
});

test("flags floor raises and does not lower", () => {
  assert.equal(applyFlagsFloor("low", [{ id: "unlimited_approve" }]), "watch");
  assert.equal(applyFlagsFloor("low", [{ id: "owner_mismatch" }]), "high");
  assert.equal(applyFlagsFloor("high", [{ id: "unlimited_approve" }]), "high");
  assert.equal(applyFlagsFloor("unknown", [{ id: "authority_change" }]), "watch");
  assert.equal(applyFlagsFloor("low", [{ id: "unknown_program" }]), "low");
  assert.equal(applyFlagsFloor("low", [{ id: "durable_nonce" }, { id: "lookup_account_unchecked" }]), "low");
});

test("host tools reject vault, sign, and broadcast names", () => {
  assert.equal(hostToolVerdict("decode_message"), "allow");
  assert.equal(hostToolVerdict("rpc_get_signatures_for_address"), "allow");
  assert.equal(hostToolVerdict("vault.read"), "reject");
  assert.equal(hostToolVerdict("signTransaction"), "reject");
  assert.equal(hostToolVerdict("chrome.storage"), "reject");
  assert.equal(hostToolVerdict("sendTransaction"), "reject");
  assert.equal(mentionsBannedRpc({ method: "sendTransaction" }), true);
  assert.equal(mentionsBannedRpc({ pubkey: "11111111111111111111111111111111" }), false);
});

test("unread chain stays unknown unless a floor flag raises it", () => {
  assert.deepEqual(assessLevelWithoutChain([]), { decisionsLevel: "unknown", level: "unknown" });
  assert.equal(assessLevelWithoutChain([{ id: "unlimited_approve" }]).level, "watch");
  assert.equal(assessLevelWithoutChain([{ id: "owner_mismatch" }]).level, "high");
});

test("report markdown allowlist keeps raw HTML as text", () => {
  const blocks = parseTxAiMarkdown(
    "## 這筆在做什麼\n這是 **轉帳**，不是 <script>alert(1)</script>。\n- 第一點\n- 第二點\n\n1. 仍缺資料",
  );
  assert.equal(blocks[0]?.kind, "h");
  if (blocks[0]?.kind === "h") assert.equal(blocks[0].level, 2);
  const paragraph = blocks.find((b) => b.kind === "p");
  assert.ok(paragraph && paragraph.kind === "p");
  if (paragraph?.kind === "p") {
    assert.ok(paragraph.inlines.some((p) => p.kind === "strong" && p.text === "轉帳"));
    assert.ok(paragraph.inlines.some((p) => p.kind === "text" && p.text.includes("<script>")));
  }
  assert.equal(blocks.some((b) => b.kind === "ul"), true);
  assert.equal(blocks.some((b) => b.kind === "ol"), true);
});

test("public settings omit the OpenRouter key", () => {
  const secret = "sk-or-test-not-real";
  const pub = toPublicSettings({ ...DEFAULT_SETTINGS, openRouterApiKey: secret, txAiAnalysisEnabled: true });
  assert.equal("openRouterApiKey" in pub, false);
  assert.equal(pub.openRouterConfigured, true);
  assert.equal(JSON.stringify(pub).includes(secret), false);
  assert.equal(pub.txAiAnalysisEnabled, true);
  assert.equal(pub.openRouterReportModelMode, "default");
  assert.equal(pub.openRouterDecisionsModelMode, "default");
});
