# 簽署交易頁 UI／UX — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

## 現況

dApp 的 `signTransaction` 與 `signMessage`、`connect` 共用同一張 popout。交易請求的主內容是 pending payload 的 JSON。使用者批准後，錢包回已簽交易，由 dApp 自己送出；錢包不代廣播。

## 產品意向

`signTransaction` 用自己的審批頁，讓人在批准前看出這筆交易在做什麼，而不是讀 JSON。

頁上要能掃到：

- 哪個站點在請求（origin）
- 將用哪個帳戶簽（名稱與縮寫地址）
- 交易摘要：幾條指令、每條的程式與可讀的一句說明（對不出來就顯示程式縮寫，不捏造語意）
- 費用付款人與這筆預估手續費（查得到才顯示；查不到就明示未知，不顯示 0）
- 拒絕與批准

原始交易可展開查看。載入失敗或請求已不在，顯示短錯誤。批准中按鈕不可連點。

simulation 結果是另一則構想：[sign-transaction-simulation.md](./sign-transaction-simulation.md)。本項頁面要留得出結果的位置，但**不**把 simulation 算進本項範圍。

`connect` 與 `signMessage` 不在本項改版。

## 開工前仍須拍板（排進 INDEX 時）

- 指令說明做到多細：只列程式，或對常見 System／Token／ATA 給固定句型。
- 多簽、版本化交易（v0、address lookup table）在頁上怎麼標，對不出帳戶時怎麼寫。
- 手續費用 `getFeeForMessage` 或只顯示「由網路決定」。
- 鎖定中開啟此頁時，先解鎖再看摘要，或同一頁解鎖。

## 非目標（構想層）

- 改簽名語意：仍是批准後回已簽交易，dApp 自行 send
- `signAndSendTransaction`、錢包代廣播
- 在本項實作 simulation（見另一則 backlog）
- Agent 解讀交易
