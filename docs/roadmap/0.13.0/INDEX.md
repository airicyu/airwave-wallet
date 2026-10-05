# 0.13.0 — 審批宿主（發起方 × 殼模式）

- **狀態：** `shipped`
- **上游版本：** [0.12.0](../0.12.0/INDEX.md)（`walletSend` 組交易／批准後廣播／等 `confirmed` 語意不變；本版改 **宿主選哪裡開** 與 **成功離開呈現**）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃訪談（2026-10-05）；sidebar 殼本體仍 [backlog/sidebar-mode.md](../backlog/sidebar-mode.md)
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)；confirmed 頁可另加非正式概念稿於 `docs/design-demos/`（衝突以本 INDEX／HOW 為準）
- **秘密欄位：** 本版無新密碼欄

## 產品句

依「誰發起」與「殼模式」選審批宿主：網站＋popup mode → 獨立 popout（已開 popup 仍開 popout）；網站＋sidebar mode → 殼內（本版只寫預留）；錢包內操作 → 當下殼內。本版實作 **popup 側**：抽共用審批殼；`walletSend` 改在 popup 內審批。錢包側 submit：批准即進 **pending confirm 全頁轉圈** → 同一畫面 **confirmed** → 0.5s → 回 Home。dApp `signTransaction` 批准後仍立刻關窗。

## 文件地圖

