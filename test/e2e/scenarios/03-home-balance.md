# 首頁餘額

前置：本則已 `bun run e2e-validator` 重置帳本；步驟內再 airdrop。錢包解鎖，Devnet RPC 為 `http://127.0.0.1:8899`。優先用 Side panel。

1. 對目前帳戶地址執行 `solana airdrop 2 <地址> --url http://127.0.0.1:8899`。
2. 打開 Side panel 首頁並重新整理資產。

期望：SOL 餘額顯示為 2。沒有打到 `api.devnet.solana.com`。
