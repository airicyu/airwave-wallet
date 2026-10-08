# Design review — 0.25.0 Airwave Wallet

最新結論在下方「第 3 輪複審」。先前輪次題旨保留在後段，狀態以第 3 輪修復追蹤表為準。

## 第 3 輪複審

- 日期：2026-10-09（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；HANDOFF：**尚無**（INDEX 寫明實作前再寫。缺檔不另立 HIGH）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：複核 `--popup-w` 所在檔與 `openPopout` 的 420×640。現碼未做本版 ≠ 設計 HIGH
- **總評：** **無未關閉 HIGH。契約層審查門檻通過（不含 HANDOFF）。** 提案可行，不是整份不可行。H2 殘餘與 L4 已寫進 INDEX／HOW／reasoning，語意閉合。H1、M1–M5、L1–L3 本輪改文沒有再拆開，維持關閉。HANDOFF 仍無，不另立 HIGH；技能上的開工清單仍要等 HANDOFF

## Findings（第 3 輪）

關閉＝已寫進 INDEX／HOW／reasoning，語意開得上實作，且不與已定案自相矛盾。仍開＝契約仍分叉。非阻擋＝記錄即可。

### HIGH

#### H1 — 殼內 `uiHost` 仍綁死 `"popup"`，與新寫入值分叉 — **關閉**

本輪「工具列」與「審批 popout 尺寸」的改文沒有動到殼內宿主。INDEX「錢包內審批」與 HOW「`uiHost`」仍是：依發起頁寫 `"window"` 或 `"sidebar"`、不再寫入 `"popup"`、讀到 `"popup"` 走殼內路徑、失焦不另做 abort。維持關閉。

#### H2 — 工具列聚焦只靠 SW 記憶體，醒來會再開一扇 — **關閉**

第 2 輪的兩種讀法已刪掉讀法 1。現在三份檔指同一條：

- INDEX「工具列」：SW 啟動只套用 `setPanelBehavior` 與 `setPopup`，不聚焦、不 `windows.create`。只有 `shell === "window"` 且 `action.onClicked` 才依 HOW 找回或新建。`sidebar` 的啟動與點擊都不碰錢包視窗。
- HOW「工具列」：網址找回（找到則聚焦、不校正；沒有才 `windows.create` 並做一次 viewport 校正）只在 `shell === "window"` 且 `action.onClicked`。SW 啟動不建立、不聚焦；`window` 時可以用 `getAll` 把仍開著的 id 記回記憶體，找到不聚焦、不校正，沒有不建立。`sidebar` 的啟動與點擊都不建立、不聚焦。
- reasoning「為何用網址找回錢包視窗」：點圖示時才用 `src/popup/index.html` 找回並聚焦、不重做校正；SW 醒來只記 id，不聚焦、不新建；側欄模式不碰這扇窗。

Track 1 驗收已含「關掉 service worker 再點仍聚焦該扇」與「關掉 service worker 但不要點圖示，不得自己冒出錢包視窗」，以及 `sidebar` 時 SW 醒來不得開或聚焦。啟動記 id 的「可以」只是記帳，不恢復「一醒就新建並聚焦」。`切到視窗` 仍是側欄 Home 的另一條點擊（聚焦既有或新建），與「人沒點圖示不得冒出」不衝突。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | 本輪未改「最後一個一般瀏覽器視窗」。播種、`onRemoved`、頁面只讀已在手的 id、查詢未回就 return，仍在 HOW。與 INDEX「切到側欄」一致 |
| M2 | **關閉** | 本輪未改校正執行者。HOW「錢包視窗 viewport」仍是 `shell.fitWalletWindow`、只校正這一輪新建、找到既有只聚焦。INDEX「寬度」的「聚焦時不要再強制縮回」同向 |
| M3 | **關閉** | 本輪未改。payload 只有 `shell` 時不 `notifyAccountChanged`，INDEX「寫入」、HOW「只有 `shell` 的 patch」、reasoning 仍一致 |
| M4 | **關閉** | 本輪未改。載入不因舊 `shell` 自關；並存不是切換失敗；`beginSend` 跟文件路徑。reasoning 同向 |
| M5 | **關閉** | 本輪未改。`PopupMarkup.tsx` 與 `popup/style.css` 本版不拆，只加切殼鈕與殼根 class |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | 本輪未改。錢包視窗沿用 `popup/index.html`，側欄新建 `sidepanel/index.html`，兩條都不是 popout |
| L2 | **關閉** | HOW「側欄版面」仍是不改 `popup/style.css` 裡 `--popup-w` 的定義，並寫明 `popout/style.css` 沒有這個變數 |
| L3 | **關閉** | 出貨 checklist 仍是「在切換成功後寫入 `shell`」 |
| L4 | **關閉** | INDEX「審批 popout 尺寸」已改成：尺寸仍是 `openPopout` 的 `width: 420`、`height: 640`；`--popup-w` 只在 `wallet/src/popup/style.css`，本版不改它的定義。與 HOW「側欄版面」及現碼一致 |

