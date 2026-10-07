# 0.21.0 — 清理空 token account

- **狀態：** `shipped`
- **上游版本：** [0.20.0](../0.20.0/INDEX.md)（Solana 客戶端已是 `@solana/kit`；本版才做清空）。持倉濾掉餘額 0 見 [0.7.0](../0.7.0/INDEX.md)。單一可簽送出走 [0.12.0](../0.12.0/INDEX.md)／[0.13.0](../0.13.0/INDEX.md) 的 `walletSend`，**本版不改那條**
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 backlog 構想（出貨已刪檔）；見 [docs/reasoning.md](./docs/reasoning.md)。畫面概念稿 [`docs/design-demos/close-empty-token-accounts-ux.html`](../../design-demos/close-empty-token-accounts-ux.html)（非正式；衝突以本 INDEX／HOW 為準）
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)
- **秘密欄位：** 無新密碼欄；vault blob 不改 schema

## 產品句

人在 Home 看這一戶時，能勾選它名下數量為 0 的 token account，一次確認後由錢包簽名並送出，把 rent 收回成 SOL。塞不進一筆交易就拆開，同時在飛幾筆交給 Kit executor 的預設；某一筆失敗或沒上鏈不取消其餘。這不是對 dApp 的新方法，也不走現有的簽署 popout。

## 文件地圖

