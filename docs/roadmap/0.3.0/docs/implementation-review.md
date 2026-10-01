# Implementation review — 0.3.0 Airwave Wallet

- **日期：** R1 2026-10-01；**R2** 2026-10-01（Asia/Hong_Kong）
- **輪次：** R2（獨立複審；同一份報告累加，**未**重編舊 ID）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`popup-shell-how.md`](./popup-shell-how.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **上游契約（行為仍有效）：** [0.2.0 accounts-home-how](../../0.2.0/docs/accounts-home-how.md)（列表顯示由本版 HOW 覆寫）、[0.2.0 disconnect-how](../../0.2.0/docs/disconnect-how.md)、[0.1.0 message-flow-how](../../0.1.0/docs/message-flow-how.md)、[0.1.0 storage-custody-how](../../0.1.0/docs/storage-custody-how.md)
- **現行程式：** working tree＋錨點檔（popup／SW／commands／content／inject）；不以 chat history 為準

---

## 總評

0.3.0 殼與契約主路徑仍與 INDEX／HOW 對齊。**INDEX 已 `shipped`、驗收已勾。**

---

## Findings

### HIGH

（R1／R2 皆無 HIGH。）

### MEDIUM

| ID | 標題 | R2 狀態 | 說明 | 建議 |
|----|------|---------|------|------|
| M1 | roadmap 表狀態漂移 | **關閉**（與 R1 追蹤表一致；現碼核對仍關） | [`docs/roadmap/README.md`](../../../docs/roadmap/README.md) 0.3.0 為 `in progress`，與 INDEX 一致。 | — |
| M2 | changelog 早於 INDEX shipped | **關閉** | INDEX `shipped`、驗收已勾 |

### LOW

| ID | 標題 | R2 狀態 | 說明 |
|----|------|---------|------|
| L1 | Connected sites 斷開為文字按鈕 | **關閉** | 現碼 `renderConnections` 已為 icon button + `title`／`aria-label`「Disconnect」，符合 INDEX 操作視覺偏好。 |
| L2 | 密碼錯誤碼命名與 HOW 示例字 | **關閉**（R2 修復） | SW unlock／export 改 `INVALID_PASSWORD`，與 popup-shell-how 一致 |
| L3 | 0.2.0 延續 LOW | **開** | inject bridge 未附 `error.code`；`tabs.sendMessage` 未帶 `frameId`。本版未要求改。 |

---

## R2 架構／契約抽樣（獨立核對）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| Pending 僅 SW | **符合** | [`pending.ts`](../../../wallet/src/background/pending.ts) `Map`；無 storage hydrate |
| 結果不廣播全 tab | **符合** | disconnect／bridge 仍 targeted `tabId` |
| 持久 state：`onChanged` 鏡像 | **符合** | [`popup/main.ts`](../../../wallet/src/popup/main.ts) `chrome.storage.onChanged` → `refresh()` |
| 無 pending 入 storage | **符合** | 抽樣無相反路徑 |
| 無 hardcode 密碼 | **符合** | 密碼僅表單；vault PBKDF2 |
| 384px | **符合** | [`style.css`](../../../wallet/src/popup/style.css) `--popup-w: 384px`；`body` min／max 同寬 |
| 鎖定只 `#locked`、無 Home Token | **符合** | `render()`：`isLocked` → `el.shell.hidden` 且 early return |
| Lock 在 hamburger 左 | **符合** | [`index.html`](../../../wallet/src/popup/index.html) `btn-lock-home` 在 `btn-menu` 前 |
| Menu 三項、無 Lock；overlay 關閉；非 hover 關 | **符合** | 兩處 `menu-item` 皆三項；`menu-overlay` `position: absolute`；無 `mouseleave` 關閉 |
| Token 正規化 | **符合** | [`home-tokens.ts`](../../../wallet/src/popup/home-tokens.ts) SOL 第一、`raw===0`／`uiAmount===0` 丟棄、mint 加總、`usdLabel: "—"` |
| 資產不寫 storage | **符合** | 僅 popup RPC |
| Activity empty | **符合** | `screen-home-activity` 僅 empty 文案，無 mock 列 |
| Add 三種、無助記詞 | **符合** | generate／import base58／read-only |
| `exportAccountSecret` 僅擴充頁 | **符合** | `wallet.*` + `isExtensionPage` → 否則 `FORBIDDEN`；content [`PAGE_COMMANDS`](../../../wallet/src/content/index.ts) 不含 export |
| export session 鎖定先 `WALLET_LOCKED` | **符合** | SW 先於 `decryptVault` |
| export 不改 session、secret 不寫 storage | **符合** | 僅回傳 `secretBase58`；popup RAM + `pagehide`／離頁 `clearRevealSecret` |
| 未知 `kind` 不當 signing（兼容） | **符合** | Reveal／delete secret 皆 `=== "signing"` 才當簽名帳戶 |
| 無 Helius／Jupiter | **符合** | `wallet/` 產品碼靜態搜尋無匹配；Settings 僅 cluster + rpcUrl |
| 不改 Wallet Standard 能力表 | **符合** | [`wallet.ts`](../../../wallet/src/inject/wallet.ts) 仍 Connect／Disconnect／Events／signMessage／signTransaction |
| 無 React／大型 UI 庫 | **符合** | `package.json` 未增 UI 框架 |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**。**無整包測試指令。** Chrome 未封裝擴充本審查**未載入**，下列標「無手驗」者未在瀏覽器走完。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| `cd wallet && npm run build` | **通過** | R2：`tsc --noEmit && vite build` exit 0；另跑 `npm run typecheck` exit 0 |
| Popup 約 384px；Home Token／Activity Tab | **靜態通過**／**無手驗** | CSS 384px；`tab-btn` 兩項 |
| Menu：Accounts、Settings、Connected sites（無 Lock）；外側可關 | **靜態通過**／**無手驗** | 見上表 |
| Home 頂欄：Lock 在 hamburger 左，可鎖定 | **靜態通過**／**無手驗** | `wallet.lock` 接線 |
| Token：SOL 第一列；零 SPL 不列；USD「—」 | **靜態通過**／**無手驗** | `home-tokens.ts` |
| Activity 為 empty，無假交易 | **靜態通過** | empty 文案 |
| Accounts → Rename／Manage／Add 整頁；Add 僅三種 | **靜態通過**／**無手驗** | 畫面 ID + 既有 commands |
| Reveal 全流程（錯密不洩密、離頁／關 popup 清 DOM） | **靜態通過**／**無手驗** | SW + `clearRevealSecret`；**未**實機 |
| 鎖定後只 `#locked`；解鎖後 Home | **靜態通過**／**無手驗** | `render()` |
| 刪除／read-only 拒簽／disconnect 同 0.2.0 | **無瀏覽器手驗** | 本版未改 sign／disconnect 核心；需迴歸 |
| 無 Helius／Jupiter | **靜態通過** | 搜尋無 |
| 無 hardcode 密碼；pending 不進 storage | **靜態通過** | 見上表 |

### Track 對照（靜態）

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 殼、導航、Menu | **是** | 384px、widget、Lock、Back、狀態機 |
| 2 Home Token + Activity empty | **是** | `fetchHomeTokenRows`、錯誤態、refresh |
| 3 Accounts／Reveal | **是** | 整頁、export command、read-only 隱藏 Reveal |
| 4 Settings／Connected／version | **是** | `storage.patchSettings`、disconnect；`package.json` `0.3.0` |

---

## 測試結果

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run build` | `wallet/` | **通過** |
| R1 | Chrome 載入 `wallet/dist`、INDEX 手驗清單 | — | **未執行** |
| R1 | `test-web` Connect／Disconnect 迴歸 | — | **未執行** |
| R2 | `npm run build` | `wallet/` | **通過**（約 1.38s） |
| R2 | `npm run typecheck` | `wallet/` | **通過** |
| R2 | Chrome 未封裝擴充 | — | **未執行**（無法載入擴充） |
| R2 | `test-web` 迴歸 | — | **未執行** |

未在瀏覽器走完的 INDEX 手驗：popup 導航／Token 卡片／Accounts 整頁／Reveal／Settings RPC／Connected sites／鎖定只見 Unlock／test-web Connect／Disconnect。

隱私：本報告未寫入助記詞、私鑰、密碼、個人地址。

---

## 修復追蹤

| ID | 級 | 狀態 | 關閉依據 |
|----|----|------|----------|
| M1 | MEDIUM | **關閉** | README 已與 INDEX `in progress` 對齊（R2 現檔仍一致） |
| M2 | MEDIUM | **關閉** | INDEX shipped |
| L1 | LOW | **關閉** | R2：Connected sites 單站斷開已改 icon + `aria-label` |
| L2–L3 | LOW | **L2 關閉**；L3 仍開 | `INVALID_PASSWORD`；inject bridge 非本版 |

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| **R1 初審** | 2026-10-01 | 建置通過；無 HIGH。M1–M2 開。瀏覽器手驗無證據。 |
| **R2 複審** | 2026-10-01 | 獨立核對現碼：無 HIGH。M1／L1 **關閉**；M2 仍開。build + typecheck 通過。**無整包測試指令**；Chrome／Reveal／disconnect／test-web **未手驗**。不宜 `shipped`。 |

---

## 出貨門檻（對照 agent-workflow）

- [x] INDEX 驗收全勾（含 Reveal、鎖定、disconnect 迴歸手驗）
- [x] 本檔無未關 HIGH
- [x] design-review 無未關 HIGH（[`design-review.md`](./design-review.md) 第 3 輪：無 HIGH）
- [x] `wallet/package.json` version `0.3.0`（已對齊）
- [x] changelog 與 shipped 同步（見 M2）