## 驗收對照（第 3 輪）

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 無工具列 popup。點圖示依 `settings.shell` 開錢包視窗或側欄 | 可測 | 無。H2 已把新建／聚焦限定在 `window` 的點擊 |
| Home 頂欄、鎖定左側有切殼圖示；子頁、鎖定、審批沒有 | 可測 | 無 |
| 視窗 → 側欄、側欄 → 視窗都會關掉另一面，並在切換成功後寫入 `shell` | 可測 | 無 |
| 切換失敗不寫入、不關掉目前這一面 | 可測 | 無 |
| 錢包視窗初次 viewport 為 360×600；側欄寬度 100% 跟面板，無 422px 置中欄 | 手驗可量 | 無 |
| 使用者拉寬側欄或視窗後，下次聚焦不強制縮回 360 | 可測 | 無。找到則不校正；SW 啟動不新建 |
| 網站簽名仍是審批 popout；錢包送出與收回租金留在當下殼 | 可測 | 無 |
| `uiHost` 不再寫入 `"popup"` | 讀碼可測 | 無 |
| 解鎖規則不變 | 可測 | 無 |
| 三語 catalog 有 `shell.toSidebar`、`shell.toWindow` | 可測 | 無 |
| `cd wallet && npm run typecheck` 與 `npm run build` 通過 | 可跑 | 無整包測試指令，與 GUIDELINES 一致 |
| 未封裝擴充走完 Track 2、Track 3 手驗 | 可測 | 無。Track 1 另有「SW 醒來但人沒點圖示時不開窗」與側欄模式不開窗 |
| design-principles 第 1 節已改成錢包視窗／側欄 | 讀檔可測 | 現文仍是工具列 popup；本版已指定出貨時改 |
| 文件與程式無真實密碼／助記詞／私鑰 | 可測 | 本版契約無秘密欄。審查未見違規 |
| 版本號檔對齊 `0.25.0`；狀態 `shipped` 須使用者同意 | 可測 | 無 |
| 出貨後刪 backlog 的 sidebar 列與 `sidebar-mode.md` | 可測 | 無 |

## 與現碼抽樣（第 3 輪）

現碼未做本版 ≠ 設計 HIGH。本輪只複核 L4 與審批尺寸。未把 `docs/brainstorm/` 或 `../solibra-wallet` 當已定案。

| 錨點 | 抽樣 |
|------|------|
| `wallet/src/popup/style.css` | 仍有 `--popup-w: 422px`。與 INDEX、HOW「不改這個定義」一致，是待做的殼根覆寫範圍 |
| `wallet/src/popout/style.css` | 無 `--popup-w`。與 INDEX、HOW 一致 |
| `wallet/src/background/messaging/open-popout.ts` | `width: 420`、`height: 640`。與「審批尺寸不改」一致 |

架構禁區抽查（契約文字，非實作完成度）：pending 仍約定在 SW；切殼推送明文禁止對網頁 content script 與全部 tab 廣播；`shell` 進既有 `airwave.settings.v1`；沒有硬編碼密碼或新的明文密碼欄；`shell.fitWalletWindow` 只在 SW 處理，不是 Wallet Standard 方法。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX「錢包內審批」；HOW「`uiHost`」 |
| H2 | HIGH | 關閉 | INDEX「工具列」；HOW「工具列」；reasoning「為何用網址找回錢包視窗」；Track 1 驗收的 SW 醒來不開窗 |
| M1 | MEDIUM | 關閉 | HOW「最後一個一般瀏覽器視窗」 |
| M2 | MEDIUM | 關閉 | HOW「錢包視窗 viewport」 |
| M3 | MEDIUM | 關閉 | INDEX「寫入」；HOW「只有 `shell` 的 patch」；reasoning「為何切殼不發帳戶變更」 |
| M4 | MEDIUM | 關閉 | INDEX「同時只留一面」；reasoning「為何並存時 uiHost 看文件路徑」 |
| M5 | MEDIUM | 關閉 | INDEX「不拆的大檔」；HOW「側欄版面」 |
| L1 | LOW | 關閉 | HOW「Manifest」；INDEX 錨點 `popup/index.html`、`sidepanel/index.html` |
| L2 | LOW | 關閉 | HOW「側欄版面」 |
| L3 | LOW | 關閉 | INDEX 出貨 checklist「切換成功後寫入」 |
| L4 | LOW | 關閉 | INDEX「審批 popout 尺寸」；HOW「側欄版面」 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-09 | 有未關閉 HIGH（H1、H2）。門檻未過，不可開工。提案可行。HANDOFF 尚無 |
| 第 2 輪複審 | 2026-10-09 | H1 與 M1–M5、L1–L3 關閉。H2 殘餘仍開。L4 新開、非阻擋。門檻未過，不可開工。提案可行。HANDOFF 仍無，不另立 HIGH |
| 第 3 輪複審 | 2026-10-09 | H2 與 L4 關閉。無未關閉 HIGH，無仍開 MEDIUM。契約層門檻通過（不含 HANDOFF）。提案可行。HANDOFF 仍無，不另立 HIGH |

