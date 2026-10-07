# 0.20.0 HOW — 全轉 `@solana/kit`

本檔是 **HOW**。產品語意以 [INDEX.md](../INDEX.md) 為準。Kit 套件的**函式名**以實作時 npm 上的穩定版為準；下表是職責對照，名稱若微差須對齊同一職責，禁止退回 `@solana/web3.js`。

官方入門：[Kit getting started](https://www.solanakit.com/docs/getting-started)、[Upgrade guide](https://www.solanakit.com/docs/upgrade-guide)。

## 允許的新依賴（wallet 與／或 test-web）

只加實際用到的。出貨時 `wallet/package.json` 與 `test-web/package.json` **不得**再列 `@solana/web3.js`。**禁止**出貨時留下 `@solana/compat`（那是給與 v1 並存的過渡；本版終態零 v1）。

| 套件 | 用途 |
|------|------|
| `@solana/kit` | `address`、RPC factory、交易／message codec、signer 從 bytes 建立、blockhash lifetime、`pipe` 組 tx（若採用） |
| `@solana/kit-plugin-rpc` | **可選**。若用 `createClient().use(solana…Rpc())`。錢包必須把 endpoint 設成 **Settings 的 rpcUrl**，禁止寫死只連官方 public RPC 而忽略使用者自訂／Helius |
| `@solana/kit-plugin-signer` | **可選**。禁止 `signerFromFile`（瀏覽器沒有該檔案 API） |
| `@solana-program/system` | 錢包自組 SOL 轉帳；test-web 組測試 tx |
| `@solana-program/token`、`@solana-program/token-2022` | 錢包自組 SPL／Token-2022 transfer（取代 `wallet-begin-send.ts` 手寫 data） |
| `@solana-program/associated-token` | ATA idempotent create（若套件提供對等 ix） |
| `@solana-program/compute-budget` | 寫入／取代 CU limit／price ix（取代 `ComputeBudgetProgram`） |

可另加 **僅 Kit 生態、無 class 包袱** 的小包（例如獨立 `@solana/addresses`），須能說明 web3.js 已刪且為 tree-shake。禁止再加 `@solana/spl-token` 的舊 web3 客戶端。

`tweetnacl`：**本版定案**只用於 `finishSignMessage` 的 `nacl.sign.detached`（64-byte vault secret）。不改 Kit off-chain signer。簽交易禁止 tweetnacl。之後若要刪套件須另開版本並對照同一 key／訊息的 64-byte 結果。

既有允許保留：`@scure/bip39`、`ed25519-hd-key`、`bs58`、Wallet Standard 套件、React、Vite、CRX。

## 禁止

- `Connection`、`PublicKey`、`Keypair`、`VersionedTransaction`、`VersionedMessage`、`Message`、`TransactionMessage`、`SystemProgram`、`ComputeBudgetProgram`、`TransactionInstruction`、`AddressLookupTableAccount` 來自 `@solana/web3.js`
- inject 裡 `createClient()`、RPC plugin、持有 signer／密鑰
- `signerFromFile`／Node fs 讀 keypair
- 把解鎖後的 Ed25519 材料寫進 `chrome.storage.local`（session 仍只允許 **既有** `SESSION_UNLOCKED` blob：vault 包裝金鑰 + 既有 `VaultSecrets` 形狀）
- 為遷庫改 command 名、storage key、pending 形狀、Wallet Standard 能力表

## 職責對照（web3.js v1 → Kit）

| 現況 | 本版 |
|------|------|
| `new Connection(rpcUrl)` | `createSolanaRpc(rpcUrl)`（或 client.rpc，endpoint 同源）。commitment 對齊現況（多為 `confirmed`） |
| `new PublicKey(s)`／`toBase58()`／`equals` | `address(s)`；比較用字串；非法字串與今日一樣當無效地址 |
| `PublicKey.findProgramAddressSync` | Kit 的 PDA helper（async 亦可；呼叫端改 `await`） |
| `Keypair.fromSecretKey`／`fromSeed` | 助記詞派生仍 `ed25519-hd-key` → 32-byte seed；再 Kit「從 32 或 64 byte 建 signer」。**Vault 仍存今日的 bs58 64-byte secret**，不改 blob schema |
| `Keypair.generate()`（Burner／新增隨機帳戶） | 用安全隨機 32-byte seed（`crypto.getRandomValues`）再建 Kit signer／64-byte secret 寫回 vault。禁止 `signerFromFile`、禁止為了隨機帳戶去用 web3 `Keypair.generate` |
| `VersionedTransaction.deserialize`／`serialize` | Kit transaction codec；Wallet Standard 進出仍是 `number[]`／`Uint8Array` |
| `tx.sign([keypair])` | Kit 對該交易 `partiallySign`／`signTransactionMessageWithSigners`（只簽本錢包該簽的帳戶） |
| `Message.from`／`VersionedMessage.deserialize` 後 `serialize().byteLength === 原長` | **同一判定**：用 Kit 的 legacy 與 versioned **message** codec（不是整筆帶簽名 tx）。成功且 round-trip 位元組長度等於輸入才算「像交易」。禁止只看 `0x80`／`0x81`。Track 1 測資構造（不必在 roadmap 貼 hex）：用 Kit 編一筆**無多餘尾部**的 v0 **或** legacy **message**（不是整筆已簽 tx）→ `messageLooksLikeTransactionMessage` 為 true；短 UTF-8 普通句子（非空、非 NUL）為 false；禁止以首字節魔術當通過條件 |
| `connection.simulateTransaction` | 對等 RPC `simulateTransaction`；pre／post 餘額差額公式 **不改**（0.10.1） |
| `sendRawTransaction` + `getSignatureStatuses` | 對等 RPC；`walletSend`／`signAndSendTransaction` 等待 `confirmed` 時序不改 |
| `getParsedTokenAccountsByOwner`、`getBalance`、`getSignaturesForAddress`、`getAccountInfo`、`getLatestBlockhash`、`getMinimumBalanceForRentExemption`、`getFeeForMessage`（若現有） | 同名或 Kit rpc proxy 同職責；解析欄位對齊現有 home-tokens／activity |
| ALT：`AddressLookupTableAccount` | Kit 對等 decode／resolve；模擬與 CU 改寫仍須能處理 lookup 交易，行為同 0.11.0／0.10.0 |
| Inspector：`message.serialize()` → 標準 base64 | 對 **將去簽的那份** message（`workingTx ?? 原始`）用 Kit codec 得到 **相同 wire bytes**，再標準 base64。URL 規則維持 [0.19.0 INDEX](../../0.19.0/INDEX.md) |

## Session／custody

1. `VaultSecrets.secrets` 仍是 `accountId → bs58(64-byte secret)`。`loadSecrets`／hydrate `SESSION_UNLOCKED` **不改欄位**。
2. 解鎖後 SW 記憶體可持有這些 bytes，並 **快取** 由 bytes 建成的 Kit signer。`getKeypair` 刪除；改 `signerForAccountId`（可 async）與「匯出／寫回仍用 bytes」的既有函式。
3. `loadSecrets` 若因 Web Crypto 變成 async：`wallet.unlock`、session hydrate **必須 await 完成後**才把 `unlocked === true` 暴露給 UI／簽署。禁止畫面已解鎖但 signer Map 仍空。
4. Kit CryptoKey 若預設不可 extract： **不要**把 vault 改成只存 non-extractable 物件。長期密文真相仍是 bytes。匯出私鑰、改密碼、加帳戶繼續走 bytes。
5. inject **零**密鑰。page script 只用地址字串／32-byte pubkey（Wallet Standard `WalletAccount`）。

## inject 瘦身

`wallet/src/inject/wallet.ts` 今日只為 `PublicKey` 轉 base58／bytes。本版 **禁止** 把 Kit client／RPC 打進 content／inject。允許：`bs58` + 長度 32 檢查，或 Kit 可 tree-shake 的 `address`／codec **單一符號**。出貨後 inject 的 bundle 不得再含 `@solana/web3.js`。

## 錢包自組交易（begin-send）

`wallet-begin-send.ts` 改用 program 套件組 ix（System transfer、Token／Token-2022 transfer 或 transferChecked（對齊現況實際送出的那種）、ATA create idempotent）。帳戶角色、金額 **BigInt**、租賃估算、餘額不足錯誤碼與 [0.12.0 send HOW](../../0.12.0/docs/send-token-how.md) 相同。組完仍是 **未簽** bytes 進 pending，批准後才簽。

不要為了 Kit 改成 `createClient().sendTransaction` 在 begin 階段就廣播。

## 0.19 靜態解讀

`decode-compiled-ix` **維持手寫 disc＋精確長度**（INDEX 0.19 變體表）。本版只把 `PublicKey` 換成地址字串。**不要**用 program plugin 的 decoder 放寬／收緊「已解」條件。`instructionDesc` 半套禁令不變。

## RPC 單例

SW 內對同一 `rpcUrl` 可快取 rpc 物件；Settings 變更 endpoint 後下次查詢須用新 URL。禁止全域寫死 devnet。

## test-web

`test-web/src/main.ts` 組 Versioned transfer、airdrop、失敗用 tx：改 Kit。Wallet Standard 偵測 Airwave、feature 名稱、按鈕語意不變。簽訊息「像交易」的測試向量：仍須能被 **本版同一套** `messageLooksLikeTransactionMessage` 判為 true（可用 Kit 編出的 message bytes）。

## 靜態掃尾

全倉庫 `wallet/src`、`test-web/src`、兩份 `package.json` 的 `dependencies` **不得**出現 `@solana/web3.js`。註解／roadmap 歷史檔可保留舊名。對應 `package-lock.json`：這兩個 package 的**直接** `dependencies` 節不得再列 `@solana/web3.js`（與 `package.json` 一致）。傳遞依賴若第三方仍帶 web3 **不**視為本版未完成，但本倉庫不得再直接 depend。
