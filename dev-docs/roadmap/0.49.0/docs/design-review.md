# Design review — 0.49.0 Airwave Wallet

- 日期：2026-10-20（Asia/Hong_Kong）
- 輪次：**第 3 輪**（累加；舊 ID 不重編）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md) 第 4 節。本版已定案不推翻禁區：pending 仍經 `ui.getPending`，不讀 `chrome.storage` 找 payload；不改 storage 同步、custody、訊息路由
- 上一版：[`../../0.48.0/INDEX.md`](../../0.48.0/INDEX.md) 已 `shipped`。本版維持其行為、class、命令與 storage key。INDEX 寫明 backlog 無本版構想
- 現行程式抽樣：`wallet/src/approval/shell.ts` 的 `disposeApprovalShell`、`wallet/src/popup/components/ApprovalHost.tsx`、`wallet/src/flow/SignFlowPage.tsx`、`wallet/src/popout/main.tsx`、`wallet/src/approval/sign-tx-body.ts`、`wallet/src/popup/style.css`
- **總評：** 審查門檻**通過**。無未關閉 HIGH。同意的 MEDIUM（M1、M2、M3）已寫進 INDEX 或 HOW。L4 仍開，標非阻擋。提案可行，沒有不可行項。HANDOFF 仍寫「審查通過前不要實作」；本輪不改該檔

## Load-bearing decisions

`reasoning.md` 仍寫明五段獨立、CSS 用 `@import` 所以不改元件、`shell.ts` 直接改 React 而不先做會被丟掉的 vanilla 拆分、`sign-tx-body.ts` 仍負責 expected-delta。被放棄的做法與 INDEX 非目標一致。HOW 開頭寫明 Phase N 即 INDEX 的 Track N。各段可編輯檔與「不改 `PopupMarkup.tsx`、不搬 CSS、不改另一資料夾」互相對得上。畫面 export 名稱與現碼公開函式一致。

## Findings

關閉＝該輪建議句已寫進 INDEX 或 HOW；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — Phase 1 雙前綴規則與 Track 1 驗收不能同時成立 — **關閉**（第 2 輪）

初審：HOW 寫「兩個前綴就留在 `style.css`」，INDEX 驗收要把畫面前綴整段搬走，現碼跨前綴規則無法同時滿足兩邊。

關閉位置：INDEX「Decided／Behavior」旁的 Track 1 驗收，以及 `how.md` Phase 1 主段。兩者都寫：一個 selector 的前綴若分屬兩份新檔，整條規則留在 `style.css`；若都屬於同一份新檔，整條規則跟那份檔走。`.unlock-screen, .rpc-guide` 與 `.flow-page .approval-root` 留在 `style.css`。`.main-wallet-card .account-name` 進 `accounts.css`。現碼這三條都在（`style.css` 約第 82、401、685 行）。

殘句另見 **M3**，不重開 H1。INDEX 與 HOW 主段已有唯一做法。

#### H2 — React 卸載清理寫得比現有 `disposeApprovalShell` 窄 — **關閉**（第 2 輪）

初審：HOW 只點名停 auto-sim、tx-ai watch、expiry timer。現碼還會清 sign-tx body、confirmed、approve-hold、DOM abort、storage 與 runtime 監聽。

關閉位置：INDEX「Decided／Approval UI」，以及 `how.md` Phase 5 卸載段。兩者都寫卸載做與今日 `disposeApprovalShell` 相同的清理，並點名 tx-ai、auto-sim、sign-tx body、expiry、confirmed、approve-hold、該次掛載的 DOM 監聽，以及該次掛上的 storage 與 runtime 監聽。`abortWalletSendOnPopupUnload` 仍留在 `ApprovalHost.tsx`。

對現碼：`disposeApprovalShell`（`shell.ts`）除上述外還移除 `settingsChangeListener`（另一個 `chrome.storage.onChanged`）。契約寫「該次掛上的 storage 與 runtime 監聽」，已涵蓋這顆，不必另開 ID。模組內旗標與草稿一併清掉，屬於同一函式的清理，不構成新行為。

### MEDIUM

#### M1 — 簽名殼邏輯沒有檔案歸屬，又有 400 行上限 — **關閉**（第 2 輪）

關閉位置：INDEX「Decided／Approval UI」，以及 `how.md` Phase 5 畫面表之前。模擬、CU 草稿、tx-ai、timer 與監聽可再拆成 `wallet/src/approval/` 內的非畫面模組；每個新 `.ts` 單責、50 行以上要英文標頭、低於 400 行；不要塞回 `sign-tx-body.ts`。

