# 拒絕簽名

前置與「Devnet 簽名並送出」相同（含本則 `e2e-validator` 重置；需要 SOL 時 airdrop），且 test-web 已連線。帳戶裡要有足夠付手續費的 SOL。優先用 Side panel。

1. 打開帶 `?rpc=http://127.0.0.1:8899` 的 test-web。
2. 按 Sign transaction。
3. 在簽名核准畫面（Side panel 殼內，或審批視窗）按拒絕。

期望：test-web log 是拒絕或使用者取消，沒有簽章。餘額與按下去之前相同。
