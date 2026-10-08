# Design review — 0.23.0 Airwave Wallet

- 日期：2026-10-08（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（初審、第 2 輪同日；本檔累加，ID 不重編）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`storage-keys.ts`、`SettingsScreens.tsx`、`types.ts`、`runtime.ts`、`popup/style.css`、`decode-compiled-ix.ts`、`wallet-finish-send.ts`、`close-empty-service.ts`、`sign-and-send-finish.ts`、`popout/main.ts`
- **總評：** 無未關閉 HIGH。應修 MEDIUM（M1–M5）均已寫進 INDEX／HOW／HANDOFF。提案可行。設計審查門檻**通過**。L3／L4 仍開、標非阻擋。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — SW 譯文與 INDEX「只回錯誤碼」矛盾 — **關閉**

第 2 輪已關。本輪核對：INDEX「錯誤」仍為選 A；HOW「錯誤碼（SW 不譯）」；reasoning「為何 SW 不譯」；HANDOFF starter「SW 不 t」。無迴歸。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| **M1** | **關閉** | 第 2 輪已關。INDEX Track 2／HOW「收字串」仍列齊掃檔範圍。 |
| **M2** | **關閉** | 第 2 輪已關。INDEX「設計原則」／Track 3／HOW 仍為第 1、3、6、8 節。 |
| **M3** | **關閉** | 第 2 輪已關。INDEX 查表／`t`；HOW Util 空白與執行期缺鍵。 |
| **M4** | **關閉** | 第 2 輪已關。INDEX Track 2 驗收＋HOW：存 code／raw，換 locale 重繪再 `t`。 |
| **M5** — HOW 錯誤碼表未覆蓋仍會進畫面的 SW 中文 chrome | **關閉** | INDEX「錯誤」：HOW 表為最低集合；SW／popout 推到錢包可見列、進度、toast、模擬解讀標籤一律改穩定 code 或 decoder kind，UI render 再 `t`；command 已有 code 者 UI 只認 code。Track 2：持倉／模擬改 HOW code。錨點已加 `decode-compiled-ix.ts`、`wallet-finish-send.ts`、`close-empty-service.ts`、`popout/`。HOW「錯誤碼」涵蓋規則＋表列 `SEND_*`／`CLOSE_EMPTY_*`／`MISSING_REQUEST_ID`＋ix `kind`／角色 id；command 只 map `code`。HANDOFF starter：送出進度／收回租金／ix 解讀標籤改 code 或 kind；command 不展示中文 `message`。現碼仍有中文 chrome（見抽樣）＝尚未實作，不是設計分叉。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| **L1** | **關閉** | INDEX「查表」已為「同類套件」。 |
| **L2** | **關閉** | 錨點表已含第 2 輪所列路徑。 |
| **L3** | **仍開／非阻擋** | 原則檔第 1 節寬度「約 384」；INDEX 驗收以 `--popup-w` 422px。INDEX「版面」已標歷史意向，不擋實作。 |
| **L4** | **仍開／非阻擋** | 構想來源仍寫「規劃對話選定」方案 B；`reasoning.md` 已自足。 |
| **L5** — INDEX 文首／錨點改原則檔節次與已定案不一致 | **關閉** | INDEX 文首「出貨時須改第 1、3、6、8 節」；錨點 `design-principles.md` 同句；已定案／Track 3／HOW／HANDOFF starter 一致。第 2 輪所指兩處用詞已改。 |

