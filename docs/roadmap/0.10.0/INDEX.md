# 0.10.0 — 簽署交易審批頁（模擬主舞台）

- **狀態：** `shipped`
- **上游版本：** [0.9.0](../0.9.0/INDEX.md)（pending／custody／Wallet Standard 方法表不變；本版改 `signTransaction` **如何進 pending／如何呈現／如何模擬**）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 出貨前為 backlog 簽署交易頁／simulation；已刪獨立檔，契約只留本目錄。
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)；概念稿 [`design-demos/sign-transaction-ux.html`](../../design-demos/sign-transaction-ux.html)（非正式；衝突以本 INDEX／HOW 為準）
- **秘密欄位：** [`docs/research/secret-field-autofill.md`](../../research/secret-field-autofill.md) 類 B

## 產品句

dApp 的 `solana:signTransaction` 打開獨立審批 popout：主舞台是未簽交易對**凍結簽署帳戶**的預期 SOL／代幣變動（SW 打目前 cluster RPC 模擬）；指令與 program 放在預設收合的交易明細。鎖定時先在同一視窗解鎖。批准仍只簽名、不代廣播。模擬失敗不自動拒絕。

## 文件地圖

1. 本檔
2. [docs/sign-transaction-how.md](./docs/sign-transaction-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.9.0 INDEX](../0.9.0/INDEX.md)（鎖定／凍結帳戶／類 B／焦點；本版對齊其 popout 殼）、[0.1.0 message-flow-how](../0.1.0/docs/message-flow-how.md)
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍頁面 | **只**重做 `kind === "signTransaction"` 的 popout。`connect` 維持 0.8.0 JSON 版面。`signMessage` 維持 0.9.0 契約與畫面。禁止順手做 `signAndSendTransaction`、自訂 priority fee、Agent 解讀 |
| Pending 權威 | 仍只活在 SW `Map`；popout URL **只**帶 `requestId`。禁止 `chrome.storage` hydrate pending。結果仍只回發起 tab／frame。模擬結果**不**寫 local／session storage |
| 命令 | 既有 `dapp.signTransaction`、`ui.getPending`、`ui.resolvePending`、`wallet.unlock`、`wallet.getState` 保留。**新增一個** UI command：`ui.simulatePendingTx`，payload `{ requestId: string }`，**僅**擴充 popout 可呼。pending 不存在**或** `kind` 不是 `signTransaction` → `ok: false`、`NOT_FOUND`（不要 `UNKNOWN`）。SW 對該 pending 的未簽交易打目前 cluster 的 `rpcUrl`。禁止 popout／inject 自己打 RPC 當主路徑。不改 dApp payload `{ transaction: number[] }`。不改批准成功回給 dApp 的 `signedTransaction` 位元組語意（仍只附加本錢包簽名，不改 instruction） |
| 鎖定仍開窗 | `dapp.signTransaction`：**不要**因 `WALLET_LOCKED` 立刻對 dApp 失敗。無作用中帳戶、唯讀／無法簽名 → 仍立刻 `NO_ACCOUNT`／`ACCOUNT_READ_ONLY`（不開窗）。通過後一律 `addPending`＋`openPopout`。鎖定時 popout **整頁**一般解鎖（與 0.9.0 同一套：Airwave、錢包已鎖定、類 B 密碼欄、內容區「解鎖」、**不畫**殼底；解鎖鈕**禁止**套用殼底批准的 `flex: 1` 以致拉滿視窗）。解鎖來源不限本窗：本窗 `wallet.unlock` **或** popup 解鎖使 `getState.unlocked === true`（`chrome.storage.onChanged` 與／或重拉 `getState`，禁止自寫 rehydrate 總線）。**僅本窗剛按解鎖**才 700ms 批准 hold；popup 先解鎖則不必。關窗（含解鎖前）仍結束 pending，dApp `USER_REJECTED`（關窗 message 可維持既有 `Approval window closed`） |
| 帳戶凍結 | enqueue 時把當時作用中簽名帳戶 `accountId` 寫入 pending `signAccountId`（僅記憶體）。widget 與 `finishSignTransaction` **只**對該 id。popup 切 active **不**改本筆簽名者。該戶已刪／唯讀／無密鑰 → 既有 `NO_KEY`／`ACCOUNT_READ_ONLY`，禁止改簽別戶 |
| 主舞台 | 成功模擬：**只**顯示簽署帳戶的 SOL／SPL 增減，**不要**「會成功」徽章。沒有增減寫「無餘額變動」。進行中：「預期變動」卡內「查詢中」；**批准仍可按**（模擬是諮詢，不是閘門）。重試：預期變動卡標題列 icon，再呼 `ui.simulatePendingTx` |
| 預計失敗 | RPC 有回且 `value.err` 非空：預期變動**上方**一張 notice「預計交易失敗」；有簡單原因則一行（優先取 logs 裡 `Error: …` 或精簡 `InstructionError`；對不出就不編、notice 仍可只有標題）。**同一張卡內** `<details>`「失敗詳情」預設收合，放 `err` 原文與 `logs`（可截斷過長 logs，但至少最後約 20 行若有）。預期變動卡仍在：無可信差額則「無法估計變動」。**不**自動 `resolve` 拒絕 |
| 無法模擬 | RPC 失敗、逾時、缺 blockhash 且 `replaceRecentBlockhash` 仍做不到、錯 cluster、位元組無法 `VersionedTransaction.deserialize`：notice「無法模擬」＋一句原因。沒有 program logs 就不畫失敗詳情。無法 deserialize 時：**批准 disabled**（簽了也會炸）；拒絕可按。其餘無法模擬：**批准仍可按** |
| 模擬參數 | SW 用目前 Settings 的該 cluster `rpcUrl` 建 `Connection`。對未簽 `VersionedTransaction`：`simulateTransaction` 採 `sigVerify: false`、`replaceRecentBlockhash: true`。先取模擬**前**帳戶（`getMultipleAccounts` 或同等），再拿模擬回傳的 post 對照成差；**禁止**把 post 存量當增減。`accounts.addresses` **至少**含凍結公鑰，以及 message 已解析帳戶裡、token owner 為該凍結公鑰的 Token／Token-2022 token account（靜態 keys；v0 已成功載入的 lookup 一併算）。列不出的 mint 才可省略。禁止以「先只帶 signer」當出貨範圍。Lookup 載入失敗：`outcome: "rpc"`（或 RPC 錯誤原文），不要假裝有餘額差。單次模擬 RPC 等待上限 **15 秒**（AbortSignal）；逾時當 `rpc`，不擋批准（`unparseable` 除外）。Durable nonce 交易在 `replaceRecentBlockhash` 下模擬可能失真：落入 `fail`／`rpc`，不要把差額當可信。不把模擬當 send |
| 餘額差 | 單位是**簽署帳戶**（凍結公鑰）的 native lamports 差，以及該公鑰為 token owner 的 SPL 數量差（按 mint 加總）。SOL 標「SOL」。SPL：能從模擬／持倉拿到的 symbol／decimals 則用；否則 mint 前 4…後 4，不要捏造 USD。不把他人帳戶變動列進主舞台。零差不列。全部零差且前後資料齊 →「無餘額變動」。某個 `addresses` 槽在 pre 或 post 為空（帳戶不存在）視為存量 0。僅 RPC／對不上地址／encoding 失敗才不附 `deltas`，此時預期變動「無法估計變動」。`outcome: "fail"` 同樣規則 |
| 交易明細 | 主舞台下方一張 `<details>`「交易明細」，**預設收合**。compiled instruction 列表**只信** `ui.simulatePendingTx` 回傳的 `instructions[]`（popout **不要**自己 deserialize 來畫列，以免與 SW 分叉）。每列：序號 + program 熟名或公鑰前 4…後 4；同一 program 兩次兩列；不依 program 合併；不畫 CPI inner ix。可選一句固定說明**僅**限 HOW 所列可確定型別，對不出 data **只留 program**。SW 無法列出時明細寫「無法列出指令」。費用付款人：能從已 deserialize 的 `tx.message` 出 payer 就寫縮寫（`rpc` 若已 parse 仍可寫）。預估手續費：`getFeeForMessage` 成功才寫 SOL 數量；失敗、未 deserialize、`unparseable`／`rpc` 查不到 →「未知」，禁止寫 0。再下一層「原始交易」預設收合（連續小寫 hex）。v0 帳戶對不出時該列可標「帳戶未解析」 |
| 熟名 program | 僅 HOW 靜態表（System、Token、Token-2022、ATA、Compute Budget、Memo）。表上沒有的 program **禁止**猜 Jupiter／DEX 品牌名 |
| 批准語意 | 批准＝SW 對凍結帳戶 `tx.sign`，回已簽交易給 dApp。**不** `sendTransaction`。模擬成功／失敗都不改這句。批准點下至關窗前批准再 disabled。逾時仍既有 `TIMEOUT`。bytes 無法 `VersionedTransaction.deserialize` 而仍 `ui.resolvePending` approve（含直接打 command）：對 dApp `INVALID_TRANSACTION`（message 可用 `"Invalid transaction"`），**禁止** `nacl`／`tx.sign`；拒絕／關窗仍 `USER_REJECTED` |
| 類 B／焦點 | 解鎖欄與 0.9.0 相同。本版不重做 popup 鎖定屏與全域 focus（已 shipped）；popout 新文字欄須遵守同一 accent 規則 |
| test-web | 既有「簽交易」（0 lamport 自轉）保留。另加可觸發：**預期模擬失敗**的交易（例如轉出超過餘額的 SOL，合成／測試向量，**不要**寫真實助記詞）。不宣告新 Wallet Standard 方法 |
| Storage | **不**新增 local／session key |