---

## 第 2 輪複審

- 日期：2026-10-09（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；HANDOFF：**尚無**（INDEX 寫明實作前再寫。缺檔不另立 HIGH）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：複核 `--popup-w` 所在檔與 `openPopout` 尺寸；其餘沿用初審錨點。現碼未做本版 ≠ 設計 HIGH
- **總評：** **有未關閉 HIGH（H2 殘餘）。審查門檻未過，不可開工。** 提案可行，不是整份不可行。初審 H1、M1–M5、L1–L3 已寫進 INDEX／HOW／reasoning，語意閉合，本輪關閉。H2 的「用網址找回、找到不校正」已寫上，但同一段把「沒有才新建、有則聚焦」套到 service worker 啟動，與側欄表格及「點圖示才開」仍分叉。另有 L4（LOW，非阻擋）。契約層未過是因為 H2，不是因為缺 HANDOFF。契約洞尚未全關；實作前仍須補 HANDOFF

## Findings（第 2 輪）

關閉＝已寫進 INDEX／HOW／reasoning，語意開得上實作，且不與已定案自相矛盾。仍開＝契約仍分叉。非阻擋＝記錄即可。

### HIGH

#### H1 — 殼內 `uiHost` 仍綁死 `"popup"`，與新寫入值分叉 — **關閉**

INDEX「錢包內審批」已把殼內宿主寫成 `uiHost === "window"` 或 `"sidebar"`，並沿用 0.13.0 對 `"popup"` 的離開規則：`ui.abortPending`、禁止 `closePopout`、成功留在當下殼回 Home、拒絕留在送出填寫、不再寫入 `"popup"`、記憶體讀到 `"popup"` 仍走殼內路徑、失焦禁止另做 abort。HOW「`uiHost`」用文件路徑決定寫入值，不讀 `settings.shell`。與「批准、廣播、`broadcastSig`、確認中時序不改」無衝突。

#### H2 — 工具列聚焦只靠 SW 記憶體，醒來會再開一扇 — **仍開**

已寫進、且足以蓋住初審主缺陷的部分：HOW「工具列」規定 id 只在 SW 記憶體；記憶體沒有 id 或 `windows.get` 失敗時先 `getAll`，只認 `src/popup/index.html`，排除 `src/popout/index.html`，不用 `type: "popup"` 單獨判斷；找到則記回記憶體且不校正；`onRemoved` 清 id；禁止把審批 `windowId` 交進這份記憶體或 `bindPopoutWindow`。INDEX「工具列」禁止記憶體沒有 id 就直接 `windows.create`。Track 1 驗收要求關掉 service worker 再點一次仍聚焦該扇。reasoning「為何用網址找回錢包視窗」說明為何不能只靠記憶體。視窗還開著時不會再無條件開第二扇，這一段可以實作。

仍分叉的是同一段的後句：「`action.onClicked` 以及 SW 啟動套用工具列行為時……有則聚焦……沒有才 `windows.create`」。它沒有限定 `shell === "window"`，也沒有把「人點了圖示」和「SW 自己醒來」拆開。同節表格寫 `sidebar` 的 `onClicked` 不要 `windows.create`，`window` 的 `onClicked` 才走上一節。產品句是點工具列圖示才打開上次那一面。

兩種讀法都不能從檔案裡刪掉另一種：

1. SW 一醒，視窗模式找不到就新建並聚焦；側欄模式也照第一段新建或聚焦。人沒點圖示也會冒出錢包視窗，並和側欄表格衝突。
2. 只有 `shell === "window"` 且 `onClicked` 才在找不到時新建；SW 啟動只把仍開著的那扇 id 記回記憶體，不聚焦、不新建；側欄的啟動與點擊都不碰錢包視窗。

Track 1 的「關掉 SW 再點」測得到讀法 2 的點擊路徑，測不到 SW 啟動就新建。實作仍會猜，故 H2 不關閉。

建議改寫 HOW「工具列」那一段（INDEX 工具列條改成指向這段），擇定讀法 2：