#### M2 — 拿掉 `appr-` 前綴時，查 DOM 的範圍沒寫死 — **關閉**（第 2 輪）

關閉位置：INDEX「Decided／Approval UI」（殼只在該次 React 根內用 ref 查詢），以及 `how.md` Phase 5（`ApprovalHost` 與 `SignFlowPage` 拿掉 `elementIdPrefix`；不對無前綴 id 呼叫 `document.getElementById`）。Class 名維持現有表。

#### M3 — Phase 1 末句把「分屬兩份新檔」縮成「兩個前綴」 — **關閉**（第 3 輪）

初審所稱末句是 `how.md` 的「If a rule's selector uses two prefixes」。第 3 輪核對：該句已不在 `how.md`、INDEX、`reasoning.md`。

關閉位置：`how.md` Phase 1 主段（約第 26 行）與 INDEX Track 1 驗收同一句：一個 selector 的前綴若分屬兩份新檔，整條留在 `style.css`；若都屬於同一份新檔，整條跟那份檔走。`.unlock-screen, .rpc-guide` 與 `.flow-page .approval-root` 留在 `style.css`。`.main-wallet-card .account-name` 進 `accounts.css`。

### LOW

#### L1 — popout 如何載入 CSS 的那句與進入點不符 — **關閉**（第 2 輪）

關閉位置：INDEX Track 1 驗收，以及 `how.md` Phase 1：「只搬 `popup/style.css` 裡的規則；不改 `popout/style.css`；不在 popout 入口加 popup 樣式匯入。」現碼 `popout/index.html` 只連 `popout/style.css`，`popout/main.tsx` 另匯 `approval/tx-ai.css`。理由句的舊說法另見 **L4**，不重開 L1。

#### L2 — 骨架裡的 legacy connect 區塊沒有交代 — **關閉**（第 2 輪）

關閉位置：INDEX「Decided／Approval UI」與 Track 5 驗收，以及 `how.md` Phase 5：不移植 `buildApprovalRootHtml` 的 legacy connect；連接不進 `ApprovalShell`；popout 在 `kind === "connect"` 仍渲染 `ConnectPage`。現碼 `popout/main.tsx` 已是這條分支；`shell.ts` 仍查 `view-legacy`，屬尚未改寫，不是設計 HIGH。

#### L3 — Track 與 Phase 用詞並存 — **關閉**（第 2 輪）

關閉位置：`how.md` 開頭：「Phase N is Track N in `INDEX.md`。」用詞仍並存，對照已寫死，不擋實作。

#### L4 — `approval-shared.css` 的理由仍寫 popout 會載入 popup CSS — **仍開**（第 2 輪，非阻擋）

`how.md` 前綴表下寫 `approval-shared.css` 放在 `popup/`，因為「popout 經現有 bundle 載入 popup CSS」。現碼 popout 入口沒有這份匯入。同節禁令與 INDEX 已禁止為 popout 加 popup 樣式匯入。檔案位置本身與 INDEX 一致（`.connect-*`、`.approval-*` 進共用表，由 `style.css` `@import`）。這句只是錯的理由，不構成第二套做法。建議改成：popout 繼續用自己的 `popout/style.css`；Phase 1 不為了這份共用表去改 popout。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| Track 1：共用規則留在 `style.css`；畫面前綴旁置並 `@import`；跨檔 selector 留在 `style.css`；點名的兩條跨檔與一條 accounts 複合 selector 去向已寫；class 不改名、宣告文字與規則內順序不變；不改 `popout/style.css`、不加 popout 的 popup 樣式匯入 | 可對檔 diff | M3 已關閉，主段與 INDEX 一致。**L4** 不擋 |
| Track 2–4：舊檔只 re-export；列出的畫面一名一檔；指定私有子元件留在該檔；`PopupMarkup.tsx` 匯入路徑不變；`TxAiSettingsScreen` 與 `CombinedManage` 不改 | 可對 export 與 git diff | 無。現碼公開函式與 HOW 的 barrel 名單一致 |
| Track 5：三個 mount API 與 `dangerouslySetInnerHTML` 消失；三個 host 渲染同一元件；popout connect 仍是 `ConnectPage`；畫面檔低於 400 行；非畫面模組可放在 `approval/`；delta 仍由 `sign-tx-body.ts` 畫進 ref；pending 仍來自 service worker；卸載對齊 `disposeApprovalShell`；查詢只用該次 React 根內的 ref | 手驗加 diff 可做 | 無未關閉項 |
| 全 Track：`cd wallet && npm run typecheck`；只為已落地的 phase 開未封裝擴充，對過每個搬走的畫面；Track 5 在 test-web 簽名上看得到批准鈕，錢包送出進入 confirming | 人可做 | 沒有點名 test-web 哪一顆鈕。範圍已收成「按鈕在、送出進入 confirming」，與「行為不變、不重做 0.48.0 全測」一致，不單列 finding |

