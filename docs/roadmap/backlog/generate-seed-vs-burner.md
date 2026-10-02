# 產生：助記詞錢包 vs Burner — backlog

構想已排進 [0.6.0](../0.6.0/INDEX.md)。視覺見 [`docs/design-demos/generate-wallet-ux.html`](../../design-demos/generate-wallet-ux.html)。**以 INDEX 為準**。

現行 Add「產生新錢包」只做隨機 Keypair（Burner），成功只顯示短地址。需要可恢復錢包的人沒有 12 詞備份屏。

## 產品意向

Add 第一層兩條：

1. **新錢包**：產生英文 BIP39 **12** 詞，衍生 phantom `m/44'/501'/0'/0'` 寫入 signing。同一回應只把助記詞送到 popup 一次。畫面：一句「離開後無法再顯示助記詞」、唯讀 12 格、公鑰前4…後4（複製全文）。殼底「完成」。此屏無 Back。助記詞不進 storage／log。之後 Reveal 只出私鑰。
2. **Burner**：維持現況隨機密鑰、不顯示助記詞。之後仍可 Reveal。

## 非目標（構想層）

- 24 詞、passphrase、備份 quiz、把助記詞 persist
- 塞進 [0.6.0](../0.6.0/INDEX.md)（該版非目標含產生助記詞）