> 用網址找回只在 `shell === "window"` 且 `action.onClicked` 時，才可以在找不到 `src/popup/index.html` 時 `windows.create` 並做一次 viewport 校正。找到則聚焦、記回記憶體、不校正。SW 啟動（含閒置後醒來）只依 `shell` 套用 `setPanelBehavior` 與 `setPopup({ popup: "" })`；`shell === "window"` 時用 `getAll` 把仍開著的錢包視窗 id 記回記憶體，找到不聚焦、不校正，沒有不 `windows.create`。`shell === "sidebar"` 的啟動與點擊都不 `windows.create`、不聚焦錢包視窗。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | HOW「最後一個一般瀏覽器視窗」已寫：啟動 `getAll`（聚焦中的 normal 優先，否則任一仍在的 normal）、`onFocusChanged`、`onRemoved` 改指或清空、頁面只讀已在手的變數、查詢未回就 return 且不寫 `shell`、不關視窗、推送只給已開的錢包視窗與側欄。INDEX「切到側欄」的失敗句與此一致 |
| M2 | **關閉** | HOW「錢包視窗 viewport」已寫執行者：頁面 load 後送 `shell.fitWalletWindow`，payload 只有 `clientWidth`／`clientHeight`，SW 用 `sender.tab.windowId`，只對這一輪新建且尚未校正的 id `windows.update` 一次。這和初審建議稿的「payload 自帶 windowId」不同，但是完整決定，不是殘餘分叉。已存在的視窗只聚焦。不共用 `openPopout` 的 420×640 |
| M3 | **關閉** | INDEX「寫入」、HOW「只有 `shell` 的 patch」、reasoning「為何切殼不發帳戶變更」一致：payload 自有鍵正好是 `shell` 時，`writeSettings` 之後不 `notifyAccountChanged`。其他 patch 維持現況 |
| M4 | **關閉** | 已擇一，不是「載入時強制只留一面」。INDEX「同時只留一面」寫明：切換成功才關另一面；載入時不因舊 `shell` 自關；Chrome 側欄選單造成的並存不是切換失敗；`beginSend` 的 `uiHost` 跟發起頁文件路徑。reasoning「為何並存時 uiHost 看文件路徑」同向。Home 按鈕成功路徑仍關另一面 |
| M5 | **關閉** | INDEX「不拆的大檔」與 HOW「側欄版面」：`PopupMarkup.tsx` 與 `popup/style.css` 本版不拆，只加切殼鈕與殼根 class |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | HOW「Manifest」：錢包視窗沿用 `wallet/src/popup/index.html`；側欄新建 `wallet/src/sidepanel/index.html`；`default_path` 與 vite input 都是 `src/sidepanel/index.html`；兩條都不是 `popout/index.html`。INDEX 錨點有這兩支 HTML |
| L2 | **關閉** | HOW「側欄版面」已改理由：不要改 `popup/style.css` 裡 `--popup-w` 的定義，避免固定框和覆寫打架，並寫明 `popout/style.css` 沒有這個變數。INDEX 另有一句把變數安錯檔，見 L4，不把 L2 重開 |
| L3 | **關閉** | INDEX 出貨 checklist 已改成「在切換成功後寫入 `shell`」，與 HOW「成功之後才 patch」一致 |
| L4 | **仍開**／非阻擋 | INDEX「審批 popout 尺寸」寫「popout CSS 的 `--popup-w: 422px`」。HOW「側欄版面」寫 `wallet/src/popout/style.css` 沒有 `--popup-w`。現碼該變數只在 `wallet/src/popup/style.css`；`open-popout.ts` 的外框仍是 420×640。尺寸決定（不改審批窗）兩份一致，變數所在檔不一致。建議 INDEX 改成：審批尺寸仍是 `openPopout` 的 420×640；`--popup-w` 只在 `popup/style.css`，本版不改它的定義 |

## 驗收對照（第 2 輪）

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 無工具列 popup。點圖示依 `settings.shell` 開錢包視窗或側欄 | 手驗可測點擊主路徑 | H2：SW 啟動「沒有才新建／有則聚焦」未限定模式，側欄與未點擊時不可測成單一路徑 |
| Home 頂欄、鎖定左側有切殼圖示；子頁、鎖定、審批沒有 | 可測 | 無 |
| 視窗 → 側欄、側欄 → 視窗都會關掉另一面，並在切換成功後寫入 `shell` | 可測 | 無。L3 已對上 HOW |
| 切換失敗不寫入、不關掉目前這一面 | 可測 | 無。M1 的空 id return 已寫 |
| 錢包視窗初次 viewport 為 360×600；側欄寬度 100% 跟面板，無 422px 置中欄 | 手驗可量 | 無。M2 的命令與一次校正已寫 |
| 使用者拉寬側欄或視窗後，下次聚焦不強制縮回 360 | 可測 | 點擊找回「找到則不校正」已寫。H2 若被讀成 SW 啟動就新建，會另開一扇而不是聚焦拉寬後的那扇 |
| 網站簽名仍是審批 popout；錢包送出與收回租金留在當下殼 | 可測 | 無。H1 已關 |
| `uiHost` 不再寫入 `"popup"` | 讀碼可測 | 無。讀到舊值走殼內路徑已寫 |
| 解鎖規則不變 | 可測 | 無 |
| 三語 catalog 有 `shell.toSidebar`、`shell.toWindow` | 可測 | 無 |
| `cd wallet && npm run typecheck` 與 `npm run build` 通過 | 可跑 | 無整包測試指令，與 GUIDELINES 一致 |
| 未封裝擴充走完 Track 2、Track 3 手驗 | 可測 | Track 1 已含「關掉 SW 再點仍聚焦」。尚未要求手驗「SW 醒來但人沒點圖示時不開窗」；H2 關閉後再補這一步 |
| design-principles 第 1 節已改成錢包視窗／側欄 | 讀檔可測 | 現文仍是工具列 popup；本版已指定出貨時改 |
| 文件與程式無真實密碼／助記詞／私鑰 | 可測 | 本版契約無秘密欄。審查未見違規 |
| 版本號檔對齊 `0.25.0`；狀態 `shipped` 須使用者同意 | 可測 | 無 |
| 出貨後刪 backlog 的 sidebar 列與 `sidebar-mode.md` | 可測 | 無 |

