# WHY — 0.35.0

## 要修什麼

獨立審批窗（`chrome.windows.create` 的 popout）靜態標題是 `Airwave — 審批`，approval shell 執行期又寫 `` `Airwave — ${tr(…)}` ``。Settings 若是英文，內文已是英文、窗名卻仍是中文或「英文品牌＋中文／英文譯文」。Chrome 把這種頁面當混語，反覆跳出 Google 翻譯條。工具列 popup 與側欄 HTML 寫死 `lang="zh-Hant"`，英文介面同樣 lang／內文不一致。

## 為何拿掉 `Airwave — `

品牌是 Latin 專有名詞。和「審批」拼在同一條 title 就是半中半英，翻譯條照樣來。英文 `Airwave — Approval` 雖同為 Latin，為三語一致、也不把品牌塞進窗名。Airwave 仍是畫面內的產品名（解鎖 h1 等），只是**不進 `document.title`**。

否決：只改 popout、popup／側欄維持 `Airwave`＋寫死 `zh-Hant`（英文殼仍混語）。否決：`<meta name="google" content="notranslate">`（那是關翻譯，使用者若真要譯也譯不了；本版是讓頁面語系自洽）。

## 為何窗名英文是 Approval 不是 Review

backlog 產品句英文窗名是 Approval。既有 `approval.review` 英文是 Review，給畫面用。分鍵 `window.title.approval`，避免為了窗名改掉畫面上的 Review。

## 為何殼內審批不改錢包窗名

0.25.0：側欄活著時網站審批進同一殼；`walletSend` 也留在當下殼。那是同一 `document` 裡換視圖，不是第二個 window。Chrome 翻譯條主要打獨立 popout。殼標題固定 `錢包`／`Wallet`，避免在 Home↔審批之間閃窗名。approval shell 與 `ConnectPage` 現碼會寫 `document.title`；本版必須用 `isInWalletShellHost`／`isPopoutApprovalUrl` 守住，不能只拿掉 `Airwave —` 前綴。

## 為何不動 sandbox／offscreen

對使用者沒有視窗 chrome；iframe／offscreen 文件的 title 不進翻譯條決策。改它們只增加 AI sandbox 面的無關 diff。

## 靜態 HTML 為何可空 title

locale 在 `chrome.storage`，HTML 無法在首 byte 就選對語。混語靜態標題（`Airwave — 審批`）比空白更糟：偵測器第一眼就看到半中半英。空白＋腳本讀 locale 後寫單一語文，是可接受的第一幀。
