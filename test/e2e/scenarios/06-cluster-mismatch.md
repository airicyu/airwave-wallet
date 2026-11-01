# 另一叢集的 blockhash

前置與「Devnet 簽名並送出」相同。錢包 cluster 維持 Devnet。Mainnet blockhash RPC 為 `http://127.0.0.1:8787`。優先用 Side panel。

1. 打開 `test-web`，網址為 `?rpc=http://127.0.0.1:8899&otherRpc=http://127.0.0.1:8787`。Log 的 Other cluster RPC 必須是 mock。
2. 已連線後按「Sign transaction（另一叢集 blockhash，省略 chain）」。
3. 看簽名核准畫面（Side panel 殼內，或審批視窗）。

期望：出現 cluster 不符通知，核准按鈕不可按。這筆交易沒有被簽下去，也沒有被送出。
