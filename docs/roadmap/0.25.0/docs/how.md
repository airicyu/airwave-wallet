# HOW — 0.25.0 錢包視窗與側欄

INDEX 衝突以 INDEX 為準。審批批准、廣播、`broadcastSig`、確認中時序仍以 [0.13.0](../../0.13.0/docs/approval-host-how.md) 與 [0.17.0](../../0.17.0/INDEX.md) 為準。本檔只寫 **殼怎麼開、怎麼關、寬度怎麼量**。

## 詞

| 詞 | 意思 |
|----|------|
| 錢包視窗 | `settings.shell === "window"` 那扇。`chrome.windows` 的 `type: "popup"`。載入錢包 Home |
| 側欄 | `settings.shell === "sidebar"`。Chrome Side Panel |
| 審批 popout | 網站請求的那扇。仍走 `openPopout(requestId)`。與錢包視窗不是同一扇 |

禁止把錢包視窗的 `windowId` 交進 `bindPopoutWindow`。

## `settings.shell`

- 型別 `"window" | "sidebar"`。
- `normalizeSettings`：值不是這兩個字串 → `"window"`。
- 只在切換 **成功** 之後 `patchSettings({ shell })`。
- SW 啟動（`onInstalled`、`onStartup`、service worker 醒來）讀一次並套用下面的工具列行為。

## Manifest

- `permissions` 增加 `"sidePanel"`。
- 錢包視窗沿用 `wallet/src/popup/index.html`（0.24.0 禁止搬移這支）。側欄新建 `wallet/src/sidepanel/index.html`，掛同一支 React 入口。
- `side_panel.default_path` 與 vite `rollupOptions.input` 都是 `src/sidepanel/index.html`。
- `action` **沒有** `default_popup`。
- 兩條路徑都不是 `src/popout/index.html`。用文件路徑區分目前是哪一面（按鈕文案與切換方向看路徑，不看可能還沒寫入的 `settings.shell`）。

vite input 要含側欄 HTML。crx 的 manifest 路徑與打包後路徑必須是同一支檔。

## 工具列

一律先 `chrome.action.setPopup({ popup: "" })`。SW 啟動（含閒置後醒來）以及每次寫入 `shell` 之後，只依 `shell` 套用 `setPanelBehavior` 與 `setPopup({ popup: "" })`。啟動 **不** `windows.create`，也 **不** `windows.update` 去聚焦。

錢包視窗 id 只放 SW 記憶體，不寫 `chrome.storage`。`windows.onRemoved` 清掉這個 id。禁止把審批 popout 的 `windowId` 交進這份記憶體或 `bindPopoutWindow`。

用網址找回只在 `shell === "window"` 且 `action.onClicked` 時進行：記憶體沒有 id，或 `windows.get` 失敗，先 `chrome.windows.getAll`，只接受網址為 `src/popup/index.html` 的那扇。不是 `src/popout/index.html`，也不用 `type: "popup"` 單獨判斷。找到則聚焦、記回記憶體、不校正大小。沒有才 `windows.create`，並只對這一輪新建做一次 viewport 校正。

SW 啟動且 `shell === "window"` 時，可以用同一套 `getAll` 把仍開著的錢包視窗 id 記回記憶體。找到不聚焦、不校正；沒有不 `windows.create`。

`shell === "sidebar"` 的啟動與點擊都不 `windows.create`、不聚焦錢包視窗。

| `shell` | 行為 |
|---------|------|
| `"sidebar"` | `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`。點圖示由 Chrome 開側欄 |
| `"window"` | `setPanelBehavior({ openPanelOnActionClick: false })`。只有 `chrome.action.onClicked` 走上一節的找回或新建 |

## 最後一個一般瀏覽器視窗

`sidePanel.open` 的 `windowId` 必須是 `windowTypes: ["normal"]` 的瀏覽器視窗，不能是錢包視窗自己，也不能是審批 popout。

SW 維護記憶體裡的 `lastNormalWindowId`，不寫 storage：

- 啟動時 `chrome.windows.getAll`：聚焦中的 normal 視窗優先，否則任一仍在的 normal。沒有就空。
- `chrome.windows.onFocusChanged`：聚焦到的視窗型別是 `normal` 時更新。
- `windows.onRemoved` 命中這個 id：改指另一扇仍在的 normal，沒有就清空。

擴充頁載入時問一次 SW，之後 SW 有變就推給已開的錢包殼（錢包視窗與側欄），頁面放在模組變數。推送只給這兩種擴充頁，禁止對網頁 content script 或全部 tab 廣播。

