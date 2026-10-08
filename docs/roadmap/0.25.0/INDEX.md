# 0.25.0 — 錢包視窗與側欄

- **狀態：** `in progress`
- **上游版本：** [0.24.0](../0.24.0/INDEX.md) 的目錄與命令出口；使用者可見行為接 [0.23.0](../0.23.0/INDEX.md)。審批宿主接 [0.13.0](../0.13.0/INDEX.md)，本版只改下面寫明的 `uiHost` 與殼，不改批准／廣播規則
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** [backlog/sidebar-mode.md](../backlog/sidebar-mode.md)（排程前草稿；與本 INDEX 衝突以本檔為準）
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)。本版出貨時改第 1 節的主表面寬度（見已定案「設計原則」）。不另做概念稿
- **秘密欄位：** 無新密碼欄；vault blob 不改 schema。殼模式明文寫在既有 `airwave.settings.v1`

## 產品句

使用者在錢包 Home 頂欄用一顆圖示，把同一套錢包殼在 **工具列 action popup** 與 **Chrome 側欄** 之間切換。點工具列圖示：`shell === "window"` 時開／關 **圖示下方 popup**；`shell === "sidebar"` 時開側欄。不用 `chrome.windows.create` 開錢包主殼。網站連線與簽名：`shell === "sidebar"` 時在側欄殼內審批；`shell === "window"` 時仍開審批 popout 獨立窗。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)（殼模式、開窗、側欄手勢、寬度）
3. [docs/page-modules.md](./docs/page-modules.md)（頁面模組 vs 宿主 vs 導航 stack；側欄網站請求怎麼 display）
4. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.24.0](../0.24.0/INDEX.md)、[0.23.0](../0.23.0/INDEX.md)、[0.13.0](../0.13.0/INDEX.md)
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 兩種殼 | **`window`**：manifest `action.default_popup` 載入 `src/popup/index.html`（工具列圖示下方 popup；`shell === "sidebar"` 時 SW `setPopup({ popup: "" })` 關閉）。**`sidebar`**：Chrome Side Panel，同一套殼。禁止用 `chrome.windows.create` 開錢包主殼。錢包主殼不是 dApp 審批 `popout/index.html`，禁止共用 `openPopout` 或 pending 的 `windowId` 綁定 |
| 預設 | `settings.shell` 缺欄或不是 `"window"`／`"sidebar"` → **`"window"`**。不跟瀏覽器、不記在 `chrome.storage.session` |
| 寫入 | 欄位 `shell` 放進既有 `Settings`，經 `normalizeSettings` 與 `storage.patchSettings`。不新增 `chrome.storage` key。切換成功才寫入；失敗維持原值。`onChanged` 更新各 UI 鏡像。`storage.patchSettings` 的 payload **只有** `shell` 時，寫入後禁止 `notifyAccountChanged`（公鑰沒變，不得對已連線分頁發 `airwave-bridge-account-changed`）。payload 還含 cluster 或其他欄時，維持現況通知 |
| 工具列 | manifest 有 `default_popup: src/popup/index.html`。`shell === "window"`：`setPopup` 恢復該路徑、`openPanelOnActionClick: false`，點圖示由 Chrome 開 action popup（**不** `windows.create`、**不** `onClicked` 開窗）。`shell === "sidebar"`：`setPopup({ popup: "" })`、`openPanelOnActionClick: true`。SW 啟動只套用 `setPanelBehavior` 與 `setPopup`，**不** `windows.create` |
| Home 按鈕 | 只在已解鎖的 **Home 頂欄**（Tokens 與 Activity 共用那條，`isHomeView`）。放在鎖定鈕 **左側**。圖示按鈕，`title` 與 `aria-label` 同一句，走 catalog。`window` 殼顯示「改到側欄」；`sidebar` 殼顯示「改到視窗」。鎖定頁、子頁、送出、收回租金、審批頁 **不** 放 |
| 切到側欄 | 在 **點擊當下** 呼叫 `chrome.sidePanel.open`（見 HOW，禁止先 `await` 再 open）。成功後：寫入 `shell: "sidebar"`、套用側欄的工具列行為、`window.close()` 關 action popup。失敗：不寫入、不關 popup |
| 切到視窗 | 同一次點擊內 `setPopup` + `openPopup` 打開工具列 popup；**`openPopup` 成功後**才寫入 `shell: "window"`、關掉側欄、套用 popup 的工具列行為。`openPopup` 失敗則側欄保持開著、不寫入 |
| 同時只留一面 | **切換成功**後另一面必須關掉。文件載入時禁止因 `settings.shell` 還是舊值就把自己關掉（切換是先開成功再寫入）。Chrome 側欄選單仍可能在 `shell === "window"` 時把側欄打開，這種並存不是切換失敗。`wallet.beginSend` 的 `uiHost` 跟發起那一頁的文件路徑，不跟 `settings.shell`。審批 popout 可以與錢包殼同時存在，不要為了切殼關掉審批窗，也不要為了審批關掉錢包殼 |
| 側欄關掉的方法 | 沒有 `sidePanel.close`。用 HOW 的 `setOptions({ enabled: false })` 再立刻 `enabled: true` 加回路徑。禁止用 `window.close()` 指望關掉側欄 |
| 寬度 | 錢包視窗的 **viewport**（`documentElement.clientWidth`／`clientHeight`）是 **360×600**。`windows.create` 的寬高含外框，建立後量一次並 `windows.update` 補差值；之後使用者拉過的大小，聚焦時 **不要** 再強制縮回。側欄殼 `width/height: 100%`，**禁止** `max-width: 422px`、禁止置中固定欄。Chrome 側欄內容預設與下限是 360px，本版 **不** 呼叫任何 API 去設側欄寬（`sidePanel` 沒有這個參數）。使用者把側欄拉寬時，內容跟著拉滿 |
| 審批 popout 尺寸 | **不改**。仍是現有 `openPopout` 的 `width: 420`、`height: 640`。`--popup-w` 只在 `wallet/src/popup/style.css`，本版不改它的定義。不要為了 360 去改審批頁 |
| 解鎖 | 規則不變：`wallet.lock` 或瀏覽器工作階段結束才鎖。側欄開著、視窗失焦，都不改鎖法。鎖定畫面在當下那一面殼裡解鎖 |
| 網站請求 | 依 `settings.shell`：**`sidebar`** → `uiHost: "sidebar"`、側欄殼內審批、**禁止** `openPopout`。**`window`**（工具列 popup 模式）→ 一律 `uiHost: "popout"` 並 `openPopout`（toolbar popup 開著也仍 popout） |
| 頁面模組 | 畫面按 **Page** 切，不按宿主拼 DOM。Connect／簽訊息／簽交易各是一個完整 Page（標題、內文、底欄、進入離開）。宿主只 display 該模組。側欄用導航 stack `push`／`pop`（Home → 該 Page → 回 Home）。禁止再使用 `dapp-approval` 當「所有網站請求共用一洞」。細節見 [page-modules.md](./docs/page-modules.md)。不把修 Connect 缺按鈕當成目標；目標是先有可 display 的 Connect Page 再掛上 |
| 錢包內審批 | `walletSend` 與收回租金留在 **當下這一面殼**，禁止為它們 `openPopout`。殼內宿主是 `uiHost === "window"` 或 `"sidebar"`，沿用 0.13.0 對 `"popup"` 的規則：`ui.abortPending` 結束該筆錢包送出、禁止 `closePopout`、成功後在當下殼回 Home（確認中 → 已確認 → `home-token`）、拒絕留在送出填寫。`beginSend` 依發起頁路徑寫入 `"window"` 或 `"sidebar"`（見 HOW），不讀 `settings.shell`。本版起 **不再寫入** `"popup"`。記憶體若仍讀到 `"popup"`，走同一條殼內路徑，禁止把它當成審批 popout 去 `windows.remove`。批准、廣播、`broadcastSig`、確認中時序不改。錢包視窗與側欄失焦不卸載，禁止另做 blur → `ui.abortPending`。關掉該殼或離開審批 view 仍走既有 `pagehide`／離開 view 的 abort，不要為側欄另寫一條。只改 `wallet/src/background/wallet/commands/send-command.ts`；若舊路徑 `wallet/src/background/wallet/send-command.ts` 還在，那是 0.24.0 未刪完，本版不在兩份同時寫 host |
| 字串 | 兩鍵進 `wallet/scripts/gen-ui-messages.mjs`，重跑產生器寫回 `ui-messages.ts`。`shell.toSidebar`：改到側欄／改到侧栏／Move to sidebar。`shell.toWindow`：改到視窗／改到窗口／Move to window。三語都要有 |
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
| 工具列點擊開 `default_popup`（422×600） | 仍 `default_popup` 載入 popup 殼；`shell === "sidebar"` 時 SW 清空 popup、點圖示開側欄 |
| 沒有 Side Panel | `side_panel.default_path` 載入同一套錢包殼 |
| `settings` 無 `shell` | `airwave.settings.v1` 增 `shell`；缺省 `"window"` |
| `uiHost` 為 `"popout"` \| `"popup"` | 網站：`sidebar` 殼 → `"sidebar"`；`window` 殼 → `"popout"`。錢包送出依發起頁寫 `"window"` \| `"sidebar"` |
| Home 頂欄右側是鎖定、選單 | 鎖定左側加一顆切殼圖示，只在 Home |
| 側欄寬度未定 | popup 殼寬度沿用既有 `--popup-w`；側欄 100% 拉滿面板 |

