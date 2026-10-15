# 0.44.0 HANDOFF

**狀態：** 實作完成（INDEX `in progress`）；待使用者手驗擴充與同意出貨／commit。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [docs/design-review.md](./docs/design-review.md)
5. 概念稿 [`tx-ai-model-chain-ux.html`](../../design-demos/tx-ai-model-chain-ux.html)（已同意）
6. 上游：[0.39.0](../0.39.0/INDEX.md)、[0.30.0](../0.30.0/INDEX.md)、[0.34.0](../0.34.0/INDEX.md)

## 產品摘要

- 報告／定級 **預設｜自訂**；預設鏈在 `tx-ai.ts` 常數，**不**寫 storage；Settings 預設時 **disabled** 列出常數。
- 自訂 ≤5 id + completion 備援（404／502／503 換下一個；429 等 1s；400／401／402／403 與其他失敗不換）。
- 審批 AI 列：**不變**（0.43 widget）。

## Track 順序（閘門通過後）

1. **Track 1** — `tx-ai.ts` 常數／`effective*Chain`／`classifyOpenRouterFailure`；`openrouter.ts` `callWithModelChain`；`tx-ai.test.ts`
2. **Track 2** — `*Mode`／`*Chain` + migrate；`TxAiSettingsScreen` 預設｜自訂（**無**還原預設按鈕）；hub；`ui-messages` `defaultSummary`
3. **Track 3** — `bridge` session 鎖定（**勿**改 `tx-ai-widget`）
4. **出貨** — [`docs/user-guide.md`](../../../docs/user-guide.md) 交易 AI 一節

## 禁區

- pending storage hydrate、全 tab 廣播、硬編碼密碼、sandbox OpenRouter
- 閘門前改 `wallet/`（test-web 除外）
- 把常數鏈寫入 storage 的「還原預設」按鈕

## 測試

| 階段 | 指令／手驗 |
|------|------------|
| test-web | `cd test-web && npm run build` |
| wallet | `cd wallet && npm run typecheck && npm run build` |
| 手驗 | HOW §9 六項 + INDEX 驗收 |

## Paste-ready starter（閘門通過後）

```text
讀 AGENTS.md、GUIDELINES、design-principles、dev-docs/roadmap/0.44.0/INDEX.md、docs/how.md、reasoning.md、HANDOFF.md、docs/design-review.md（最新輪，無未關 HIGH）。

依 Track 1→3 實作 0.44.0。HTTP／migrate／Settings 觸發以 INDEX+HOW 為準。Track 1：tx-ai 鏈 + openrouter + 單測。Track 2：mode/chain + TxAiSettings（預設 disabled 列、離開子頁存 custom）。Track 3：discardTxAi + widget。每 Track 結束 typecheck/build。HOW §9 手驗。不要 commit。
```
