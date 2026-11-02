# 首頁活動（Helius mock）

前置：本則只打 Helius mock，不需 validator airdrop。Mock 在 `8787`。錢包解鎖。Cluster 改為 Mainnet。Mainnet 不設自訂 RPC。Helius API URL 設為 `http://127.0.0.1:8787`。Debug mode 可開著，但這則不使用 Jupiter 或 OpenRouter。優先用 Side panel。

1. 打開 Side panel，進活動分頁並重新整理。
2. 若畫面有載入更多，再按一次。

期望：第一頁有交易列，不是空狀態，也不是無法取得。第二頁的列與第一頁不同。位址列裡的請求打到 `127.0.0.1:8787` 的 `/v0/addresses/.../transactions`，沒有打到 `api.helius.xyz`。
