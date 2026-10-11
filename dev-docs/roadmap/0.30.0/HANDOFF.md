# 0.30.0 HANDOFF

**狀態：** **設計審查閘門已通過**（見 [`docs/design-review.md`](./docs/design-review.md) 第 2 輪）。可依 Track 實作產品碼。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [docs/design-review.md](./docs/design-review.md)
5. 上游 [0.27.0](../0.27.0/INDEX.md) key 形狀；[0.29.0](../0.29.0/INDEX.md) Mainnet RPC
6. POC：`test-web/sign-risk-*.ts`（參考；tool 表以 HOW 為準）
7. 視覺：Settings · AI [`tx-ai-analysis-ux.html`](../design-demos/tx-ai-analysis-ux.html)；審批帳戶／站點 [`approval-account-chrome-ux.html`](../design-demos/approval-account-chrome-ux.html)；AI 卡＋overlay [`tx-ai-chip-report-ux.html`](../design-demos/tx-ai-chip-report-ux.html)（已同意）

## 產品摘要

Settings 開 AI＋OpenRouter → 三種 kind enqueue 後 SW 自動 assess 一次 → offscreen 承載 sandbox 唯讀 harness → **僅 SW** Decisions＋本地 flags 下限 → 審批卡 icon／報告；不擋模擬與核准；pending 結束即丟。

## Track 順序

1. Settings／storage（含 `openRouterDecisionsModel`、secrets UX）  
2. Sandbox 殼與橋（offscreen 必備、CSP、信任根）  
3. Host tools／assess／Decisions／flags 下限（僅 SW）  
4. 審批 UI（懸浮卡＋overlay；帳戶 pill 第一列；站點同列靠左）  

## 禁區

- Sandbox／offscreen 碰 vault／代簽／持 key／打 Decisions  
- 採信 sandbox 回傳 flags 做下限  
- 泛用 RPC／broadcast method  
- 等級禁用核准；Refresh 重跑 AI；報告 persist；寫死繁中；npm 出貨 bubble-harness  

## 待拍板

無。

## Paste-ready starter（實作 Track 1）

```text
讀 dev-docs/roadmap/0.30.0/INDEX.md、docs/how.md、HANDOFF.md、AGENTS.md、dev-docs/roadmap/GUIDELINES.md。
實作 0.30.0 Track 1 — Settings／storage：openRouterApiKey、openRouterModel、openRouterDecisionsModel、txAiAnalysisEnabled、openRouterConfigured；toPublicSettings omit key；readIntegrationSecrets 加 key；設定 UI（秘密列 UX＝Helius／Jupiter；模型兩下拉；開關預設 off）；三語 catalog。
對照 dev-docs/design-demos/tx-ai-analysis-ux.html Settings · AI。
不要做 Track 2–4；不要 commit 除非使用者要求。
INDEX 狀態改 in progress。驗收：typecheck；getState 無明文 key。
```
