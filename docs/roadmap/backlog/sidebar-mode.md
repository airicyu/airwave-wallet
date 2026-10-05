# Sidebar 模式 — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。0.1.0–0.5.0 都把 sidebar 列為非目標；那些版本**不要**補做。

## 產品意向

使用者可讓錢包殼顯示在 **Chrome 瀏覽器側欄**（Side Panel），用來取代工具列 **popup**。

- 這是擴充的 `side_panel`，不是在網頁裡畫一條自己的側欄。
- 側欄裡是現有錢包殼：Home、Accounts、Settings、解鎖。狀態仍以 `chrome.storage` 為真相，與 popup 同一套 command。
- 切到側欄模式後，點工具列圖示**打開側欄**，不再彈出 popup。切回則恢復 popup。
- 切換放在 Settings，立刻寫入（對齊設計原則第 2 節）。
- dApp 審批宿主：popup mode 至 [0.13.0](../0.13.0/INDEX.md) 仍走 **popout**；錢包內 `walletSend` 已在 popup 殼內。側欄殼與「網站請求進 sidebar 殼內」仍由本 backlog 負責。

側欄不會因為失焦而關掉（popup 會）。解鎖 session 的規則不變：仍是 `wallet.lock` 或瀏覽器工作階段結束才鎖，不因為側欄開著就改鎖法。

版面沿用同一套畫面。側欄寬度由使用者拉，不保證是 popup 的 384px；列、按鈕、長字串仍須單行可掃（`ellipsis`），頁級主按鈕仍貼在殼底。

## 開工前仍須拍板（排進 INDEX 時）

- 預設是否仍為 popup（意向是預設 popup，側欄為可選）。
- 側欄模式時是否從 manifest 拿掉 `default_popup`，或兩種表面都留著但圖示只開一種。
- 側欄最小寬度，以及比 384px 更寬時內容是置中固定欄還是拉滿。
- 權限只用 `sidePanel`，是否還要 `openPanelOnActionClick`。

## 非目標（構想層）

- 網頁內嵌側欄、覆蓋 dApp 版面
- 用側欄取代 popout 審批
- 每個分頁一個不同錢包狀態
- 在尚未排進本項的版本裡打開 sidebar
