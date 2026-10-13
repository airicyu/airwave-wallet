# Implementation review — 0.41.0 Airwave Wallet

- 日期：2026-10-14（Asia/Hong_Kong）
- 輪次：**第 1 輪初審**
- 角色：實作審查（不改程式、不加功能、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[HOW](./how.md)、[reasoning](./reasoning.md)、[design-review](./design-review.md)、[HANDOFF](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 對照範圍：working tree（`OnboardingScreens.tsx`、`generate-seed-flow.ts`、`generate-burner-flow.ts`、`DiceRerollButton.tsx`、`secret-key-accounts.ts`、`style.css`、`ui-messages.ts`）
- **總評：** 無未關閉 HIGH。使用者 2026-10-14 確認畫面後出貨。`BAD_SECRET` 分支有程式、未經擴充點擊。L1 非阻擋。

## Findings（第 1 輪）

### HIGH

（無。）

### MEDIUM

| ID | 狀態 | 依據 |
|----|------|------|
| M1 | **關閉** | 使用者 2026-10-14 確認畫面可出貨。Add account 兩條路徑的畫面手驗依該確認勾過。壞 `secretKeyBase58` 仍只有程式分支，沒有在擴充裡點過。 |

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | **仍開** | `handleGenerateAccount` 在欄位存在時共用 `loadedFromSecretRaw`。該函式在字串以 `[` 開頭時走 JSON 位元組陣列，與 import 相同。INDEX 欄名是 base58，並把空字串、壞 base58、長度不對定成拒絕；這條 JSON 形狀是多收，不是改走 `generateRandomLoadedAccount`。對齊設計審查 L3，不升 HIGH。 |

## 與已定案對照（抽樣）

| 已定案 | 程式 |
|--------|------|
| 只改 `add-generate-seed`、`add-generate` | `GenerateSeedScreen`、`GenerateBurnerScreen`；未改首次建庫與匯入畫面 |
| 移除整組助記詞複製 | 無 `btn-copy-seed-words`／`copySeedWords`；公鑰列仍 `common.copy` |
| 骰子靠右、45×45、`#9945ff` 描邊、SVG 約 34px、點數頂 2／左 1／右 3、0.21s 上跳再微晃且可重播 | `DiceRerollButton`＋`.dice-btn`／`dice-shake`；`title`／`aria-label`＝`onboarding.regenerateDraft`（三語） |
| 助記詞／拋棄式間距 | `.generate-seed-screen` toolbar 下距 18px、詞格下距 22px；拋棄式 toolbar `padding-top: 10px` |
| 兩頁都顯示 `onboarding.solanaPubkey` | 兩頁皆有 `.pk-label` |
| 重骰未完成不可建立；送出與畫面公鑰同一組 | `rolling` 時骰子與殼底 disabled；建立送當下 `words`／`secretKeyBase58` |
| 進頁 draft；離開不寫 storage | mount 時 `createGenerateSeedDraft`／`createBurnerDraft`；secret 只在 popup state |
| `wallet.generateAccount` 可選 `secretKeyBase58` | 有欄位則解碼入庫；省略則 `generateRandomLoadedAccount`。解碼失敗回 `BAD_SECRET`，不改走隨機 |
| 拋棄式成功勾、Done、rpc-guide | `successPk`、`common.done`、`viewAfterAccountCreated(..., "add-generate")` 仍在 |
| 建立指令 | 助記詞仍 `wallet.importSeedAccount`（phantom、index 0）一次 |

架構禁區：draft 不進 `chrome.storage`；命令仍 `wallet.generateAccount`／`wallet.importSeedAccount` 加 `requestId`；未改 pending、未廣播、未硬編碼密碼。

## 驗收對照

| 驗收句 | 結果 |
|--------|------|
| Track 1 使用者同意概念稿 | INDEX 已記 2026-10-14 同意。本輪不重審設計 |
| Track 2–3 手驗與建置 | 建置通過。手驗未走完（M1） |
| backlog 兩項刪列；changelog／版本號 | 未做。構想檔仍在。`wallet` package 仍為 0.40.0 |
| 狀態 `shipped` | INDEX 仍 `in progress` |

## 測試結果

指令（INDEX）：`cd wallet && npm run typecheck && npm run build`

- `npm run typecheck`（`tsc --noEmit`）：通過（2026-10-14）
- `npm run build`（`tsc --noEmit && vite build`）：通過（2026-10-14）

尚無整包 unit 指令。未跑、也不假設 `bun test`。

手驗：未在已載入的未封裝擴充裡走完，**不記通過**。

- Add account → 助記詞：重骰、無整組複製、建立後帳戶與畫面公鑰一致
- Add account → 拋棄式：進頁即見地址、重骰、產生入庫
- 重骰尚未把新 draft 寫進畫面時，骰子與主按鈕不可按、不能建立
- 帶壞 `secretKeyBase58` 時回 `BAD_SECRET`，且不產生另一把隨機鑰匙

靜態閱讀：上述鎖與 `BAD_SECRET` 分支在程式裡存在；未經擴充手驗。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉條件 |
|----|----|------|----------|
| M1 | MEDIUM | 關閉 | 使用者 2026-10-14 確認畫面 |
| L1 | LOW | 仍開 | 可維持共用解碼；若要收成純 base58，再改 `handleGenerateAccount` 並回寫 HOW |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪 | 2026-10-14 | 無 HIGH。typecheck／build 通過。手驗未走完。不可出貨 |
| 出貨 | 2026-10-14 | 使用者確認畫面。M1 關閉。狀態 `shipped` |