無新 HIGH／MEDIUM／LOW。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| Settings 第一列進語言頁；三列單選立刻寫 `locale`；無儲存鈕 | 可 | 無 |
| 樞紐摘要為 endonym，不隨介面語改寫本名 | 可 | 無 |
| 切 `en` 後 Home、Settings 其它列、解鎖、popout／審批殼為英文（專有名詞與 legal 除外）；切回繁中還原 | 可 | M5 已關；實作須掃 HOW 表外同等中文 chrome（現碼仍有，見抽樣） |
| 舊資料無 `locale`→繁中；無效碼→繁中；不讀瀏覽器語言 | 可 | Track 1／HOW `normalizeSettings` |
| 無 i18next 等新依賴；無畫面級 `if (locale)` 拼句 | 可 | 語言頁 endonym／`checked` 已排除 |
| popup／popout body 方案 B；解鎖／確認中標題無 `0.02em` | 可 | 現碼未改（實作項） |
| 無新 command、無新 storage key、無新 Wallet Standard 方法 | 可 | `locale` 為既有 blob 欄位 |
| typecheck／build | 實作後測 | 本輪不跑 |
| 手驗未封裝擴充；422px 英文列不擠出殼底 | 實作後測 | 無 |
| `design-principles.md` 文案跟 locale | 可 | M2／L5 關閉 |
| 文件與程式無真實密碼／助記詞／私鑰 | 本輪抽樣未見 | 維持 |
| 版本號 0.23.0；shipped 須使用者同意；出貨後清 backlog | 出貨程序 | 無 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。與提案互斥、實作時應改掉：

- `Settings`／`DEFAULT_SETTINGS`／`normalizeSettings` **無** `locale`。
- Settings 樞紐無語言列；無 `settings-locale`。
- `SUBPAGE_TITLES`、`runtime.ts` 頂欄（含 `` `送出 ${row.symbol}` ``）仍寫死中文。
- `body` 字體非方案 B；`.unlock-screen h1` 仍 `0.02em`。
- 無 `ui-i18n.ts`／`ui-messages.ts`；無 i18next。
- `decode-compiled-ix.ts` 仍推「轉移 SOL」「來源」「收款」。
- `wallet-finish-send.ts` `notify.progress` 仍「交易無效」「確認逾時…」。
- `close-empty-service.ts` 對 UI `message` 仍「掃描失敗」「無法估算 CU」等（多數列已有 `code`，契約要 UI 只認 code）。
- `sign-and-send-finish.ts` 仍有中文 `message`（「已送出、確認未知」）；HOW 涵蓋規則要求同等句一併改碼，不必再擴 INDEX。
- `popout/main.ts` 仍「缺少 requestId」。
- 持久設定仍是 `chrome.storage.local` 鏡像路徑。未見 pending 進持久 Zustand、全 tab 廣播結果、硬編碼密碼、inject 持有長期私鑰。本版非目標未要求改 vault／pending。

backlog 與 `docs/design-demos/i18n-type-ux.html` 非正式。上游 0.22.0 畫面語意本版只收字串、不推翻。待拍板仍空。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | H | 關閉 | INDEX「錯誤」選 A；HOW「錯誤碼（SW 不譯）」；reasoning 對應節；HANDOFF starter |
| M1 | M | 關閉 | INDEX Track 2；HOW「收字串」 |
| M2 | M | 關閉 | INDEX「設計原則」／Track 3；HOW「設計原則」 |
| M3 | M | 關閉 | INDEX「查表」／`t`；HOW「Util」 |
| M4 | M | 關閉 | INDEX 錯誤＋Track 2 驗收；HOW「錯誤碼」 |
| M5 | M | 關閉 | INDEX「錯誤」＋Track 2＋錨點；HOW「錯誤碼」涵蓋規則與表擴列；HANDOFF starter |
| L1 | L | 關閉 | INDEX「查表」 |
| L2 | L | 關閉 | INDEX 錨點表 |
| L3 | L | 仍開／非阻擋 | INDEX「版面」已標 384 為歷史意向 |
| L4 | L | 仍開／非阻擋 | reasoning 已自足；INDEX 構想來源句仍提規劃對話 |
| L5 | L | 關閉 | INDEX 文首＋錨點「第 1、3、6、8 節」；HANDOFF starter 同 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-08 | 有未關閉 HIGH（H1）。應修 M1–M4。提案可行。門檻未過。 |
| 第 2 輪複審 | 2026-10-08 | H1、M1–M4、L1–L2 已落檔。無未關 HIGH。應修 **M5** 未落檔。提案可行。門檻未過。 |
| 第 3 輪複審 | 2026-10-08 | M5、L5 已寫進 INDEX／HOW／HANDOFF。無未關 HIGH。應修 MEDIUM 全關。L3／L4 非阻擋。提案可行。門檻**通過**。 |
