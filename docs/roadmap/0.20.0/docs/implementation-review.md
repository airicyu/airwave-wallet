# Implementation review — 0.20.0 Airwave Wallet

- 日期：2026-10-07（Asia/Hong_Kong）；第 2 輪複審同日
- 輪次：**第 2 輪複審**
- 角色：實作審查（不改程式、不改 INDEX／HOW／reasoning／HANDOFF、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收
- HOW／WHY／HANDOFF：[`kit-migration-how.md`](./kit-migration-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 對照範圍：工作目錄磁碟（`wallet/`、`test-web/`）；不認 chat history
- 現行程式抽樣：同初審錨點；本輪加核 `sendTransaction`／`getBase64EncodedWireTransaction`／`encoding: "base64"`（`wallet-finish-send.ts`、`test-web/src/main.ts`）、`simulateTransaction` encoding、`handleBeginSend`、`decode-compiled-ix.ts`
- **總評：** 靜態對照與 typecheck／兩包 `build` 通過；Kit 遷庫主路徑成立。**無未關閉 HIGH。** M1／M2 均關閉（M2：使用者 2026-10-07 確認重新載入未封裝擴充後手驗通過，含批准送出）。L1 lockfile 根 version 已改為 0.20.0。使用者 2026-10-08 同意出貨，INDEX 狀態 `shipped`。

## Findings（本輪）

關閉＝對照 INDEX／磁碟已滿足；仍開＝實作相對契約仍缺或未驗。穩定 ID 本檔內不重編號。

### HIGH

（無）

未發現：出貨殘留 `@solana/web3.js` 或 `@solana/compat`；inject 建 Kit RPC／持鑰；`signerFromFile`；vault 新增私鑰 persist 欄；begin-send 呼叫 `sendTransaction` 上鏈；`unlocked = true` 早於 `loadSecrets` 建完 signer；改 command／storage key 名；Kit `sendTransaction` 省略 encoding（會被 JSON-RPC 當 base58）。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | 本輪於工作目錄實際執行 INDEX 三道指令，皆 **exit 0**（見「測試結果」）。無整包 `bun test`／`npm test`（INDEX 未要求）。 |
| M2 | **關閉** | 使用者 2026-10-07 確認重新載入未封裝擴充後手驗通過（含先前 `sendTransaction` 未標 base64 導致的 `-32602`；現已明示 `encoding: "base64"`）。報告不記地址／金額。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | `wallet/package-lock.json` 根節與 `packages[""].version` 已改為 `0.20.0`，與 `package.json` 對齊。 |
| L2 | **非阻擋** | `sign-gates.ts` 仍 export 已標 `@deprecated` 的 `keypairForAccountId`（實為 `LoadedAccountKeys`，非 web3 `Keypair`）。`send-command.ts`／`ui-handlers.ts` 仍呼叫該別名。Track 2 要求 `getKeypair` 不復存在——**已刪**；別名殘留不擋出貨。 |
| L3 | **非阻擋** | `simulate-pending-tx.ts` `buildDeltas` 對 native `preBalances`／`postBalances` 仍用 JS `number` 加減。INDEX 要求差額**公式**與 0.19 相同，且鏈上整數「繼續」BigInt；此處屬沿用既有 native 欄位型別，非本版新引入 web3 `number` 金額 API。 |
| L4 | **關閉** | 使用者 2026-10-08 同意出貨。INDEX 狀態 `shipped`。版本檔與 changelog 已是 0.20.0。 |

本輪無新增 ID。

## 重點核對（對照 INDEX／HOW）

| 項 | 結論 | 證據 |
|----|------|------|
| 刪 `@solana/web3.js` | **通過** | `wallet/package.json`、`test-web/package.json` 無該依賴；`wallet/src`、`test-web/src` 無 `from "@solana/web3.js"`；兩 lock 直接依賴亦無 |
| 禁 `@solana/compat` | **通過** | 程式與兩包 `package.json`／lock 直接依賴無該套件名 |
| 引入 Kit | **通過** | `@solana/kit` ^8.4.0；program：system／token／token-2022／compute-budget |
| RPC | **通過** | `solanaRpcForUrl` → `createSolanaRpc(rpcUrl)`；home／simulate／begin／finish 取 `settings.rpcUrl`。無 web3 `Connection` |
| Kit `sendTransaction` encoding | **通過** | `wallet-finish-send.ts` 與 `test-web/src/main.ts`：`getBase64EncodedWireTransaction`＋`encoding: "base64"`。全 `wallet/src`／`test-web/src` 僅此兩處 `.sendTransaction(`；`simulateTransaction` 亦明示 `encoding: "base64"` |
| 地址 | **通過** | `parsePublicKeyBase58` 回 base58 字串或 `null` |
| session unlocked vs signer | **通過** | `loadSecrets`：先 `unlocked = false`，`await` 全部 `loadedAccountFromStoredSecret`（含 Kit signer）後才 `unlocked = true`；hydrate `await loadSecrets` |
| `getKeypair` | **通過** | 已無此符號；改 `getLoadedAccount`／`loadedAccountForAccountId` |
| 隨機帳戶 | **通過** | `generateRandomLoadedAccount`：`crypto.getRandomValues` 32-byte seed |
| vault bs58 64-byte | **通過** | `VaultSecrets.secrets` 仍 `Record<string,string>`；`storedSecretFromBytes`／PKCS8+raw 組 64-byte 再 bs58；SESSION_UNLOCKED blob 無新私鑰欄 |
| 交易當訊息 | **通過**（靜態） | Kit compiled message decode／encode round-trip 全長；無魔術首字節 |
| signMessage | **通過**（靜態） | `nacl.sign.detached`＋64-byte `secretKeyBytes`；簽交易走 Kit `partiallySignWireTransaction` |
| 自組 tx／begin-send | **通過** | program 套件組 ix → `compileTransaction` → `encodeWireTransaction`；`handleBeginSend` 只 `addPending`，批准前不上鏈 |
| `wallet-finish-send` | **通過** | 整檔：Kit 部分簽＋`sendTransaction`（base64）＋`getSignatureStatuses` 等到 confirmed／finalized |
| 模擬／CU／解讀 | **通過** | `decode-compiled-ix.ts` 仍手寫 disc＋精確長度（字串 program id）；CU 走 `@solana-program/compute-budget` |
| Inspector | **通過**（靜態） | `buildInspectorUrl`：`https://explorer.solana.com/tx/inspector`、`message=`、cluster 規則 |
| inject | **通過** | 無 `@solana/kit`、無 RPC、無 signer／密鑰；`bs58`＋長度 32 |
| test-web | **通過**（靜態＋build） | Kit 組 tx／airdrop／廣播；`package.json` 無 web3.js |
| command／storage | **通過** | `AirwaveCommand` 與 `STORAGE`／`SESSION_UNLOCKED` 無相對 0.19 產品契約新增改名 |
| 數字 | **部分沿用** | 送出金額 `BigInt`；模擬 native 差額見 L3 |
| 版本號檔 | **通過** | `0.20.0` 已寫入 package／manifest／`version.md`／changelog |

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| 兩包 `dependencies` 無 `@solana/web3.js`；無 `@solana/compat`；lock 直接依賴亦無 web3.js | **通過** | 見上表 |
| `wallet/src` 與 `test-web/src` 無 `from "@solana/web3.js"` | **通過** | grep 無匹配 |
| command 字串與 storage key 相對 0.19.0 無新增無改名 | **通過** | `commands.ts`、`storage-keys.ts` |
| vault secrets 仍 bs58 64-byte；無新 persist 私鑰欄 | **通過** | `crypto-vault.ts`、`keypair-bytes.ts`、`session.ts` blob |
| 交易當訊息：可 parse 整段 message → 短句＋批准 disabled＋`SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`；一般 UTF-8 可簽 | **通過**（靜態）／**手驗未做** | `sign-message-tx.ts`、`finishSignMessage` |
| `signTransaction` 只簽不廣播；`signAndSendTransaction`／`walletSend` 等到 confirmed | **通過**（靜態）／**手驗未做** | `finishSignTransaction` 只回 `signedTransaction`；`runWalletSendAfterApprove` 廣播後等 confirmed |
| 未簽可改 CU、套用後簽 `workingTx`；模擬差額與 0.19 解讀門檻不變 | **通過**（靜態）／**手驗未做** | `getWorkingTx`；`decode-compiled-ix` 手寫表 |
| Inspector URL 規則 | **通過**（靜態）／**手驗未做** | `buildInspectorUrl` |
| inject 無 Kit RPC／無密鑰 | **通過** | `inject/wallet.ts` |
| `cd wallet && npm run typecheck` 與 `npm run build`；`cd test-web && npm run build` | **通過** | 本輪三指令皆 exit 0（M1 關閉） |
| 手驗 test-web | **通過**（使用者確認） | M2 關閉 |
| 文件與程式無真實密碼／助記詞／私鑰 | **通過**（抽樣） | 本報告未貼秘密 |
| 版本號檔對齊 `0.20.0` | **通過** | L4 關閉：使用者 2026-10-08 同意，INDEX `shipped` |

## 測試結果

指令（INDEX 驗收／Track 4）。本輪**實際執行**，禁止假設 `bun test`。

```text
cd wallet && npm run typecheck
cd wallet && npm run build
cd test-web && npm run build
```

| 指令 | exit code | 摘要 |
|------|-----------|------|
| `wallet` `npm run typecheck`（`tsc --noEmit`） | **0** | 無診斷輸出，約 6.5s |
| `wallet` `npm run build`（`tsc --noEmit && vite build`） | **0** | Vite 6.4.3 production；267 modules；built in 2.63s |
| `test-web` `npm run build`（`tsc --noEmit && vite build`） | **0** | Vite 6.4.3；106 modules；built in 1.04s |

**整包測試：** 無 `bun test`／倉庫層 `npm test`（INDEX 未列）。手驗：使用者 2026-10-07 確認重新載入擴充後通過（M2 關閉）。

## 修復追蹤

| ID | 級 | 狀態 | 建議 |
|----|----|------|------|
| M1 | M | **關閉** | 三道指令 exit 0 已寫入本檔 |
| M2 | M | **關閉** | 使用者確認重新載入後手驗通過 |
| L1 | L | **關閉** | lockfile 根 version 已 0.20.0 |
| L2 | L | 非阻擋 | 可刪 `keypairForAccountId` 別名、handlers 改呼叫 `loadedAccountForAccountId` |
| L3 | L | 非阻擋 | 非本版必改；差額公式勿在遷庫時順便重寫 |
| L4 | L | **關閉** | 使用者 2026-10-08 同意出貨 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-07 | 無 HIGH。Kit 遷庫靜態對照通過。typecheck／build 與瀏覽器手驗未在本輪取得證據（M1／M2）。 |
| 第 2 輪複審 | 2026-10-07 | 無 HIGH。M1 關閉（三指令 exit 0）。當時 M2 仍開。sendTransaction 已明示 base64。 |
| 手驗收斂 | 2026-10-07 | 使用者確認重新載入擴充後通過。M2／L1 關閉。無 HIGH。`shipped` 仍待使用者同意。 |
| 出貨 | 2026-10-08 | 使用者同意。INDEX 狀態改 `shipped`。無新 HIGH。 |
