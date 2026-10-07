# HANDOFF — 0.21.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/close-empty-how.md](./docs/close-empty-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.20.0](../0.20.0/INDEX.md)、[0.11.0](../0.11.0/INDEX.md)（優先費）、[0.5.0](../0.5.0/INDEX.md)（聚合）
6. 概念稿（非正式）：[`docs/design-demos/close-empty-token-accounts-ux.html`](../../design-demos/close-empty-token-accounts-ux.html)

## 產品摘要

Home Tokens 標題列收回空 token account rent。勾選→`planCloseEmpty`（Kit 估 CU limit、Default CU price）→確認→`commitCloseEmpty`（簽名、parallel executor 送出、passthrough 失敗）。無 popout、無新 pending kind。

## Track

1 掃描＋入口 → 2 打包＋勾選＋確認（含 plan）→ 3 commit＋executor → 4 build

## 禁區

GUIDELINES pending／custody；不改 `walletSend`／dApp 簽署；不廣播全 tab；不寫 storage；不做非目標；文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.21.0/HANDOFF.md、INDEX.md、close-empty-how.md、reasoning.md。跟 Track：listClosable 掃描（可簽成員、0 餘額、Token-2022 無 extension）→ Tokens 標題列回收鈕 → shared 打包 1232 → pick/confirm views → planCloseEmpty（estimateResourceLimitsFactory + 寫 CB + planId 記憶體）→ commitCloseEmpty（STALE_LIST、先簽後送、rpcTransactionPlanExecutor estimateResourceLimits false、不傳 maxConcurrency、passthroughFailedTransactionPlanExecution）→ 結果頁 → npm run build。禁 popout、禁新 pending、禁 web3.js。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 完成檢查

- [x] 設計審查無未關 HIGH（2026-10-08 第 2 輪，見 `docs/design-review.md`）
- [x] INDEX 狀態 `in progress` 後實作（Track 1–4）
- [x] changelog／version 對齊 `0.21.0`
- [x] 使用者同意出貨（2026-10-08）：`shipped`、已刪 `backlog/close-empty-token-accounts.md`