## 非目標

- `signAndSendTransaction`、錢包代廣播、改寫 Compute Budget／priority fee（見 [sign-transaction-priority-fee.md](../backlog/sign-transaction-priority-fee.md)）
- `connect`／`signMessage` 改版、`solana:signIn`、`signAllTransactions`
- 在 popout 切換帳戶、多筆交易批次簽
- Agent 解讀交易或 logs
- 改 vault KDF、持倉頁、Settings、Wallet UI 多語言、Sidebar、storage 遷移
- 用模擬取代使用者批准；失敗自動拒絕
- 改 pending 為持久 store、廣播全 tab
- 文件／log／test-web 寫入真實密碼、助記詞、私鑰

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.9.0／現況 | 0.10.0 |
|-------------|--------|
| `signTransaction` 與 connect 共用 JSON `<pre>` | 專用審批頁：預期變動主舞台＋收合明細 |
| `dapp.signTransaction` 鎖定立刻 `WALLET_LOCKED` | 開窗解鎖（對齊 0.9.0 signMessage） |
| `finishSignTransaction` 簽當下 active | 簽 enqueue 的 `signAccountId` |
| 0.1.0 起不做 simulation | SW `simulateTransaction`；popout 只渲染 |
| 無 `ui.simulatePendingTx` | 新增此一 UI command |

