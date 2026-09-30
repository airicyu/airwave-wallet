# Reasoning — 0.2.0

## 為何是這一刀（不是 agent、不是 simulation）

0.1.0 已證明訊息／vault／簽名主路徑。使用者體感缺口是「帳戶管不完、看不見資產、斷不開連線」。full-picture ②③（agent）與 simulation／signAndSend 會拉開依賴與審批複雜度；本版刻意留在**錢包基本面**。

## 為何刪 signing 帳戶要先解鎖

Vault 是單一 AES-GCM blob 包住 `secrets` map。刪除某一 signing 帳戶必須重寫 ciphertext。鎖定態下 SW 沒有明文 secrets，無法安全重打包 → 定案 `WALLET_LOCKED`。read-only 無 secret，可鎖態刪除。

## 為何首頁 RPC 由 popup 直連

餘額／token 帳戶為公開資料，不需私鑰。popup 直連避免 SW 為只讀查詢膨脹 API 面；私鑰仍永不進 popup。若日後要統一限流再改 SW 代查。

## 為何鎖定也可看 Home（設計審查 H1 選 B）

餘額不依賴 vault 明文。強制「先解鎖才能看錢」增加摩擦且暗示鎖定與鏈上可見性綁定。定案：有 active 公鑰即可查；解鎖只守護簽名／改 vault。

## 為何 disconnect 與 account-changed 分開

0.1.0：切帳戶**保持** origin 連線並推新公鑰。若 reuse `account-changed` 且公鑰空字串，dApp 可能誤判。獨立 `airwave-bridge-disconnected` 語意清楚：連線撤銷。

## 否決／延後

| 方案 | 決定 |
|------|------|
| 本版上 sidebar | 否；兩套殼風險高，先把 popup 帳戶＋首頁做穩 |
| Jupiter token metadata | 否；非主路徑，零依賴優先 |
| 刪帳戶不需 unlock（留下密文孤兒） | 否；custody 不清晰 |
| Agent／simulation 塞進 0.2.0 | 否；非目標寫死 |

## 與架構禁區

本版不改 pending 模型、不廣播、不加硬編碼密碼、能力表僅新增已實作的 `standard:disconnect`。