## 與現碼抽樣（第 2 輪）

現碼未做本版 ≠ 設計 HIGH。本輪只複核與 L4、審批尺寸有關的錨點。未把 `docs/brainstorm/` 或 `../solibra-wallet` 當已定案。

| 錨點 | 抽樣 |
|------|------|
| `wallet/src/popup/style.css` | 仍有 `--popup-w: 422px`。與 HOW「不改這個定義」一致，是待做的覆寫範圍 |
| `wallet/src/popout/style.css` | 無 `--popup-w`，也無 420／422／640。與 HOW 一致，與 INDEX「popout CSS 的 `--popup-w: 422px`」不一致（L4） |
| `wallet/src/background/messaging/open-popout.ts` | `width: 420`、`height: 640`。與「審批尺寸不改」一致 |

架構禁區抽查（契約文字，非實作完成度）：pending 仍約定在 SW；切殼推送明文禁止對網頁 content script 與全部 tab 廣播；`shell` 進既有 `airwave.settings.v1`，不新開 storage key；沒有硬編碼密碼或新的明文密碼欄；沒有新的 Wallet Standard 方法。`shell.fitWalletWindow` 寫明只在 SW 處理。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX「錢包內審批」；HOW「`uiHost`」 |
| H2 | HIGH | 仍開 | 找回與不校正已在 HOW「工具列」、INDEX「工具列」、reasoning「為何用網址找回錢包視窗」。殘餘：同一段未把新建／聚焦限定在 `window` 的 `onClicked` |
| M1 | MEDIUM | 關閉 | HOW「最後一個一般瀏覽器視窗」 |
| M2 | MEDIUM | 關閉 | HOW「錢包視窗 viewport」 |
| M3 | MEDIUM | 關閉 | INDEX「寫入」；HOW「只有 `shell` 的 patch」；reasoning「為何切殼不發帳戶變更」 |
| M4 | MEDIUM | 關閉 | INDEX「同時只留一面」；reasoning「為何並存時 uiHost 看文件路徑」 |
| M5 | MEDIUM | 關閉 | INDEX「不拆的大檔」；HOW「側欄版面」 |
| L1 | LOW | 關閉 | HOW「Manifest」；INDEX 錨點 `popup/index.html`、`sidepanel/index.html` |
| L2 | LOW | 關閉 | HOW「側欄版面」 |
| L3 | LOW | 關閉 | INDEX 出貨 checklist「切換成功後寫入」 |
| L4 | LOW | 仍開／非阻擋 | 待改 INDEX「審批 popout 尺寸」對 `--popup-w` 所在檔的那句 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-09 | 有未關閉 HIGH（H1、H2）。門檻未過，不可開工。提案可行。HANDOFF 尚無 |
| 第 2 輪複審 | 2026-10-09 | H1 與 M1–M5、L1–L3 關閉。H2 殘餘仍開。L4 新開、非阻擋。門檻未過，不可開工。提案可行。HANDOFF 仍無，不另立 HIGH |

---

## 初審紀錄（題旨保留）

- 日期：2026-10-09（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；HANDOFF：**尚無**（INDEX 寫明實作前再寫，本輪不建檔）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 上游對照：[0.24.0](../../0.24.0/INDEX.md)（目錄與命令出口；狀態仍 `in progress`）、[0.23.0](../../0.23.0/INDEX.md)（可見 chrome）、[0.13.0](../../0.13.0/INDEX.md) 與 [approval-host-how.md](../../0.13.0/docs/approval-host-how.md)（審批宿主）。[backlog/sidebar-mode.md](../../backlog/sidebar-mode.md) 只是構想，不當本版契約
- 現行程式抽樣：見「與現碼抽樣」。倉庫有程式
- **總評：** **有未關閉 HIGH。審查門檻未過，不可開工。** 提案可行，不是整份不可行。殼模式、拿掉工具列 popup、側欄拉滿、網站請求仍走審批 popout，與架構禁區同向。H1、H2 是契約分叉，寫進 INDEX／HOW 後即可再審。應修 MEDIUM 預設一併寫入，再寫 HANDOFF

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — 殼內 `uiHost` 仍綁死 `"popup"`，與新寫入值分叉 — **仍開**

0.13.0 已定案把殼內規則寫在字面 **`uiHost === "popup"`**：`ui.abortPending` 結束錢包送出、禁止 `closePopout`、成功後在殼內回 Home、關窗／失焦卸載＝拒絕。0.25.0 改為 `wallet.beginSend` 只寫 `"window"` 或 `"sidebar"`，並寫「不改批准／廣播規則」。

