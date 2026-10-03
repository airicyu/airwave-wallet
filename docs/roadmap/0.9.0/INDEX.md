# 0.9.0 — 簽署訊息審批頁＋焦點描邊

- **狀態：** `shipped`
- **上游版本：** [0.8.0](../0.8.0/INDEX.md)（custody、pending 生命週期、Wallet Standard 方法表不變；本版改 `signMessage` **如何進 pending／如何呈現**）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)；概念稿 [`design-demos/sign-message-ux.html`](../../design-demos/sign-message-ux.html)（非正式；衝突以本 INDEX／HOW 為準）
- **秘密欄位：** [`docs/research/secret-field-autofill.md`](../../research/secret-field-autofill.md) 類 B

## 產品句

dApp 的 `solana:signMessage` 打開獨立審批 popout：使用者看得到站點、將簽名的帳戶、可讀 UTF-8 或 hex；看起來像 Solana 交易 message 的位元組**不能批准**；鎖定時先在同一視窗解鎖再進入簽署頁。popup／popout 文字欄 focus 用主題 `--accent` 邊框，不要系統橙色 outline。

## 文件地圖

1. 本檔
2. [docs/sign-message-how.md](./docs/sign-message-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.1.0 message-flow-how](../0.1.0/docs/message-flow-how.md)（pending／只回原 tab；本版 HOW 為增量）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍頁面 | **只**重做 `kind === "signMessage"` 的 popout。`connect` 與 `signTransaction` 維持 0.8.0 既有版面（origin／一句種類／JSON `<pre>`／拒絕批准）。禁止順手做交易摘要或 simulation |
| Pending 權威 | 仍只活在 SW `Map`；popout URL **只**帶 `requestId`。禁止 `chrome.storage` hydrate pending。結果仍只回發起 tab／frame |
| 命令 | **不**新增 command 名。仍 `dapp.signMessage`、`ui.getPending`、`ui.resolvePending`、`wallet.unlock`、`wallet.getState`。dApp payload 仍 `{ message: number[] }`。不改簽名結果位元組格式。SW 記憶體 pending **可**加欄（見帳戶凍結、交易旗標），**不**寫入 `chrome.storage` |
| 鎖定仍開窗 | `dapp.signMessage`：**不要**因 `WALLET_LOCKED` 立刻對 dApp 失敗。無作用中帳戶、唯讀／無法簽名 → 仍立刻 `NO_ACCOUNT`／`ACCOUNT_READ_ONLY`（不開窗）。通過後一律 `addPending`＋`openPopout`。鎖定時 popout **整頁**一般解鎖（標題 Airwave、錢包已鎖定、類 B 密碼欄、內容區「解鎖」、**不畫**殼底拒絕／批准）。解鎖來源不限本窗：本窗 `wallet.unlock` **或**使用者在 popup 解鎖導致 `getState.unlocked === true`（popout 須訂閱既有 `chrome.storage.onChanged` 與／或解鎖後重拉 `getState`，**禁止**自寫 rehydrate 總線）。進入簽署殼後，**僅當本窗剛按解鎖**才做 700ms 批准 hold；若是 popup 先解鎖則不必 hold。關窗（含解鎖前）仍結束 pending |
| 解鎖後連點 | **僅本窗剛按解鎖**切到簽署頁後，批准至少 700ms disabled（拒絕可按），避免手指打到原解鎖熱區。若是 popup 先解鎖而 popout 進入簽署殼：**不必** hold。批准點下後至視窗關閉前批准再 disabled（防連點） |
| 交易當訊息 | 用 `@solana/web3.js`：`Message.from` 或 `VersionedMessage.deserialize`；成功後以其 `serialize()` 的 `byteLength ===` 原 `bytes.length` 才算整段佔滿；長度不等或丟錯則否。禁止只靠首字節 `0x80`／`0x81`＋長度當最終判定。enqueue 時 SW 算一次，把布林 `messageLooksLikeTx` 存在該筆 pending（僅記憶體）。`finishSignMessage`／關窗**重算同一函式**（與旗標不一致時以重算為準，且應讓旗標與重算相同模組）。**不要**在 enqueue 時立刻對 dApp 回 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`——仍開 popout |
| 交易當訊息 UI | **優先於** UTF-8／hex：只要 `ui.getPending` 帶回的 `messageLooksLikeTx === true`（popout **只信此旗標**畫主體，不要自己再 parse 來決定短句／啟用批准）。畫面＝頂欄凍結帳戶 widget＋「簽署訊息」＋站點列＋單卡短句：**不能把交易當成訊息簽署。** 不畫 Message payload、不畫 Raw binary。禁止寫有害網站、偷錢、誘騙、釣魚。殼底：**拒絕可按、批准 disabled**。拒絕、關窗、或 UI 仍送出 approve：dApp 皆得 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`（英文 message 可維持 `"Message looks like a transaction"`）。SW **禁止**對這種 bytes 做 `nacl.sign` |
| 一般拒絕 | 非交易當訊息：拒絕或關窗 → 既有 `USER_REJECTED`（關窗 message 可維持 `"Approval window closed"`） |
| UTF-8 主體 | `TextDecoder("utf-8", { fatal: true })` 成功，且無 NUL，且除 TAB／LF／CR 外無其他 C0，且去掉空白後長度 > 0 → 主體 **Message payload** 文字卡（`pre-wrap`；約 6 行高、卡內捲）。其下 **Raw binary payload** 為 `<details>` **預設收合**，旁複製按鈕（複製**無空白**小寫 hex） |
| 非 UTF-8 主體 | 不做文字卡。主體即 **Raw binary payload** 一般卡（不包 details）。同一套 hex 顯示（兩字元一組空白）與複製 |
| 站點與帳戶 | 內容最上中央標題「簽署訊息」。下一行「站點」＋ origin 單行 ellipsis（仿 chip，**不是** input）。頂欄左：與 Home **同一視覺**的帳戶 widget（頭像字母、名稱、公鑰前 4…後 4）＋複製完整公鑰。popout **不是**切換器（widget 不可 `setActiveAccount`）。**凍結：** `dapp.signMessage` enqueue 時把當時作用中簽名帳戶的 `accountId` 寫入該筆 pending（`signAccountId`，僅 SW Map）。widget 只顯示該帳戶 meta（`getState.accounts` 對 id）；`finishSignMessage` **只**對該 id 取 key 簽名。批准當下若該帳戶已刪、變唯讀、或金庫無對應密鑰 → 失敗（既有 `NO_KEY`／`ACCOUNT_READ_ONLY` 類即可），**禁止**改簽別戶。popup 在審批期間切換作用中帳戶**不**改變本筆簽名對象與 widget |
| 載入失敗 | 無 `requestId` 或 `ui.getPending` 失敗／NOT_FOUND：標題「審批」；主體短句 **請求已不在**；拒絕與批准皆 disabled。`kind === "signMessage"` 且載入成功：標題「簽署訊息」。不要把 payload JSON 當 signMessage 主畫面 |
| 類 B | popout 解鎖欄：`type="text"` + `-webkit-text-security: disc`；禁止 `type="password"`、`autocomplete="current-password"`／`"new-password"`、`name="password"`。成功／關窗清空。與 popup 解鎖同一套 harden |
| Popup 解鎖 | popup `#locked` 與概念稿／popout 鎖定屏同一結構：垂直置中、全寬 `--fill` 欄、accent focus、主按鈕在欄下內容區（`primary-btn`），無頂欄無殼底 dock |
| Focus | popup 與 popout：文字 `input`（**排除** `radio`／`checkbox`／`range`／`file`／`hidden`／`button`／`submit`／`reset`）與 `textarea` 的 `:focus` **與** `:focus-visible`：`outline: none`；有框線者 `border-color: var(--accent)`。禁止依賴 Windows／Chrome 預設橙／金 focus ring。字卡 `.word-slot:focus-within` 維持既有 accent。勿把這條套成全域 `input { width:100% }` 以致 radio 被壓扁 |
| test-web | 既有「簽訊息」保留 UTF-8。另加可觸發：**非 UTF-8 bytes**、以及 **可被 SDK 解析為整段 transaction message 的 bytes**（向量用合成／固定測試位元組，**不要**寫真實助記詞）。不改 Wallet Standard 註冊表 |
| Storage | **不**新增 local／session key。pending 仍不進 storage |

