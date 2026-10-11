# 0.16.0 — Popup React 收斂 HOW

產品語意以 [INDEX](../INDEX.md) 為準。本檔寫 **state 放哪、離開畫面清什麼、Back／dock 對照、刪哪些檔**。

## 目標結構（意向）

```text
popup/
  main.tsx
  App.tsx                 # 鏡像、導航 context、lifecycle（onChanged、settled、pagehide）
  types.ts
  style.css
  state/                  # reducer＋PopupContext（navigate／refresh／toast／跨頁暫存）
  components/             # 殼、ApprovalHost、共用輸入
  home/ accounts/ settings/ onboarding/ send/
  lib/                    # 純函式：format、password harden；無 session 主路徑
  runtime.ts              # 可留：Back 表、離開清除、dock 計算（讀 context state，不 bind 全域）
```

禁止：`bindPopupShell`；模組級 `session` 當畫面權威；輸入時 `bumpUi`／全樹 `tick`。

## App 層必備欄位

| 欄 | 說明 |
|----|------|
| `wallet` | `wallet.getState` 鏡像 |
| `currentView` | `View` |
| `detailTokenId` | 詳情／送出／審批共用；Back 出 `token-detail` 時清 |
| `activeWalletSendRequestId` | 導航用；權威在 SW |
| `homeTokenRows` | 今日 `lastSuccessfulTokenRows`；**僅**切 `activeAccountId` 時清（鎖定不清） |
| `focusAccountId` | 每次 `navigateTo` 有傳第二參則寫入（含同 view）；**未傳則保留**。Manage／Reveal／Rename／刪除／combined 子操作讀此欄 |
| `expandedTokenRowIds` | Home 展開列；**僅**切帳戶時清（鎖定不清） |
| `homeAssetsForce` | 下次 Home 載入是否 `force`；送出成功回 Home 時設真 |
| toast | 訊息、4s timer、navigate 時清 |

送出 amount／recipient／`sendFormError` **不**在 App 層，見下節順序。

Context 至少提供：`navigateTo(view, accountId?)`、`refresh()`、`showError`、`clearError`、`handleBack`。畫面用 `usePopupContext()`。**禁止** `bindPopupShell`，禁止每 render bind runtime。

## 離開／進入清除（複製 0.15.0 `performNavigate`）

`navigateTo(next, accountId?)` **每次**都做（即使 `current === next`）：有傳 `accountId` 則寫 `focusAccountId`；關選單；清 toast。

僅當 `current !== next` 時跑「離開畫面」副作用：

| 條件 | 動作 |
|------|------|
| `current === send-approval` 且 `next !== send-approval` 且仍有 `activeWalletSendRequestId` | 該 id 清掉並 `ui.abortPending` |
| 離開 `add-import-seed` | reset 助記詞匯入流（12 空格、step=words、kind=phantom、清 preview／選取／busy／err） |
| 離開 `add-generate-seed` | reset 產生助記詞流（重抽詞或失敗則 words=null） |
| 離開 `add-import-secret` | 清 label／secret／err |
| 離開 `account-reveal-key` | 清記憶體內私鑰與 reveal 密碼 |
| 離開 `token-send` 且 `next !== send-approval` | 清空送出表單 |
| **進入** `token-send` 且 `current !== token-send` | 清空送出表單（含從審批回來） |
| 進入 `settings-password` 且 `current !== settings-password` | 清空三個改密欄與 err |
| `current` 與 `next` 都是 settings* 且不同 | 若離開 password：清空改密；若離開 keys：unreveal 並清空 helius／jupiter 草稿 |
| `next` 是 `settings` 或 `settings-*` | 關閉 RPC 編輯（editKey／draft 空） |

進入重置：只要 `next` 命中下表即執行（**含同 view 再進**，不要求 `current !== next`）：

| `next` | 動作 |
|--------|------|
| `add-combined` | reset combined 建立（chips、picked、main、label、draft、err） |
| `add-generate` | 清 successPk、label、err |
| `add-generate-seed` | reset 產生流並清 label／err |
| `add-import-secret` | 清 label／secret／err |
| `add-import-seed` | reset 匯入流 |
| `add-watch` | 清 label／pk／err |
| `account-rename` | 用 focus 帳戶的現有 label 當草稿 |

鎖定（`vaultExists && !unlocked`）：關選單、清 `detailTokenId`、清空送出表單。**不清**持倉快取與展開列。  
`activeAccountId` 變更：清持倉快取、展開列、`detailTokenId`、送出表單；若當時在 `token-send` 或 `token-detail` → `navigateTo("home-token")`。