## 與現碼抽樣

現碼尚未拆檔、尚未改 React，這不是設計 HIGH。

| 錨點 | 與提案 |
|------|--------|
| `shell.ts` | 仍是 vanilla mount。`ui.getPending` 取 pending。`disposeApprovalShell` 的清理面與關閉後的 H2 句子對得上。`mountSignTxBodyShell` 已從 `sign-tx-body.ts` 匯出 |
| `ApprovalHost.tsx` | `host` 為 `sidebar` 或 `window`，`elementIdPrefix: "appr-"`，`dangerouslySetInnerHTML`。`abortWalletSendOnPopupUnload` 在此檔。與 HOW 的輸入、回呼、以及「此函式留在原檔」對得上 |
| `SignFlowPage.tsx` | 同一 mount，host 同為 `sidebar` 或 `window`，只接 `onClose`。不渲染 connect |
| `popout/main.tsx` | 無 `requestId` 時沿用現有錯誤字串。`kind === "connect"` 渲染 `ConnectPage`。其餘 `mountApprovalShell`，`host: "popout"`。樣式只連 popout 表與 `tx-ai.css`，與 L1 關閉句一致，與 L4 的理由句不一致 |
| `sign-tx-body.ts` | 只畫 delta 與模擬 timer。費用卡與 CU 草稿 DOM 在 `shell.ts`，歸 `ApprovalFeeDetails` 合理 |
| `style.css` | 單檔、無 `@import`。Vite 會處理 CSS `@import`，Phase 1 不必加依賴。H1 點名的三條 selector 都在檔內 |

`UiHost` 還有 `"popup"`。現有三個 host 只用 `popout`、`sidebar`、`window`，與 HOW 的聯集一致。

架構抽樣：本版不改結果回傳範圍、不把 pending 寫進持久 Zustand、不引入硬編碼密碼、不新增 Wallet Standard 宣告。注入端不在本版取得長期私鑰。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉（第 2 輪） | INDEX Track 1 驗收；`how.md` Phase 1 主段 |
| H2 | HIGH | 關閉（第 2 輪） | INDEX「Decided／Approval UI」；`how.md` Phase 5 卸載段 |
| M1 | MEDIUM | 關閉（第 2 輪） | INDEX「Decided／Approval UI」；`how.md` Phase 5 非畫面模組句 |
| M2 | MEDIUM | 關閉（第 2 輪） | INDEX「Decided／Approval UI」；`how.md` Phase 5 ref 句 |
| M3 | MEDIUM | 關閉（第 3 輪） | `how.md` Phase 1 主段；INDEX Track 1 驗收。舊末句已刪 |
| L1 | LOW | 關閉（第 2 輪） | INDEX Track 1 驗收；`how.md` Phase 1 不改 popout 表、不加匯入 |
| L2 | LOW | 關閉（第 2 輪） | INDEX「Decided／Approval UI」與 Track 5；`how.md` Phase 5 legacy connect 句 |
| L3 | LOW | 關閉（第 2 輪） | `how.md` 開頭 Phase N＝Track N |
| L4 | LOW | 仍開 | `how.md` Phase 1「existing bundle」理由句；非阻擋 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-20 | 不可開工。H1、H2 仍開。提案可行，修文件即可 |
| 第 2 輪 | 2026-10-20 | H1、H2、M1、M2、L1、L2、L3 已寫進 INDEX 或 HOW 並關閉。無未關閉 HIGH。M3 仍開，門檻未過。提案可行 |
| 第 3 輪 | 2026-10-20 | 核對 H1–L3 仍在 INDEX 或 HOW。M3 末句已刪，關閉。無未關閉 HIGH。L4 仍開且非阻擋。門檻通過。提案可行 |

## Waiver

（無）

## Verdict

`proceed`
