# 0.28.0 — Home Activity 捲到底載入更舊紀錄

- **狀態：** `shipped`
- **上游版本：** 行為接 [0.18.0](../0.18.0/INDEX.md) Activity 列與查詢分流；列尾 Orb 接 [0.22.0](../0.22.0/INDEX.md)；Helius URL 解析與 `heliusConfigured` 接 [0.27.0](../0.27.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 `backlog/activity-infinite-scroll.md`、`backlog/activity-token-icons.md`（出貨後已刪）
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)。捲動區是 popup／側欄中間 `.screen-body`，禁止整份文件當捲軸
- **秘密欄位：** 無。禁止把助記詞、私鑰、密碼、真實地址、Helius API key 寫進本目錄或錯誤字串

## 產品句

Home Activity 仍先列出最近最多 20 筆；捲到底可再載更舊一頁。有 mint 的列在種類旁顯示餘額變動 token 的 https icon（Jupiter／持倉快取）。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.18.0 INDEX](../0.18.0/INDEX.md)、[0.18.0 home-activity-how](../0.18.0/docs/home-activity-how.md)（Solscan 已由 0.22.0 改 Orb；Helius 解析已由 0.27.0 改 `resolveHeliusApiTarget`）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | Activity 分頁載入、列上本地絕對時間、以及有 mint 時的 token https icon。不改列種類規則、金額符號文字、Orb、Helius 失敗退回、聚合「只查對外地址」、歷史不進 `chrome.storage`。不換成 Parsed Events |
| 時間列 | 有 `timestampSec` 時，用**執行環境本地時區**顯示 `YYYY-MM-DD HH:MM:SS`（月日時分秒兩位補 0）。不要相對時間（剛剛、N 分鐘前、昨天、`6/1` 這種 `M/D`）。不要 `toISOString`（那是 UTC）。沒有 timestamp 則不畫時間。刪 catalog `activity.when.*` |
| 命令 | `wallet.getHomeActivity` 的 payload 可帶可選字串 `before`。缺省、或 trim 後空字串：抓**最近**一頁（與 0.18.0 相同）。非空：抓比該 signature **更舊**的一頁。每一頁最多 20 筆。回應形狀維持 `{ rows }` 或 `{ rows: [], error: "unavailable" }`。不宣告新 Wallet Standard 方法、不加 npm |
| 查詢 | mainnet 且 `resolveHeliusApiTarget(settings.heliusApiUrl)` 有值：既有 enhanced URL，另在有 `before` 時加 query `before=<signature>`。否則 `getSignaturesForAddress(owner, { limit: 20 })`，有 `before` 時加 Kit 的 `before`。Helius 非 2xx／逾時／body 不是陣列：該次 `unavailable`，**不要**退回簽名粗列。第一頁失敗（信封 `ok !== true`、result 有 `error`、或拋錯）：畫面整頁「活動暫時無法載入」。下一頁失敗定義見「下一頁失敗」。信封的 `ok` 不是 result 欄位 |
| 還有沒有更多 | 以**本頁回傳的 `rows` 長度**（去重前 SW 回給 UI 的陣列）是否等於 20 判斷。等於 20：可能還有更舊，捲到底可再要。少於 20（含 0）：之後再捲到底**不再**發請求。UI 接上時去掉 signature 已在畫面上的列。若本頁長度為 20 但去重後 0 筆：視為**沒有更多**，避免同一游標死循環 |
| 捲動觸發 | 捲動根是 `.screen-body`（`overflow-y: auto`），不是 `window`／`document`。列表最底放 sentinel；進入該根的可見區底部時，若 `hasMore` 且沒有進行中的下一頁請求，則發下一頁，`before`＝畫面上最舊一筆的 `signature`。下一頁進行中不要因為 sentinel 仍可見再發 |
| 下一頁畫面 | 進行中：列表最底插小 loading widget（純 CSS，不加套件）。本頁列切進列表後拿掉。沒有更多時不留 widget。第一頁仍用現有整頁安靜「載入中」（`common.loading`），不用這個底欄 widget。可見畫面**不要**寫「正在載入下一頁」；widget 的 `aria-label` 用 catalog `activity.loadingOlder` |
| 下一頁失敗 | 條件：擴充信封 `ok !== true`，或 result 有 `error`，或請求拋錯。已顯示的列全部留下，`phase` 保持 `list`，`hasMore` 仍為 true。不要把整份列表換成第一頁錯誤態。拿掉 loading widget，同一底欄放安靜短句 catalog `error.activityOlderLoad`。不要用 `error.activityLoad`，不要用底部 toast 當這條主路徑。失敗當下人還停在底部：**不要**自動再打。必須先離開底部（sentinel 離開可見區），再捲到底，才拿掉錯誤短句、再插 widget、用**同一個** `before` 再要下一頁 |
| 重抓第一頁 | 切換 active、cluster、`rpcUrl`、`heliusConfigured`，或離開 Activity 再進入：丟掉已接上的頁與 `hasMore`／底欄錯誤，從最近一頁重抓（清列＋整頁載入中）。過期／已取消的回應不得改 phase、rows、`hasMore` |
| Token icon | Enhanced 列從本地址的 token／native 腿取出最多 **2** 個 mint（送出／收到各一顆；互換付出與得到；native SOL 用 wrapped mint `So1111…12`）。`HomeActivityRow` 帶 `mints` 與 `icons`（僅 https `iconUrl`）。service worker 先 peek 持倉快取的 `iconUrl`／`symbol`，缺的再批次 `lookupJupiterMintMetadata`（mainnet）。https icon 畫在列左。同一輪非空 `symbol` 把明細裡該 mint 的前4…後4縮寫換成代號（JLP／INF 等）；SOL／USDC／USDT 仍用硬編碼，不必等 Jupiter。Jupiter／快取失敗：列照常，缺圖不占位，缺代號則維持 mint 縮寫。簽名粗列沒有 mint，不打 Jupiter。不為 Activity 持久化圖庫。`onError` 藏圖。不改 Parsed Events |
| 文案 | [0.23.0](../0.23.0/INDEX.md) catalog：`error.activityOlderLoad`＝繁「更舊的活動這次沒載到」／簡「更旧的活动这次没加载到」／en「Couldn't load older activity」。`activity.loadingOlder`＝繁「載入更舊的活動」／簡「加载更旧的活动」／en「Loading older activity」。跑 `wallet/scripts/gen-ui-messages.mjs` |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.28.0`。`shipped` 須使用者同意。出貨後刪 backlog 列與 `activity-infinite-scroll.md`、`activity-token-icons.md` |

