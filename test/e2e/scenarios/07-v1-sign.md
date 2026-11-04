# v1 簽名與代送

前置與「Devnet 簽名並送出」相同（含本則 `e2e-validator` 重置、airdrop 2 SOL、test-web `?rpc=http://127.0.0.1:8899`、已連線）。本機 validator 要能接受 v1 交易。優先用 Side panel。

1. 按 Sign transaction（v1）。核准畫面的兩個輸入是 `CU limit` 和優先費（`優先費`／`优先费`／`Priority fee`），沒有 `CU price`。優先費顯示 `5000`，不是被設定預設值覆寫後的另一個數字。按核准。
2. 按 Sign transaction（v1，省略優先費）。優先費顯示設定裡的預設值（出廠 `5000`）。按拒絕。
3. 按 Sign transaction（v1，優先費 0）。優先費顯示 `0`。按拒絕。
4. 按 Sign transaction（v1，省略 CU limit）。出現既有的模擬失敗通知。核准按鈕仍可按。按拒絕。
5. 按 Sign transaction（v1，已有簽章）。`CU limit` 和優先費兩個輸入都是停用的。按拒絕。
6. 按 signAndSendTransaction（v1，錢包代送）。費用卡與步驟 1 相同。沒有 cluster 不符。按核准。

期望：步驟 1 的 log 有 `v1 signTransaction returned:`。步驟 2 到 5 的 log 是拒絕或使用者取消，沒有 `v1 signTransaction returned:`。步驟 6 的 log 有 `v1 signAndSendTransaction ok:`，沒有 `v1 signAndSendTransaction error`。