兩份都算上游時，實作會猜：要改那些 `=== "popup"` 分支，還是只改寫入、讓殼內路徑永遠對不上。HOW 只說未知 host 不要當成審批 popout 去關窗，沒有把 `"window"`／`"sidebar"` 定義成 0.13.0 的殼內宿主。這是主路徑（殼內送出的拒絕、成功離開）契約分叉，故為 HIGH。

現碼幾乎不讀 `uiHost`（見抽樣）。這不把本項降級：審查對的是已定案，不是「今天碰巧沒讀」。

建議寫進 0.25.0 已定案的完整句子（擇一須寫死）：

> 殼內宿主改為 `uiHost === "window"` 或 `"sidebar"`。這兩個值沿用 0.13.0 對 `"popup"` 的規則：`ui.abortPending` 結束該筆錢包送出、禁止 `closePopout`、成功後在當下殼回 Home（確認中 → 已確認 → `home-token`）、拒絕留在送出填寫。不再寫入 `"popup"`；記憶體若仍讀到 `"popup"`，走同一條殼內路徑，禁止 `windows.remove` 審批 popout。批准、廣播、`broadcastSig`、確認中時序不改。錢包視窗與側欄失焦不卸載，禁止另做 blur → `ui.abortPending`（0.13.0 的失焦拒絕只因工具列 popup 失焦會關掉）。

#### H2 — 工具列聚焦只靠 SW 記憶體，醒來會再開一扇 — **仍開**

INDEX／HOW 規定錢包視窗 id 只活在 service worker 記憶體；沒有 id 或 `windows.get` 失敗就 `windows.create`。驗收要求再點工具列圖示聚焦同一扇、不另開第二扇。

MV3 的 service worker 會在閒置後被回收。現碼沒有 `chrome.runtime.connect` 長連線把 SW 留住。視窗還開著時 SW 已醒成空白記憶體，下一次 `onClicked` 會再建一扇。這與「同時只留一面」和 Track 1 驗收衝突，而且是工具列主路徑，不是少見崩潰。id 不進 `chrome.storage` 這點維持正確，缺的是醒來時依網址找回既有視窗。

建議寫進 HOW（INDEX 已定案加一句指向 HOW）：