## 實作 Track

### Track 1 — 殼模式、manifest、工具列與側欄

- **做：** `Settings.shell` 與 `normalizeSettings`。manifest 加 `sidePanel`、`side_panel.default_path`，保留 `default_popup`。vite input 加上側欄 HTML（可與 popup 共用同一支 React 入口，用路徑區分殼）。SW 記住最後聚焦的 **一般** 瀏覽器視窗 id。啟動時套用 `setPopup`／`setPanelBehavior`。**禁止** `chrome.windows.create` 開錢包主殼。
- **不做：** Home 按鈕（Track 2）；改審批 popout 尺寸；改 `uiHost` 分流（Track 3）。
- **驗收：** `cd wallet && npm run typecheck`。舊 settings 無 `shell` 讀出來是 `"window"`。`shell === "window"` 點工具列開 action popup；`shell === "sidebar"` 點工具列開側欄。SW 醒來不得 `windows.create` 錢包窗。

### Track 2 — Home 按鈕互切

- **做：** Home 頂欄圖示。切到側欄必須在點擊同步呼叫 `sidePanel.open`（HOW）。成功才寫 `shell` 並 `window.close()` 關 popup。切回 popup：`openPopup` 成功後 SW 才關側欄並寫 `shell`。catalog 兩鍵。按鈕不出現在 Home 以外。
- **不做：** Settings 開關。
- **驗收：** typecheck。手驗：popup Home → 側欄開、popup 關；側欄 Home → popup 開、側欄關。沒有 `lastNormalWindowId` 時切到側欄不改模式。

