# Design review — 0.20.0 Airwave Wallet

- 日期：2026-10-07（Asia/Hong_Kong）；本輪同日
- 輪次：**第 4 輪複審**（初審、第 2／3 輪複審同日已存在；本輪不重編號）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`kit-migration-how.md`](./kit-migration-how.md)、[`../HANDOFF.md`](../HANDOFF.md)、[`reasoning.md`](./reasoning.md)；行為上游 [0.19.0 INDEX](../../0.19.0/INDEX.md)、[0.9.0 INDEX](../../0.9.0/INDEX.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`session.ts`、`sign-message-tx.ts`、`finish-pending.ts`、`wallet-begin-send.ts`、`wallet-finish-send.ts`、`inject/wallet.ts`、`simulate-pending-tx.ts`、`wallet/package.json`（現碼仍為 0.19 棧，**未實作本版 ≠ HIGH**）
- **總評：** 無未關閉 HIGH。提案可行。審查門檻**通過**。M1–M6 維持關閉。**M7 關閉**（INDEX Track 2 已寫 `wallet-finish-send.ts` 整檔去 web3：部分簽＋廣播／等 `confirmed` 改 Kit rpc；HANDOFF Track 2 同向）。仍開：**L2**（非阻擋）。無新增應修 MEDIUM。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

（無，維持初審）

本輪再核：未推翻 pending 只在 SW、結果只回原 tab、storage＋`onChanged`、custody／inject 不持鑰、不宣告新 Wallet Standard 方法。清空空 token account 仍為非目標並鏈 [backlog](../../backlog/close-empty-token-accounts.md)。出貨禁 `@solana/compat` 與禁直接依賴 web3.js **同向**。0.9.0「必須 `Message.from`／`VersionedMessage.deserialize`」改為 Kit **message** codec round-trip 全長＋禁魔術首字節，與 0.9.0 判定語意等價。待拍板表空。

現碼 `loadSecrets` 同步建 `Keypair` 後立刻 `unlocked = true`；提案要求 hydrate／unlock **await signer 再建旗標**，與現行同步路徑可調和，不構成互斥。

現碼 `wallet-finish-send.ts` 仍 `tx.sign`＋`new Connection`＋`sendRawTransaction`／`getSignatureStatuses`；契約已指定本檔整檔在 **Track 2** 換 Kit，現碼未遷 ≠ HIGH。`wallet-send-broadcast.ts` 僅 `chrome.runtime.sendMessage` 的 UI notice，與鏈上廣播無關，不另開 finding。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| **M1** | **關閉**（維持） | INDEX 已定案 Custody：隨機新帳戶／Burner 用 `crypto.getRandomValues` 再建 Kit signer 與 64-byte 寫回；禁止 web3 `Keypair.generate`。HOW 職責對照已有 `Keypair.generate()` 列；禁止 `signerFromFile`。HANDOFF Track 2 含隨機帳戶 generate。 |
| **M2** | **關閉**（維持） | INDEX Track 1：`shared/home-tokens.ts` 可暫留 web3；Track 3 必須與 `home-tokens-service.ts` **兩檔一起**刪 web3。錨點表已列 shared 檔。 |
| **M3** | **關閉**（維持） | INDEX 錨點已含 `shared/accounts.ts`、`decode-compiled-ix.ts`、`wallet-finish-send.ts`、`account-commands.ts`／`session-commands.ts`。 |
| **M4** | **關閉**（維持） | INDEX 出貨驗收：兩包 `package-lock.json` 對該 package 的**直接** dependencies 亦無 `@solana/web3.js`（傳遞不算未完成）。HOW 靜態掃尾同向。 |
| **M5** | **關閉**（維持） | INDEX Track 5 **做**已列未簽改 CU／簽 `workingTx`，以及 Inspector URL／`cluster` 規則。出貨 checklist 對應句仍在。 |
| **M6** | **關閉**（維持） | INDEX Track 1 驗收：不要求整包 `npm run typecheck` 已綠。HOW 交易當訊息列寫死 Track 1 測資構造：無尾部 v0 或 legacy message → true；短 UTF-8 句子 → false；禁止首字節魔術；不必貼 hex。 |
| **M7** | **關閉** | INDEX Track 2 **做**：`wallet-finish-send.ts` **整檔**去掉 web3.js：部分簽走 Kit，廣播與等 `confirmed` 改 Kit rpc（`settings.rpcUrl`；時序與 skipPreflight 維持 0.17／0.13）。Track 3 清單仍為 begin-send／模擬／home-tokens 等讀寫，不再漏該檔廣播。HANDOFF Track 句：`wallet-finish-send` 整檔（簽＋廣播）。HOW `sendRawTransaction`＋`getSignatureStatuses` 職責列與 Track 2 分軌對齊。 |

本輪未新增 MEDIUM。Track 2／3 其餘 web3 錨點（session、finish-pending、inject、begin-send、simulate、home-activity、ui-handlers）分軌清楚。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| **L1** | **關閉** | INDEX 文件地圖已說明：0.10.1 差額改 pre／post 寫在 `0.10.0/` changelog／INDEX，無獨立 `0.10.1/` 資料夾；連結為 `../0.10.0/INDEX.md`。 |
| **L2** | **仍開** | 可選套件名 `@solana/kit-plugin-*` 以 npm 穩定版職責為準，非硬鎖字串。非阻擋。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 兩包 `dependencies` 無 web3.js／compat；lock 直接依賴同向 | 可 | M4 已關 |
| src 無 `from "@solana/web3.js"` | 可（grep） | M7 已關（finish-send 整檔 Track 2）；Track 3 驗收仍兜底 `wallet/src` |
| command／storage key 相對 0.19 無新增改名 | 可 | 無 |
| vault 仍 bs58 64-byte；無新 persist 私鑰欄 | 可 | HOW 已禁 CryptoKey 當長期真相 |
| 交易當訊息：可 parse 整段 message → 短句＋批准 disabled＋`SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`；UTF-8 可簽 | 可；Track 1 構造已寫 | M6 已關 |
| `signTransaction` 只簽不廣播；signAndSend／walletSend 等到 confirmed | 可（沿用 0.12／0.17） | Track 2 寫死 finish-send 等 confirmed |
| 未簽改 CU、簽 `workingTx`；差額與 0.19 解讀門檻不變 | 可 | M5 已關 |
| Inspector URL／cluster | 可（沿用 0.19） | M5 已關 |
| inject 無 Kit RPC／無密鑰 | 可（靜態） | 無 |
| typecheck／build | 出貨可；Track 1 不要求整包綠已寫死 | M6 已關 |
| 手驗 test-web 或記無法載擴充 | 可 | Track 5 含 CU／Inspector |
| 無真實秘密；版本號出貨對齊 | 可 | 無 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。抽樣與提案**可調和**。

| 現況 | 與提案 |
|------|--------|
| `wallet/package.json` 0.19.0、依賴 `@solana/web3.js` ^1.98.4 | 終態刪除；禁 compat |
| `sign-message-tx.ts`：`VersionedMessage.deserialize`／`Message.from`＋全長 | 推翻庫名、保留判定；等價 |
| `session.ts`：`Map<string, Keypair>`；`loadSecrets` 後 `unlocked = true` | 改 Kit signer；async 則旗標不得早於 signer（契約已寫） |
| `account-commands.ts`／`session-commands.ts`：`Keypair.generate()` | INDEX／HOW 已定 CSPRNG＋Kit |
| `finish-pending.ts`：`VersionedTransaction`＋tweetnacl 簽訊息 | 簽 tx 走 Kit；signMessage 優先 Kit，例外僅該路徑可留 nacl |
| `wallet-begin-send.ts`：手寫 ix、`Connection` | program 套件；begin 不上鏈（Track 3） |
| `wallet-finish-send.ts`：`tx.sign`＋`Connection` 廣播／確認 | **Track 2 整檔**去 web3（M7 已關） |
| `simulate-pending-tx.ts`：Connection＋VersionedTx＋ALT | Kit RPC／codec；公式與 0.19 變體表不變 |
| `inject/wallet.ts`：僅 `PublicKey` 轉 address／32 bytes | 刪 web3；禁止 client／RPC／密鑰 |
| pending／`sendBridgeResult(tabId)` | 本版不改；合禁區 |

未把 `brainstorm/` 或 `../solibra-wallet` 當現行程式。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | MEDIUM | 關閉 | INDEX 已定案 Custody；HOW 職責對照 `Keypair.generate()`；HANDOFF Track 2 |
| M2 | MEDIUM | 關閉 | INDEX Track 1 暫留句＋Track 3 兩檔；錨點 `shared/home-tokens.ts` |
| M3 | MEDIUM | 關閉 | INDEX 錨點表 |
| M4 | MEDIUM | 關閉 | INDEX 出貨驗收 lockfile 直接依賴；HOW 靜態掃尾 |
| M5 | MEDIUM | 關閉 | INDEX Track 5 做；出貨 checklist CU／Inspector |
| M6 | MEDIUM | 關閉 | INDEX Track 1 驗收 typecheck 邊界；HOW 交易當訊息測資構造 |
| M7 | MEDIUM | 關閉 | INDEX Track 2：`wallet-finish-send.ts` 整檔（簽＋Kit rpc 廣播／confirmed）；HANDOFF Track 2 同句 |
| L1 | LOW | 關閉 | INDEX 文件地圖 0.10.1 說明 |
| L2 | LOW | 仍開 | 非阻擋 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-07 | 可行；無 HIGH；門檻通過。五則 MEDIUM（generate、home-tokens 兩檔、錨點、lockfile、Track 5）。 |
| 第 2 輪複審 | 2026-10-07 | 可行；無 HIGH；門檻通過。M1–M5 仍開。新增 M6：Track 1 typecheck 邊界與交易當訊息測資未寫死（構造規則可寫、不必貼 hex）。契約自相矛盾未達 HIGH；0.9.0 推翻等價；提案不可行＝否。 |
| 第 3 輪複審 | 2026-10-07 | 可行；無 HIGH；門檻通過。M1–M6、L1 已寫進契約故關閉。新增 M7：`wallet-finish-send` 廣播／`Connection` 未分軌寫死（預設應修）。L2 非阻擋。提案不可行＝否。 |
| 第 4 輪複審 | 2026-10-07 | 可行；無 HIGH；門檻通過。M1–M6 維持關閉。M7 關閉（Track 2 整檔含廣播）。仍開應修 MEDIUM：無。L2 非阻擋。提案不可行＝否。 |