> 錢包視窗 id 只放 SW 記憶體，不寫 `chrome.storage`。`action.onClicked` 以及 SW 啟動套用工具列行為時：記憶體沒有 id，或 `windows.get` 失敗，先 `chrome.windows.getAll`，只接受網址為錢包視窗 HTML 的那扇（不是 `src/popout/index.html`，也不用 `type: "popup"` Alone 判斷）。有則聚焦並記回記憶體，且不校正大小。沒有才 `windows.create`，並只對這一輪新建做一次 viewport 校正。`windows.onRemoved` 清掉這個 id。禁止把審批 popout 的 `windowId` 交進這份記憶體或 `bindPopoutWindow`。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **仍開**（應修） | **`lastNormalWindowId` 生命週期不完整。** HOW 禁止在 `sidePanel.open` 之前 `await getAll`，這點對使用者手勢是對的。但沒寫 SW 啟動時先播種，也沒寫該 normal 視窗被 `onRemoved` 時改指另一扇或清空。SW 剛醒、頁面尚未收到 id，或 id 已失效時，Home「改到側欄」會無聲 return，即使當時有一般瀏覽器視窗。建議寫死：啟動時 `getAll`，聚焦中的 normal 視窗優先，否則任一仍在的 normal；`onRemoved` 命中則改指或清空；頁面仍只讀已在手的變數；查詢未回到頁面時點擊 return，不寫 `shell`、不關視窗。推送只給已開的錢包殼（擴充頁），不要對網頁 content script 廣播，不要寫進 storage |
| M2 | **仍開**（應修） | **viewport 校正沒有執行者。** 目標 360×600 是 `documentElement` 的 client 寬高，SW 讀不到該頁 DOM。HOW 寫「建立後讀該頁」但沒有訊息。實作容易把 `windows.create` 的外框數字當成 viewport 交差。建議寫死：該頁 load 後量 client 寬高，送一則擴充訊息給 SW（命令名在 HOW 寫死，例如 `shell.fitWalletWindow`，payload 含 `windowId` 與兩個 client 尺寸）。SW 只對「這一輪新建、尚未校正」的 id `windows.update` 一次。已存在的視窗只聚焦。不要共用 `openPopout` 的 420×640 |
| M3 | **仍開**（應修） | **切殼會通知已連線網站帳戶變了。** 已定案要求經 `storage.patchSettings` 寫 `shell`。現碼 `handlePatchSettings` 在寫入後只要有作用中公鑰就 `notifyAccountChanged`，對該連線的 `tabId` 發 `airwave-bridge-account-changed`。語言切換已走上這條，但切殼更常發生，而且公鑰沒變。建議寫死：patch 的鍵只有 `shell` 時禁止這則帳戶通知。cluster 等既有欄位維持現況。這不是審批結果廣播 |
| M4 | **仍開**（應修） | **非切換路徑可以兩面並存。** `side_panel.default_path` 設下之後，Chrome 自己的側欄選單仍開得了側欄。契約只要求「切換完成後」關掉另一面。並存時 `settings.shell` 可以仍是 `"window"`，而 HOW 要殼內模組的 host 跟文件路徑走。`beginSend` 卻讀 `settings.shell`。pending 上的 `uiHost` 會和人正在看的那一面不一致。建議擇一寫死：偵測到與 `settings.shell` 不符的那一面被打開時關掉它（或立刻改寫 `shell` 並關掉另一面）；若允許並存，則 `beginSend` 的 `uiHost` 跟發起那一面的文件路徑，不跟 `settings.shell`。預設應收成只留一面 |
| M5 | **仍開**（應修） | **超過 400 行的檔本版會碰到，拆不拆沒寫。** `popup/style.css` 與 `PopupMarkup.tsx` 都超過 400 行。0.24.0 把拆分留給碰到它們的版本；AGENTS 要求同一輪 review 要不要拆。本版只需要 Home 一顆鈕和殼根寬高覆寫。建議在已定案寫：這兩個檔本版不拆，只加切殼鈕與殼根 class |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **仍開**／非阻擋 | 錢包視窗與側欄的 HTML 路徑沒寫死。0.24.0 禁止搬移 `wallet/src/popup/index.html`。建議寫：錢包視窗沿用該檔；側欄新建另一支 HTML（同一 React 入口）；manifest `default_path` 與 vite input 用同一相對路徑；兩條路徑都不是 `popout/index.html` |
| L2 | **仍開**／非阻擋 | HOW 說不要改 `--popup-w` 以免連坐審批頁。審批頁用 `wallet/src/popout/style.css`，該檔沒有 `--popup-w`。class 覆寫仍然對；理由那句可改成「不要改 `--popup-w` 的定義，避免錢包殼固定框和覆寫打架」 |
| L3 | **仍開**／非阻擋 | 出貨驗收「立刻寫入 `shell`」和 HOW「`sidePanel.open` 成功之後才寫」用詞不同。語意已是成功後才寫。驗收句改成「切換成功後寫入」即可，避免實作成開窗前先寫 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 無工具列 popup。點圖示依 `settings.shell` 開錢包視窗或側欄 | 手驗可測 | H2：SW 回收後「聚焦同一扇」在契約下不成立 |
| Home 頂欄、鎖定左側有切殼圖示；子頁、鎖定、審批沒有 | 可測 | 無。`isHomeView` 已是 Tokens／Activity |
| 視窗 → 側欄、側欄 → 視窗都會關掉另一面，並立刻寫入 `shell` | 手驗可測主路徑 | L3 用詞；M1 假失敗；M4 非按鈕路徑 |
| 切換失敗不寫入、不關掉目前這一面 | 可測 | 無一般視窗的失敗已寫清 |
| 錢包視窗初次 viewport 為 360×600；側欄寬度 100% 跟面板，無 422px 置中欄 | 手驗可量 | M2 誰量、誰 `windows.update` |
| 使用者拉寬側欄或視窗後，下次聚焦不強制縮回 360 | 可測 | H2 的找回路徑必須寫明「找到則不校正」，否則和本條衝突 |
| 網站簽名仍是審批 popout；錢包送出與收回租金留在當下殼 | 可測 | H1：殼內離開語意未對上新 `uiHost` |
| `uiHost` 不再寫入 `"popup"` | 讀碼可測 | H1：讀取側未定義 |
| 解鎖規則不變 | 可測 | 無。失焦不關窗已寫；blur 不得另當拒絕見 H1 建議句 |
| 三語 catalog 有 `shell.toSidebar`、`shell.toWindow` | 可測 | 無。產生器存在，鍵名與現有 catalog 形狀相容 |
| `cd wallet && npm run typecheck` 與 `npm run build` 通過 | 可跑 | 無整包測試指令，與 GUIDELINES 一致 |
| 未封裝擴充走完 Track 2、Track 3 手驗 | 可測 | 手驗步驟未含 SW 回收後再點圖示（應在關閉 H2 後補進 Track 1） |
| design-principles 第 1 節已改成錢包視窗／側欄 | 讀檔可測 | 現文仍是約 384px 的工具列 popup；本版已指定出貨時改，不構成衝突 |
| 文件與程式無真實密碼／助記詞／私鑰 | 可測 | 本版契約無秘密欄。審查未見違規 |
| 版本號檔對齊 `0.25.0`；狀態 `shipped` 須使用者同意 | 可測 | 無 |
| 出貨後刪 backlog 的 sidebar 列與 `sidebar-mode.md` | 可測 | 無 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下面只標與提案互斥、或提案必須點名才不會改錯的現行行為。未把 `docs/brainstorm/` 或 `../solibra-wallet` 當已定案。

