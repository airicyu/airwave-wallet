# Implementation review — 0.9.0 Airwave Wallet

- **日期：** R1 2026-10-04（Asia/Hong_Kong）
- **輪次：** R1（初審）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`sign-message-how.md`](./sign-message-how.md)；[`reasoning.md`](../reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；變更檔見 git `status`／`diff`；不以 chat history 為準

---

## 總評

0.9.0 主軌（shared `messageLooksLikeTransactionMessage`、`dapp.signMessage` 鎖定仍 pending＋popout、凍結 `signAccountId`、`signMessage` 專用 popout、popup 解鎖屏與 accent focus、test-web 三入口）與 INDEX／HOW **靜態對齊良好**；**`cd wallet && npm run typecheck`、`npm run build` 與 `cd test-web && npm run build` 均通過**。**無未關閉 HIGH**。INDEX 驗收 checklist 多項需 **Chrome 載入擴充＋test-web 手驗**；本輪未在瀏覽器走完。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| — | （無） | — | R1 靜態＋建置未發現違反已定案或 GUIDELINES 架構禁區之阻擋項 | — |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | signMessage 全流程未做瀏覽器手驗 | **開啟** | UTF-8／二進位／交易當訊息、鎖定 popout 解鎖與 700ms hold、popup 先解鎖、審批期切帳、關窗錯誤碼、focus 視覺等，本輪僅靜態碼＋建置。 | 出貨前依下方手驗清單在 Chrome 執行並在下一輪更新證據欄。 |
| M2 | 版本號仍為 0.8.0 | **關閉** | R1 後已同步 `version.md`、`wallet/package.json`、`changelog.md` → 0.9.0；INDEX 仍 `in progress` 待使用者同意出貨／手驗。 | — |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | `docs/roadmap/README.md` 與 INDEX 狀態用語不一致 | **關閉** | README 已改 `in progress`。 |
| L2 | 契約目錄與部分文件為 untracked | **開啟** | `docs/roadmap/0.9.0/`（含本檔）、`wallet/src/shared/sign-message-tx.ts`、`docs/design-demos/sign-message-ux.html` 等；審查以 INDEX 正文為準。 |
| L3 | 無針對交易 message 判定或 popout 分支的自動化測試 | **開啟** | INDEX Track 僅要求 typecheck／build；非契約硬需求。 |
| L4 | pending 逾時一律 `TIMEOUT` | **開啟** | HOW 載明交易 message 逾時亦用 `TIMEOUT`（非交易碼）；與關窗／拒絕路徑不同。靜態符合 HOW。 |

---

## R1 重點對照（INDEX／HOW／禁區）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| `messageLooksLikeTransactionMessage` 單一 shared 函式；v0 再 legacy；整段 `serialize().byteLength === bytes.length` | **符合** | [`wallet/src/shared/sign-message-tx.ts`](../../../../wallet/src/shared/sign-message-tx.ts) |
| 無首字節 0x80／0x81 啟發式 | **符合** | `wallet/` grep 無 `looksLikeVersioned`／首字節判定 |
| `dapp.signMessage` 鎖定不早退 `WALLET_LOCKED`；仍 `addPending`＋`openPopout` | **符合** | [`signMessageEnqueueGateError`](../../../../wallet/src/background/index.ts) 不含鎖定；enqueue L601–641 |
| 交易 bytes enqueue 不早退 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION` | **符合** | enqueue 僅寫 `messageLooksLikeTx` 旗標後開窗 |
| `signAccountId`／`messageLooksLikeTx` 僅記憶體 pending | **符合** | [`commands.ts`](../../../../wallet/src/shared/commands.ts) `PendingRecord`；[`pending.ts`](../../../../wallet/src/background/pending.ts) Map |
| `finishSignMessage` 重算判定；交易路徑不 `nacl.sign`；一般拒絕 `USER_REJECTED` | **符合** | [`index.ts`](../../../../wallet/src/background/index.ts) L373–458 |
| 批准簽名只用 `signAccountId` | **符合** | `keypairForAccountId(signAccountId)` |
| 關窗：交易 message → `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`；否則 `USER_REJECTED` | **符合** | `chrome.windows.onRemoved` L1808–1835 |
| popout 交易 UI 只信 `messageLooksLikeTx`；短句；批准 disabled | **符合** | [`popout/main.ts`](../../../../wallet/src/popout/main.ts) `renderSignBody` |
| UTF-8／hex 展示與複製（compact hex） | **符合** | `isDisplayableUtf8`、`hexCompact`／`hexGrouped` |
| 鎖定全屏解鎖；無殼底 dock；類 B | **符合** | [`popout/index.html`](../../../../wallet/src/popout/index.html) `view-unlock`；`hardenWalletPasswordInput` |
| 本窗解鎖後 700ms 批准 hold；popup 解鎖經 `onChanged` 無 hold | **符合** | `refreshAfterUnlock(true|false)`；`SESSION_UNLOCKED` listener L400–406 |
| `connect`／`signTransaction` 仍 legacy JSON 版面 | **符合** | `showLegacy`；`signGateError` 仍含鎖定早退 |
| popup `#locked.unlock-screen` 結構對齊 HOW | **符合** | [`popup/index.html`](../../../../wallet/src/popup/index.html) L18–23 |
| 文字欄 `:focus`／`:focus-visible` accent；排除 radio 等 | **符合** | [`popup/style.css`](../../../../wallet/src/popup/style.css) L1451+；[`popout/style.css`](../../../../wallet/src/popout/style.css) L382+ |
| test-web 三按鈕（UTF-8／二進位／交易當訊息） | **符合** | [`test-web/src/main.ts`](../../../../test-web/src/main.ts)；合成 `TransactionMessage` v0 |
| pending 不進 `chrome.storage`；結果只回原 tab | **符合** | 未新增 pending storage；`sendBridgeResult(p.tabId, …)` |
| 無新 Wallet Standard 方法；無真實秘密於 diff | **符合** | test-web 用 `Keypair.generate()`；roadmap 抽樣 |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**；標 **需手驗** 者本審查未在 Chrome 執行。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| 已解鎖、UTF-8：非 JSON 主畫面；標題、站點、凍結 widget、Message payload、收合 Raw binary；批准簽名；審批期 popup 切帳不改 widget／簽名者 | **靜態通過**／**需手驗** | popout DOM／`signAccountId`／SW 簽名 id |
| 非 UTF-8：無文字卡；Raw binary 主卡；複製無空白 hex | **靜態通過**／**需手驗** | `isDisplayableUtf8` 失敗分支 |
| 整段交易 message：僅短句；批准 disabled；拒絕 → `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`；SW 未簽名 | **靜態通過**／**需手驗** | `finishSignMessage` L385–395 |
| 交易 message 關窗：同上錯誤碼（非 `USER_REJECTED`） | **靜態通過**／**需手驗** | `onRemoved` L1819–1827 |
| 鎖定簽訊息：不立刻 `WALLET_LOCKED`；解鎖屏無殼底；本窗解鎖 700ms hold；popup 先解鎖無 hold | **靜態通過**／**需手驗** | enqueue gate；`startApproveHold` |
| `ui.getPending` 失敗：請求已不在；兩鈕 disabled | **靜態通過** | `showGone`；`view-gone` disabled 按鈕 |
| connect／signTransaction popout 與 0.8.0 相同 | **靜態通過**／**需手驗** | `view-legacy`＋JSON `pre` |
| 解鎖欄非 `type="password"` | **靜態通過** | popout／popup `type="text"`＋mask |
| 文字欄 focus accent；radio 未 `width:100%` | **靜態通過**／**需手驗** | CSS 選擇器排除 radio |
| pending 不進 storage；只回原 tab | **靜態通過** | 見上表 |
| `cd wallet && npm run build` | **通過** | 見測試記錄 |
| 文件與程式無真實密碼／助記詞／私鑰 | **靜態通過** | 本輪 diff 抽樣 |

### Track 對照

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 SW 解析／鎖定開窗／禁止代簽 | **是** | typecheck 通過 |
| 2 signMessage popout UI | **是** | |
| 3 popup 解鎖＋焦點 | **是** | |
| 4 test-web 向量 | **是** | test-web build 通過 |

---

## 測試記錄

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run typecheck` | `wallet/` | **通過**（exit 0） |
| R1 | `npm run build` | `wallet/` | **通過**（`tsc --noEmit && vite build`，exit 0） |
| R1 | `npm run build` | `test-web/` | **通過**（exit 0） |
| R1 | Chrome 載入 `wallet/dist`＋test-web、INDEX checklist 手驗 | — | **未執行** |

### 需瀏覽器手驗（對 INDEX 驗收）

1. 已解鎖：test-web「簽 UTF-8 訊息」→ popout 見 Message payload＋收合 Raw binary；批准後 dApp 得簽名；審批中於 popup 切換作用中帳戶，popout widget 與簽名結果仍為原帳戶。
2. 「簽二進位」→ 僅 Raw binary 卡；複製為連續小寫 hex。
3. 「簽交易當訊息」→ 短句「不能把交易當成訊息簽署。」；批准不可點；拒絕與關窗皆得 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`（test-web log／dApp error code）。
4. 鎖定狀態重複 1–3：應開 popout 解鎖屏（無底欄）；本窗解鎖後約 700ms 內批准 disabled；改為先在 popup 解鎖再觸發簽訊息則進簽署殼且無 700ms hold。
5. 無效 `requestId` 或逾時刪 pending 後開 popout：「請求已不在」、兩鈕 disabled。
6. connect／signTransaction：仍 JSON `<pre>` 主體（與 0.8.0 一致）。
7. 目視 popup／popout 文字欄 focus 為 accent 邊框（非系統橙框）；Settings 網路 radio 版面正常。

隱私：本報告未寫入助記詞、私鑰、密碼、真實地址或生產 API key。

---

## 修復追蹤

| ID | 目標狀態 | 關閉條件 |
|----|----------|----------|
| M1 | 開啟 | 手驗清單執行並記於下一輪「驗收對照」 |
| M2 | 關閉 | 版本已 0.9.0 |
| L1 | 關閉 | README 對齊 |
| L2 | 開啟 | 與程式一併 commit |
| L3 | 開啟 | 可選；非阻擋 |
| L4 | 開啟 | 資訊性；HOW 已載明 |

---

## Working tree 摘要（R1）

**已修改：** `wallet/src/background/index.ts`、`wallet/src/shared/commands.ts`、`wallet/src/popout/*`、`wallet/src/popup/*`、`test-web/*`、`docs/design-principles.md`、`docs/roadmap/README.md`、`docs/roadmap/backlog/*` 等。

**未追蹤（與 0.9.0 相關）：** `docs/roadmap/0.9.0/`、`wallet/src/shared/sign-message-tx.ts`、`docs/design-demos/sign-message-ux.html` 等。