## 非目標

- `signTransaction`／connect 審批改版、simulation、代廣播（見其它 backlog）
- Sign-in with Solana 專用文案、`solana:signIn`
- 改 vault KDF、改密、持倉、Settings
- 在 popout 切換帳戶、多筆訊息批次簽
- 保證密碼管理器永遠不問
- Wallet UI 多語言、Sidebar、storage 遷移
- 改 pending 為持久 store、廣播全 tab
- 文件／log／test-web 寫入真實密碼、助記詞、私鑰

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.8.0／現況 | 0.9.0 |
|-------------|--------|
| popout 三種 kind 共用 JSON `<pre>` | `signMessage` 專用可讀頁；另兩種不變 |
| SW 首字節啟發式立刻 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`、不開窗 | SDK 整段解析；開窗；批准永遠不可；拒絕／關窗才把該錯誤碼回 dApp |
| 鎖定時 `dapp.signMessage` 立刻 `WALLET_LOCKED` | 開窗解鎖；解鎖後簽署頁；700ms 批准 hold |
| 輸入 focus 常為系統橙框 | 文字欄 accent 邊框、`outline: none` |

## 實作 Track

### Track 1 — SW：解析、鎖定開窗、禁止代簽交易 message

- **做：** 抽出整段 SDK 判定；`dapp.signMessage` 鎖定仍 pending＋popout；enqueue 不再早退該錯誤碼；`finishSignMessage` 對交易 message **永不簽名**；拒絕／關窗對交易 message 回 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`。關窗 listener 須看 pending kind／判定，不可一律 `USER_REJECTED` 蓋掉交易 message。
- **不做：** popout 視覺精修；改 connect／signTx 閘門。
- **驗收：** `cd wallet && npm run typecheck`。靜態：鎖定路徑不再在 `dapp.signMessage` 早退；approve 分支有 SDK 再檢與 `signAccountId`。手驗（可留到 Track 4）：關窗對交易 message 的錯誤碼。

