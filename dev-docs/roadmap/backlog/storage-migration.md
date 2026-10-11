# 版本升級與 storage 遷移 — backlog

[0.26.0](../0.26.0/INDEX.md) 已出貨骨架：`airwave.schemaGeneration`＝1，不改 `*.v1` 形狀。之後真正改資料形狀時另開版本契約；本檔仍是構想，不是契約。

## 現況

持久資料在 `chrome.storage.local`，鍵名自帶後綴：`airwave.settings.v1`、`airwave.accounts.v1`、`airwave.activeAccountId.v1`、`airwave.connections.v1`、`airwave.vault.v1`。金庫 blob 另有 `version: 1`。

擴充版號（`0.x.y`）與這些 storage 後綴**沒有**對應。升級時沒有集中遷移步驟。相容靠讀取時補洞，例如：

- settings 缺欄由 `normalizeSettings` 補預設；舊的單一 `rpcUrl` 折進 `rpcByCluster`
- accounts 缺 `kind` 當 `"signing"`

解鎖 session（`chrome.storage.session`）關瀏覽器就沒有，不當遷移對象。

## 產品意向

訂一套**升級時搬資料的方法**，讓已安裝的錢包在擴充更新後仍開得起來，帳戶、金庫、連線、設定不丟。

方法意向：

1. **版號分開。** 使用者看到的擴充版號不等於 storage schema。另記「這份 local 資料寫到第幾代」。
2. **只在 service worker 啟動時跑**，跑完才處理 command。Popup 不自己改舊鍵。
3. **一步一代、可重入。** 遷移是有序函式（第 n 代 → 第 n+1 代）。再跑一次結果相同。不靠「缺欄就順便猜」當唯一路徑；讀取補洞可以留著當防呆，但形狀變更要有具名步驟。
4. **明文與金庫分開。** settings、accounts、active id、connections 不需密碼，啟動時可寫回。金庫 ciphertext 若要改 KDF 或 blob 形狀，**必須**等使用者下次解鎖、密碼驗證成功才重加密；失敗則**不覆蓋**舊 blob。
5. **失敗不毀資料。** 任一步寫入失敗就停，留下升級前的鍵。不要先刪舊鍵再寫新鍵。不要因為遷移失敗而重建空金庫。
6. 測試用虛構帳戶與虛構金庫，不把真實助記詞、私鑰、密碼寫進 repo。

已在使用者機器上的 `*.v1` 就是第一代基線。本方法要能從那一代往後走，而不是要求人人重裝。

## 開工前仍須拍板（排進 INDEX 時）

- schema 世代存在新鍵，還是沿用鍵名後綴（`v1` → `v2`）當世代。
- 第一個出貨步驟是否只「記下目前形狀為第 1 代」、不做轉換。
- 金庫要改格式時，鎖定畫面怎麼講（短句錯誤，不附教學）。

## 非目標（構想層）

- 雲端備份、換電腦匯出整包 storage
- 從其他錢包產品匯入
- 每次開 popup 由 UI 跑遷移
- 為了遷移改密碼學或把秘密寫進明文鍵