## Back 對照表

特殊（不是單純 parent view）：

| 目前 | Back |
|------|------|
| `add-generate` 且已有 successPk | **不離開頁**：只清 successPk，回到表單 |
| `add-import-seed` 且 step=`pick` | **不離開頁**：回到 words（gen++、busy=false、清 preview／selected／pathPreview） |
| `token-detail` | 清 `detailTokenId`，去 `home-token` |
| 其餘 | 下表 parent；未列則 `home-token` |

| 目前 | parent |
|------|--------|
| `account-reveal-key` | `account-manage` |
| `account-rename`、`account-manage`、`add-account` | `accounts` |
| `add-generate`（無 success）、`add-generate-seed`、`add-combined`、`add-watch` | `add-account` |
| `add-import-secret`、`add-import-seed`（words） | `add-import` |
| `add-import` | `add-account` |
| `settings-network`、`settings-rpc`、`settings-keys`、`settings-cu-price`、`settings-password` | `settings` |
| `about-disclaimer`、`about-terms` | `about` |
| `settings`、`connected-sites`、`about`、`accounts`、`home-activity` | `home-token` |
| `send-approval` | `token-send` |
| `token-send` | `token-detail` |

## 殼底 dock

無列之 view：dock 隱藏。有列則顯示主按鈕：

| view | 標籤 | disabled |
|------|------|----------|
| `add-generate` 無 success | 產生 | false |
| `add-generate` 有 success | 完成 | false |
| `add-generate-seed` | 建立 | busy 或尚無 words |
| `add-import-secret` | 匯入 | `detectSecret` 不 ok |
| `add-import-seed` words | 下一步 | busy 或 filled 不是 12 也不是 24 |
| `add-import-seed` pick | 匯入 | busy 或未選 index |
| `add-watch` | 建立 | 公鑰 parse 失敗 |
| `add-combined` | 建立 Combined | 有效成員 < 1 |
| `settings-password` | 變更密碼 | 新密碼 &lt; 8 或不一致或缺目前密碼 |
| `token-send` | 確認 | 無 wallet 或 `sendFormValid` 偽 |
| `send-approval` | （隱藏） | — |

主按鈕命令與今日 `handleDockPrimary` 相同（同一組 `wallet.*` 呼叫與成功後導航）。實作可把「按鈕」放在該畫面 footer callback，由殼讀 dock 表；**不要**改文案或成功導向。

子頁標題：`add-import-seed`＋pick →「選帳戶」；`token-detail` 用持倉列 name／symbol 否則 `SUBPAGE_TITLES`；`token-send` →「送出 {symbol}」；其餘 `SUBPAGE_TITLES`。

## 審批

維持 `ApprovalHost`：`APPROVAL_ROOT_HTML` 含全部 `appr-*`；`mountApprovalShell({ host:"popup", elementIdPrefix:"appr-" })`；cleanup dispose。`pagehide`／`beforeunload`：`ui.abortPending`（今日 `abortWalletSendOnPopupUnload`）。只保留**一份** abort 函式。

失敗 settled 回 `token-send` 的順序（對齊 0.15.0 `usePopupController`）：**先** `navigateTo("token-send")`（此步會依上表清空草稿與 `sendFormError`），**再**把 `notice.error ?? "已取消"` 寫進送出表單錯誤。若先寫錯誤再 navigate，錯誤會被進入清空吃掉。使用者按 Back／殼上拒絕而 `navigateTo("token-send")`（非 settled 失敗）則只清空，不另寫錯誤。

未列 view（含 `send-approval`、`home-activity`、Home Token）殼底 dock **隱藏**；不要為審批再做一顆 `shell-dock` 主鈕（審批底欄仍在 `appr-sign-dock`）。

## 刪檔（出貨前、無主路徑引用才刪）

- `wallet/src/popup/lib/icons.ts`
- `wallet/scripts/html-body-to-jsx.mjs`
- `wallet/scripts/fix-popup-markup-visibility.mjs`
- 若仍存在且未被 React 主路徑 import：`popup/main.ts`、`popup/lib/dom.ts`、`accounts/accounts-ui.ts`、`accounts/combined-ui.ts`、`home/tokens-ui.ts`、`send/send-flow.ts`、`settings/settings-ui.ts`

凡仍含 `bindPopupShell` 或把 `session.*` 當畫面權威、且無主路徑引用的 popup 檔一律刪。若 typecheck 仍引用，先斷引用再刪。

## 測試

`cd wallet && npm run typecheck` 與 `npm run build`。無整包單元測試指令。手驗見 INDEX。
