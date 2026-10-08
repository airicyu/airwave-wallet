# WHY — 0.25.0

## 為何是視窗 ↔ 側欄，不是 Settings 開關

Backpack 的切換在 Home，按一下殼就換過去，另一面關掉。Settings 再放一列會變成第二個入口，而且人要先離開 Home 才能換殼。模式仍立刻寫進 `settings`，只是觸發點是 Home 圖示。

## 為何拿掉工具列 popup

切回去的那一面若仍是會失焦關掉的 `default_popup`，就不是 Backpack 的獨立視窗。Chrome 又規定：設了 `default_popup`，點圖示不會進 `action.onClicked`，側欄的 `openPanelOnActionClick` 也不會贏過 popup。兩種模式都清空 popup，點圖示才有單一入口。

## 為何錢包視窗不叫 popout、不共用 `openPopout`

本倉庫的 popout 是網站審批窗：URL 帶 `requestId`，關掉要 abort 或回覆那筆 pending。錢包 Home 沒有 `requestId`。共用 `bindPopoutWindow` 會把關 Home 誤當成拒簽。

## 為何寬度是 360，而且側欄拉滿

Backpack 與 Jupiter 側欄同寬，是因為它們都拉滿 Chrome 側欄。側欄內容預設寬與下限是 360px（Chromium `kSidePanelDefaultContentWidth`）。`chrome.sidePanel` 沒有設寬度的參數，套件改不了。我們現在的 popup 是 422px；放進側欄再置中，會比那兩家窄一截、兩側留白。所以側欄 `width: 100%`。錢包視窗的 viewport 也定 360，第一次對看才不會跳寬。使用者之後自己拉寬的，聚焦時不縮回去，否則每次點圖示都在跟人手動調整打架。

## 為何審批 popout 維持 420×640

這一版只換錢包殼的寬。審批頁的欄位密度是按 422px 排的，縮到 360 會變成另一個版面題。

## 為何網站請求仍開審批 popout

0.13.0 預留過「網站 + sidebar → 側欄裡審批」。側欄可能沒開、也可能人正在看 Home。網站請求仍用獨立審批窗，才不會蓋掉側欄裡做到一半的送出，也不必在這一版重寫宿主矩陣。該預留維持不做。

## 為何 `sidePanel.open` 不能先 await

Chrome 要求這支 API 落在使用者點擊的同步呼叫裡。先向 SW 查視窗再 open，手勢在 await 之後就沒了，側欄不開、模式卻可能已被寫成 sidebar。所以一般瀏覽器視窗 id 要事先放在頁面上。

## 為何過渡動畫不寫進 Page

之後若 Connect 從下往上蓋住 Home，動畫期間兩頁必須同時存在。若 Page 自己假設「全樹只有我」或用 `currentView` 互斥渲染，一加過渡就要拆所有畫面。導航管 stack 與掛載；Page 只是可 mount 的根。批准／abort 跟邏輯 pop 走，不跟 `transitionend` 走，才不會動畫沒播完使用者以為已連線、或滑走途中誤拒簽。本版仍可畫面上一次一頁，但模組邊界先按「可同時掛兩頁」切。

## 為何網站請求要 Page 模組，而不是修側欄缺按鈕

側欄 connect 看起來像「標題錯、沒按鈕」，根因是沒有 Connect **Page**。現碼把網站請求推進一個叫 `dapp-approval` 的洞，標題借用送出，內文借用審批 popout 殼裡一塊沒有產品名的 DOM。宿主在拼畫面，所以換宿主就碎。正確切法是：先有完整 Page，宿主只負責 display 與 stack。popup 模式開 popout、側欄模式 push 同一模組，畫面不會分叉。

## 為何切殼不發帳戶變更

`handlePatchSettings` 現在每次寫入都 `notifyAccountChanged`。語言切換已走上這條，但公鑰沒變。切殼更常，已連線網站不該收到 `account-changed`。payload 只有 `shell` 時跳過；改網路仍通知。

## 為何並存時 uiHost 看文件路徑

切換是先開成功再寫 `shell`。若文件一載入就因 shell 還是舊值而關掉自己，新開的那一面會被自己關掉。Chrome 側欄選單也可能在視窗模式把側欄打開。所以不在載入時自關。`beginSend` 看的是人正在用的那一頁，而不是可能還沒寫入的 `settings.shell`。工具列仍只開 `settings.shell` 那一面；Home 按鈕的成功路徑仍關掉另一面。

## 為何用網址找回錢包視窗

視窗 id 放 SW 記憶體是對的，但 MV3 會把閒置的 service worker 回收。醒來後記憶體是空的，若在**點圖示**時直接 `windows.create` 就會有兩扇。用 `src/popup/index.html` 找回，並排除審批 `popout/index.html`。找到則聚焦且不重做 360×600 校正。SW 自己醒來只把仍開著的 id 記回來，不聚焦、不新建；側欄模式完全不碰這扇窗。人沒點圖示，不該冒出錢包視窗。

## 為何切換失敗不寫入

寫入成功但窗沒開，下次點工具列會去開一個不存在的側欄或把人困在關不掉的模式。先開成功，再寫 `shell`，再關另一面。
