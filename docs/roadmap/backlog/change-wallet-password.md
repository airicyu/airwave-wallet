# 變更錢包密碼 — backlog

概念互動稿（非正式契約）：[`docs/design-demos/change-wallet-password-ux.html`](../../design-demos/change-wallet-password-ux.html)。排進 INDEX 後以 INDEX 為準。

## 產品意向

使用者可在 **Settings** 變更**錢包密碼**（[`DOMAIN.md`](../DOMAIN.md)「錢包密碼」：解鎖金庫與 Reveal 再確認用的那一把，不是單一帳戶的密碼）。

流程意向：

1. 輸入目前密碼，再輸入新密碼並再確認一次。
2. Service worker 用目前密碼解開 `airwave.vault.v1`；失敗則**不寫**金庫、session 維持原樣。
3. 成功則以**新 salt** 用新密碼整包重加密寫回；已解鎖的 session 工作金鑰換成新的，使用者不必立刻再解鎖一次。
4. 密碼只在該次 command 進入 SW，用完即丟。禁止把密碼、新舊 ciphertext 寫進 log、文件或 popup 以外的持久明文。

沒有「忘記密碼」恢復。不知道目前密碼就不能改。

欄位是錢包密碼：畫面打碼，但 **不要** `type="password"` 或 `autocomplete="current-password"`／`new-password`（Chrome 會把錢包密碼送進 Google 密碼管理器）。作法見 [`docs/research/secret-field-autofill.md`](../../research/secret-field-autofill.md) 類 B。助記詞／私鑰仍走另一套 harden，不要改成 password 型別。

## 開工前仍須拍板（排進 INDEX 時）

- 新密碼最短長度是否沿用建立金庫的 8 字元。
- 鎖定時能否只靠「目前密碼」改密，或必須先解鎖。
- 密碼管理器：**已拍** 錢包密碼不得進 Google。改密與建庫／解鎖同一套遮罩 text，禁止 `current-password`／`new-password`。

## 非目標（構想層）

- 無目前密碼的重設、助記詞當恢復碼、雲端託管
- 每個帳戶一把密碼
- 更換 KDF／演算法（仍是既有 password-boxed vault）
- 在文件或測試夾具寫入真實密碼、助記詞、私鑰
