# Reasoning — 0.1.0

## 為何 SW 簽名、popout 只審批

[extension-message-flow.html](../../../../brainstorm/research/extension-message-flow.html) 明確：popout 只展示本次請求並回傳 approve／reject；**不在 popout 解密私鑰**。使用者確認後，**service worker** 用已解鎖、僅存於 SW 記憶體的金鑰材料簽名，再沿 `requestId` 回原 tab。

這仍符合 GUIDELINES「簽名不在 page script」：inject 永遠拿不到私鑰 bytes。若改為 popout 內簽名，須另寫 INDEX 推翻條並處理 popout 與 vault 的 IPC；本版不採。

## 為何不用 operation store / storage 當 event bus

Solibra 教訓：pending 寫進 `chrome.storage` 再 rehydrate 會造成並行請求覆蓋、UI 與 SW 分叉。本版 pending 只在 SW `Map<requestId, …>`；popout URL 只帶 `requestId`，向 SW 拉 payload。

SW 被回收時：**0.1.0 不**把 pending 寫入 `chrome.storage`／`storage.session` 供 popout 或 UI rehydrate。若 SW 重啟導致 in-flight 請求遺失，inject 端 Promise 逾時 reject；使用者可重試。session pending 備援留後版 backlog，不在本版實作。

## 為何 0.1.0 不做 sidebar、token 首頁、simulation

垂直切片優先：**test-web 能 connect → sign message → sign transaction（approve 後回傳已簽 tx，dApp 自行 send）**。其餘 wishlist 項留 backlog 或後版。

## 為何 devnet 預設、RPC 可改

B2 教訓：設定必須驅動 `Connection`。本版至少 devnet／mainnet 二選一與可編輯 RPC URL；預設 devnet 降低手測誤轉 mainnet 風險。

## 訊息 envelope 命名

對外 page bridge 使用 `source: "airwave-inject"` / `"airwave-content"`（不用 Solibra 前綴），避免與舊產品混淆。

## 依賴

允許 `@solana/web3.js`、Wallet Standard 官方套件、Vite 建置、Chrome types。不引入大型狀態框架；popup 狀態以 `chrome.storage.onChanged` 鏡像為主。