### Track 3 — 側欄拉滿、錢包內 uiHost、網站分流、原則檔

- **做：** 側欄根節點寬高 100%。`UiHost` 加上 `"window"` \| `"sidebar"`；`wallet.beginSend` 依發起頁路徑寫入；殼內審批跟著當下文件。網站 pending 依 `settings.shell` 分流（見已定案「網站請求」）。`patchSettings` 只有 `shell` 時不發帳戶變更。改 design-principles 第 1 節。`cd wallet && npm run typecheck && npm run build`。
- **不做：** 改審批 popout 的 420×640。
- **驗收：** 兩道指令 exit 0。手驗：側欄拉滿面板。popup／側欄各走一次代幣送出，不另開審批 popout。`shell === "window"` 時 `test-web` 簽名開 popout；`shell === "sidebar"` 時在側欄殼內審批。

## 驗收（出貨 checklist）

- [ ] 點工具列依 `settings.shell` 開 action popup 或側欄；禁止 `windows.create` 錢包主殼
- [ ] Home 頂欄、鎖定左側有切殼圖示；子頁、鎖定、審批沒有
- [ ] popup ↔ 側欄切換成功後關掉另一面並寫入 `shell`；`openPopup`／`sidePanel.open` 失敗則不寫入
- [ ] 切換失敗不寫入、不關掉目前這一面
- [ ] 側欄寬度 100% 跟面板，無 422px 置中欄
- [ ] 網站審批依 `shell` 分流（sidebar 殼內／window 模式 popout）；錢包送出與收回租金留在當下殼
- [ ] `uiHost` 不再寫入 `"popup"`
- [ ] 解鎖規則不變
- [ ] 三語 catalog 有 `shell.toSidebar`、`shell.toWindow`
- [ ] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [ ] 未封裝擴充走完 Track 2、Track 3 手驗
- [ ] design-principles 第 1 節已改成工具列 popup／側欄
- [ ] 文件與程式無真實密碼／助記詞／私鑰
- [ ] 版本號檔對齊 `0.25.0`；狀態 `shipped` 須使用者同意
- [ ] 出貨後刪 backlog 的 sidebar 列與 `sidebar-mode.md`

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/manifest.config.ts` | 保留 `default_popup`；加 `sidePanel` 與 `side_panel` |
| `wallet/vite.config.ts` | 側欄 HTML 入口 |
| `wallet/src/shared/storage-keys.ts` | `Settings.shell` 與預設 `"window"` |
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
