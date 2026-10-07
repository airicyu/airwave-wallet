# 0.20.0 reasoning

## 為何整版遷、而不是只遷「錢包自組交易」

產品句是 **內部庫替換、行為不變**。若只遷 send、留下 session 的 `Keypair` 與 simulate 的 `VersionedTransaction`，倉庫會長期雙棧，inject／test-web 仍鎖 v1。使用者已接受 Kit 拆包後的依賴數量，終態定為 **零 `@solana/web3.js`**。

未選：只加 `@solana/compat` 當永久層。compat 是遷移工具，出貨後再留等於沒遷完。

## 為何 vault 不改成只存 CryptoKey

Kit 鼓勵 Web Crypto、常 non-extractable。錢包還要：匯出、改密碼重包、助記詞再派生、SW 被殺後從 `SESSION_UNLOCKED` 的 **既有 secrets 形狀** hydrate。那些路徑的真相已是 64-byte secret 的 bs58。本版若改 schema 會變成 [storage-migration](../../backlog/storage-migration.md)，超出「換庫」。

失敗模式：hydrate 只還原 AES vault key、沒 await 建好 Ed25519 signer → UI `unlocked` 但批准 `NO_KEY`。故 INDEX 要求 unlocked 旗標不得早於 signer 就緒。

## 為何 inject 不准 createClient

Wallet Standard inject 只登記帳戶與把 bytes 丟進擴充。Kit client／RPC 會把 content script 打肥，且容易誤把簽名能力放進 page。地址用 bs58 或極小 codec 即可。

## 為何 0.19 解讀不改用 program codec

0.19 用精確 data 長度當「已解」門檻，禁止半套。Plugin decoder 可能接受較寬 layout（多簽、extensions）。遷庫版若順便換 decoder，審批明細會靜默變樣。故只換 `PublicKey` → 字串。

## 為何推翻 0.9.0「必須用 web3.js Message.from」

那條是為了 **禁止用魔術首字節假裝 parse**。等價物是 Kit message codec 的 round-trip 長度。語意保留，實作庫名換掉。

## 為何不在本版做清空 token account

那是產品功能（後續 [0.21.0](../../0.21.0/INDEX.md)）。本版只換組 ix 的庫；清空帳戶仍須獨立 INDEX（CU 常數、分批、聚合數字）。遷完 Kit 之後做會比較順，但不綁在 0.20.0。

## 隨機帳戶仍從 bytes 建（不改 vault）

Burner／新增帳戶今日 `Keypair.generate()`。Kit 對等是 CSPRNG 32 bytes 再匯入 signer，寫回仍 bs58 64-byte。不改用不可 extract 的純 CryptoKey 當金庫列。

## 否決

| 方案 | 為何否 |
|------|--------|
| 升級到 web3.js v2 但仍叫 `@solana/web3.js` | 官方已品牌化為 Kit；新程式庫走 `@solana/kit` |
| Chrome 不支援 Ed25519 就放棄 Kit | 現況簽名也不靠 SubtleCrypto Ed25519（nacl／Keypair）；本版可從 bytes 建 signer。真缺 API 時 signMessage 可暫留 nacl，不是退回 v1 Connection |

## signMessage 仍用 tweetnacl（0.20.0 出貨）

`finishSignMessage` 對一般 UTF-8 訊息仍呼叫 `nacl.sign.detached`、密鑰為 vault 的 64-byte `secretKeyBytes`（與遷庫前同一 wire）。簽 **交易** 走 Kit `partiallySignWireTransaction`。規劃已拍板：0.20.0 **不**把 signMessage 改 Kit（vault 已有 bytes、與 Wallet Standard 慣例一致；少一個依賴不值得本版回歸）。之後刪 nacl 須另開版本。
| begin-send 改成 client.sendTransaction 一次送出 | 與 0.12／0.13 審批後才廣播衝突 |