### Track 2 — signMessage popout UI

- **做：** 依 HOW 畫鎖定／UTF-8／hex／交易短句／請求已不在／批准中；殼底原則；複製；700ms hold；類 B 解鎖。
- **不做：** 重做 connect／signTx 內容區（可共用變數與焦點 CSS）。
- **驗收：** 本檔 checklist 畫面項；`cd wallet && npm run typecheck`。

### Track 3 — popup 解鎖＋全域焦點

- **做：** popup 鎖定屏對齊 HOW；popup／popout 文字欄 focus 規則。
- **不做：** 改 Settings 寫入時機。
- **驗收：** 鎖定屏垂直置中；抽樣輸入 focus 無系統橙框。

### Track 4 — test-web 向量

- **做：** UTF-8／非 UTF-8／交易 message 三個簽訊息入口（或同等）。
- **不做：** 新 Wallet Standard 方法。
- **驗收：** `cd wallet && npm run build`；`cd test-web` 既有 build 若有則跑。

## 驗收（出貨 checklist）

- [x] 已解鎖、UTF-8 訊息：popout 非 JSON 主畫面；可見標題、站點 origin、**凍結**帳戶 widget、Message payload、收合的 Raw binary；批准後 dApp 仍收到既有簽名結果；審批期間 popup 切帳戶不改 widget／不改簽名者
- [x] 非 UTF-8：無文字卡；Raw binary 為主卡；可複製無空白 hex
- [x] 整段可 parse 的交易 message：畫面僅短句「不能把交易當成訊息簽署。」；批准 disabled；拒絕後 dApp `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`；SW 未簽名
- [x] 同上關窗：dApp 同一錯誤碼（不是普通 `USER_REJECTED`）
- [x] 鎖定時簽訊息：不立刻 `WALLET_LOCKED`；popout 解鎖屏無殼底；解鎖後簽署頁；**僅本窗剛按解鎖**時批准 700ms 內 disabled（popup 先解鎖則不必）
- [x] `ui.getPending` 失敗：請求已不在；兩鈕 disabled
- [x] connect／signTransaction popout 內容契約與 0.8.0 相同（非 JSON 改版）
- [x] 解鎖欄非 `type="password"`
- [x] popup 與 popout 文字欄 focus 為 accent，非系統橙框；radio 未被 `width:100%` 壓扁
- [x] pending 不進 `chrome.storage`；結果只回原 tab
- [x] `cd wallet && npm run build` 通過
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/index.ts` | `dapp.signMessage`、`finishSignMessage`、關窗、交易 message 判定 |
| `wallet/src/background/pending.ts` | pending Map／popout window 綁定（行為增量見 HOW） |
| `wallet/src/shared/commands.ts` | pending／payload 型別；本版原則不擴 command 名 |
| `wallet/src/popout/index.html` | 審批 DOM |
| `wallet/src/popout/main.ts` | 依 kind 分支 UI |
| `wallet/src/popout/style.css` | 簽署頁／解鎖／焦點 |
| `wallet/src/popup/index.html` | `#locked` |
| `wallet/src/popup/style.css` | 解鎖屏＋全域文字欄 `:focus` |
| `wallet/src/popup/main.ts` | 類 B harden（popout 應對齊） |
| `test-web/src/main.ts` | 簽訊息測試入口 |
| `docs/design-demos/sign-message-ux.html` | 非正式視覺 |
