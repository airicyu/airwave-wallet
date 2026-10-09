# 0.25.0 — 錢包視窗與側欄

- **狀態：** `shipped`
- **上游版本：** [0.24.0](../0.24.0/INDEX.md) 的目錄與命令出口；使用者可見行為接 [0.23.0](../0.23.0/INDEX.md)。審批宿主接 [0.13.0](../0.13.0/INDEX.md)，本版只改下面寫明的 `uiHost` 與殼，不改批准／廣播規則
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** [backlog/sidebar-mode.md](../backlog/sidebar-mode.md)（排程前草稿；與本 INDEX 衝突以本檔為準）
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)。本版出貨時改第 1 節的主表面寬度（見已定案「設計原則」）。不另做概念稿
- **秘密欄位：** 無新密碼欄；vault blob 不改 schema。殼模式 **不** 寫進 `airwave.settings.v1`

## 產品句

使用者在錢包 Home 頂欄用一顆圖示，把同一套錢包殼在 **工具列 action popup** 與 **Chrome 側欄** 之間切換。殼模式跟 **側欄錢包文件現在是否活著**：活著＝sidebar mode；被 X 關掉、瀏覽器新開而側欄沒開＝popup mode。點工具列：側欄沒開時開／關圖示下方 popup；側欄開著時走側欄。不用 `chrome.windows.create` 開錢包主殼。網站連線與簽名：側欄錢包開著 → 側欄殼內審批；否則開審批 popout。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)（殼模式、開窗、側欄手勢、寬度）
3. [docs/page-modules.md](./docs/page-modules.md)（頁面模組 vs 宿主 vs 導航 stack；側欄網站請求怎麼 display）
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游：[0.24.0](../0.24.0/INDEX.md)、[0.23.0](../0.23.0/INDEX.md)、[0.13.0](../0.13.0/INDEX.md)
6. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 兩種殼 | **popup／window**：manifest `action.default_popup` 載入 `src/popup/index.html`。**sidebar**：Chrome Side Panel，同一套殼。禁止用 `chrome.windows.create` 開錢包主殼。錢包主殼不是 dApp 審批 `popout/index.html`，禁止共用 `openPopout` 或 pending 的 `windowId` 綁定 |
| 預設 | 側欄錢包文件 **不在**（含瀏覽器新開、使用者按側欄 X）→ **popup mode**。不寫 `chrome.storage`、不寫 `settings.shell`。磁碟上若仍有舊 `shell` 欄，**忽略且不再寫入** |
| 寫入 | 殼模式只活在 **SW 記憶體**（側欄頁 load＝開著；`pagehide`／沒有 SIDE_PANEL context＝關上）。不新增 storage key。禁止把「上次用側欄」持久化成偏好。`storage.patchSettings` 本版不必為切殼呼叫；若仍收到只有 `shell` 的 payload，忽略該欄且禁止 `notifyAccountChanged` |
| 工具列 | manifest 有 `default_popup: src/popup/index.html`。**側欄文件活著**：`setPopup({ popup: "" })`、`openPanelOnActionClick: true`。**否則**（含 SW 剛醒）：`setPopup` 恢復錢包頁、`openPanelOnActionClick: false`，點圖示開 action popup（**不** `windows.create`、**不** `onClicked` 開窗）。SW 啟動只套用 popup 那套工具列（側欄此時通常沒開），**不** `windows.create` |
| Home 按鈕 | 只在已解鎖的 **Home 頂欄**（Tokens 與 Activity 共用那條，`isHomeView`）。放在 **選單鈕左側**。圖示按鈕，`title` 與 `aria-label` 同一句，走 catalog。看 **當下這份文件**：popup 殼顯示「改到側欄」；側欄殼顯示「關閉側欄」。鎖定頁、子頁、送出、收回租金、審批頁 **不** 放。鎖定錢包改為選單一項，不在 Home 頂欄放鎖圖示 |
| 切到側欄 | 在 **點擊當下** 呼叫 `chrome.sidePanel.open`（見 HOW，禁止先 `await` 再 open）。成功後：套用側欄的工具列行為、`window.close()` 關 action popup。失敗：不改工具列、不關 popup。不寫 settings |
| 關閉側欄 | 側欄 Home 那顆鈕**只關側欄**（HOW 的 `setOptions` disable／enable）。**禁止** `openPopup`。關了之後是 popup mode：工具列還原錢包頁、`openPanelOnActionClick: false`。下次使用者點工具列圖示才開 action popup。失敗則側欄保持開著。不寫 settings |
| 同時只留一面 | **切換成功**後另一面必須關掉。使用者用 Chrome **X 關側欄**＝回到 popup mode（恢復 `default_popup`），不是切換失敗。`wallet.beginSend` 的 `uiHost` 跟發起那一頁的文件路徑。審批 popout 可以與錢包殼同時存在，不要為了切殼關掉審批窗，也不要為了審批關掉錢包殼 |
| 側欄關掉的方法 | 沒有 `sidePanel.close`。用 HOW 的 `setOptions({ enabled: false })` 再立刻 `enabled: true` 加回路徑。禁止用 `window.close()` 指望關掉側欄 |
| 寬度 | 錢包視窗的 **viewport**（`documentElement.clientWidth`／`clientHeight`）是 **360×600**。`windows.create` 的寬高含外框，建立後量一次並 `windows.update` 補差值；之後使用者拉過的大小，聚焦時 **不要** 再強制縮回。側欄殼 `width/height: 100%`，**禁止** `max-width: 422px`、禁止置中固定欄。Chrome 側欄內容預設與下限是 360px，本版 **不** 呼叫任何 API 去設側欄寬（`sidePanel` 沒有這個參數）。使用者把側欄拉寬時，內容跟著拉滿 |
| 審批 popout 尺寸 | **不改**。仍是現有 `openPopout` 的 `width: 420`、`height: 640`。`--popup-w` 只在 `wallet/src/popup/style.css`，本版不改它的定義。不要為了 360 去改審批頁 |
| 解鎖 | 規則不變：`wallet.lock` 或瀏覽器工作階段結束才鎖。側欄開著、視窗失焦，都不改鎖法。鎖定畫面在當下那一面殼裡解鎖 |
| 網站請求 | 側欄錢包文件 **現在活著** → `uiHost: "sidebar"`、側欄殼內審批、**禁止** `openPopout`。否則（側欄已 X、新開瀏覽器、SW 剛醒還沒有側欄頁）→ `uiHost: "popout"` 並 `openPopout`。禁止因為網站點 Connect 去 `sidePanel.open`（沒有擴充頁手勢，Chrome 會拒）。工具列 popup 開著也仍 popout |
| 頁面模組 | 畫面按 **Page** 切，不按宿主拼 DOM。Connect／簽訊息／簽交易各是一個完整 Page（標題、內文、底欄、進入離開）。宿主只 display 該模組。側欄用導航 stack `push`／`pop`（Home → 該 Page → 回 Home）。禁止再使用 `dapp-approval` 當「所有網站請求共用一洞」。細節見 [page-modules.md](./docs/page-modules.md)。不把修 Connect 缺按鈕當成目標；目標是先有可 display 的 Connect Page 再掛上 |
| 錢包內審批 | `walletSend` 與收回租金留在 **當下這一面殼**，禁止為它們 `openPopout`。殼內宿主是 `uiHost === "window"` 或 `"sidebar"`，沿用 0.13.0 對 `"popup"` 的規則：`ui.abortPending` 結束該筆錢包送出、禁止 `closePopout`、成功後在當下殼回 Home（確認中 → 已確認 → `home-token`）、拒絕留在送出填寫。`beginSend` 依發起頁路徑寫入 `"window"` 或 `"sidebar"`（見 HOW）。本版起 **不再寫入** `"popup"`。記憶體若仍讀到 `"popup"`，走同一條殼內路徑，禁止把它當成審批 popout 去 `windows.remove`。批准、廣播、`broadcastSig`、確認中時序不改。錢包視窗與側欄失焦不卸載，禁止另做 blur → `ui.abortPending`。關掉該殼或離開審批 view 仍走既有 `pagehide`／離開 view 的 abort，不要為側欄另寫一條。只改 `wallet/src/background/wallet/commands/send-command.ts`；若舊路徑 `wallet/src/background/wallet/send-command.ts` 還在，那是 0.24.0 未刪完，本版不在兩份同時寫 host |
| 字串 | 兩鍵進 `wallet/scripts/gen-ui-messages.mjs`，重跑產生器寫回 `ui-messages.ts`。`shell.toSidebar`：改到側欄／改到侧栏／Move to sidebar。`shell.closeSidebar`：關閉側欄／关闭侧栏／Close sidebar。三語都要有 |
| 不拆的大檔 | `wallet/src/popup/PopupMarkup.tsx` 與 `wallet/src/popup/style.css` 本版超過 400 行仍不拆。只加 Home 切殼鈕與殼根 class。其餘超過 400 行的檔本版沒碰到就不拆 |
| 設計原則 | 出貨時改 [`docs/design-principles.md`](../../design-principles.md) 第 1 節：主表面改為錢包視窗 viewport 360×600，側欄拉滿 Chrome 面板；審批 popout 仍用既有 popout 寬。工具列 popup 不再是主表面 |
| 依賴 | 不加 npm 套件。權限只加 `sidePanel` |
| 數字 | 不改金額運算。本版不引入 `big.js` |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.25.0`。狀態改 `shipped` 須使用者同意 |

## 非目標

- 網頁裡自己畫一條側欄、覆蓋 dApp
- 在 `shell === "window"` 時把網站審批塞進工具列 popup（該模式仍一律 popout）
- Settings 裡再做一顆殼模式開關
- 保留工具列 `default_popup` 當第三種殼
- 用 API 設定側欄寬度，或在側欄裡放一條 422px 置中欄
- 每個分頁不同錢包狀態
- 改 vault、改 pending 生命週期、宣告新 Wallet Standard 方法
- 地址簿、聚合送出、Agent
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.24.0 結束時 | 0.25.0 |
|---------------|--------|
| 工具列點擊開 `default_popup`（422×600） | 側欄沒開時仍 `default_popup`；側欄文件活著才清空 popup、點圖示走側欄 |
| 沒有 Side Panel | `side_panel.default_path` 載入同一套錢包殼 |
| `settings` 無殼偏好 | **仍不**把殼寫進 settings。SW 記憶體跟側欄文件是否活著 |
| `uiHost` 為 `"popout"` \| `"popup"` | 網站：側欄文件活著 → `"sidebar"`；否則 `"popout"`。錢包送出依發起頁寫 `"window"` \| `"sidebar"` |
| Home 頂欄右側是鎖定、選單 | 選單左側加一顆切殼圖示，只在 Home；鎖定改為選單項 |
| 側欄寬度未定 | popup 殼寬度沿用既有 `--popup-w`；側欄 100% 拉滿面板 |

## 實作 Track

### Track 1 — 殼模式、manifest、工具列與側欄

- **做：** 殼模式＝側欄文件是否活著（SW 記憶體，不寫 settings）。manifest 加 `sidePanel`、`side_panel.default_path`，保留 `default_popup`。vite input 加上側欄 HTML（可與 popup 共用同一支 React 入口，用路徑區分殼）。SW 記住最後聚焦的 **一般** 瀏覽器視窗 id。啟動時套用 **popup** 那套 `setPopup`／`setPanelBehavior`。**禁止** `chrome.windows.create` 開錢包主殼。
- **不做：** Home 按鈕（Track 2）；把殼寫進 `airwave.settings.v1`；改審批 popout 尺寸；改 `uiHost` 分流（Track 3）。
- **驗收：** `cd wallet && npm run typecheck`。瀏覽器新開、側欄沒開：點工具列開 action popup。側欄開著：點圖示走側欄。SW 醒來不得 `windows.create` 錢包窗。

### Track 2 — Home 按鈕互切

- **做：** Home 頂欄圖示。切到側欄必須在點擊同步呼叫 `sidePanel.open`（HOW）。成功才套用側欄工具列並 `window.close()` 關 popup。側欄那顆鈕只關側欄，不 `openPopup`。使用者再點工具列才開 action popup。Chrome X 關側欄同樣回到 popup 工具列。catalog：`shell.toSidebar`、`shell.closeSidebar`。按鈕不出現在 Home 以外。
- **不做：** Settings 開關。不寫 `settings.shell`。不從側欄程式化 `openPopup`。
- **驗收：** typecheck。手驗：popup Home → 側欄開、popup 關；側欄 Home → 側欄關、當下不自動開 popup；再點工具列才開 popup。沒有 `lastNormalWindowId` 時切到側欄不開、維持 popup。

### Track 3 — 側欄拉滿、錢包內 uiHost、網站分流、原則檔

- **做：** 側欄根節點寬高 100%。`UiHost` 加上 `"window"` \| `"sidebar"`；`wallet.beginSend` 依發起頁路徑寫入；殼內審批跟著當下文件。網站 pending 依 **側欄文件是否活著** 分流（見已定案「網站請求」）。改 design-principles 第 1 節。`cd wallet && npm run typecheck && npm run build`。
- **不做：** 改審批 popout 的 420×640。不為切殼 `patchSettings`。
- **驗收：** 兩道指令 exit 0。手驗：側欄拉滿面板。popup／側欄各走一次代幣送出，不另開審批 popout。側欄沒開時 `test-web` 簽名開 popout；側欄開著時在側欄殼內審批。

### Track 4 — 網站請求 Page 模組與 stack

- **做：** 依 [page-modules.md](./docs/page-modules.md) 抽出 `connect`／`sign-message`／`sign-transaction` 三個完整 Page。側欄用 flow stack `push`／`pop`：**疊層 keep-alive**（底下不卸載，dismiss 只收頂層）。刪 `dapp-approval` view。同一 Connect Page 掛側欄與 popout。禁止再用審批殼裡沒名字的 connect 區塊當側欄畫面。
- **不做：** Settings／Accounts 搬家；從下彈出動畫；把網站請求塞進工具列 popup。
- **驗收：** typecheck。側欄 `test-web` connect：標題是連線、有拒絕／批准、結束回 Home。popup 模式 connect 仍 popout，畫面同一模組。簽訊息／簽交易側欄可批准或拒絕並回 Home。

## 驗收（出貨 checklist）

- [x] 點工具列：側欄沒開 → action popup；側欄開著 → 側欄；禁止 `windows.create` 錢包主殼
- [x] Home 頂欄、選單左側有切殼圖示；子頁、鎖定、審批沒有；鎖定在選單內
- [x] popup → 側欄成功後關 popup；側欄 Home 關側欄後不自動 `openPopup`；`sidePanel.open` 失敗則不關目前這一面
- [x] 側欄按 X 後回到 popup mode（工具列再開是 popup；網站 Connect 走 popout）
- [x] 側欄寬度 100% 跟面板，無 422px 置中欄
- [x] 網站審批：側欄文件活著 → 殼內；否則 popout。錢包送出與收回租金留在當下殼
- [x] 側欄 connect 是完整 Page（自有標題與底欄），不是 `dapp-approval`／送出標題；結束 pop 回 Home
- [x] `uiHost` 不再寫入 `"popup"`
- [x] 解鎖規則不變
- [x] 三語 catalog 有 `shell.toSidebar`、`shell.closeSidebar`
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 未封裝擴充走完 Track 2、Track 3 手驗
- [x] design-principles 第 1 節已改成工具列 popup／側欄
- [x] 文件與程式無真實密碼／助記詞／私鑰
- [x] 狀態 `shipped`（使用者同意）。出貨當下版本檔曾對齊 `0.25.0`；其後 [0.26.0](../0.26.0/INDEX.md) 已覆蓋為 `0.26.0`
- [x] 出貨後刪 backlog 的 sidebar 列與 `sidebar-mode.md`

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/manifest.config.ts` | 保留 `default_popup`；加 `sidePanel` 與 `side_panel` |
| `wallet/vite.config.ts` | 側欄 HTML 入口 |
| `wallet/src/shared/storage-keys.ts` | 本版 **不** 再把殼寫進 Settings；舊 `shell` 欄忽略 |
| `wallet/src/background/storage/storage-io.ts` | `normalizeSettings` 讀未知值成 `"window"` |
| `wallet/src/background/messaging/open-popout.ts` | 審批窗；本版不拿它開錢包視窗 |
| `wallet/src/shared/commands.ts` | `UiHost` 加上 `"window"` \| `"sidebar"` |
| `wallet/src/background/wallet/commands/settings-command.ts` | payload 只有 `shell` 時不 `notifyAccountChanged` |
| `wallet/src/background/wallet/commands/send-command.ts` | `beginSend` 的 `uiHost` 改依發起頁路徑 |
| `wallet/src/popup/index.html` | 錢包視窗，禁止搬移 |
| `wallet/src/sidepanel/index.html` | 本版新建的側欄入口 |
| `wallet/src/popup/PopupMarkup.tsx` | Home 頂欄按鈕 |
| `wallet/src/popup/style.css` | 目前 `--popup-w: 422px`；錢包殼改 100%，審批頁保留 |
| `wallet/scripts/gen-ui-messages.mjs` | 兩顆切殼文案 |
| `docs/design-principles.md` | Track 3 改第 1 節 |
