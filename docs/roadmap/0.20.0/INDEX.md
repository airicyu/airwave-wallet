# 0.20.0 — 全轉 Solana Kit（行為不變）

- **狀態：** `shipped`
- **上游版本：** [0.19.0](../0.19.0/INDEX.md)。本版只把 Solana 客戶端從 `@solana/web3.js` **v1** 換成官方 Kit 棧。**不改**使用者可見流程、文案、pending／custody／storage／Wallet Standard 能力表、模擬差額公式、CU 規則、0.19 靜態解讀變體表
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃對話（2026-10-07）。官方文件 [Kit getting started](https://www.solanakit.com/docs/getting-started)、[Upgrade guide](https://www.solanakit.com/docs/upgrade-guide)。**不是**清空 token account（仍 [backlog](../backlog/close-empty-token-accounts.md)）
- **畫面：** 不改。沿用 [`docs/design-principles.md`](../../design-principles.md) 與 0.19.0 已出貨畫面
- **秘密欄位：** 無新密碼欄；vault blob **不**改 schema

## 產品句

擴充與 test-web 的 Solana 編解碼、RPC、組指令、簽名改走 `@solana/kit` 與所列 program／plugin 套件；對使用者與 dApp 而言，連接、簽署、送出、持倉、Activity、審批與 0.19.0 相同。出貨後倉庫不再直接依賴 `@solana/web3.js`。

## 文件地圖

1. 本檔
2. [docs/kit-migration-how.md](./docs/kit-migration-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 行為契約（本版不推翻語意，只換庫）：[0.9.0](../0.9.0/INDEX.md)（交易當訊息）、[0.10.0](../0.10.0/INDEX.md)（模擬；0.10.1 差額改 pre／post 寫在該目錄 changelog／INDEX，無獨立 `0.10.1/` 資料夾）、[0.11.0](../0.11.0/INDEX.md)（CU）、[0.12.0](../0.12.0/INDEX.md)（送出）、[0.17.0](../0.17.0/INDEX.md)（signAndSend）、[0.19.0](../0.19.0/INDEX.md)（靜態解讀／Inspector）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 與 0.19.0 | pending 只在 SW Map、不進 `chrome.storage`、結果只回原 tab、inject 不持鑰、能力表、CU／`workingTx`、差額主舞台、`unparseable`、0.19 變體表與 Inspector URL 規則：**維持**。本版**推翻**的只有「實作必須 import `@solana/web3.js`」——含 0.9.0「交易當訊息必須用 `Message.from`／`VersionedMessage.deserialize`」改為 **同等 round-trip**（見 HOW），判定結果須與遷庫前同一組測試向量一致 |
| 範圍 | `wallet/` 與 `test-web/` 全部去掉直接依賴 `@solana/web3.js`。popup／approval UI **不**為遷庫改 DOM／文案／class |
| 依賴 | 允許 HOW 清單中的 Kit 與 `@solana-program/*`、可選 kit-plugin。**出貨禁止** `@solana/web3.js`、**禁止**留下 `@solana/compat`。GUIDELINES「壓低 3rd-party」本版**明示讓步**：這些是官方拆包，不是亂加巨獸 |
| RPC | 禁止 `Connection`。用 Kit rpc（或 plugin client 的 `.rpc`）。Endpoint **永遠**是當下 Settings 的 `rpcUrl`（含 Helius／custom），禁止寫死 public devnet 當錢包主路徑 |
| 地址 | 禁止 `PublicKey` class。用 Kit `address`（或等價品牌字串）。`parsePublicKeyBase58` 仍回 base58 字串或 `null`，非法輸入失敗行為與現況相同 |
| Custody | Vault **仍** `accountId → bs58(64-byte secret)`。解鎖可建 Kit signer，但密文真相仍是 bytes。`unlocked === true` **不得早於**該次解鎖要使用的 signer 已建好。禁止 `signerFromFile`。禁止把 Ed25519 材料新增持久欄位。**隨機新帳戶／Burner：** 用 `crypto.getRandomValues` 產生 seed 再建 Kit signer 與 64-byte 寫回；禁止 web3 `Keypair.generate` |
| 簽名 | dApp／錢包送出的 wire 仍是 Wallet Standard bytes。內部 deserialize／部分簽／serialize 走 Kit。`signMessage` **維持** `nacl.sign.detached`（64-byte secret）；不在本版改 Kit bytes signer。簽交易禁止 tweetnacl |
| 交易當訊息 | 同一 shared 函式；enqueue 與 finish／關窗重算；UI 只信旗標。實作改 Kit message codec round-trip 全長。禁止魔術 byte 判定 |
| 自組 tx | `wallet-begin-send` 用 program 套件組 ix；仍先 pending、批准後才簽才廣播。禁止 begin 階段 `sendTransaction` 上鏈 |
| 模擬／CU／解讀 | 公式與 0.19 手寫變體表不變；只換 Connection／tx／PublicKey 實作。解讀**不要**改用寬鬆 plugin decode |
| inject | 不引入 Kit client／RPC。只處理帳戶地址與把 bytes 轉進 bridge |
| test-web | 組測試交易與 airdrop 改 Kit；按鈕與 feature 路徑不變 |
| 數字 | 鏈上整數繼續 `BigInt`／字串；Kit 的 `lamports` 品牌型別可用。禁止 JS `number` 做金額加減乘除 |
| Storage／命令 | **不**新增、不改名 command 與 `chrome.storage` key |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.20.0`。狀態改 `shipped` 須使用者同意 |

## 非目標

- 清空空 token account、聚合送出、地址簿、Sidebar、i18n、Agent
- 改模擬差額、CU 上下限、Default CU price、0.19 已解／hex 門檻、Inspector 選站
- 宣告新的 Wallet Standard 方法；改 pending 生命週期
- vault schema／storage 世代遷移
- 把 popup 審批殼改成 Kit React hooks
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.19.0 | 0.20.0 |
|--------|--------|
| `@solana/web3.js` v1：`Connection`／`Keypair`／`VersionedTransaction` | `@solana/kit`＋ program 套件；出貨無 web3.js |
| 0.9.0 契約點名 web3 `Message.from` | 同等 codec round-trip，庫換成 Kit |
| begin-send 手寫 Token／ATA data | 優先 `@solana-program/*` 組 ix，產品規則不變 |
| 畫面與流程 | **不變** |

## 實作 Track

### Track 1 — 依賴與共用葉

- **做：** wallet 安裝 HOW 允許套件。改 `shared/accounts.ts`、`shared/seed-derive.ts`、`shared/sign-message-tx.ts` 去掉 web3.js。抽出 `createSolanaRpc(settings.rpcUrl)` 小工廠（可放 `background` 或 `shared`，勿放 inject）。交易當訊息改 Kit round-trip（測資構造見 HOW）。`shared/home-tokens.ts` 本軌**若仍 import web3 可暫留**，Track 3 必須與 `home-tokens-service.ts` **兩檔一起**刪 web3。
- **不做：** 改 UI；改 vault schema；動 finish-pending 簽署（可先留編譯用暫時轉接，但不得在出貨殘留 web3）。
- **驗收：** 本軌結束時 `shared/accounts.ts`、`seed-derive.ts`、`sign-message-tx.ts` 無 web3 import。不要求整包 `npm run typecheck` 已綠（其餘檔仍可能 web3）。依 HOW 構造：無尾部 v0 或 legacy message → `messageLooksLikeTransactionMessage` true；短 UTF-8 句子 → false。

### Track 2 — Session 與簽署

- **做：** `session.ts` 與 `account-ids`／`sign-gates`／account／session commands：`Keypair` → bytes + Kit signer。`finish-pending.ts` 簽 tx 走 Kit。`wallet-finish-send.ts` **整檔**去掉 web3.js：部分簽走 Kit，廣播與等 `confirmed` 改 Kit rpc（仍 `settings.rpcUrl`；時序與 skipPreflight 等維持 0.17／0.13）。unlock／hydrate await signer。inject 去掉 `PublicKey`。
- **不做：** 改錯誤碼字串語意（`WALLET_LOCKED`／`NO_KEY` 等維持）；改 popout 鎖定流程。
- **驗收：** typecheck。靜態：`getKeypair` 不復存在或不再 export 給 handlers；`unlocked` 賦值在 signer 就緒之後。

### Track 3 — RPC 讀取、模擬、CU、送出組 ix

- **做：** `shared/home-tokens.ts` 與 `background/home-tokens/home-tokens-service.ts`、home-activity、simulate-pending-tx、sign-tx-simulate、compute-budget-tx、decode-compiled-ix、ui-handlers、wallet-begin-send：去掉 `Connection`／`VersionedTransaction`／`PublicKey`／CB program class。begin-send 改 program 套件。解讀仍手寫變體表。
- **不做：** 改差額公式、改 0.19 `decoded` 條件、改 Inspector query 規則（只換 serialize 實作）。
- **驗收：** typecheck。`wallet/src` 內無 `@solana/web3.js` import。

### Track 4 — test-web 與掃尾

- **做：** test-web 遷 Kit、刪兩包的 web3.js 依賴。確認無 `@solana/compat`。`cd wallet && npm run typecheck && npm run build`；`cd test-web && npm run build`。
- **不做：** 新按鈕、新 feature。
- **驗收：** `package.json` dependencies 無 `@solana/web3.js`。源碼 grep 無該字串（除註解若有「舊 v1」說明，盡量不留）。

### Track 5 — 手驗

- **做：** 未封裝擴充 + test-web：connect、signMessage UTF-8、signMessage 像交易（批准 disabled）、signTransaction、signAndSendTransaction、walletSend、解鎖後再簽、Activity／持倉仍能查。另：未簽交易改 CU、套用後批准簽的是寫入後的 `workingTx`；點 Explorer 打開的 URL 為 `https://explorer.solana.com/tx/inspector` 且含 `message=`，`cluster` 依 Settings（devnet → `devnet`，否則 `mainnet-beta`）。
- **不做：** 清空帳戶功能。
- **驗收：** 見下方 checklist。環境無法載擴充則在 implementation-review 逐條標未走完。

## 驗收（出貨 checklist）

- [x] `wallet/package.json` 與 `test-web/package.json` 的 `dependencies` 無 `@solana/web3.js`；無 `@solana/compat`。兩包 `package-lock.json` 對該 package 的**直接** dependencies 亦無 `@solana/web3.js`（傳遞依賴不算未完成）
- [x] `wallet/src` 與 `test-web/src` 無 `from "@solana/web3.js"`
- [x] command 字串與 storage key 相對 0.19.0 無新增無改名
- [x] vault secrets 形狀仍為 bs58 64-byte；無新 persist 私鑰欄
- [x] 交易當訊息：可 parse 的整段 message → 短句＋批准 disabled＋`SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`；一般 UTF-8 仍可簽
- [x] `signTransaction` 批准只簽不廣播；`signAndSendTransaction`／`walletSend` 仍等到 confirmed（後者宿主仍 popup）
- [x] 未簽可改 CU、套用後簽 `workingTx`；模擬差額與 0.19 明細解讀門檻不變
- [x] Inspector URL 仍 `explorer.solana.com/tx/inspector` 且含 message base64；cluster 規則不變
- [x] inject 無 Kit RPC／無密鑰
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過；`cd test-web && npm run build` 通過
- [x] 手驗：使用者 2026-10-07 確認重新載入未封裝擴充後通過（含先前失敗的批准送出；`sendTransaction` 明示 base64）
- [x] 文件與程式無真實密碼／助記詞／私鑰
- [x] 版本號檔對齊 `0.20.0`；使用者 2026-10-08 同意出貨，狀態 `shipped`

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/package.json` | 刪 web3.js、加 Kit |
| `wallet/src/shared/seed-derive.ts` | `Keypair.fromSeed` |
| `wallet/src/shared/sign-message-tx.ts` | 0.9.0 判定 |
| `wallet/src/shared/accounts.ts` | `parsePublicKeyBase58` |
| `wallet/src/shared/home-tokens.ts` | Connection／PublicKey 常數與查詢 |
| `wallet/src/background/session/session.ts` | 解鎖 Keypair Map |
| `wallet/src/background/wallet/account-commands.ts`、`session-commands.ts` | `Keypair.generate`／fromSecretKey |
| `wallet/src/background/pending/finish-pending.ts` | nacl／`tx.sign` |
| `wallet/src/background/send/wallet-begin-send.ts` | 手組 ix |
| `wallet/src/background/send/wallet-finish-send.ts` | `tx.sign`＋Connection 廣播 |
| `wallet/src/background/simulate/simulate-pending-tx.ts` | Connection＋VersionedTx |
| `wallet/src/background/simulate/decode-compiled-ix.ts` | PublicKey 比 program id |
| `wallet/src/inject/wallet.ts` | inject 僅 PublicKey |
| `test-web/src/main.ts` | 測試 dApp 組 tx |