## 非目標

- 一次抓完全部歷史，或把 `ACTIVITY_LIMIT` 調大來假裝能看更多
- 「載入更多」按鈕當主要操作
- 活動寫進 `chrome.storage`，或離線翻舊頁
- 改列種類規則、金額符號文字、Orb、Helius 失敗時改回簽名粗列
- 為 icon 改打 Parsed Events、DAS、或逐筆 `getTransaction`
- 沒有 mint 時畫字母頭像或占位圖
- 聚合帳戶把每個成員的活動併成一條時間序
- bubble-harness、簽署 AI 評估卡（那份 0.28.0 草案已撤；本版是 Activity）
- 改 custody、pending、Wallet Standard、`../solibra-wallet`

## 開工前仍須拍板

（無）

## 與上一版對照

| 0.18.0／現況 | 0.28.0 |
|--------------|--------|
| 只抓最近 20 筆、不翻頁 | 滿頁後捲到底再抓更舊一頁 |
| `getHomeActivity` 無游標 | 可選 `before` |
| 失敗＝整頁 `error.activityLoad` | 僅第一頁如此；下一頁失敗留列＋底欄短句 |
| 相對時間或過期後 `M/D` | 本地 `YYYY-MM-DD HH:MM:SS` |
| 列上無 token 圖 | Enhanced 有 mint 時 https 小圓 icon |
| 查詢仍在 SW、不進 storage | **維持** |

