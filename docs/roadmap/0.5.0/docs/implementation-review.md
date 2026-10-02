# Implementation review — 0.5.0 Airwave Wallet

- **日期：** R1 2026-10-02（Asia/Hong_Kong）
- **輪次：** R1（初審）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`combined-how.md`](./combined-how.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）＋錨點檔；不以 chat history 為準

---

## 總評

Combined 四 Track 主路徑對齊 INDEX／HOW，**R2 已關 H1／H2**；**`cd wallet && npm run build` 通過**。無未關閉 HIGH。INDEX 驗收 checklist 靜態已核；**Chrome 手驗仍待使用者**。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| H1 | 鎖定時可簽 main 誤回 `ACCOUNT_READ_ONLY` | **關閉（R2）** | 見上 | R2 已修 |
| H2 | TTL 背景 refresh 以 `withMembers:false` 覆寫 combined 快取 | **關閉（R2）** | 見上 | R2 已修 |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | changelog／version 早於 INDEX 出貨 | **開啟** | [`version.md`](../../../version.md)、[`wallet/package.json`](../../../wallet/package.json) 已 `0.5.0`，[`changelog.md`](../../../changelog.md) 已寫 0.5.0；INDEX 仍 `in progress`、驗收未勾、backlog 未清。 | 出貨前再勾驗收、改 INDEX `shipped`、刪 backlog（HANDOFF）。 |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | Token 展開鈕含 `title` tooltip | **開啟** | [`popup/main.ts`](../../../wallet/src/popup/main.ts) 展開 chevron 設 `title`「展開／收合成員」。INDEX 禁止 hover tooltip 當**主路徑**；目前主路徑仍為按鈕＋列內明細，屬輔助。可保留或移除 `title` 以嚴格對齊字面。 |

---

## R1 重點對照（INDEX／HOW／禁區）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| Pending 僅 SW | **符合** | [`pending.ts`](../../../wallet/src/background/pending.ts) `Map`；popout 帶 `requestId` |
| 結果 targeted（切 main） | **符合** | [`notifyAccountChangedForConnectionAccount`](../../../wallet/src/background/index.ts) 比對 `connections.accountId` |
| 持久 state 經 `chrome.storage` | **符合** | accounts／connections 讀寫未改禁區 |
| Combined 判別聯合、`getExposedPublicKey` | **符合** | [`accounts.ts`](../../../wallet/src/shared/accounts.ts)、[`storage-keys.ts`](../../../wallet/src/shared/storage-keys.ts) |
| `ACCOUNT_EXISTS` 僅 signing+watch | **符合** | `pubkeyExists` → `signingWatchPubkeyExists` |
| 禁止巢狀 combined id 當 sub | **符合** | `normalizeSubPubkeysInput` + `isCombinedAccountId` |
| `LAST_SUB_ACCOUNT` | **符合** | `wallet.removeCombinedSub` length===1 |
| 刪 storage signing 不動 combined subs | **符合** | `deleteAccount` 只 filter accounts |
| Connect 綁 combined id、暴露 main | **符合** | `rememberConnectedTab(..., activeId)` + `getActivePublicKey` |
| 簽名取 signing `accountId`、禁 combined.id | **符合** | `keypairForActiveSigning` + `resolvePubkey` |
| 簽名優先序 read-only 先於鎖定 | **部分** | 邏輯順序正確，但 H1 使可簽 main 在鎖定被誤判 read-only |
| Home 多 owner 串行、無平行 DAS | **符合** | `runRefresh` `for (const owner of owners)` 串行 |
| 任一 owner 失敗整輪失敗＋保留快取 | **符合** | `fetchSingleOwnerRows` throw → catch 回 `cached` |
| `wallet.getHomeTokens` 附 `members` | **符合** | `withMembers: isCombinedAccount(active)` |
| 方案 A Add→獨立填表頁 | **符合** | `screen-add-combined`、`btn-go-add-combined` |
| combined Reveal 隱藏 | **符合** | manage combined `btnGoReveal.hidden = true` |
| export combined → `ACCOUNT_READ_ONLY` | **符合** | `wallet.exportAccountSecret` |
| inject features 未剝除 | **符合** | [`inject/wallet.ts`](../../../wallet/src/inject/wallet.ts) |
| 廢除 owners 長度 1 守衛 | **符合** | `getHomeTokenOwners` 多址；無「≠1 不打網」 |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**；標 **需手驗** 者本審查未在 Chrome 執行。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| `cd wallet && npm run build` 成功 | **通過** | R1：`tsc --noEmit && vite build` exit 0 |
| 可建 combined（≥1 址；含 signing 列與未入隊址）；不能刪到 0 sub | **靜態通過**／**需手驗** | commands + popup 建立／`LAST_SUB_ACCOUNT` |
| `setActiveAccount` 切 combined／單一：dApp 新暴露公鑰、`connections.accountId` 不變 | **靜態通過**／**需手驗** | `setActiveAccount` + `notifyAccountChanged` |
| 刪原 main 的 signing 後 combined 仍在、main 址不變、簽名 `ACCOUNT_READ_ONLY` | **靜態通過**／**需手驗** | 刪帳不改 combined 列；`resolvePubkey` 第 3 步 |
| 切目前錢包：僅綁該 combined 的 origin 收 `account-changed` | **靜態通過**／**需手驗** | `setCombinedMain` → `notifyAccountChangedForConnectionAccount` |
| 鎖定＋combined＋可簽 main → `WALLET_LOCKED` | **未通過（H1）**／**需手驗確認** | 鎖定時 secrets 未注入解析 |
| Home 加總；單一 pipe | **靜態通過**（H2 影響 TTL 後快取）／**需手驗** | `mergeMultiOwnerRows` |
| Combined 展開列：僅餘額>0 成員與 %；展開不改 main | **靜態通過**／**需手驗** | merge 濾 `uiAmount<=0`；展開僅 toggle Set |
| 非 combined 無展開控制 | **靜態通過**／**需手驗** | `activeIsCombined && members.length>=1` |
| 無巢狀 combined | **靜態通過** | `normalizeSubPubkeysInput` |
| pending／custody 禁區未破 | **符合（靜態）** | 無 storage pending hydrate、無硬編碼密碼 |

### Track 對照（靜態）

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 Storage／解析／CRUD | **是** | H1 不影響 CRUD |
| 2 Connect／切 main／簽名 | **部分** | H1 |
| 3 Home 加總 + pipe | **部分** | H2 |
| 4 Popup UI + version 0.5.0 | **是** | M1 流程；build 通過 |

---

## 測試結果

**無整包測試指令**（GUIDELINES；INDEX 指定 build + 手驗）。

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run build` | `wallet/` | **通過**（vite ~1.2s，exit 0） |
| R1 | Chrome 載入 `wallet/dist`、INDEX 手驗句 | — | **未執行** |

### 需瀏覽器手驗（對 INDEX 手驗指令）

1. 建 combined（一從未在 storage 的地址 + 一已是 signing 的地址）。
2. 刪曾為 main 的 signing 帳戶 → 簽名被拒（`ACCOUNT_READ_ONLY`）、combined 列表仍在。
3. 僅一 sub 時移除成員 → 失敗（`LAST_SUB_ACCOUNT`）。
4. test-web Connect 後 popup 切 main → 頁面公鑰變、不斷開。
5. combined Home：展開一列 → 僅餘額>0 地址與 %；收合；切單一帳戶無展開鈕。
6. **鎖定**時對 combined（目前錢包可簽）簽名 → 預期 `WALLET_LOCKED`（現碼可能為 H1 之 `ACCOUNT_READ_ONLY`）。
7. 切 main：僅綁該 combined 的 test-web 公鑰變；`connections` 仍為 combined id。
8. （建議）active combined 下等待 >45s 或觸發 TTL 背景 refresh 後再開 Home，確認加總未變成單址（H2）。

隱私：本報告未寫入助記詞、私鑰、密碼、真實地址或 API key。

---

## 修復追蹤

| ID | 級 | 狀態 | 關閉依據 |
|----|----|------|----------|
| H1 | HIGH | **關閉** | R2：`resolvePubkey` 鎖定時仍視 storage signing 為 signing；`signGateError` → `WALLET_LOCKED` |
| H2 | HIGH | **關閉** | R2：`scheduleBackgroundRefresh` 傳入 `withMembers` |
| M1 | MEDIUM | **仍開** | 待 INDEX shipped／backlog 清 |
| L1 | LOW | **關閉** | R2：移除展開鈕 `title` |

---

## 變更範圍備註（R1 diff 摘要）

Working tree 主要觸及：`wallet/src/shared/accounts.ts`（新）、`storage-keys.ts`、`commands.ts`、`background/index.ts`、`home-tokens-service.ts`、`popup/`（方案 A UI）、`version.md`／`changelog.md`／`package.json` 0.5.0，以及 INDEX／combined-how 文案同步（`in progress`、填表頁定案）。未改 `../solibra-wallet`。
