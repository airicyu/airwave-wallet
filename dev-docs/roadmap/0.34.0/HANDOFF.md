# 0.34.0 HANDOFF

**狀態：** `shipped`（2026-10-12）。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [docs/design-review.md](./docs/design-review.md)（審查產物）
5. 上游：[0.30.0](../0.30.0/INDEX.md)、[0.32.0](../0.32.0/INDEX.md)

## 產品摘要

SW 在 sandbox 前跑 decode + 審批式 simulate + 分批 getMultipleAccounts，塞進 user prompt；OpenRouter **只**不提供 `decode_message`、`simulate`；`get_accounts`／`rpc_get_multiple_accounts` 保留。定級重用 preflight。**AI 與審批 blockhash 失效無關**（不中止、不略過）。

## Track 順序

1. preflight 模組 + enrichFlags `accountsRead`
2. prompt、bridge 過濾、assess 整合（含 AI 與審批 blockhash **解耦**；不做 sync／略過列）
3. build、features、changelog、版本號、INDEX 手驗

## 禁區

- 改 0.33 預期變動 UI
- 持久化 preflight／report
- 審批 simulate 改回換 blockhash
- pending storage hydrate、全 tab 廣播

## 待拍板

無。

## Paste-ready starter（設計閘門通過後）

```text
讀 dev-docs/roadmap/0.34.0/INDEX.md、docs/how.md、HANDOFF.md、AGENTS.md、dev-docs/roadmap/GUIDELINES.md。
依 Track 1→3 實作。runTxAiPreflight 在 assess.start 前；user prompt 含三節 JSON；bridge 僅過濾 decode_message／simulate；定級用 preflightEnriched；不實作 blockhash 同步／略過 AI。
工作區可能有未提交 WIP，以 INDEX 為準對齊。
不要 commit，除非使用者要求。
```
