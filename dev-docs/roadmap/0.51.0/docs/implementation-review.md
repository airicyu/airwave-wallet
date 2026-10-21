# Implementation review — 0.51.0

Reviewed at: working tree（HEAD `915903e` 加上未提交變更）
Tracks: 1

- 日期：2026-10-21
- 輪次：**1**。後續輪次沿用既有 ID，往下追加。
- 角色：實作審查。不改程式、不改 INDEX／how、不 commit。
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案與驗收；[`how.md`](./how.md)；[`../HANDOFF.md`](../HANDOFF.md) 只核對交接是否越權；架構禁令見 [`../../GUIDELINES.md`](../../GUIDELINES.md)。
- 範圍：`wallet/src/popup` 建立合併帳戶相關 diff，以及未追蹤的 `wallet/src/popup/accounts/combined-create-add.tsx`、`dev-docs/roadmap/0.51.0/`。

## Round 1（2026-10-21）

**總評：** Track 1 的畫面、草稿與 `wallet.createCombinedAccount` 呼叫與 INDEX、how 一致，架構禁令未破。`cd wallet && npm run typecheck` 結束碼 0。未封裝擴充手驗未走完。沒有未關閉的 HIGH。

### Match to how.md

| 步驟 | 結果 |
|------|------|
| 三個 view id、標題、`BACK_PARENT`、`AccountViews` 渲染 | 完成 |
| 四個建立 view 之間保留草稿；離開這四個 view 時在改 `currentView` 的同一處清除；建立成功也清除 | 完成（`noteCombinedCreateNavigation` 在 `navigateTo`；成功路徑另呼叫 `clearCombinedDraft`） |
| 草稿型別 `label` / `members` / `main`，模組記憶體，不進 `chrome.storage` | 完成 |
| `members` 只存正規化公鑰；加入時略過失敗與重複；main 空或不在名單時改為第一筆或空 | 完成 |
| 建立頁：名稱、有成員才顯示主錢包卡、成員列無鉛筆、握把拖曳門檻 6、不呼叫 `wallet.reorderCombinedSubs` | 完成 |
| 名稱 `maxLength`、空白不送 `label`、失敗留在頁面並寫 `#combined-err`、不用 `showError` | 完成 |
| 沒有本機 signing／watch 時不渲染名稱行；主錢包卡同樣省略空名稱 | 完成 |
| 新增選項、貼上、本機清單的行為與 dock | 完成 |
| 沿用 `accounts.css` 的管理頁樣式；建立頁不再使用 `.chip-list`、`.add-line`、`.combined-pick-list` | 完成（本輪沒有 CSS diff） |
| how 寫的 export：read、replace、clear | 不同：有 `getCombinedDraft` 與 `clearCombinedDraft`，更新拆成 label／append／remove／main／reorder，沒有單一 `replace`。見 IR-051-2 |

### Findings

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| IR-051-1 | MEDIUM | Open（出貨門檻） | INDEX 驗收勾選仍是空的。本輪沒有載入未封裝擴充，最後一列手驗（貼上、本機帳戶、設主錢包、調順序、建立、到管理頁核對）未走完。 |
| IR-051-2 | LOW | Open | `how.md` 要求草稿模組匯出 replace。實作沒有這個函式，改由數個 mutation 寫入同一份模組草稿。產品行為仍符合 INDEX。 |
| IR-051-3 | LOW | Open（預期） | 版號仍是已出貨的 0.50.0（`npm run typecheck` 印出 `@airwave/wallet@0.50.0`）。與 INDEX `in progress` 一致，等使用者說 ship 再對齊。 |

**未關閉 HIGH：** 無。

### 架構禁令

| 檢查 | 結果 |
|------|------|
| Pending 不進 UI 自行灌 storage | 通過。本版沒有新的 pending |
| 耐久狀態以 `chrome.storage` 為準 | 通過。草稿依 INDEX 放在畫面旁模組，不寫 storage，也沒有另做 rehydrate 主路徑 |
| 託管：無硬編密碼、無明文長存解鎖金鑰 | 通過。本 diff 未碰 vault |
| 訊息只回原分頁 | 通過。仍走既有 `sendExtensionRequest("wallet.createCombinedAccount")`，沒有新指令 |
| 金額不用 JavaScript `number` | 通過。本 diff 沒有金額運算 |
| 新的第三方依賴 | 通過。沒有 `package.json` 變更 |
| 指令或 storage 死路徑 | 通過。`memberNames`、`wallet.reorderCombinedSubs`、`wallet.setCombinedMemberName` 沒有從建立頁送出 |

### INDEX 驗收

| 驗收列 | 結果 | 依據 |
|--------|------|------|
| 名稱欄；有成員時主錢包卡與成員列（圓圈、種類槽、複製、垃圾桶、握把） | 靜態通過 | `combined-create-screen.tsx` |
| 加號進地址或本機帳戶；貼上只收新的有效鍵並回到建立頁；本機列再點顯示已在組合 | 靜態通過 | `combined-create-add.tsx`、`keysFromPaste` |
| 圓圈設定主錢包卡；垃圾桶可清到零筆並停用建立；握把順序即 `subPubkeys` | 靜態通過 | 草稿 mutation 與 `onPrimary` |
| 從建立頁回到新增選擇器會清草稿；從貼上或本機返回保留；選單離開四個 view 也清 | 靜態通過 | `BACK_PARENT` 與 `noteCombinedCreateNavigation`；`setCurrentView` 只在 `navigateTo` |
| 仍呼叫 `wallet.createCombinedAccount`，不寫 `memberNames` | 靜態通過 | payload 只有 `label?`、`subPubkeys`、`mainPubkey`。指令本體未改 |
| `cd wallet && npm run typecheck` | 通過 | 結束碼 0（2026-10-21） |
| 未封裝擴充手驗 | 未走完 | 本輪無法載入擴充，不記為通過 |

本版 INDEX 沒有整包測試指令，也沒有 `test-web` 步驟。沒有跑 `bun test`。

### 測試結果

工作目錄 `wallet/`。本輪執行。

| 指令 | 結束碼 |
|------|--------|
| `npm run typecheck`（`tsc --noEmit`） | 0 |

### Fix log

| ID | Status | 追蹤 |
|----|--------|------|
| IR-051-1 | Open | 在未封裝擴充走完 INDEX 最後一列，再勾驗收。這不是程式修補。 |
| IR-051-2 | Open | 若要對齊 how，可補一個 replace，或把 how 改成現有的 mutation。行為已符合 INDEX，不擋 Track。 |
| IR-051-3 | Open | 使用者說 ship 時再對齊版號。 |

## Verdict: accept with fixes

程式可以接受。出貨前仍要補 IR-051-1 的手驗。沒有需要先改程式才能再審的 HIGH。