| 錨點 | 抽樣 |
|------|------|
| `wallet/manifest.config.ts` | 有 `action.default_popup: "src/popup/index.html"`，權限只有 `storage`、`tabs`，無 `side_panel`。與本版「拿掉 default_popup、加 sidePanel」是待做，不互斥 |
| `wallet/vite.config.ts` | input 為 `popup`、`popout`。側欄入口尚未加，不互斥 |
| `wallet/src/shared/storage-keys.ts` | `Settings` 無 `shell`。`airwave.settings.v1` 已存在。提案不加新 key，與禁區一致 |
| `wallet/src/background/storage/storage-io.ts` | `normalizeSettings` 重建物件。新欄必須在這裡讀未知值成 `"window"`，否則 `patchSettings` 的展開會把 `shell` 洗掉。提案已點名此檔 |
| `wallet/src/background/wallet/commands/settings-command.ts`（非 INDEX 錨點，M3 依據） | `handlePatchSettings` 合併後一律 `notifyAccountChanged`。與「只改殼」互斥，見 M3 |
| `wallet/src/background/messaging/open-popout.ts` | `type: "popup"`、420×640，並 `bindPopoutWindow`。`windows.onRemoved` 只處理這份綁定。提案不拿它開錢包視窗，與現碼相容；H2 的 `getAll` 必須排除 `popout/index.html` |
| `wallet/src/shared/commands.ts` | `UiHost = "popout" \| "popup"`。pending 型別在記憶體。沒有把 pending 放進 storage 或 Zustand |
| `wallet/src/background/wallet/commands/send-command.ts` | `beginSend` 寫 `uiHost: "popup"`，不呼叫 `openPopout`。工作樹另有 `wallet/src/background/wallet/send-command.ts` 也寫 `"popup"`。0.24.0 契約要刪舊路徑、不留 shim。本版錨點只應改 `commands/send-command.ts`；舊檔若還在，不要兩份同時寫 host |
| `wallet/src/popup/PopupMarkup.tsx` | Home（`isHomeView`）頂欄 `bar-end` 有鎖定鈕。子頁是另一條 `bar-subpage`。鎖定頁在 `showShell` 之前返回。切殼鈕放鎖定左側與現結構相容，現碼無此鈕 ≠ HIGH |
| `wallet/src/popup/style.css` | `--popup-w: 422px`、`--popup-h: 600px`；`html`／`body`／`#root`／`#app` 用這組，且 `max-height: 600px`。側欄若共用又只改變數，會和「拉滿、`max-height: none`」打架。HOW 的 class 覆寫對這份 CSS 是必要的 |
| `wallet/src/popout/style.css` | 獨立樣式，無 `--popup-w`。審批尺寸維持 420×640 與現碼一致 |
| `wallet/scripts/gen-ui-messages.mjs` | 產生器存在，三語 `triple(...)`。尚無 `shell.toSidebar`／`shell.toWindow` |
| `docs/design-principles.md` 第 1 節 | 仍寫主表面是工具列 popup、寬約 384px。0.23.0 產品寬已是 CSS 422px。本版指定出貨時改第 1 節，且寫明不另做概念稿，足以蓋過該檔「先做 design demo」的句子 |
| 審批宿主現碼 | `ApprovalHost` 寫死 `host: "popup"`，成功回呼是 `navigateTo("home-token")`，`pagehide`／`beforeunload` 呼叫 `ui.abortPending`。`finishWalletSendUserAbort` 不看 `uiHost`。`shell.ts` 收下 `host` 但未依它分支。dApp enqueue 為 `"popout"`。收回租金流程沒有 `openPopout`。這些是待改接線，不是與「留在當下殼」互斥；與 0.13.0 **文件**互斥的是 H1 |

架構禁區抽查：pending 仍是 SW `Map`；popout URL 只帶 `requestId`；本版沒有把 pending 寫進持久 store；沒有硬編碼密碼或新的明文密碼欄；沒有新的 Wallet Standard 方法；網站結果路徑未改成全 tab 廣播。`lastNormalWindowId` 用記憶體推給錢包殼，不是審批結果廣播。M1 要求把推送範圍寫死，避免實作成 `tabs` 廣播。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 仍開 | 待寫入 INDEX「錢包內審批」；必要時 HOW「`uiHost`」 |
| H2 | HIGH | 仍開 | 待寫入 HOW「工具列」；INDEX 工具列條加一句 |
| M1 | MEDIUM | 仍開 | 待寫入 HOW「最後一個一般瀏覽器視窗」 |
| M2 | MEDIUM | 仍開 | 待寫入 HOW「錢包視窗 viewport」 |
| M3 | MEDIUM | 仍開 | 待寫入 INDEX「寫入」或 HOW「`settings.shell`」 |
| M4 | MEDIUM | 仍開 | 待寫入 INDEX「同時只留一面」與 `beginSend` 那一列 |
| M5 | MEDIUM | 仍開 | 待寫入 INDEX 已定案或 Track 3「不做」 |
| L1 | LOW | 仍開／非阻擋 | 可寫入 HOW「Manifest」 |
| L2 | LOW | 仍開／非阻擋 | 可改 HOW「側欄版面」一句 |
| L3 | LOW | 仍開／非阻擋 | 可改 INDEX 出貨 checklist 用詞 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-09 | 有未關閉 HIGH（H1、H2）。門檻未過，不可開工。提案可行。HANDOFF 尚無 |
