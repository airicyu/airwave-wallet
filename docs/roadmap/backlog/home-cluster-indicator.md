# Home 顯示目前是 Devnet 或 Mainnet — backlog

已排進 [0.22.0](../0.22.0/INDEX.md)，**不是契約**。以該版 INDEX 為準（僅 Devnet 徽章；Mainnet 不標）。

## 現況

作用中網路是 Settings 的 `settings.cluster`（`devnet` 或 `mainnet`），存在 `chrome.storage`。切換只在 Settings「網路」兩列單選，見 [`docs/design-principles.md`](../../design-principles.md) 第 8 節。

Home（`home-token`、`home-activity`）共用頂欄 `#bar-home`：帳戶 widget、複製地址、鎖定、選單。頂欄與持倉／Activity 內容都沒有寫出目前是 Devnet 還是 Mainnet。使用者要先進 Settings 才知道錢包打的是哪一個 cluster。

## 產品意向

人站在錢包 Home 時，不用進 Settings，就能看出目前是 **Devnet** 還是 **Mainnet**。兩個狀態都要標出來，不能只在 Devnet 才出現字、Mainnet 完全沒有標示。

標示讀現有 `settings.cluster`。Settings 一切換，Home 跟著變（既有 `chrome.storage.onChanged` 鏡像），不要另存一份「Home 看到的網路」。

Devnet 要比 Mainnet 更醒目（顏色或徽章），避免測試網看起來像正式網。文案用現有 Settings 用詞：`Devnet`、`Mainnet`。

Home **不**另做一套切換。改網路仍走 Settings 的兩列單選，不要在 Home 用分段 tab 當 cluster 選擇器（設計原則第 5 節）。

範圍是 popup Home 的兩頁（持倉、Activity），因為它們共用同一條頂欄。

## 開工前仍須拍板（排進 INDEX 時）

- 標示放在頂欄（帳戶名旁或右側），還是頂欄下方一條短狀態。
- Devnet 的醒目樣式：色塊、字色，或兩者。

## 非目標（構想層）

- 在 Home 直接切 cluster
- 改 Settings 的網路單選、RPC 清單，或 `settings.cluster` 的儲存方式
- 簽署 popout、送出、帳戶列表也加同一顆標示（那些頁若要做，另開項目）
- 顯示 RPC URL、自訂 endpoint，或第三個 cluster（testnet 等）