## 實作軌道

### Track 1 — 命令與查詢游標

- **做：** payload `before`；Helius／`getSignaturesForAddress` 帶 `before`；每頁最多 20。
- **不做：** 改 row 對應規則；改 Helius 失敗退回；寫 storage。
- **驗收：** `cd wallet && npm run typecheck`。無 `before` 行為與現況相同。見下方「before 手驗」句。

### Track 2 — 畫面 infinite scroll

- **做：** `.screen-body` 上 sentinel；底欄 widget／失敗短句／重試規則；catalog 兩鍵；時間列改本地 `YYYY-MM-DD HH:MM:SS`，刪 `activity.when.*`。
- **不做：** 整頁捲軸；載入更多按鈕；改第一頁三種安靜態文案。
- **驗收：** 見下方手驗。

### Track 3 — token icon

- **做：** 列帶 mint；快取＋ Jupiter https icon；左側小圓圖；失敗藏圖。
- **不做：** 換 Helius API；沒 mint 畫假圖；寫 storage。
- **驗收：** 見下方 icon 手驗。

## 驗收

- [x] `cd wallet && npm run typecheck`
- [x] **before 手驗：** 滿 20 筆後捲到底，該次 `wallet.getHomeActivity` 的 payload.`before` 等於觸發當下畫面上最舊列的 `signature`。mainnet 且 Helius target 可解析時，enhanced query 含同一個 `before`；否則 Kit `getSignaturesForAddress` 選項含同一個 `before`。用擴充／SW 日誌或本機攔截確認即可。禁止把真實地址或 API key 寫進文件或報告
- [x] 進入 Activity：仍先最多 20 筆；不足 20 或 0 筆時捲到底不再發下一頁
- [x] 滿 20 筆且帳戶還有更舊交易：捲 `.screen-body` 到底出現底欄 loading widget，列接在後面，widget 消失；再捲到底可再載
- [x] 下一頁失敗：已有列仍在，底欄 `error.activityOlderLoad`；停在底部不連打；捲離再到底會再試
- [x] 切帳戶或 cluster：列表從頭、整頁載入中，不是接在舊列後面
- [x] 第一頁失敗仍整頁 `error.activityLoad`；mainnet Helius 失敗不出現簽名粗列
- [x] 列上時間為本地時區 `YYYY-MM-DD HH:MM:SS`（例如 `2026-06-01 14:03:09`），不要「2 days ago」或 `6/1`
- [x] mainnet＋Helius：有 token／SOL 變動的列左側出現 https 圓 icon（互換最多兩顆）；圖裂了列與文字仍在
- [x] 無 Helius 的簽名粗列：沒有 token 圓圖，也不為了圖去打 Jupiter
- [x] 未封裝擴充走完 Activity（popup 或側欄）；靜態截圖不算通過
- [x] 無真實助記詞、私鑰、密碼、個人地址寫入本版文件

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/home-activity.ts` | `ACTIVITY_LIMIT`、row 對應 |
| `wallet/src/background/home-activity/home-activity-service.ts` | Helius／簽名查詢；附 icon |
| `wallet/src/background/home-tokens/home-tokens-service.ts` | `peekCachedMintDisplay`、Jupiter |
| `wallet/src/background/home-activity/get-home-activity-command.ts` | 讀 payload、回 rows |
| `wallet/src/popup/components/HomeActivityList.tsx` | 列表與觸發 |
| `wallet/src/popup/style.css` | `.screen-body`、activity 樣式 |
| `wallet/src/shared/ui-messages.ts` | catalog |
| `wallet/scripts/gen-ui-messages.mjs` | 生出 typed key 後必須跑 |
| `docs/design-principles.md` | 中間內容才准捲 |