1. 本檔
2. [docs/approval-host-how.md](./docs/approval-host-how.md)
3. [docs/refactor-plan.md](./docs/refactor-plan.md)（檔案拆分；行為不變）
4. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.12.0](../0.12.0/INDEX.md)、[0.11.0](../0.11.0/INDEX.md) 簽署殼
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 與 0.12.0 | 組交易、`walletSend` pending、模擬／CU、批准後簽名＋`sendRawTransaction`＋等 `confirmed`（≤60s）、`broadcastSig` 不重送、拒絕／已送出未知短錯誤、禁止 `sendBridgeResult`／`finishSignTransaction`：**不變**。改變的是 **開哪裡審批** 與 **成功後 UI 離開** |
| 宿主矩陣（完整契約） | **網站發起**＋**popup mode** → **popout**。**網站發起**＋**sidebar mode** → **sidebar 殼內**（本版不實作殼）。**錢包內操作**（send；預留 swap／close-account reclaim）→ **當下殼內**（popup 或 sidebar），不另開窗 |
| 本版實作範圍 | **只做 popup 側。** 網站 `connect`／`signMessage`／`signTransaction` → **維持 popout**。`wallet.beginSend` 成功後 **禁止** `openPopout`；popup 導向殼內審批 view（記憶體持 `requestId`）。Sidebar 列只預留文句 |
| 網站請求種類 | `connect`／`signMessage`／`signTransaction` **同一套**宿主規則 |
| 網站＋已開 popup | popup mode 仍 **必開 popout**，不改走已開 popup |
| 審批 UI | **一個共用審批殼模組**（預期變動、交易費卡、交易明細、鎖定解鎖、拒絕／批准、確認中、confirmed 頁）。本版 **popout 與 popup 都掛此模組**。禁止為 `walletSend` 另複製一頁 |
| Pending 權威 | 仍只活在 SW `Map`。URL／導航 **只**帶或持 `requestId`。pending **不**進 `chrome.storage`。結果只 runtime 擴充頁或原 dApp tab（既有規則）；禁止全 tab 廣播 |
| 宿主標記 | SW pending 記憶體加 **`uiHost: "popout" \| "popup"`**（本版；日後可加 `"sidebar"`）。網站 enqueue → `"popout"`。`walletSend` enqueue → `"popup"`。Auto-exit／關閉語意讀此欄，不靠猜 |
| Popup 關閉＝拒絕 | `uiHost === "popup"` 且使用者關掉／失焦關閉 popup：等同拒絕——結束 pending、`ui.walletSendSettled` `ok: false`；若已有 `broadcastSig` 則短錯誤「已送出、確認未知」。實作：popup `pagehide`／`beforeunload` 發 `ui.abortPending`（或同等）＋既有逾時；**禁止**只靠「下一次開 popup 才清」 |
| 批准後離開 | **只簽不廣播**（`signTransaction`）：批准成功 **立刻** auto-exit（popout 關窗）。**錢包側 submit**（本版 `walletSend`）：見「成功時序」。不宣告 `signAndSendTransaction` |
| 成功時序（`walletSend`） | 鏈上達 `confirmed` 後：SW **立刻**結束該 pending 並發 `ui.walletSendSettled` `{ ok: true, requestId }`（可附 `signature` 字串供 UI 縮寫）；**禁止** SW 再 `sleep(500)` 才 settled。若 `uiHost === "popup"`：**禁止**呼叫 `closePopout`。若 `uiHost === "popout"`（僅 Track 過渡仍承載 `walletSend` 時）：SW 同樣立刻 settled、**不**先 sleep；關窗改由 UI。共用審批殼：點批准且 `{ accepted: true }` 後 **立刻**離開審批內容（預期變動／費用／拒絕批准底欄），進入 **pending confirm 全頁**（轉圈＋「確認中」）。收到該 `settled` `ok: true` 後 **同一畫面**變成 **confirmed**（繁中「已確認」；勾示意；可選簽名前 4…後 4），**再等 0.5s** 由宿主 auto-exit：`popup` → `navigateTo("home-token")`、清送出表單、`getHomeTokens`；`popout` → `window.close`。popup／共用殼 **禁止**在 pending confirm 或 confirmed 態因同一 `settled` **立刻**跳 Home（須先完成畫面轉換）。確認失敗：pending 仍在＋progress，回到審批內容＋短錯誤，不進 confirmed |
| Confirmed 頁 | 僅成功時序之 UI 態；與 pending confirm **同一畫面轉換**；**無**主按鈕。色票對齊 design-principles |
| 拒絕／失敗 | 點拒絕：`settled` `ok: false`；popup **留在 token-send**（欄位保留）。送出／確認失敗：pending 仍在、短錯誤、可再批准（0.12.0）；殼內聽 `ui.walletSendProgress` |
| 離開審批 view | popup 內導離審批 view（Back／切到其他 view）且該 `requestId` 尚未 settled：必須 `ui.abortPending`（語意同關窗拒絕）。禁止人已離開審批頁卻讓 pending 掛到逾時 |
| `ui.abortPending` | **新增**。payload `{ requestId: string }`。回 `{ ok: true }`（冪等）。SW：無 pending／已結束 → no-op 成功。若 pending 且殼內宿主（本版 `uiHost === "popup"`）：結束 pending；取消確認等待；清該筆記憶體態；發 `settled` `ok: false`（有 `broadcastSig` → message「已送出、確認未知」）。與點「拒絕」共用同一內部結束路徑。`uiHost === "popout"` 關窗仍以 `windows.onRemoved` 為主；UI 亦可呼叫 abort 冪等 |
| Finish 分流 | `runWalletSendAfterApprove`／同等在 `confirmed` 成功後：讀 `uiHost`——立刻 `settled` `ok: true`、**永不** SW-side 成功延遲 sleep；`popup` **永不** `closePopout`；`popout` 亦不由 SW `closePopout` 搶在 confirmed 頁之前關窗（改 UI 0.5s 後關） |
| Storage | 不新增 local key |
| test-web | 不宣告新 Wallet Standard 方法。手驗：dApp 簽交易仍 popout＋立刻關；錢包送出走 popup 殼內 |

## 非目標

- Chrome Side Panel／sidebar 殼本體
- `signAndSendTransaction`、Agent、改 vault
- 聚合送出、地址簿、swap／close-account 產品本體
- 改網站 popup mode 宿主（仍 popout）
- 推翻 0.12.0 鏈上送出／confirmed／broadcastSig 規則
- 為每個 wallet operation 複製審批頁

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.12.0 | 0.13.0 |
|--------|--------|
| `walletSend` → `openPopout` | `walletSend` → popup 殼內＋`uiHost: "popup"` |
| confirmed 後約 500ms 關／回 Home，無成功頁 | 批准後 **pending confirm 全頁轉圈**；confirmed **同一畫面**再 0.5s 後 exit |
| dApp `signTransaction` 立刻關 | **維持** |
| 審批 UI 主要在 `popout/main.ts` | **共用模組**；popout＋popup 掛載 |

