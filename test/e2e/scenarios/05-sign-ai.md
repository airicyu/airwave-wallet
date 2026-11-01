# 簽交易 AI（單輪）

前置與「Devnet 簽名並送出」相同，另外 Debug mode 的 OpenRouter base URL 為 `http://127.0.0.1:8787`，簽交易 AI 分析開啟，OpenRouter 金鑰欄有任意非空字串（mock 不驗證金鑰）。優先用 Side panel。

1. 打開帶 `?rpc=http://127.0.0.1:8899` 的 test-web，已連線。
2. 按 Sign transaction。
3. 在核准畫面（Side panel 殼內，或審批視窗）等待分析出現。不要期待模型再呼叫工具。

期望：分析內文含有 “What This Transaction Does”。請求打到 `127.0.0.1:8787` 的 `/api/v1/chat/completions`。這則到看到報告即可，不必核准送出。