1. 本檔
2. [docs/close-empty-how.md](./docs/close-empty-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.20.0](../0.20.0/INDEX.md)（Kit RPC／signer）、[0.12.0](../0.12.0/INDEX.md)（`walletSend` 仍單筆）、[0.11.0](../0.11.0/INDEX.md)（優先費進位、Default CU price）、[0.5.0](../0.5.0/INDEX.md)（聚合的可簽成員）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | Popup Home Tokens：掃描、勾選、確認、送出、結果。查詢、組交易、簽名、送出都在 service worker，RPC 只用當下 Settings 的 `rpcUrl`。popup 只渲染與確認。不改 `connect`／`signMessage`／`signTransaction`／`signAndSendTransaction`／`wallet.beginSend`。不宣告新的 Wallet Standard 方法 |
| 空 | 鏈上 token account 的數量為 0，帳戶仍在。有餘額的不關。native SOL 主帳戶不在掃描結果裡，不關。數量為 0 的 wSOL（mint `So11111111111111111111111111111111111111112`）可關，收回的是該 token account 的 lamports |
| 誰可關 | 只關 **owner 等於該可簽地址** 的帳戶。單一 `signing`：掃這個地址。聚合：只掃 **可簽成員** 的地址，觀察成員不掃。單一唯讀，或聚合裡沒有可簽成員：沒有入口。代幣帳戶的 close authority 若存在且不是該 owner：不列入 |
| Token-2022 | 沒有任何 extension、未凍結、數量 0、owner 為該可簽地址：可關。有任一 extension，或凍結：當成關不掉，不計入、不出現在清單。legacy Token 只要數量 0、未凍結、owner 相符就可關 |
| 入口 | 只在 Home **Tokens** 標題列，跟重新整理並排，回收圖示在重新整理左邊。`title` 與 `aria-label` 同一句「收回租金」。有可關帳戶時圖示為綠色，右下角數字是可關筆數。筆數為 0 但仍有至少一個可簽地址：同一顆變暗、不顯示 0、不能點。完全沒有可簽地址：不畫。Activity 頁與頂欄不放這顆。掃描未完成前不畫。**全** owner 掃描失敗（`RPC_ERROR`）不畫；**部分** owner 失敗仍顯示已掃到的筆數。持倉重新整理時 `list` 帶 `force: true` 清 SW 掃描快取 |
| 勾選頁殼 | 頂欄 Back＋標題「收回租金」＋Menu（對齊概念稿）。鎖定下仍可進勾選與看 `plan` 回傳的費用 |
| 勾選 | 整頁勾選，有全選。全選列在「目前清單每一列都勾」時為勾；點一下全選變全勾，再點一聲全不勾。沒勾任何列時殼底「下一步」disabled。可選超過一筆交易裝得下的數量。聚合清單依錢包分組（該成員名稱＋地址前 4…後 4）；單一可簽不分組。殼底文字：`已選 {n} · {m} 筆交易`。`m` 用 HOW 的打包函式，禁止寫死 8 |
| 確認頁 | 頂欄 Back＋「確認收回」＋Menu。主數字是勾選帳戶 lamports 加總換成 SOL（尚未扣手續費），下面 `{n} 個帳戶 · {m} 筆交易`。費用卡三列：手續費（簽名費＋優先費加總）、簽名費、優先費。其下依交易分組列出將關的帳戶（名稱或 mint 縮寫、token account 前 4…後 4、該戶 lamports 的 SOL）。殼底文字鈕「確認」。進入確認頁時先讓 Kit 估每一筆的 CU limit，再乘上我們的單價把費用算死。不打 `getFeeForMessage`，不用 `simulateTransaction` 回傳的 `fee` 欄 |
| 費用 | 每一筆交易：簽名費 `5000` lamports × 該筆 `numRequiredSignatures`（本版每筆恰好 1）。優先費＝`ceil(cuLimit × defaultCuPrice / 1_000_000)` lamports（與 [0.11.0](../0.11.0/INDEX.md) 相同進位；**大於 0 且不足 1 lamport 時為 1**）。`defaultCuPrice` 讀 Settings。畫面三列都是各筆加總。lamports 加減只用 `BigInt`。`cuLimit` 見下欄 |
| CU | **Limit** 交給 Kit 對該筆 message 的資源估算（合理上限加它自己的緩衝，封頂 1,400,000）。不寫死 `底 + 每關一戶`。估算在進入確認頁時做完，把得到的 limit 寫進該筆 `SetComputeUnitLimit`。**Price** 由我們寫：Settings 的 Default CU price，`SetComputeUnitPrice`。簽下去的就是這組 limit／price。送出時 executor `estimateResourceLimits: false`，禁止再模擬把畫面上的 limit 換掉。估算失敗：確認頁優先費與手續費寫「未知」，「確認」disabled，不改用 1,400,000 充數 |
| 打包 | 同一 owner、同一個 token program 的 Close 才進同一筆。destination＝該 owner（rent 回到該錢包，不歸集）。超過 HOW 的 1232-byte 封包就開下一筆。legacy 與 Token-2022 不混在同一筆。打包是 `wallet/src/shared/` 的純函式，popup 殼底的 `m` 與 SW 真正組出來的筆數用同一函式 |
| 送出 | 使用者在確認頁按一次「確認」。SW **先把這波每一筆簽完**（不在簽名迴圈裡打 RPC），再送出。送出走 `@solana/kit-plugin-rpc` 的 transaction plan executor，**不傳** `maxConcurrency`，用套件預設（撰寫時文件為 10）。本版不自寫在飛池、不把 5 寫進呼叫。`estimateResourceLimits: false`、`skipPreflight: false`。多筆放在 **parallel** plan（沒有 sequential 依賴）。呼叫用 `passthroughFailedTransactionPlanExecution` 接住「有筆失敗就丟錯」。某一筆失敗、過期或送出被拒，不取消其餘。等全部有結果才顯示結果頁。禁止 executor 在送出前用模擬改寫已寫入的 CU。RPC endpoint 永遠是 `settings.rpcUrl`，禁止 `solanaMainnetRpc`／`solanaDevnetRpc` 寫死 |
| 確認交易 | commitment `confirmed`。executor 若要 `rpcSubscriptions`，由同一個 `rpcUrl` 把 `https`→`wss`、`http`→`ws`。某一筆在 15 秒內沒有訂閱進度，或訂閱失敗：該筆改走與 `wallet-finish-send` 相同的 HTTP `getSignatureStatuses` 輪詢，上限 60 秒，並用該筆 `lastValidBlockHeight` 判斷過期。禁止因為沒有 wss 就把整波算失敗 |
| 結果 | 三數：已確認（上鏈且成功）、鏈上失敗（已到 `confirmed` 或 `finalized` 且 `err` 非空）、已過期（沒上鏈：blockhash 過期、送出被拒、預檢失敗、逾時、或 executor 給了 `canceled`）。主數字只加總 **已確認成功** 那些帳戶的 lamports。殼底「完成」回 Home Tokens，並重查持倉與空帳戶掃描。送出中全頁「確認中」／「等待這一波結束」，Back disabled，不逐筆畫進度 |
| 過期清單 | `planCloseEmpty` 在 SW 記憶體存每筆未簽 bytes、帳戶列表與費用快照（`planId`，TTL 15 分鐘，不進 storage）。`commitCloseEmpty` 送出前重讀帳戶；並以當下 `defaultCuPrice` 重算總手續費，與快照字串不符也算 stale。任一戶已不存在、數量不是 0、owner 不符、或 stale：整波不簽名、不送出，錯誤碼 `STALE_LIST`，留在確認頁並應重跑 `planCloseEmpty`。禁止默默少關幾戶仍送出 |
| 鎖定 | `wallet.listClosableTokenAccounts` 與 `wallet.planCloseEmpty` **允許**鎖定（對齊 `wallet.getHomeTokens`：可先掃、可先看費用）。僅 `wallet.commitCloseEmpty` 未解鎖時回 `WALLET_LOCKED`、不簽不送。確認頁「確認」在鎖定時 **disabled**（不另開解鎖子流程；使用者先回 Home 或現有鎖定屏解鎖後再按）。簽名使用 session 裡既有的 Kit signer。簽名迴圈結束後，送出只用已簽 bytes。鎖定不清掉已簽 bytes，也不撤回已廣播的交易；還沒簽到的不補簽，那些筆算已過期 |
| 離開 | 勾選頁 Back 回 Home。確認頁 Back 回勾選，勾選保留在 popup React state。切換作用中帳戶、離開這兩頁、或鎖定：清空勾選與確認草稿。送出進行中不因切頁而中止已簽名的送出；結果仍由 SW 算完，popup 若已離開則不強制彈回，下次進 Home 只看到重查後的餘額 |
| 狀態放哪 | 可關清單、勾選、這波簽名字節與送出結果只在記憶體（SW 與 popup state）。**不**寫進 `chrome.storage`。沒有新的 pending kind，不開 popout，URL 不帶 `requestId` |
| 命令 | 新增 popup→SW：`wallet.listClosableTokenAccounts`（payload 可選 `{ force?: boolean }`；掃目前作用中帳戶）、`wallet.planCloseEmpty`（勾選的 token account 地址；SW 組未簽 tx、Kit 估 CU、寫入 limit／price、回傳費用與 `planId`）、`wallet.commitCloseEmpty`（`{ planId }`；stale 檢查、簽名、executor 送出）。`list`／`plan` **不回** `WALLET_LOCKED`。`commit` 才回。失敗碼另含 `CU_ESTIMATE_FAILED`、`RPC_ERROR`。其餘見 HOW。`commit` handler 須 **單一 async 鏈 await 至整波結果齊備** 再回 popup（避免 SW 休眠後 popup 永遠等不到）。不新增 `chrome.storage` key |
| 數字 | 鏈上 lamports、數量、手續費用 `BigInt`，JSON 用十進位字串，禁止先經 `number`。SOL 顯示用整數除法切 9 位小數組成字串，禁止 `Number(lamports)` |
| 依賴 | 允許新增 `@solana/kit-plugin-rpc`（executor／concurrency）。`@solana/kit` 與既有 `@solana-program/token`、`token-2022`、`compute-budget` 繼續用。**不**為本版加 `@solana/kit-plugin-instruction-plan`。禁止 `@solana/web3.js`、`@solana/compat`、`signerFromFile` |
| 名稱 | 清單列：mint 對得上當下持倉列就用該列 symbol；wSOL mint 對不上時寫 `wSOL`；其餘 mint 前 4…後 4。不為了名稱另打 Jupiter |
| test-web | 不新增按鈕、不宣告新 feature |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.21.0`。狀態改 `shipped` 須使用者同意 |

## 非目標

- 關掉仍有餘額的 token account，或燒代幣
- 關閉 native SOL 主帳戶
- 有 extension 的 Token-2022（含轉帳費、hook、機密轉帳）
- 把多個錢包的 rent 歸集到一個地址
- 對 dApp 宣告或改 `signAndSendTransaction`；把本流程塞進 `walletSend` 審批殼或模擬差額主舞台
- 改簽署交易審批的 phase 1 CU（仍是 [backlog/estimate-cu-via-kit.md](../backlog/estimate-cu-via-kit.md)）。本版只在收回空帳戶這條用 Kit 估算 limit
- 送出中逐筆重試、結果頁重送
- Agent 決定哪些該關、多語言、Sidebar、地址簿、storage 遷移
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.20.0／現況 | 0.21.0 |
|--------------|--------|
| 餘額 0 的 token account 不出現在持倉，也不能關 | Tokens 標題列可進入勾選並關閉 |
| 錢包自組送出只有 `walletSend` 單筆轉帳＋審批殼 | 本流程在 popup 內一次確認；`walletSend` 不變 |
| Kit RPC 是單筆 `sendTransaction` | 本流程用 plan executor 的預設並發；不自寫上限。單筆送出路徑不改 |
| 無空帳戶掃描 | `wallet.listClosableTokenAccounts` |

## 實作 Track

### Track 1 — 掃描與入口

- **做：** SW 依 HOW 的可關條件掃目前帳戶；popup Tokens 標題列回收圖示與數字。純函式可先空著，只要掃描結果形狀對。
- **不做：** 勾選頁、簽名、送出。
- **驗收：** `cd wallet && npm run typecheck`。唯讀帳戶的 Home 不畫回收圖示。命令不寫 `chrome.storage`。

### Track 2 — 打包、勾選、確認

- **做：** shared 打包純函式；勾選頁與確認頁；費用 BigInt；殼底筆數用該函式。
- **不做：** `sendTransaction`、executor。
- **驗收：** typecheck。同一組地址呼叫打包函式兩次，分組與筆數相同。優先費只用 Default CU price 乘上 Kit 已寫入的 limit，沒有第二套 CU 常數。

### Track 3 — 簽名與送出

- **做：** `wallet.commitCloseEmpty`：重讀、`STALE_LIST`、先簽完再 executor 送出、HTTP 確認後備、結果頁。成功後重查持倉與掃描。
- **不做：** 改 `wallet-finish-send.ts` 的單筆語意；開 popout。
- **驗收：** typecheck。靜態：本流程不呼叫 `openPopout`、不 `sendBridgeResult`。executor 不傳 `maxConcurrency`，且 `estimateResourceLimits: false`。沒有自寫的在飛計數或 `5` 並發池。

### Track 4 — 建置

- **做：** `cd wallet && npm run typecheck && npm run build`。
- **不做：** test-web 新入口。
- **驗收：** 兩道指令 exit 0。

## 驗收（出貨 checklist）

- [x] Tokens 標題列：有可關帳戶時綠色回收＋數字；0 筆但有可簽地址時變暗、無數字、不能點；無可簽地址時不畫；Activity 與頂欄沒有這顆
- [x] 勾選可全選；未選時「下一步」不可按；殼底筆數與確認頁分組一致，且同一 owner 的兩種 token program 不在同一筆交易
- [x] 確認頁手續費＝各筆簽名費＋優先費；優先費的 limit 來自 Kit 估算、price 來自 Default CU price；不呼叫 `getFeeForMessage`。估算失敗時「確認」不可按
- [x] 按確認後先簽完再送；並發只靠 executor 預設，程式裡沒有自寫上限；一筆失敗或過期後其餘仍送；結果分已確認／鏈上失敗／已過期
- [x] 清單過期或手續費與畫面不一致時整波不送，`STALE_LIST`
- [x] 有 extension 或凍結的 Token-2022 不在清單；數量 0 的 wSOL 可在清單
- [x] 聚合只含可簽成員，rent 回到該成員，不歸集
- [x] 不開 popout、無新 pending kind、無新 storage key、不宣告新 Wallet Standard 方法；`walletSend` 仍單筆審批後送出
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 手驗：使用者同意出貨（2026-10-08）；出貨前加修：持倉 RPC 限流 warn toast、刷新合併 GTAO／避免重複背景 refresh
- [x] 文件與程式無真實密碼／助記詞／私鑰
- [x] 版本號檔對齊 `0.21.0`；狀態 `shipped`；已刪 backlog 該列與 `close-empty-token-accounts.md`

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/PopupMarkup.tsx` | Tokens 標題列與重新整理鈕 |
| `wallet/src/shared/home-tokens.ts` | 持倉濾掉餘額 0；`WRAPPED_SOL_MINT` |
| `wallet/src/background/home-tokens/home-tokens-service.ts` | 現有 token account 查詢 |
| `wallet/src/shared/commands.ts` | 新增 `listClosableTokenAccounts`／`planCloseEmpty`／`commitCloseEmpty` |
| `wallet/src/background/send/wallet-begin-send.ts` | 單筆組 ix 的 Kit 寫法；本版不改其產品語意 |
| `wallet/src/background/send/wallet-finish-send.ts` | HTTP 等到 `confirmed` 的既有迴圈；本版後備確認對齊它，不改 `walletSend` |
| `wallet/src/shared/solana-rpc.ts` | `createSolanaRpc(settings.rpcUrl)` |
| `wallet/src/background/session/session.ts` | 解鎖後的 Kit signer |
