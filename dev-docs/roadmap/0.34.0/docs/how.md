# 0.34.0 — Preflight 與 prompt 契約

契約在 [INDEX](../INDEX.md)。

## `runTxAiPreflight(snapshot, rpcUrl, signal)`

順序（同一 `AbortSignal`）：

1. **`enrichFlags`** — 本地 decode → `resolvedAccountPubkeysForPrefetch`（優先 token source／fee payer／signer／writable，最多 **60**）→ host **分批** `getMultipleAccounts`（每批 20，`prefetch-accounts.ts`）→ 另打 fee payer `getBalance` → `applyOwnerMismatch` → 回傳：
   - `decode`、`flags`、`chainRead`
   - `accountsRead`：`preflightPubkeys`、`pubkeys`、`accounts`、`feePayerBalanceLamports?`
2. **`simulateTransactionRpc`** — `decodeWireTransaction(snapshot)`；選項 `{ replaceRecentBlockhash: false, sigVerify: false }`（與 `phase2-deltas` 審批路徑一致）。回傳物件進 prompt：
   - `err`、`unitsConsumed`、`logs`（最多尾 40 行）
   - RPC 未設：`{ error: "MAINNET_RPC_UNSET" }`（不 throw）

## `formatTxAiPreflightForPrompt(preflight)`

輸出固定三節（英文標題，內容 JSON 字串）：

```text
## Preflight decode (host)
{...}

## Preflight simulate (this tx blockhash, no sigVerify)
{...}

## Preflight getMultipleAccounts (token sources from decode)
{...}
```

每節 `JSON.stringify` 後若超過 8000 字元，截斷並加 `…`。

## `buildAssessPrompt(locale, kind, preflightContext)`

- `systemMessage`：報告規則 + 帳戶／`rpc_*` tool 列表 + 明示僅 `decode_message`、`simulate` 不可用。
- `userMessage`：三語 lead（主機已預檢，勿重複）+ `preflightContext` 全文。

## `assess.runSession` 順序

`TX_AI_WALL_MS` **60s** 只包住 sandbox harness loop（`assess.start` 前啟動、`waitForLoop` 結束即 `clearTimeout`）；**不含** SW preflight、**不含** Decisions。單次 `llm.chat`／tool 往返 **55s**（`TX_AI_LLM_BRIDGE_MS`），與 [0.32.0](../../0.32.0/INDEX.md) 一致。

1. `setTxAiState(running)`
2. `readSettings()`
3. `preflight = await runTxAiPreflight(...)`（不佔 60s 牆鐘）
4. `session.preflightEnriched = preflight.enriched`
5. `noteDecodedPubkeys(requestId, pubkeysFromTxAiDecode(...))`
6. `ensureOffscreen()` → 啟動 wall → `assess.start` 帶新 prompt
7. `waitForLoop` → 結束後清 wall
8. 定級用 `session.preflightEnriched.flags`（**不再** `enrichFlags(snapshot)`）

## OpenRouter `tools`

`bridge.ts`：

```ts
const PREFLIGHT_HOST_TOOLS = new Set(["decode_message", "simulate"]);
```

`SANDBOX_TOOL_SCHEMAS.filter((t) => !PREFLIGHT_HOST_TOOLS.has(t.name))` 再 map 成 chat tools。

## 與審批 blockhash 失效

**無耦合。** `ui.simulatePendingTx` 的 `BlockhashNotFound` 只影響預期變動卡；**不**讀寫 `txAi`、不 `abort` assess、不改 AI 列狀態。使用者可先讀 AI 報告，再由 dApp 重送新 blockhash 的交易。

## Loop 步數

`TX_AI_MAX_STEPS = 8`（`wallet/src/shared/tx-ai.ts`）；`agent-harness/loop.ts` 沿用此常數。

## 測試

`cd wallet && npm run build`。可選：對 `formatTxAiPreflightForPrompt` clip 寫小 unit。以 INDEX 手驗為準。
