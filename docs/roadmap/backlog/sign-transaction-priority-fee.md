# 簽署交易時自訂 priority fee — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

頁面與模擬主舞台已出貨：[0.10.0](../0.10.0/INDEX.md)。本項仍是「批准前能改這一筆的 priority fee」；排程後以該版 INDEX 為準。

## 現況

`signTransaction` 批准後，service worker 照 dApp 送來的交易位元組簽名，原樣回已簽交易，由 dApp 自己送出。錢包不插入、不改寫 Compute Budget。使用者不能在審批時改這筆的 priority fee，也不能改總手續費。

Solana 每簽一筆的基底費由協議決定。使用者能加的是 **priority fee**（`ComputeBudget` 的 `SetComputeUnitPrice`，以 micro-lamports／CU 計）。頁上說的「交易費」＝基底費＋這筆 priority fee。

## 產品意向

在簽署交易頁、按下批准之前，使用者可以為**這一筆**設定 priority fee。預設沿用 dApp 交易裡已有的單價；使用者改過才覆寫。沒改則簽回的位元組與今天相同（除既有簽名流程本身）。

改了之後、簽名之前，錢包把該筆的 `SetComputeUnitPrice` 設成使用者的值（沒有這條指令就補上），再簽這個改過的交易，回給 dApp。不代為 `sendTransaction`。

頁上要同時看得到：

- 目前 priority fee（沿用 dApp 的，或使用者剛設的）
- 連動後的預估總交易費（查得到才顯示；查不到寫未知，不顯示 0）
- 一個可改的設定（數值或預設檔，排進 INDEX 時定）

費用付款人不是本筆要簽的帳戶時，改 priority fee 會改到別人付的費：此時不提供設定，並用一句話說明。唯讀、簽不了的帳戶維持不能批准。

改寫與簽名都在 service worker。popout 只收集使用者要的單價。不把這次設定寫進 `chrome.storage` 當預設（除非該版 INDEX 明文要記住）。

## 開工前仍須拍板（排進 INDEX 時）

- 控制是自由輸入（SOL 或 micro-lamports），或低／中／高／自訂；建議值從哪裡來（RPC 優先費估算或寫死檔位）。
- 只改 `SetComputeUnitPrice`，或連 `SetComputeUnitLimit` 一起讓使用者設。
- dApp 已帶單價時，覆寫是取代該指令，還是另插一條（一筆交易只能留一條有效單價）。
- 插入指令後超過封包大小、或 v0／lookup table 改不動時，怎麼停並讓使用者改回原價。
- 改價後要不要重跑模擬（0.10.0 已有 `ui.simulatePendingTx`；本項未排進 INDEX 前只構想）。

## 非目標（構想層）

- 改協議基底費（每簽名的固定 lamports）
- `signAndSendTransaction`、錢包代廣播
- 在 `signMessage` 上設費
- 替 dApp 決定優先級；沒改就不改寫交易
- 全域 Settings 裡一條永遠套用的 priority fee（本項只針對這一筆審批）
