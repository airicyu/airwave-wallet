# 實作審查 — 0.42.0

- 日期：2026-10-14（Asia/Hong_Kong）
- 輪次：**第 1 輪初審**
- 角色：實作審查（不改 INDEX／HOW／HANDOFF／程式；不 commit）
- 對照基準：[INDEX.md](../INDEX.md) 已定案＋驗收；[HANDOFF.md](../HANDOFF.md)；[send-combined-how.md](./send-combined-how.md)；架構禁區 [GUIDELINES.md](../../GUIDELINES.md)
- 範圍：`git status`／diff 中 0.42.0 相關程式與 `dev-docs/roadmap/0.42.0/`（untracked）；另含同工作樹內與本版無直接關係的 roadmap 文件 diff（見 042-L01）

**總評：** Track 1（popup 入口／餘額切片）與 Track 2（`handleBeginSend` 閘門、`signAccountId`、單 owner 查列）與 INDEX／HOW 一致；架構禁區未見新的主路徑違反。**無未關閉 HIGH。** `npm run typecheck` 通過；`wallet-send-eligibility` 窄測 2/2 通過（見測試結果）。INDEX 驗收仍全未勾、手驗未記錄——**尚不能標 shipped**（042-M01）。

---

## Findings

關閉＝已符合契約或已驗；仍開＝須實作 agent 或使用者補完；非阻擋＝出貨前建議處理。

### HIGH

（無。）

**未關閉 HIGH：** 無。

### MEDIUM

| ID | 狀態 | 說明 |
|----|------|------|
| 042-M01 | **仍開** | INDEX 驗收 checklist 七項皆未勾；其中兩條手驗（可簽聚合送出、超過成員餘額拒絕）與「送出進行中切換目前錢包」本輪未在未封裝擴充執行。靜態對照支持 Track 1–2 已接線，但出貨門檻仍須使用者手驗並勾 INDEX。 |
| 042-M02 | **仍開（非阻擋）** | `wallet-send-eligibility.test.ts` 已加入，但 `wallet/package.json` 仍無 `test` script；裸 `node --test` 無法解析 TS。審查以 `npx tsx --test src/shared/wallet-send-eligibility.test.ts` 跑通。建議出貨前在 INDEX 或 package scripts 寫明窄測指令（可選）。 |

### LOW

| ID | 狀態 | 說明 |
|----|------|------|
| 042-L01 | **仍開（非阻擋）** | 同一 working tree 含非 0.42.0 文件 diff：`dev-docs/roadmap/0.30.0/`、`dev-docs/roadmap/README.md`、`dev-docs/roadmap/backlog/`（刪除 AI／bubble-harness 構想檔、更新 `send-token-combined.md`）。不影響本版送出邏輯；commit 時宜分開或註明。 |
| 042-L02 | **仍開（非阻擋）** | `dev-docs/roadmap/README.md` 表列 0.42.0 為 `planned`，[INDEX](../INDEX.md) 為 `in progress`。 |
| 042-L03 | **仍開（非阻擋）** | 窄測未覆蓋：`canWalletSendFromActiveAccount` 在 `mainPubkey` 對應 `readOnly`、或成員列缺目前錢包時的行為；SW 超額 `INSUFFICIENT_FUNDS` 仍依 0.12.0＋單 owner 列，未加新測。 |

---

## 驗收對照

| INDEX 驗收句 | 靜態／自動化結果 | 備註 |
|--------------|------------------|------|
| 聚合、目前錢包可簽：詳情有「送出」，流程同單一 | **靜態通過** | `TokenDetailView` 改用 `canWalletSendFromActiveAccount`；`TokenSendForm`／`send-logic` 沿用 0.12.0 流程。 |
| 可送出上限＝目前這一條餘額 | **靜態通過** | `homeTokenRowForSendBalance`＋`uiAmountLabel`→`BigInt`；窄測 assert 成員 `1` 非合併 `3`。 |
| 其他成員不能同一筆送出 | **靜態通過** | SW `getHomeTokensForOwners([gatePubkey])` 僅單 owner；無歸集路徑。 |
| 目前錢包不可簽：無「送出」 | **靜態通過** | `resolvePubkey`→`role !== "signing"` 時 popup／SW 皆拒；`readOnly` 在 `signGateError` 已挡。 |
| 送出進行中切換目前錢包：仍簽凍結簽名列 | **依 0.12.0 推定** | `addPending` 寫入 `signAccountId`（簽名列 id）；審批／`finish-pending` 未改。本輪未手驗。 |
| `cd wallet && npm run typecheck` | **通過** | exit 0（見測試結果）。 |
| 手驗：可簽聚合送出與超額拒絕 | **未執行** | 見 042-M01。 |

---

## 契約抽樣（working tree）

| 檢查項 | 結果 |
|--------|------|
| 新模組 `wallet-send-eligibility.ts`：popup `canSend`＋餘額切片；不碰 RPC／pending | 通過 |
| `send-command.ts`：`signGateError`→`resolvePubkey(..., gatePubkey)`→`signAccountId`；`loadedAccountForAccountId(signAccountId)`；單 owner 查列 | 通過；與 HOW「非 `active.id`」一致 |
| 未新 pending kind、未改 storage 形狀、未廣播 | 通過 |
| 金額演算走 `uiAmountLabel` 字串→`BigInt`（`tokenBalanceRaw`）；`homeTokenRowForSendBalance` 帶入的 `uiAmount` number 未參與上限演算 | 通過 |
| 修改的 `send-command.ts` 檔首英文職責註解（≥50 行規則） | 通過 |
| 新檔 `wallet-send-eligibility.ts` 檔首註解 | 通過 |

---

## 測試結果

工作目錄 `wallet/`。

| 指令 | exit code | 備註 |
|------|-----------|------|
| `npm run typecheck` | 0 | INDEX 驗收明列 |
| `npx tsx --test src/shared/wallet-send-eligibility.test.ts` | 0 | 2 passed；非 INDEX 明列；package 無 `test` script |

未跑未封裝擴充手驗（INDEX 要求，見 042-M01）。

---

## 修復追蹤

| ID | 狀態 | 追蹤 |
|----|------|------|
| 042-M01 | 仍開 | 實作／使用者：手驗三條（含 pending 期切換 `mainPubkey`）；勾 INDEX 驗收。 |
| 042-M02 | 仍開、非阻擋 | 可選：加 `npm test` 或 HANDOFF 寫 `tsx --test` 路徑。 |
| 042-L01 | 仍開、非阻擋 | 提交範圍與 0.42.0 分離。 |
| 042-L02 | 仍開、非阻擋 | README 狀態與 INDEX 對齊。 |
| 042-L03 | 仍開、非阻擋 | 可補 read-only combined 窄測。 |

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪 | 2026-10-14 | 無 HIGH；Track 1–2 與契約一致；typecheck＋窄測通過；手驗與 INDEX 勾選未完成，未過出貨門檻 |