## 實作 Track

### Track 1 — SW：鎖定開窗、凍結帳戶、模擬 command

- **做：** `dapp.signTransaction` 鎖定仍 pending＋popout；enqueue `signAccountId`；`finishSignTransaction` 只簽該 id；實作 `ui.simulatePendingTx`（HOW 參數）；deserialize 失敗讓 UI 能區分「無法解析」。
- **不做：** popout 視覺精修；改 signMessage／connect 閘門；改交易位元組 instruction。
- **驗收：** `cd wallet && npm run typecheck`。靜態：鎖定路徑不再在 `dapp.signTransaction` 早退 `WALLET_LOCKED`；approve 用 `signAccountId`。

### Track 2 — signTransaction popout UI

- **做：** 依 HOW 畫鎖定／預期變動／失敗 notice／無法模擬／交易明細／請求已不在／批准中；進簽署殼後呼叫模擬；重試 icon；700ms hold 規則與 0.9.0 相同。
- **不做：** 重做 signMessage 主體；自訂 priority fee 控制。
- **驗收：** 本檔 checklist 畫面項；`cd wallet && npm run typecheck`。

### Track 3 — test-web 向量

- **做：** 既有簽交易保留；加一條會讓模擬 `err` 非空的入口（餘額不足類）。
- **不做：** 新 Wallet Standard 方法、代 send。
- **驗收：** `cd wallet && npm run build`；`cd test-web` 若有 build 則跑。

## 驗收（出貨 checklist）

- [x] 已解鎖、可解析交易：popout 非 JSON 主畫面；可見標題「簽署交易」、站點、**凍結**帳戶 widget、預期變動（或查詢中／無變動／無法估計）；交易明細預設收合；批准後 dApp 仍收到已簽交易；錢包未廣播；審批期間 popup 切帳戶不改 widget／不改簽名者
- [x] 模擬 `value.err` 非空：notice「預計交易失敗」在預期變動上方；原因一行（有則顯示）；失敗詳情在**同一張** notice 內預設收合；不自動拒絕；批准仍可把交易簽回 dApp
- [x] RPC 不可用：notice「無法模擬」；無失敗詳情 logs；批准仍可按（位元組可 deserialize 時）
- [x] 無法 deserialize：無法模擬；批准 disabled；拒絕後 dApp `USER_REJECTED`；若仍 approve（含直接 `ui.resolvePending`）則 dApp `INVALID_TRANSACTION`、未簽名
- [x] 鎖定時簽交易：不立刻 `WALLET_LOCKED`；整頁解鎖無殼底、解鎖鈕非拉滿高度；**僅本窗剛按解鎖**時批准 700ms disabled
- [x] `ui.getPending` 失敗：請求已不在；兩鈕 disabled
- [x] connect popout 仍為 0.8.0 JSON；signMessage 仍為 0.9.0
- [x] 解鎖欄非 `type="password"`；pending 與模擬結果不進 `chrome.storage`；結果只回原 tab
- [x] `cd wallet && npm run build` 通過
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/index.ts` | `dapp.signTransaction`、`finishSignTransaction`、`signGateError`、新模擬 command |
| `wallet/src/background/pending.ts` | pending Map |
| `wallet/src/shared/commands.ts` | 新增 `ui.simulatePendingTx`；pending `signAccountId` 給 signTx 用 |
| `wallet/src/popout/index.html` | 審批 DOM（可共用 0.9.0 殼，signTx 主體另繪） |
| `wallet/src/popout/main.ts` | `kind === "signTransaction"` 分支 |
| `wallet/src/popout/style.css` | 預期變動／notice／明細；解鎖鈕 `flex: none` |
| `wallet/src/inject/wallet.ts` | 能力表不新增方法 |
| `test-web/src/main.ts` | 簽交易測試入口 |
| `docs/design-demos/sign-transaction-ux.html` | 非正式視覺 |