## 實作 Track

### Track 1 — 抽共用審批殼；popout 改掛載

- **做：** 從現行 popout 抽出共用模組（connect／signMessage／signTransaction／walletSend 審批 UI＋模擬／CU／resolve 呼叫）。`popout/main.ts` 改為宿主薄殼＋掛模組。行為對齊 0.12.0／0.11.0（含 `walletSend` 若仍經 popout 的過渡可在本 Track 末仍走 popout，或 Track 2 再切）。
- **不做：** popup 殼內宿主；sidebar。
- **驗收：** `cd wallet && npm run typecheck`；dApp connect／signMessage／signTransaction 手驗與改前同；靜態：未宣告新 Wallet Standard 方法。**出貨前不得**停在「`walletSend` 仍只走 popout」；須完成 Track 2–3。

### Track 2 — `walletSend` → popup 宿主

- **做：** `wallet.beginSend` **不** `openPopout`；pending `uiHost: "popup"`。popup 收 `requestId` 進審批 view、掛同一模組。`pagehide`／同等 → abort＝拒絕。網站路徑仍 `openPopout`＋`uiHost: "popout"`。
- **不做：** 改 dApp 宿主；sidebar。
- **驗收：** 送出確認後 popup 內見簽署殼、站點 Airwave；不另開 popout 視窗；關 popup＝拒絕語意。

### Track 3 — Confirmed 頁與 auto-exit

- **做：** 錢包側 submit 成功路徑：批准→pending confirm 全頁轉圈→同一畫面 confirmed→0.5s→`uiHost` 分流 exit。`signTransaction` 維持立刻關。更新 settled 後 popup 回 home-token＋重查。
- **不做：** dApp signAndSend。
- **驗收：** 本檔 checklist 成功／拒絕項。

### Track 4 — 檔案拆分（行為不變）

- **做：** 依 [docs/refactor-plan.md](./docs/refactor-plan.md)：`background/index.ts` 改為 dispatch 薄殼；popup 拆 send／審批宿主／助記詞／settings 等模組。
- **不做：** 改產品語意、改 CSS 主題、引入框架。
- **驗收：** typecheck；重構專用驗收句見 refactor-plan。

### Track 5 — build

- **做：** `cd wallet && npm run typecheck` 與 `npm run build`。
- **不做：** 新依賴除非共用模組結構必要且可說明。

## 驗收（出貨 checklist）

- [x] 共用審批模組：popout 與 popup（`walletSend`）掛同一套；無第二份複製審批頁
- [x] 網站 connect／signMessage／signTransaction：仍開 **popout**（popup 已開亦然）；`signTransaction` 批准後 **立刻**關窗、不廣播
- [x] 錢包送出確認：`beginSend` **不**開 popout；popup 內審批；可見預期變動／交易費／明細；站點 Airwave
- [x] 批准後 **pending confirm 全頁轉圈** → 同一畫面 confirmed → 約 0.5s → 回 home-token 且餘額更新
- [x] 拒絕或關掉 popup：未上鏈（無 broadcastSig）時 pending 結束；popup 回／留送出填寫語意符合 HOW；有 broadcastSig 則「已送出、確認未知」
- [x] pending 不進 storage；`ui.walletSendSettled`／progress 只 runtime 擴充頁
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/index.ts` | enqueue、`openPopout`、`wallet.beginSend`、resolve／finish send |
| `wallet/src/background/pending.ts` | Map、`uiHost`、popout window 綁定 |
| `wallet/src/popout/main.ts` | 改為薄宿主＋共用模組 |
| `wallet/src/popup/main.ts`／`index.html`／`style.css` | 殼內審批 view、pagehide abort |
| `wallet/src/approval/shell.ts` | 共用審批殼（popout／popup 掛載） |
| `docs/roadmap/0.12.0/docs/send-token-how.md` | `walletSend` 鏈上差異 |
| `docs/roadmap/backlog/sidebar-mode.md` | 日後 sidebar 宿主 |
