# Implementation review — 0.47.0 Airwave Wallet

- 日期：2026-10-17（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（同一份報告累加；舊 ID 不重編）
- 角色：實作審查（不改程式）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收（狀態 `in progress`）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- **總評：** 無未關閉 HIGH。H1、M1、M2 依現碼關閉。L1 仍開。`cd wallet && npm run typecheck` 通過。未封裝擴充手驗沒有走。無整包測試指令。手驗未完成前不宜 `shipped`。

關閉只看現碼，不採信上一輪追蹤表的「已修待複審」。

## Findings

### HIGH

#### H1 — 聚合管理頁不是只有兩塊 — **關閉（第 2 輪）**

已定案「管理頁」：這一頁只兩塊，本機帳戶不出現。

`ManageScreen` 在 `isCombinedAccount` 時只回 `CombinedManagePanel`。面板是主錢包小卡與成員區塊；加號在成員標題右上。名稱、成員數、聚合徽章、移除帳戶只留在非聚合的管理頁。

### MEDIUM

#### M1 — 成員名稱為空時列高塌成一行 — **關閉（第 2 輪）**

已定案「管理頁」：每列固定兩行，名稱可空。

成員列始終輸出 `.account-name`。`.member-copy .account-name` 設 `min-height: 1.2em`，空字串仍佔一行，下一行是縮寫地址與複製。

#### M2 — 排序命令失敗時畫面順序不收回 — **關閉（第 2 輪）**

已定案「成員排序」：集合不符或公鑰無法解析時不改儲存。

`handleReorderCombinedSubs` 在 `INVALID_PUBLIC_KEY` 時尚未寫入。`persist` 在 `!res.ok` 時 `showError` 並 `setOrder(acc.subPubkeys)`。

### LOW

#### L1 — 成員改名的公鑰放在模組變數 — **仍開**

帳戶列表與地址簿的改名參數在導覽（帳戶 id、卡片 id）。成員鉛筆用 `setMemberRenamePk` 寫模組層 `memberRenamePk`，路由 `account-member-rename` 不帶該公鑰。確認時若這格是空的，畫面直接 return，不發命令、不顯示錯誤。同一輪點鉛筆再確認不受影響。

