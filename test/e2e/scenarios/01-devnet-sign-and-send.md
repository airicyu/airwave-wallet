# Devnet 簽名並送出

前置：驗證器已重置。Mock 在 `8787`。錢包已建立並解鎖，cluster 為 Devnet，Devnet RPC 為 `http://127.0.0.1:8899`，Debug mode 開，Mainnet blockhash RPC 為 `http://127.0.0.1:8787`，Mainnet 沒有自訂 RPC。

1. 在終端對錢包地址領取測試 SOL：`solana airdrop 2 <地址> --url http://127.0.0.1:8899`。不要按 test-web 的 Devnet airdrop，那個按鈕打的是頁面上的 RPC，而預設頁面不是驗證器。
2. 打開 `test-web`，網址帶 `?rpc=http://127.0.0.1:8899`。Log 第一行的 RPC 必須是這個位址。
3. 按 Connect。在擴充功能的連線核准窗按允許。
4. 頁面顯示已連線的地址後，按 Sign and send transaction。
5. 在簽名核准窗確認沒有 cluster 不符的通知，然後按核准。

期望：test-web 的 log 有 `Broadcast signature:` 和 `Confirmed:`，沒有 `Sign and send error`。核准窗不曾顯示 cluster 不符。Popup 首頁的 SOL 餘額少於 2。
