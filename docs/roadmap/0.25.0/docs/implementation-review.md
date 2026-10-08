# 實作審查 — 0.25.0

- 日期：2026-10-09（Asia/Hong_Kong）
- 輪次：第 2 輪（本檔最新）。第 1 輪正文保留於下方，既有 ID 不重編。
- 對照基準：先 [`../INDEX.md`](../INDEX.md) **產品句**與**已定案**表（使用者測過後的現行契約）。已定案若與同一份 INDEX 的 Track、非目標、驗收 checklist、「與上一版對照」，或與 [`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md) 衝突，**以已定案＋產品句判程式**；文件自相矛盾另開 finding，不把「程式跟了新已定案、沒跟舊 HOW」記成程式 HIGH。架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)（INDEX 未明文推翻者仍有效）。
- 範圍：working tree 的 `wallet/src` 與 `wallet/manifest.config.ts`（不含 `node_modules`、不以 `dist` 當源碼）。不改程式、不 commit。

## 第 2 輪（2026-10-09）

- 角色：實作審查 agent。只讀檔，不認 chat history。
- **總評（第 2 輪當時）：不可出貨。** 下列 HIGH 已在程式修復（見修復追蹤「已修」）；**仍須手驗**（025-M01）與契約文件其餘段落（025-M02 部分已改 INDEX Track／checklist）。`npm run typecheck` 與 `npm run build` exit code 皆為 0。

### Findings

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| 025-H01 | HIGH | 已修 | 側欄切回工具列 popup：`switchToWindow` 不等 `setPopup`／`openPopup` 成功，就呼叫 `shell.switchToWindow`。該命令先關側欄再 `writeSettings({ shell: "window" })`。已定案「切到視窗」要求先開成功才寫入、失敗則側欄保持開著且不寫入。側欄模式下 popup 已被設成空字串，未等待 `setPopup` 就 `openPopup` 可能被拒，側欄仍會被關掉。若拿不到 `browserWindowId` 則不寫 `shell`，但頁面已 `setPopup` 成錢包頁，工具列與 `settings.shell` 會分叉，直到 SW 下次套用。 |
| 025-H02 | HIGH | 已修 | 網站請求在 `shell === "sidebar"` 時 `uiHost: "sidebar"` 且不 `openPopout`（這點符合已定案）。呈現靠 `presentDappApproval` 先 `await readSettings`，再開側欄前又 `await tabs.get`，`sidePanel.open` 失敗被吃掉，然後只 `runtime.sendMessage` 一次。側欄文件若尚未掛上 listener（剛開啟）或根本沒開，不會進 `dapp-approval`，也沒有向 SW 拉目前 pending。使用者看不到審批，dApp 要等到逾時（120 秒）才結束。 |
| 025-H03 | HIGH | 已修 | 側欄裡的網站審批，離開 view 會 `ui.resolvePending` 拒絕；**關掉側欄**只走 `pagehide` → `abortWalletSendOnPopupUnload`，不拒絕 dApp pending。審批 popout 關窗會經 `windows.onRemoved` 立刻回覆發起頁。側欄沒有這條。已定案寫本版只改 `uiHost` 與殼、不改批准規則；關掉審批表面應結束該筆，目前要等逾時。 |
| 025-M01 | MEDIUM | 開 | 手驗仍未做。第 1 輪把「無 `default_popup`、`onClicked` 開視窗、網站一律 popout、360 viewport」當手驗腳本；那些句子已不是現行產品句。本輪改以已定案為準，狀態仍開，不表示第 1 輪已關閉。 |
| 025-M02 | MEDIUM | 開 | **契約不自足**（不是程式 HIGH）。產品句與已定案「兩種殼／工具列／網站請求」已改成工具列 popup ↔ 側欄，以及 sidebar 殼內審批。同一份 INDEX 的 Track 1（拿掉 `default_popup`、`onClicked` 開窗）、Track 3「不做把網站 pending 寫成 sidebar」、非目標（不要留 `default_popup`、不要用側欄取代審批 popout）、驗收（無工具列 popup、網站簽名仍一律 popout、viewport 360）、與上一版對照，以及 HOW／reasoning／HANDOFF 前段，仍寫舊模型。已定案「寬度」「設計原則」「字串」列仍寫 `windows.create`、360×600、「改到視窗」。程式跟產品句（popup CSS 仍 422×600，見 `style.css` 的 `--popup-w`；`popup/main.tsx` 未加 `wallet-shell-surface`；側欄 100%）**不要**為了對齊舊 HOW 改回 `windows.create`。出貨前須把 Track、非目標、checklist、對照、HOW、reasoning、HANDOFF、以及已定案裡過時的列，改到與產品句一致。 |
| 025-M03 | MEDIUM | 已修 | `switchToSidebar` 在 `lastNormalWindowId` 已在手上時，會在點擊同步路徑呼叫 `sidePanel.open`，成功後才 `patchSettings` 再 `window.close()`，這段符合已定案。快取是空的時候先 `await` SW 再 open；第一次 open 失敗後的重試也先 await。已定案禁止先 await 再 open。`onMouseDown` 的 hydrate 不能保證 click 前完成。失敗路徑沒有寫入，不升 HIGH。 |
| 025-L01 | LOW | 開 | 與第 1 輪相同：`wallet/package.json`、`wallet/manifest.config.ts` 為 `0.25.0`；倉庫根 `version.md` 仍為 `0.24.0`。本輪契約改動沒有讓這項失真。 |
| 025-L02 | LOW | 開 | `changelog.md` 仍無 `0.25.0` 條目。 |
| 025-L03 | LOW | 開（非阻擋） | 與本版產品句無直接關係的其他文件變更仍在 working tree。出貨 commit 宜分開。 |
| 025-L04 | LOW | 開 | `shell.toWindow` 現為「改到工具列／改到工具栏／Move to toolbar」（`gen-ui-messages.mjs`、`ui-messages.ts`）。已定案字串列仍是「改到視窗／改到窗口／Move to window」。文案貼近產品句，字串列未改，併入 025-M02，不升成程式 HIGH。 |
| 025-L05 | LOW | 已修 | `wallet/src/popup/shell/shell-switch.ts` 已補檔首註解。 |

**未關閉 HIGH（第 2 輪）：** 無（025-H01–H03 已修；待手驗確認）。

第 1 輪「無 HIGH、靜態對齊舊 HOW」的總評，在產品句改成工具列 popup 之後不再當現況。第 1 輪正文不刪。

### 驗收對照（以產品句＋已定案為準）

專案尚無整包測試指令。自動指令只跑 INDEX 寫明的 `cd wallet && npm run typecheck` 與 `npm run build`。手驗未走。

| 現行已定案 | 結果 | 證據 |
|------------|------|------|
| `window`：manifest `default_popup` = `src/popup/index.html`；不 `windows.create`、不 `onClicked` 開錢包主殼 | 靜態通過；手驗未做 | `manifest.config.ts` 與建置後 `dist/manifest.json` 皆有 `default_popup`；`wallet/src` 的 `windows.create` 只在 `open-popout.ts`（審批窗） |
| `sidebar`：`setPopup({ popup: "" })` 且 `openPanelOnActionClick: true` | 靜態通過 | `applyToolbarForShell` |
| `window`：`setPopup` 恢復錢包頁、`openPanelOnActionClick: false` | 靜態通過 | 同上 |
| SW 啟動只套用 `setPanelBehavior` 與 `setPopup`，不 `windows.create` | 靜態通過 | `initWalletShellOnStartup` |
| `settings.shell` 缺欄或未知 → `"window"`；不新 storage key；只在切換成功後寫入 | 部分 | `normalizeShellMode`、`DEFAULT_SETTINGS.shell` 通過。切到側欄成功後才 `patchSettings`。切到視窗見 025-H01 |
| payload 只有 `shell` 時不 `notifyAccountChanged` | 通過 | `handlePatchSettings` 的 `shellOnly`。`shell.switchToWindow` 直接 `writeSettings`，沒有呼叫 `notifyAccountChanged` |
| Home 頂欄、鎖定左側切殼圖示；鎖定／子頁／送出／審批不放 | 靜態通過 | `PopupMarkup.tsx` 按鈕在 `bar-home`（`isHomeView`）內、鎖定鈕之前；文案走 catalog |
| 切到側欄：點擊當下 `sidePanel.open`，成功才寫入並關 popup | 部分 | 有快取 id 時通過；無快取見 025-M03 |
| 切到視窗：先開成功再寫入、關側欄；失敗不寫入、不關 | **失敗** | 025-H01 |
| 網站請求：sidebar → `uiHost: "sidebar"`、殼內審批、禁止 `openPopout`；window → `openPopout` | **主路徑未完成** | host 選擇與禁止 popout 符合已定案；送達與關側欄見 025-H02、025-H03 |
| 錢包內 `beginSend` 依發起頁寫 `"window"`／`"sidebar"`，不寫 `"popup"`；不為錢包送出 `openPopout` | 靜態通過 | `commands/send-command.ts` 的 `uiHostFromSender`。磁碟上沒有舊路徑 `background/wallet/send-command.ts` |
| 記憶體 `"popup"` 走殼內路徑，不 `windows.remove` | 靜態通過 | `isInWalletShellHost` 含 `"popup"`；`windows.remove` 只發生在已 `bindPopoutWindow` 的審批窗 |
| 審批 popout 仍 420×640；`--popup-w` 定義不改 | 通過 | `open-popout.ts`；`style.css` 仍 `--popup-w: 422px` |
| 側欄寬高 100%，無 422px 置中欄 | 靜態通過 | `sidepanel/main.tsx` 加 `wallet-shell-surface` |
| 錢包視窗 viewport 360×600，以及 `windows.create` 後 `windows.update` | 不判程式 HIGH | 與產品句禁止 `windows.create` 衝突。程式用 action popup 的 422×600 CSS。見 025-M02 |
| 三語 `shell.toSidebar`／`shell.toWindow` | 部分 | 鍵存在；`toWindow` 文案見 025-L04 |
| `design-principles` 第 1 節 | 與產品句一致、與已定案「設計原則」列不一致 | 第 1 節已寫工具列 popup 約 422×600、側欄 100%、禁止 `windows.create`。已定案該列仍寫出貨時改成 360。見 025-M02 |
| typecheck 與 build | 通過 | 本輪 exit code 0 |
| 未封裝擴充手驗 | **未執行** | 025-M01。本環境沒有載入未封裝擴充的瀏覽器步驟 |
| 版本號、changelog、清 backlog、狀態 `shipped` | 未做 | 025-L01、025-L02；`shipped` 須使用者同意 |

INDEX checklist 裡「無工具列 popup」「網站簽名仍一律審批 popout」與現行已定案相反。程式沒有照那些過時句子做，不記程式缺陷。

### 契約抽樣（架構禁區）

| 檢查項 | 結果 |
|--------|------|
| Pending 仍只在 SW；UI 不從 storage hydrate 找請求 | 通過 |
| 網站審批結果仍回發起 tab（content script 只轉 `type` 為 bridge 的訊息） | 通過。側欄通知用 `kind`，content script 不轉進頁面 |
| `shell.*` 與 `storage.patchSettings` 僅擴充頁可呼叫 | 通過（`background/index.ts` `isExtensionPage`） |
| 錢包主殼不走 `openPopout`／`bindPopoutWindow` | 通過 |
| 未新增 npm 依賴；權限有 `sidePanel` | 通過 |
| 未改 `../solibra-wallet` | 通過（本輪未改該目錄） |
| 切殼不對已連線分頁發帳戶變更 | 通過（見上表） |

### 測試結果

工作目錄 `wallet/`。尚無整包測試指令；未假設 `bun test`。

| 指令 | exit code |
|------|-----------|
| `npm run typecheck` | 0 |
| `npm run build` | 0 |
| 未封裝擴充手驗 | **未執行**（025-M01） |

### 修復追蹤

| ID | 狀態 | 追蹤 |
|----|------|------|
| 025-H01 | 已修 | `shell-switch.ts`：`await openPopup()` 成功後才 `shell.switchToWindow` |
| 025-H02 | 已修 | `openDappApprovalInSidebarShell` 回傳 boolean；`sendMessage` 重試；`shell.getSidebarDappApproval` + 側欄 mount hydrate；open 失敗則 `rejectOrdinaryDappPending` |
| 025-H03 | 已修 | 側欄 `pagehide` 呼叫 `rejectDappApprovalIfOpen`；切殼時 SW 亦 reject sidebar pending |
| 025-M01 | 開 | 手驗改依現行產品句：圖示下方 popup ↔ 側欄；window 模式網站仍 popout；sidebar 模式網站在側欄審批。第 1 輪的「開獨立錢包視窗／找回 windowId」腳本作廢 |
| 025-M02 | 開 | 規劃側把 Track、非目標、驗收、對照、HOW、reasoning、HANDOFF、已定案過時列改到與產品句一致。不要把程式改回 `windows.create` |
| 025-M03 | 已修 | `switchToSidebar` 僅用快取 `lastNormalWindowId`，無 id 則 return |
| 025-L01 | 開 | 出貨前 `version.md` → `0.25.0` |
| 025-L02 | 開 | 出貨時寫 changelog |
| 025-L03 | 開、非阻擋 | 提交範圍由使用者決定 |
| 025-L04 | 開 | 與 025-M02 一起改字串列或改 catalog，兩邊要同一句 |
| 025-L05 | 已修 | `shell-switch.ts` 補檔首註解 |

### 歷審摘要

| 輪 | 日期 | 結論 |
|----|------|------|
| 2 | 2026-10-09 | 程式主殼已跟新產品句（action popup ↔ 側欄）。未關 HIGH：025-H01、025-H02、025-H03。契約其餘章節仍是舊模型（025-M02）。typecheck／build 通過；手驗未做。**不可出貨。** |
| 1 | 2026-10-09 | 對當時的 INDEX／HOW（無 `default_popup`、`windows.create`）。該總評在契約改寫後不再代表現況。 |

---

# 實作審查 — 0.25.0

- 日期：2026-10-09（Asia/Hong_Kong）
- 輪次：第 1 輪。後續輪次累加於上方，**不重編號**既有 finding ID。
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- 範圍：**working tree**（`HEAD` 為 `0.24.0`；0.25.0 程式與 `docs/roadmap/0.25.0/` 多在未提交變更與 untracked）。不含 `wallet/node_modules`、不改程式、不 commit。

## 第 1 輪（2026-10-09）

- 角色：實作審查 agent。只讀檔與 git 狀態，不認 chat history。
- **總評：** Track 1–3 靜態對照 INDEX／HOW 主體已落地（`settings.shell`、`sidePanel`、殼寬度覆寫、`beginSend` 的 `uiHost`、`shell.*` 命令、Home 切殼鈕、`design-principles` 第 1 節）。`npm run typecheck` 與 `npm run build` exit code 皆為 0。**無未關閉 HIGH。** 出貨前仍缺瀏覽器手驗（025-M01）與根目錄 `version.md` 對齊（025-L01）。

### Findings

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| 025-M01 | MEDIUM | 開 | INDEX 驗收與 Track 2／3 要求未封裝擴充手驗（含 SW 回收後再點圖示、側欄／視窗互切、360×600 viewport、`test-web` 簽名仍開審批 popout、殼內送出不開 popout）。本輪審查環境**未執行** Chrome 手驗，僅能標為出貨閘門未過；不表示靜態審查已發現必敗缺陷。 |
| 025-L01 | LOW | 開 | `wallet/package.json`、`wallet/manifest.config.ts` 已為 `0.25.0`；倉庫根 [`version.md`](../../../../version.md) 仍為 `0.24.0`。INDEX 出貨 checklist 要求版本檔對齊（`shipped` 須使用者同意）。 |
| 025-L02 | LOW | 開 | [`changelog.md`](../../../../changelog.md) 尚無 `0.25.0` 條目（出貨步驟預期補寫；非本輪程式錯誤）。 |
| 025-L03 | LOW | 開（非阻擋） | 同一 working tree 另有與本版產品句無直接關係的 diff／untracked：`docs/roadmap/backlog/account-kind-visual.md`、`docs/roadmap/README.md`、`docs/roadmap/backlog/INDEX.md` 等。0.25.0 出貨 commit 宜與這些分開或於訊息說明。 |

**未關閉 HIGH：** 無。

### 驗收對照（INDEX checklist ＋ Track）

專案**尚無整包測試指令**（GUIDELINES）；本版自動驗收以 INDEX 寫明的 `cd wallet && npm run typecheck && npm run build` 為準。手驗見 025-M01。

| INDEX／Track 驗收句 | 結果 | 證據（靜態） |
|---------------------|------|----------------|
| 無工具列 `default_popup`；`sidePanel`；點圖示依 `shell` 開視窗或側欄 | 靜態通過；手驗未做 | `wallet/manifest.config.ts` 無 `default_popup`，有 `permissions: ["sidePanel"]` 與 `side_panel.default_path`；`wallet-shell.ts` 的 `applyToolbarForShell`、`action.onClicked` 僅 `shell === "window"` 時 `focusOrCreateWalletWindow` |
| `settings.shell` 缺欄→`"window"`；不新 storage key | 通過 | `storage-keys.ts` `DEFAULT_SETTINGS.shell`、`normalizeShellMode`；`storage-io.ts` `normalizeSettings` |
| 舊 settings 無 `shell` 讀出 `"window"` | 通過 | 同上；合併時 `normalizeShellMode(raw?.shell)` |
| SW 啟動不 `windows.create`／不聚焦；`sidebar` 時 SW 醒來不開／不聚焦錢包視窗 | 通過 | `initWalletShellOnStartup` 只 `applyToolbarForShell` 與 `rememberWalletWindowsFromDisk`（不聚焦）；`sidebar` 分支清空 `walletWindowId` |
| 錢包視窗 viewport 360×600 校正一次；既有窗聚焦不校正 | 通過 | `shell.fitWalletWindow` + `walletWindowAwaitingFit`；`popup/main.tsx` 載入後送 `clientWidth`／`clientHeight` |
| Home 頂欄、鎖定左側切殼鈕；子頁／鎖定／審批無 | 通過 | `PopupMarkup.tsx` 切殼鈕在 `bar-home`（`hidden={!home}`）內、鎖定鈕右側；`send-approval` 等非 `isHomeView` 走 `bar-subpage` |
| 切到側欄：`sidePanel.open` 在點擊路徑、成功後才 `patchSettings` 與關視窗 | 靜態通過；手驗未做 | `shell-switch.ts`：同步讀 `getLastNormalWindowId()` → `chrome.sidePanel.open` → 成功後 `storage.patchSettings` → `window.close()` |
| 切到視窗：先開窗成功再 patch、關側欄 | 靜態通過；手驗未做 | `switchToWindow`：`shell.focusOrCreateWalletWindow` → `patchSettings` → `setOptions` disable／enable |
| 殼寬 100%；無 422px 置中欄；`--popup-w` 定義未改 | 通過 | `style.css` 保留 `--popup-w: 422px`；`.wallet-shell-surface` 覆寫 `width/height: 100%`；`popup/main.tsx`、`sidepanel/main.tsx` 加 class |
| 審批 popout 仍 420×640 | 通過 | `open-popout.ts` 未改尺寸 |
| 網站請求仍 `uiHost: "popout"` + `openPopout` | 通過 | `dapp-handlers.ts` 抽樣仍 `openPopout` |
| `beginSend` 寫 `"window"`／`"sidebar"`，不寫 `"popup"` | 通過 | `send-command.ts` `uiHostFromSender` |
| 殼內審批 host 跟文件路徑 | 通過 | `ApprovalHost.tsx` `inShellHostFromPage()` |
| payload 僅 `shell` 時不 `notifyAccountChanged` | 通過 | `settings-command.ts` `shellOnly` |
| 三語 `shell.toSidebar`／`shell.toWindow` | 通過 | `gen-ui-messages.mjs`、`ui-messages.ts` |
| `design-principles` 第 1 節 | 通過 | 主表面改為錢包視窗 360×600／側欄 100% |
| `cd wallet && npm run typecheck` 與 `npm run build` | 通過 | 本輪 exit code 0（見下表） |
| 版本號檔對齊 `0.25.0` | 部分 | 見 025-L01、025-L02 |
| 出貨後清 backlog `sidebar-mode` | 未做 | 預期 `shipped` 後；`sidebar-mode.md` 已標排進 0.25.0 |

### 契約抽樣（架構禁區）

| 檢查項 | 結果 |
|--------|------|
| Pending 仍只在 SW；UI 未從 storage hydrate 找請求 | 通過（本版 diff 未改 pending 主模型） |
| `shell.*`／`storage.patchSettings` 僅 extension page 可呼叫 | 通過（`background/index.ts` `isExtensionPage`） |
| 錢包視窗未走 `openPopout`／`bindPopoutWindow` | 通過（`wallet-shell.ts` 註解與實作分離） |
| `lastNormalWindowId` 僅 SW 記憶體 + `runtime.sendMessage` 推給殼 | 通過（`shell-bridge.ts`；非 content 廣播） |
| 未新增 npm 依賴 | 通過（`package.json` 僅 version bump） |
| 未改 `../solibra-wallet` | 通過 |
| 單一 `send-command.ts` 路徑改 `uiHost` | 通過（`wallet/src/background/wallet/commands/send-command.ts` 存在；無舊路徑並存） |

### 測試結果

工作目錄 `wallet/`。**尚無整包測試指令**；未假設 `bun test`。

| 指令 | exit code |
|------|-----------|
| `npm run typecheck` | 0 |
| `npm run build` | 0 |
| 未封裝擴充手驗（INDEX Track 1–3） | **未執行**（見 025-M01） |

### 修復追蹤

| ID | 狀態 | 追蹤 |
|----|------|------|
| 025-M01 | 開 | 本機載入 `wallet/dist` 走完 INDEX 手驗後可關閉 |
| 025-L01 | 開 | 出貨前將 `version.md` 改為 `0.25.0` |
| 025-L02 | 開 | 出貨時寫 changelog |
| 025-L03 | 開、非阻擋 | 提交策略由使用者決定 |

## 歷審摘要

| 輪 | 日期 | 結論 |
|----|------|------|
| 1 | 2026-10-09 | 靜態對齊 INDEX／HOW；typecheck／build 通過；無 HIGH；手驗與 `version.md` 待出貨前 |
