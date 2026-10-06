# 0.18.0 — Home Activity

- **狀態：** `shipped`
- **上游版本：** [0.17.0](../0.17.0/INDEX.md)。本版只加 Home Activity 查詢與列表。不改簽核、送出、底欄殼
- **Changelog：** [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 `backlog/home-activity.md`（出貨後已刪）。畫面以使用者同意的 [`docs/design-demos/home-activity-ux.html`](../../design-demos/home-activity-ux.html) 為準；**金額符號、文案以本檔已定案為準**，不以概念稿示範列（例如 JUP）為準
- **畫面：** 概念稿五態（有資料、載入中、尚無交易、活動暫時無法載入、devnet 粗列）。不重畫主題

## 產品句

Home 的 Activity 分頁列出 **目前帳戶對外地址**在 **目前 cluster** 上最近最多 20 筆交易。每一列是一筆交易；只有列尾圖示以新分頁開啟 Solscan。mainnet 且設定了可解析的 Helius key 時用 Helius 已解析歷史，否則用 `getSignaturesForAddress` 的粗列。

## 文件地圖

1. 本檔
2. [docs/home-activity-how.md](./docs/home-activity-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 概念稿 [`docs/design-demos/home-activity-ux.html`](../../design-demos/home-activity-ux.html)
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 與上一版 | 底欄只在 Home；從 Settings／Accounts 返回一律回 Token，不記住 Activity。鎖定仍只見解鎖頁。pending、custody、不廣播全 tab：維持 |
| 查誰 | `getExposedPublicKey`。聚合帳戶只查 **主地址**，不合併成員 |
| 幾筆 | 最多 **20**。沒有載入更多 |
| 資料 | **mainnet 且** `extractHeliusApiKey(settings.heliusApiUrl)` 有值：`GET https://api.helius.xyz/v0/addresses/{address}/transactions?limit=20&token-accounts=balanceChanged&sort-order=desc&commitment=confirmed`。否則 `getSignaturesForAddress(owner, { limit: 20 })`，打 `settings.rpcUrl`。devnet 即使有 Helius key 也走簽名粗列。查詢在 service worker。popup 只渲染。歷史不寫 `chrome.storage` |
| 失敗 | HTTP、RPC、JSON 不是陣列、地址無法解析：列清空，畫面只顯示「活動暫時無法載入」。不要改顯示簽名粗列來遮住 Helius 失敗 |
| 種類 | 只在 Helius 路徑分類，順序固定：`type === SWAP` → 互換；`TRANSFER` 且只有從本地址出去 → 送出；`TRANSFER` 且只有進來 → 收到；其餘（含 `UNKNOWN`、from／to 兩邊都是或都不是）→ 交易。不用 `description` 分類。簽名粗列每一列種類都是交易 |
| 第二行 | 送出：`−數量 符號 → 對手前4…後4`。收到：`+數量 符號`。互換：`付出 → 得到`。認不出明細時用簽名前 4…後 4。符號只認 SOL、USDC、USDT，其餘 mint 用前 4…後 4。金額只供顯示：lamport／raw 用 `BigInt` 格式化；Helius 已給的 UI `number` 只轉字串，不做加減。鏈上失敗：種類不變，第二行以紅色「失敗」開頭。簽名粗列成功寫「成功 · 縮寫」，失敗寫紅色「失敗 · 縮寫」 |
| Solscan | 唯一 explorer。mainnet `https://solscan.io/tx/{signature}`；devnet 加 `?cluster=devnet`。列尾 32px 外連圖示，`title` 與 `aria-label` 都是「在 Solscan 開啟」。整列不可點。popup 用 `chrome.tabs.create` 開新分頁。不提供 explorer 選擇，不開擴充內詳情頁 |
| 空與載入 | 查詢中只顯示「載入中」。零筆且無錯誤：「尚無交易」。標題「活動」。沒有刷新鈕。假交易不得寫進產品 |
| 指令 | 新增 `wallet.getHomeActivity`。無 payload。結果 `{ rows }` 或 `{ rows: [], error: "unavailable" }`。不進 content／inject 白名單 |
| 依賴 | 不加 npm 套件 |
| Storage | 不新增 key |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.18.0`。狀態改 `shipped` 須使用者同意 |

## 非目標

- 載入更多、點列進詳情、explorer 選擇、Orb／官方 Explorer
- 用活動金額做餘額加減；為了符號再打 Jupiter
- 記住 Activity 分頁；改底欄；聚合合併成員歷史
- 指令解析、地址簿、agent
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 實作 Track

### Track 1 — 查詢與分類

- **做：** `wallet.getHomeActivity`；Helius 與簽名兩條路；種類與第二行依上表。
- **不做：** popup 直連 RPC；把歷史寫進 storage。
- **驗收：** typecheck。mainnet＋key 才打 Helius；其餘走簽名。

### Track 2 — 畫面

- **做：** 對齊概念稿的列、三個安靜態、Solscan 新分頁。
- **不做：** 刷新鈕、整列連結、載入更多。
- **驗收：** 有資料時頂欄與底欄不隨列表捲走；只有圖示開 `https://solscan.io/tx/`。

## 驗收（出貨 checklist）

- [x] Activity 有資料時一列一筆，種類為送出／收到／互換／交易
- [x] 只有列尾圖示開 Solscan 新分頁；devnet URL 含 `cluster=devnet`
- [x] 載入中、尚無交易、活動暫時無法載入三態與概念稿一致，且失敗不留上一份列表
- [x] 聚合只查主地址；切帳戶或 cluster 後列表跟著變
- [x] 歷史不進 `chrome.storage`；未加套件
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 手驗：mainnet＋Helius key 見解析列；devnet 或無 key 見成功／失敗粗列（出貨時由使用者同意；靜態對照見 implementation-review）
- [x] 手驗：mainnet 且已設可解析 Helius key，人為使 enhanced transactions 失敗 →「活動暫時無法載入」，不要出現簽名粗列（出貨時由使用者同意；靜態路徑無 fallback）
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `docs/design-demos/home-activity-ux.html` | 同意的畫面 |
| `wallet/src/shared/home-activity.ts` | 種類、明細、Solscan URL |
| `wallet/src/background/home-activity/` | SW 查詢 |
| `wallet/src/popup/components/HomeActivityList.tsx` | 列表 |
| `wallet/src/shared/commands.ts` | `wallet.getHomeActivity` |
