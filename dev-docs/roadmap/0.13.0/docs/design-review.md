# Design review — 0.13.0 Airwave Wallet

- 日期：2026-10-05（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（累加；保留初審）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`approval-host-how.md`](./approval-host-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)；上游 [`../../0.12.0/INDEX.md`](../../0.12.0/INDEX.md)、[`../../0.12.0/docs/send-token-how.md`](../../0.12.0/docs/send-token-how.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/background/index.ts`（`openPopout`、`wallet.beginSend`、`ui.resolvePending`）、`wallet/src/background/pending.ts`、`wallet/src/background/wallet-finish-send.ts`、`wallet/src/popout/main.ts`、`wallet/src/popup/main.ts`（`submitTokenSend`／`navigateTo`／`pagehide`／`wallet-send-settled`）、`wallet/src/shared/commands.ts`
- **總評：** H1／M1／M2／M3 已關閉。無未關閉 HIGH；應修 MEDIUM 已併入契約。設計閘門 **通過**。提案 **非不可行**。L1／L4 仍開、非阻擋。本輪無新增 H／M。

## Findings（初審＋複審狀態）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — 錢包 submit 成功離開：confirmed 頁／settled／SW `closePopout`‧500ms 雙權威未寫死 — **已關閉**

**初審問題（摘要）：** 驗收要求「轉圈 → confirmed 頁 → 約 0.5s → 回 home-token」，但契約未寫死誰進 confirmed 頁、0.5s 歸 UI 或 SW、`popup` 是否禁止 `closePopout`、以及既有 `settled`→立刻 Home 如何互斥。

**複審核對：** 已寫進 INDEX「成功時序（`walletSend`）」「Finish 分流」「Confirmed 頁」；HOW「成功時序（權威）」「Finish 與 `closePopout`」；HANDOFF starter（SW 立刻 settled、禁止 popup `closePopout`、UI confirmed 頁 0.5s 再 home-token）；reasoning「Confirmed 頁再 0.5s」。單一狀態機可只靠檔案實作。

**關閉位置：** INDEX 已定案「成功時序／Finish 分流／Confirmed 頁」；HOW §成功時序／§Finish；HANDOFF starter。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **已關閉** | **殼內離開審批 view。** INDEX「離開審批 view」：導離且未 settled → `ui.abortPending`（語意同關窗拒絕）。HOW Popup 流程步驟 6；HANDOFF starter「離審批 view→ui.abortPending」；reasoning「Popup 關閉／離開審批＝拒絕」。 |
| M2 | **已關閉** | **`ui.abortPending` 命令契約。** INDEX 整列：payload `{ requestId }`、`{ ok: true }` 冪等、無 pending no-op、殼內宿主結束＋取消確認等待＋清記憶體＋`settled` `ok: false`（有 `broadcastSig` →「已送出、確認未知」）、與拒絕共用結束路徑。HOW「命令」表＋「`ui.abortPending` 細節」。 |
| M3 | **已關閉** | **Finish／`closePopout` 依 `uiHost` 分流。** INDEX「Finish 分流」：立刻 settled、永不 SW 成功 sleep；`popup` 永不 `closePopout`；`popout` 亦不由 SW 搶關（UI 0.5s 後關）。HOW「Finish 與 `closePopout`」；與 H1 時序一致。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **仍開／非阻擋** | 共用審批模組目錄名仍「實作時定名」；HANDOFF 錨點亦未定名。開工後回寫即可，不擋閘門。 |
| L2 | **已關閉** | INDEX／HOW 已寫死繁中「已確認」＋可選簽名前 4…後 4；色票對齊 design-principles。初審「或同等」鬆度已收斂。 |
| L3 | **已關閉** | INDEX Track 1 驗收已加「出貨前不得停在 `walletSend` 仍只走 popout；須完成 Track 2–3」。 |
| L4 | **仍開／非阻擋** | 殼模式（popup／sidebar）本版網站路徑固定 popout、不新增 storage key；與 backlog `sidebar-mode.md` 一致。實作勿發明讀取未存在的 mode key。 |

### 本輪新增

無新增 HIGH／MEDIUM／LOW。契約自足；待拍板為空。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 共用審批模組：popout 與 popup（`walletSend`）掛同一套；無第二份複製審批頁 | 可 | 目錄名未定（L1）；禁止複製已寫死 |
| 網站 connect／signMessage／signTransaction：仍開 popout（popup 已開亦然）；`signTransaction` 批准後立刻關、不廣播 | 可 | 無；與 0.12.0／現碼方向一致 |
| 錢包送出確認：`beginSend` 不開 popout；popup 內審批；預期變動／交易費／明細；站點 Airwave | 可 | 現碼仍 `openPopout`＝未實作，非設計 HIGH |
| 批准後轉圈→confirmed 頁→約 0.5s→回 home-token 且餘額更新 | **可** | H1 已關閉；權威時序在 INDEX／HOW |
| 拒絕或關掉 popup：未上鏈則 pending 結束；留／回送出填寫；有 broadcastSig 則「已送出、確認未知」 | 可 | M1／M2 已關閉（關窗＋離審批 view＋abort 形狀） |
| pending 不進 storage；`settled`／progress 只 runtime 擴充頁 | 可 | 契約與禁區一致 |
| `npm run typecheck`／`build` | 可 | 出貨時測；現碼未做本版 ≠ 設計失敗 |
| 文件與程式無真實秘密 | 可 | 抽樣提案無助記詞／私鑰／密碼／個人地址 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列為**若照抄現路徑會與 0.13.0 已定案互斥**（實作須改；契約本身已寫死分流／時序）：

- `wallet.beginSend` 成功後仍 `await openPopout(requestId)`；`PendingRecord` **無** `uiHost`。本版改 `"popup"` 且禁止開窗。
- `wallet-finish-send.ts`：`confirmed` 後 `sleep(CLOSE_DELAY_MS)` → `closePopout` → …。與 INDEX「Finish 分流」／成功時序 **互斥**——實作須刪 SW 成功 sleep，並依 `uiHost` 禁止 popup `closePopout`。
- `popout/main.ts`：`walletSend` 批准後進確認中；`settled` `ok: true` → `window.close()`；無 confirmed 頁態。過渡或掛模組後須先 confirmed 頁再 0.5s 關。
- `popup/main.ts`：`submitTokenSend` 只存 `activeWalletSendRequestId`、**不**導向審批 view；`settled` `ok: true` → 立刻 `home-token`（與「禁止立刻跳 Home」互斥）；既有 `pagehide` **只**清 reveal／密碼／匯入流程，**不** `abortPending`（須加關窗／離審批 abort）。
- `pending.ts`：僅 `Map`＋popout `windowId` 綁定；無 `uiHost`。pending 不進 storage：與提案**一致**。
- `commands.ts`：無 `ui.abortPending`；`PendingRecord` 無宿主欄。Wallet Standard 能力未在本抽樣宣告新方法：與「不宣告」**一致**。
- `broadcastWalletSendSettled` 用 `chrome.runtime.sendMessage`（擴充頁）：與 0.12.0／本版「只 runtime 擴充頁、禁內容 tab 橋」**一致**；非全 tab dApp 廣播。

未把 `brainstorm/` 或 `../solibra-wallet` 當已定案。`backlog/sidebar-mode.md` 僅預留，非本版實作範圍。待拍板為空。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | **已關閉** | INDEX「成功時序／Finish 分流／Confirmed 頁」；HOW §成功時序／§Finish；HANDOFF starter |
| M1 | MEDIUM | **已關閉** | INDEX「離開審批 view」；HOW Popup 流程 §6；HANDOFF starter |
| M2 | MEDIUM | **已關閉** | INDEX「`ui.abortPending`」；HOW「命令」＋「`ui.abortPending` 細節」 |
| M3 | MEDIUM | **已關閉** | INDEX「Finish 分流」；HOW「Finish 與 `closePopout`」 |
| L1 | LOW | 仍開 | 非阻擋（模組目錄名實作時定） |
| L2 | LOW | **已關閉** | INDEX／HOW「已確認」文案 |
| L3 | LOW | **已關閉** | INDEX Track 1「出貨前不得僅 popout」 |
| L4 | LOW | 仍開 | 非阻擋（勿發明殼 mode storage key） |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-05 | 可行，但有未關閉 HIGH（H1）。閘門未過。應修 M1–M3。非不可行。 |
| 第 2 輪複審 | 2026-10-05 | H1／M1–M3 已寫進 INDEX／HOW／HANDOFF 並關閉。閘門**通過**。無未關 HIGH；無新增應修 MEDIUM。非不可行。L1／L4 非阻擋。可進實作（HANDOFF 已有）。 |