點 Home 按鈕時 **讀這個變數**，禁止在 `sidePanel.open` 之前 `await chrome.windows.getAll`。沒有 id（含 SW 剛醒、查詢還沒回到頁面）：按鈕點下去直接 return。不寫 `shell`，不關視窗。

## 切到側欄（必須保住使用者手勢）

`chrome.sidePanel.open` 只能在使用者點擊的同步呼叫裡發出。先 `await` 訊息或 storage，手勢會掉，Chrome 會拒開。

Home 按鈕的 click handler 形狀：

1. 讀已經在手的 `lastNormalWindowId`。沒有就 return。
2. **同步** 呼叫 `chrome.sidePanel.open({ windowId })`（不要先 await 別的東西）。
3. 在它的 Promise 成功之後才：`patchSettings({ shell: "sidebar" })`、把工具列設成側欄模式、`window.close()` 關掉錢包視窗。
4. Promise 失敗：停在視窗模式。

## 切到視窗

在側欄頁的 click handler：

1. 請 SW 聚焦既有錢包視窗，或新建一扇並校正 viewport（下一節）。
2. 成功後才 `patchSettings({ shell: "window" })`、工具列改回視窗模式。
3. 關掉側欄：`chrome.sidePanel.setOptions({ enabled: false })`，接著 `setOptions({ enabled: true, path })`，`path` 與 manifest `default_path` 相同。不要省略第二步，否則下次開不了。
4. 第 1 步失敗：不要 disable 側欄，不要寫 `shell`。

## 錢包視窗 viewport

目標是 **內容區** 360×600，不是 `windows.create` 的外框數字。SW 讀不到該頁 DOM。

1. `windows.create({ type: "popup", focused: true, url })` 的 `url` 是 `src/popup/index.html`。用一個起點寬高即可。把這個新 id 標成「尚未校正」。
2. 該頁 load 後量 `documentElement.clientWidth`／`clientHeight`，送擴充命令 `shell.fitWalletWindow`。payload 只有 `{ clientWidth: number, clientHeight: number }`。不帶 windowId；SW 用 `sender.tab.windowId`。
3. SW 只接受錢包視窗那支 HTML。只對「這一輪新建、尚未校正」的 id 做一次 `windows.update`：外框寬加上 `360 - clientWidth`，外框高加上 `600 - clientHeight`，然後清掉「尚未校正」。已存在的視窗、第二次送來的同一 id、審批 popout，都忽略。
4. 找到既有錢包視窗時只聚焦，不校正。使用者拉寬之後保持。

命令字串 `shell.fitWalletWindow` 加進 `AirwaveCommand`，只在 SW 處理，不是 Wallet Standard 方法。審批 `openPopout` 仍是 `width: 420`、`height: 640`。不要共用這組校正。

## 側欄版面

側欄與錢包視窗的 `html`／`body`／頁根：`width: 100%`、`height: 100%`、`max-height: none`。不要套 `--popup-w: 422px` 的固定框。

頁殼規則仍在：直欄 flex、頂欄與殼底 `flex-shrink: 0`、中間 `flex: 1; min-height: 0; overflow: auto`。列保持單行 ellipsis。

審批 popout 用 `wallet/src/popout/style.css`，該檔沒有 `--popup-w`。不要改 `popup/style.css` 裡 `--popup-w` 的定義，避免錢包殼的固定框和覆寫打架。兩套入口若共用 `popup/style.css`，用殼根 class 覆寫寬高。`PopupMarkup.tsx` 與 `popup/style.css` 本版不拆檔。

## `uiHost`

| 發起 | 寫入 |
|------|------|
| 網站 connect／signMessage／signTransaction／signAndSendTransaction | `"popout"`，然後 `openPopout` |
| `wallet.beginSend` 從 `src/popup/index.html` | `"window"`，禁止 `openPopout` |
| `wallet.beginSend` 從 `src/sidepanel/index.html` | `"sidebar"`，禁止 `openPopout` |

不讀 `settings.shell` 來決定這欄。只改 `commands/send-command.ts`。

`"window"` 與 `"sidebar"` 就是 0.13.0 的殼內宿主（當時字面是 `"popup"`）：abort 結束該筆錢包送出、禁止 `closePopout`、成功留在該殼回 Home、拒絕留在送出填寫。記憶體若讀到 `"popup"`，走同一條，禁止 `windows.remove`。失焦不呼叫 `ui.abortPending`。

殼內審批模組的 host 用當下文件那一面。收回租金本來就沒有 pending host，仍是殼內換 view。

## 只有 `shell` 的 patch

`handlePatchSettings`：payload 的自有鍵正好是 `shell` 一個時，`writeSettings` 之後不要 `notifyAccountChanged`。其他 patch 維持現況。
