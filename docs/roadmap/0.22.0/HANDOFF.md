# HANDOFF — 0.22.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)、[docs/design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/how.md](./docs/how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 概念稿（非正式）：[`docs/design-demos/022-ui-polish-ux.html`](../../design-demos/022-ui-polish-ux.html)
6. 上游：[0.21.0](../0.21.0/INDEX.md)、[0.18.0](../0.18.0/INDEX.md)（Activity）、[0.11.0](../0.11.0/INDEX.md)（CU 公式）

## 產品摘要

Home 頂欄緊湊 pill（圓形兩字頭像｜名稱置中｜複製靠右、無地址列）；僅 Devnet 橙黃徽章在 pill 外右側；複製成功勾 1.6s；刷新 3s 冷卻弧；Activity 列尾 Orb；收回租金確認中藏頂欄＋與簽署同一 dash-ring；簽署 phase 1 改 Kit `estimateResourceLimitsFactory`，建議 limit 公式不變。

## Track

1 Home 頂欄／刷新／Orb → 2 收回租金確認中 → 3 簽署複製＋Kit phase 1 → 4 typecheck／build

## 禁區

GUIDELINES pending／custody／不廣播。不改 vault。不改 `walletSend` 語意。不改簽署 Inspector。不改收回租金 CU margin。不走審批殼 pending。不做 explorer 選擇。文件不寫真實秘密。不要改 `../solibra-wallet`。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/design-principles.md、docs/roadmap/0.22.0/HANDOFF.md、INDEX.md、docs/how.md、docs/reasoning.md。跟 Track：Home 緊湊 pill（36px 圓、顯示名稱前 2 字、無地址列、複製在 pill 內 1.6s 勾）；label 寫入最多 15；無名稱顯示公鑰前 4；僅 devnet 於 pill 外右側 Devnet 徽章；刷新按下起算 3s 弧；Activity orbUrl https://orb.helius.dev/tx/{sig}?cluster=devnet|mainnet-beta（無 /history），刪 solscan；close-empty-sending 藏頂欄、共用 SEND_STATUS_AURORA_SVG、「確認中」「等待鏈上確認」，結果頁不變；sign-tx phase 1 探針 1.4M/price0 後 estimateResourceLimitsFactory，讀回傳 computeUnitLimit（勿讀 unitsConsumed），suggestedLimitFromPhase1 不變，禁 estimateAndSetResourceLimitsFactory，不改 computeCloseEmptyUnitLimit。不新增 command／storage。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 完成檢查

- [x] 設計審查無未關 HIGH
- [x] INDEX 狀態 `in progress` 後實作 Track 1–4
- [x] changelog／version 對齊 `0.22.0`
- [x] 出貨後刪已完成 backlog 列與檔（cluster／copy／refresh／kit-cu）