## 驗收對照

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| 帳戶列表：可簽銅色鑰匙、唯讀藍色眼睛；鉛筆在三點左；改名是子畫面，返回不寫入，確認成空不寫入 | 手驗未走 | 靜態：`ACCOUNT_KIND_COLOR` 可簽 `#D08B5B`、唯讀 `#6CB4E8`、聚合 `#c084fc`。列表與頂欄 `AccountKindMark` 用這組。鉛筆 `account-side-rename` 在 `IconKebab` 左，`margin-right: 10px`。`account-rename` 返回父頁是 `accounts`，不發命令。`RenameScreen` 在 trim 後為空則 return，不呼叫 `wallet.renameAccount`、不顯示錯誤。成功才 `navigateTo("accounts")`，失敗留在子畫面 |
| 地址簿：鉛筆在紅底刪除左；改名是子畫面；拖曳仍改順序 | 手驗未走 | 靜態：鉛筆後接 `trash-solid`（`background: var(--danger)`、`color: #fff`），間距同類名。`address-card-rename` 確認呼叫 `addressBook.rename`；trim 後為空不發命令。返回父頁 `address-cards`。列上不再就地輸入。拖曳握把仍在列上 |
| 管理頁見主錢包小卡與成員區塊；加號在標題右上；本機帳戶不在這一頁；拖曳只改成員順序 | 手驗未走 | 靜態：小卡標籤 `common.currentWallet`（主錢包／主钱包／Main wallet），複製的是正規化後的 `mainPubkey`。加號 `navigateTo("account-manage-add")`。拖曳只送 `wallet.reorderCombinedSubs`，處理函式只改 `subPubkeys`。本機清單在 `account-manage-local`。聚合的 `account-manage` 只畫兩塊，見 H1 |
| 無本機帳戶的成員可設名稱、可改回空；有可簽本機帳戶顯示該戶名稱、沒有鉛筆、有銅色鑰匙。有唯讀本機帳戶顯示該戶名稱、沒有鉛筆、圖示槽留空 | 手驗未走 | 靜態：無本機列才畫鉛筆，確認呼叫 `wallet.setCombinedMemberName`。trim 後空字串在伺服器刪該鍵，成功回 `account-manage`。有 `signing` 或 `readOnly` 同地址時顯示該列 `label`、不畫鉛筆。只在 `accountKind === "signing"` 時畫銅色鑰匙；`.member-kind-slot` 固定寬 22px。空名稱列高見 M1。`localOwns` 命中則 `MEMBER_NAME_LOCKED`，不寫 `memberNames` |
| `wallet.reorderCombinedSubs` 集合不符或無法解析時不改順序、主錢包、`memberNames` | 靜態通過；手驗未走 | 每一項 `parsePublicKeyBase58`，失敗即 `INVALID_PUBLIC_KEY` 且尚未寫入。重複項只留第一次。正規化去重後長度或成員與目前 `subPubkeys` 的集合不同則同樣不寫。通過時只指派 `subPubkeys`。失敗時畫面收回，見 M2 |
| 本機帳戶改名後，聚合成員顯示新名稱，`memberNames` 不含這條 | 手驗未走 | 靜態：顯示用 `local.label`，不把 label 寫進 `memberNames`。本機改名走既有 `wallet.renameAccount`，不碰 `memberNames`。有本機列時設名稱被拒 |
| 刪掉該本機帳戶後，成員仍在，顯示改回 `memberNames`（沒有則只剩地址） | 手驗未走 | 靜態：刪成員才從 `subPubkeys` 移除。刪的是單一帳戶時，成員鍵還在；沒有本機列就改讀 `memberNames`，沒有鍵則名稱為空 |
| 之後單一本機帳戶加入同一地址，顯示改鎖成該戶名稱 | 手驗未走 | 靜態：再次出現 `signing` 或 `readOnly` 同地址時又優先顯示 `label`。既有 `memberNames` 鍵不在這條路徑刪除，也不拿來顯示 |
| `cd wallet && npm run typecheck` | 通過 | 2026-10-17 第 2 輪於 `wallet/` 執行，`tsc --noEmit` 結束碼 0 |
| 未封裝擴充走帳戶列表改名、地址簿改名、聚合管理（選主錢包、拖曳、加入、改名）各一輪 | 未走 | 此環境沒有未封裝擴充可操作。靜態讀碼不算通過 |

無整包測試指令。本版 INDEX 只寫 `cd wallet && npm run typecheck` 與未封裝手驗。沒有假設 `bun test`。

## 測試結果

- 指令：`cd wallet && npm run typecheck`（cwd：`wallet/`）
- 結果：通過（2026-10-17，第 2 輪）
- 無整包測試指令
- 未封裝手驗未走。上表除 typecheck 以外都沒有在未封裝擴充走完

INDEX 狀態仍是 `in progress`，驗收未勾。

架構禁區：帳戶與成員名稱仍經既有 extension command 寫入帳戶儲存。沒有把 pending hydrate、全 tab 廣播或硬編碼密碼當成主路徑。`memberNames` 只在聚合管理讀取，Home、送出、dApp 沒有讀這個欄。

第 2 輪沒有新增 ID。

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置 |
|----|----|------|----------|
| H1 | H | 關閉（第 2 輪） | 聚合時 `ManageScreen` 只回 `CombinedManagePanel` |
| M1 | M | 關閉（第 2 輪） | `.member-copy .account-name` 最小行高 |
| M2 | M | 關閉（第 2 輪） | 排序失敗 `setOrder(acc.subPubkeys)` |
| L1 | L | 仍開 | — |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-17 | H1 仍開。M1、M2、L1 仍開。typecheck 通過。未封裝手驗未走。不可出貨 |
| 第 2 輪 | 2026-10-17 | H1、M1、M2 依現碼關閉。L1 仍開。無未關閉 HIGH。typecheck 通過。未封裝手驗未走。不宜 `shipped` |
