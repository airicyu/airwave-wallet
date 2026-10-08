# HANDOFF — 0.24.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/how.md](./docs/how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游行為：[0.23.0](../0.23.0/INDEX.md)。目錄契約：[0.14.0](../0.14.0/INDEX.md)（資料夾之間只 import `index.ts`）

## 產品摘要

行為與 0.23.0 相同。`AGENTS.md`：`wallet/src` 的 `.ts` 少於 50 行可不寫檔首註解，50 行以上必須英文職責註解（最多 100 words）；另含 400 行 review、wallet 命令檔 150 行且不遞迴。Track 5 補齊全 tree 缺漏（不含手改 `ui-messages.ts`）。命令搬到 `background/wallet/commands/`，帳戶／聚合／session 分資料夾。`simulate-pending-tx.ts` 拆成同層檔。`close-empty-service.ts` 拆成列出、計畫、送出後刪除。不拆審批殼、CSS、字串表、持倉 service。

## Track

1 註解規則寫進 AGENTS.md → 2 `wallet/commands/` → 3 拆 `simulate-pending-tx.ts` → 4 拆 `close-empty-service.ts` → 5 補 ≥50 行 `.ts` 檔首註解，然後 `cd wallet && npm run typecheck && npm run build`

## 禁區

GUIDELINES pending／custody／不廣播。不改命令字串、storage key、vault、畫面、CSS、catalog。不加依賴。不留舊路徑 shim。不新建 `simulate/pending/`。不把 150 行套成遞迴資料夾。不批量給未改檔補註解。不要改 `../solibra-wallet`。文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.24.0/HANDOFF.md、INDEX.md、docs/how.md、docs/reasoning.md。行為與 0.23.0 相同。Track 1：把 HOW「註解規則」寫進 AGENTS.md。Track 2：新增 commands/index.ts；wallet/index.ts 只從 ./commands re-export。account、combined、session 依 HOW 分檔，invalidLabel 放 commands/account/invalid-label.ts 且不公開 export。connection、send、settings 整檔搬不拆。刪舊檔不留 shim。Track 3：刪 simulate-pending-tx.ts，拆成 simulate/ 同層的 sim-deadline、tx-base64、inspector-url、resolve-account-keys、simulate-rpc、phase2-deltas；bytesToBase64 只在 tx-base64.ts；buildInstructions 與 shortPk 跟 phase2-deltas；v0LookupCount 跟 resolve-account-keys。sign-tx-simulate 改 import 到同層檔，不經 simulate/index 轉一圈。公開 export 名不變。Track 4：刪 close-empty-service.ts，分成 list-closable、plan-close-empty、commit-close-empty。plan 只經 getLastListClosableEntries 讀清單，不讀 closable-cache 代替；getter 不進 close-empty/index.ts。feeTotalForPlan、assertPlanNotStale、classifyPlanResult、flattenResults 跟 commit 檔。list 只 import ../home-tokens；getOwnerParsedTokenAccounts 補進 home-tokens/index.ts。不改 closable-enrich.ts。commands.ts 的三個 handle 名不變；計畫仍只在 plan-store 記憶體。文字有改動的 ts／tsx 補英文檔首註解，最多 100 words。AGENTS.md 只寫永久規則，不寫「本版只拆哪些檔」。不要拆 shell.ts、CSS、ui-messages、home-tokens-service、popup 畫面檔。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 完成檢查

- [x] 設計審查無未關 HIGH
- [x] INDEX 狀態 `in progress` 後實作 Track 1–4（typecheck＋build）
- [x] changelog／version 對齊 `0.24.0`（出貨時）
- [x] Track 5：≥50 行 `.ts` 檔首註解已補（不含 `ui-messages.ts`）
- [ ] 使用者同意後才把 INDEX 標 `shipped`
