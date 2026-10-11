# Reasoning — 0.6.0 助記詞匯入

使用者匯入時通常不知道當初錢包用哪條 BIP44。只填一個 index 會匯到空地址。先選主流方案（Phantom vs CLI 差一個 `0'`），再列出 20 個公鑰＋SOL，讓人用「有餘額的那列」對上舊錢包。

助記詞不進 vault blob 以外的任何 persist：vault 只存該 index 的 64-byte secret，與 `importAccount` 相同。預覽 20 個 Keypair 只活在該次 SW 請求。

依賴：BIP39 與 ed25519 HD 不是 Web Crypto 能力，引入 `@scure/bip39` 與 `ed25519-hd-key` 比自寫 HMAC 路徑更不容易錯。

0.5.0 把助記詞標非目標；本版推翻該非目標，不改 Combined 契約。

預設 `phantom`：多數瀏覽器錢包與 Solflare 同這條；CLI／Ledger 是相鄰一鍵，不必先猜 index。

匯入後不切 active：避免匯入空地址就蓋掉使用者正在看的帳戶；與現行 `importAccount` 一致。

Add 把「產生」拆成新錢包與 Burner：可恢復路徑必須在寫入當下看一次 12 詞；臨時帳戶不必。助記詞仍不 persist，與匯入相同。產生固定 phantom index 0，之後可用本版匯入流程找回。

設計審查 L2／L3：概念稿「尚未實作」備註與 INDEX 已標 `in progress` **非阻擋**，不改產品句。

