# Design review — 0.4.0 Airwave Wallet

- 日期：2026-10-01（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`token-data-how.md`](./token-data-how.md)；[`reasoning.md`](./reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)
- 上游（行為仍有效、非本版契約全文）：[`../../0.3.0/INDEX.md`](../../0.3.0/INDEX.md)、[`../../0.3.0/docs/popup-shell-how.md`](../../0.3.0/docs/popup-shell-how.md)；backlog [`../../backlog/0.3.0-ui-scheme-a.md`](../../backlog/0.3.0-ui-scheme-a.md) **僅構想**
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/shared/storage-keys.ts`、`wallet/src/background/index.ts`、`wallet/src/popup/main.ts`、`wallet/src/popup/home-tokens.ts`、`wallet/src/popup/index.html`、`wallet/src/shared/commands.ts`、`wallet/src/content/index.ts`、`wallet/manifest.config.ts`
- **總評：** 無未關閉 HIGH。無未關閉應修 MEDIUM。主路徑與架構禁區可並存，提案**可行**。第 2 輪仍開的 **M9** 已寫死於 HOW DAS；**L5／L6** 已寫進 INDEX Track 2／HOW Jupiter，本輪關閉。審查門檻**通過**。僅餘 **L1**（上游 0.3.0 尚未 `shipped`），不擋本版設計閘門。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF（或 HOW 已寫死且 HANDOFF 不矛盾）；仍開＝契約仍分叉；非阻擋＝記錄即可。本輪不重編 ID。

### HIGH

#### H1 — Jupiter 缺價時 `usdLabel`：INDEX 與 HOW 互斥 — **關閉**

（同第 2 輪；現契約仍採 (B)，三處同句。本輪未再開。）

### MEDIUM

| ID | 本輪狀態 | 標題 | 依據 |
|----|----------|------|------|
| M1 | **關閉** | INDEX「誰發請求」popup／SW 或然句 | INDEX：DAS、Jupiter、**RPC fallback 一律** SW `fetch`；popup **只**呼叫 `wallet.getHomeTokens`。HOW Command 同。HANDOFF：空 Helius 則 **SW** 走 RPC fallback。 |
| M2 | **關閉** | TTL 背景 refresh 第二次交貨 | INDEX 節流：TTL 內本次只帶回快取（`fromCache: true`），可 SW 記憶體背景刷新，**本輪不再第二次交貨**。HOW Command 同。HANDOFF：TTL 命中只回快取一次。 |
| M3 | **關閉** | DAS native SOL 資料位置 | HOW DAS：讀頁級 **`nativeBalance`**；不要只靠 `items` 內 SOL；lamports 缺省當 0 仍第一列。 |
| M4 | **關閉** | Jupiter 單價 JSON 欄 | HOW：讀該 mint 物件 **`usdPrice`**（number）；缺物件或非 finite＝無 Jupiter 價。HANDOFF 點名 `usdPrice`。 |
| M5 | **關閉** | 快取鍵與指紋對 Jupiter key | HOW：鍵＝`ownersJoin\|cluster\|heliusApiUrl\|rpcUrl\|jupiterApiKey`（**含 key 本體**）。INDEX：指紋見 HOW。HANDOFF：快取鍵含 `jupiterApiKey`。 |
| M6 | **關閉** | DAS 同 mint 加總 | HOW DAS：`id`＝`native-sol` 或 mint；**同 mint 一列**（加總最小單位；DAS 已唯一則一列）。 |
| M7 | **關閉** | Jupiter 分批 429／間隔 | HOW：各批同一 `AbortSignal`；429 與 DAS 同級、每批有限次；批間 ≥200ms。 |
| M8 | **關閉** | 刷新不可先清空成功列 | HOW Command／Popup：已有上一輪成功列時 loading **不得**先清空白。INDEX 429／失敗保留快取列。 |
| M9 | **關閉** | DAS 重試預算句含糊 | HOW DAS 現寫死：該頁 429 **最多再試 2 次**（含第一次共最多 **3** 次 HTTP）；`Retry-After` 否則指數退避（如 500ms、1s）。**任一頁**用盡重試仍 429／網路失敗 → **停後續頁**，回快取（若有）+ `error`。整輪 **不另開** 從頭分頁第三次；成功頁已合併進記憶體者可進快取。非 429 的 4xx／無法解析 JSON：該頁不重試，整輪停、回快取 + `error`。頁級 HTTP 次數與「不重跑整輪」已可實作，不再猜。INDEX 節流仍寫「有限次」，與 HOW 細節不互斥。 |

### LOW

| ID | 本輪狀態 | 標題 | 說明 |
|----|----------|------|------|
| L1 | 仍開 | 上游 0.3.0 尚未 `shipped` | 0.3.0 INDEX 仍為 `in progress`。HANDOFF 禁止未 shipped 就實作 0.4.0。不擋本版設計閘門。 |
| L2 | **關閉** | Track 2 假第二頁 | HOW SW 單佇列：可用 stub／假第二頁證明串行，不必真 1000 資產。INDEX Track 2 同。 |
| L3 | **關閉** | USD 格式一例 | HOW：finite → `"$12.34"`；格式化節再舉 `$0.00`。禁止沒報價畫成 `$0`。 |
| L4 | **關閉** | `owners` 長度 | HOW：本版長度必須為 1；不是 1 → **不打網**，回空列＋`error`。INDEX Combined 列同。 |
| L5 | **關閉** | Track 2 回傳形狀簡寫 | INDEX Track 2 現寫：`wallet.getHomeTokens` 回傳 `{ rows, error?, fromCache? }`。與 HOW Command 信封同句，不再暗示裸陣列。 |
| L6 | **關閉** | Jupiter mint 列表來源 HOW 未重述 | HOW Jupiter 覆寫現寫：`ids` 只來自**本輪已產出的持倉列**（已濾 0 SPL；含 SOL 則帶 wrapped mint）；不要把已丟棄的 0 餘額 mint 送進 Jupiter。與 INDEX「當輪已濾 0 餘額」對齊。 |

本輪未新開 finding。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| `cd wallet && npm run build` 成功 | 是 | 無 |
| Settings 可存 Helius URL 與 Jupiter key（空＝關） | 是 | 無 |
| 無 Helius：列表仍可用 `rpcUrl`；無 Jupiter 則 USD「—」 | 是 | M1 已關；產品句允許有 Jupiter key 時 RPC 路徑仍可覆寫價 |
| 有 Helius：只見 fungible+SOL；無 compressed NFT；0 SPL 不出現 | 是 | M3／M6 已關 |
| 有 Jupiter key（mainnet）：有價則覆寫；省略則留 Helius 否則「—」 | 是 | H1 已關 |
| devnet：不打 Jupiter | 是 | HOW `cluster === "mainnet"` |
| 快速開關／切帳不平行多輪 DAS | 是 | 單 in-flight + abort |
| 429／斷網：曾成功則列表不清空白 | 是 | M8／M9 已關 |
| content 白名單無 token refresh command | 是 | 現碼抽樣仍無此名；本版不得加入 |
| 文件與 changelog 無真實 API key | 是 | 本輪契約抽樣無真實 key |

## 與現碼抽樣

現碼未做本版 **≠** 設計 HIGH。本輪未改抽樣結論。

| 錨點 | 現行行為 | 與 0.4.0 提案 |
|------|----------|----------------|
| `storage-keys.ts` `Settings` | 僅 `cluster`、`rpcUrl` | 提案加兩欄；缺欄當 `""` |
| `popup/home-tokens.ts`、`main.ts` | popup 直連 `rpcUrl`；`usdLabel` 恆「—」；`refreshHomeAssets` 先 `innerHTML = ""` | 提案改 SW；RPC fallback 遷 SW；HOW 禁止有成功列時先清 |
| `commands.ts` | 無 `wallet.getHomeTokens` | 提案新增；沿用 `isExtensionPage` |
| `background/index.ts` `patchSettings` | 展開 `Partial<Settings>` | 型別擴充即可；勿 persist 餘額 |
| `content/index.ts` | `PAGE_COMMANDS` 僅 dapp／ping | 與「不轉發」一致 |
| `manifest.config.ts` | `host_permissions: ["<all_urls>"]` | 與自貼 Helius／`api.jup.ag` 不互斥 |

未把 `brainstorm/` 或 `../solibra-wallet` 當現行程式或已定案。未把 backlog 構想覆寫 INDEX。

架構禁區：pending 不經本 command；結果走既有 extension `requestId`，非全 tab dApp 廣播；餘額快取明示 SW 記憶體；custody 不因持倉解鎖；不引入 SDK；不宣告新 Wallet Standard 方法。`jupiterApiKey` 明文進 `airwave.settings.v1` 與 `rpcUrl` 同級，INDEX 已明示，**不**視為硬編碼錢包密碼。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | **關閉** | INDEX「Jupiter 何時打」＋驗收；HOW Jupiter 覆寫；HANDOFF starter |
| M1 | MEDIUM | **關閉** | INDEX「誰發請求」 |
| M2 | MEDIUM | **關閉** | INDEX 節流；HOW Command；HANDOFF TTL |
| M3 | MEDIUM | **關閉** | HOW DAS `nativeBalance` |
| M4 | MEDIUM | **關閉** | HOW `usdPrice` |
| M5 | MEDIUM | **關閉** | HOW 指紋／快取鍵；HANDOFF |
| M6 | MEDIUM | **關閉** | HOW DAS 正規化 |
| M7 | MEDIUM | **關閉** | HOW Jupiter 批間／429 |
| M8 | MEDIUM | **關閉** | HOW Command／Popup |
| M9 | MEDIUM | **關閉** | HOW DAS：頁級最多再試 2 次（共 3 次 HTTP）；不從頭重跑整輪 |
| L1 | LOW | 仍開 | 0.3.0 未 shipped |
| L2 | LOW | **關閉** | HOW 單佇列 stub 分頁 |
| L3 | LOW | **關閉** | HOW `$12.34` |
| L4 | LOW | **關閉** | HOW `owners` 長度 ≠ 1 |
| L5 | LOW | **關閉** | INDEX Track 2 `{ rows, error?, fromCache? }` |
| L6 | LOW | **關閉** | HOW Jupiter：`ids` 來自已濾 0 SPL 持倉列 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-01 | 可行；未關 **H1**；應修 M1–M8；閘門未過 |
| 第 2 輪複審 | 2026-10-01 | 可行；H1、M1–M8 **關閉**；應修 **M9**；L1／L5／L6 記錄；閘門**通過** |
| 第 3 輪複審 | 2026-10-01 | 可行；**M9、L5、L6 關閉**；僅 L1 仍開；閘門**通過** |
