# 0.13.0 — 檔案拆分計畫（行為不變）

產品語意仍以 [INDEX](../INDEX.md) 為準。本檔只寫 **怎麼拆、拆到哪、不要動什麼**。

## 為何現在拆

| 檔 | 約行數 | 問題 |
|----|--------|------|
| `wallet/src/popup/main.ts` | ~2600 | 導航、送出、審批掛載、持倉、Settings、助記詞匯入、帳戶列全擠一起；改一處易踩另一處 |
| `wallet/src/background/index.ts` | ~2050 | 已有 `handleDapp`／`handleUi`／`handleWallet` 三入口，卻仍全部寫在同一檔 |
| `wallet/src/approval/shell.ts` | ~1100 | 共用殼＋CU／模擬 DOM；生命週期曾漏清（第二次送出 gone）。本輪 **先不切業務語意**，只保證 dispose 完整；DOM 繪製可下一刀 |

「幾百行」當警訊合理，但 **vanilla popup 殼本身會超過 400 行**（`navigateTo`＋`render`＋事件）。目標不是每檔 ≤300，而是 **一個檔一件事、index 只調度**。

## 不做

- 改 custody／pending／廣播規則
- 引入框架、狀態庫、新依賴
- 一次拆 `style.css`、重畫無關畫面
- 把 `home-tokens-service.ts`（已獨立）再切碎

## 目標結構

### Service worker

```text
background/
  index.ts                 # 只：onMessage、windows.onRemoved、dispatch、ensureHydrated
  ext-respond.ts           # respond()
  vault-persist.ts         # persistVaultFromSession、newAccountId、secretToStored
  origin-notify.ts         # tabs.sendMessage：result／account-changed／disconnect
  open-popout.ts
  wallet-send-broadcast.ts # runtime settled／progress（僅擴充頁）
  sign-gates.ts            # 鎖定／唯讀閘門、keypair 解析
  finish-pending.ts        # finishConnect／SignMessage／SignTransaction
  dapp-handlers.ts
  ui-handlers.ts
  wallet-handlers.ts       # wallet.* ＋ storage.patchSettings（帳戶／金庫命令集）
```

`index.ts` 目標 **≲250 行**。`wallet-handlers.ts` 仍可能 ~1000 行（命令多）；**下一刀**再按 vault／accounts／combined 拆，本輪不強求。

### Popup

```text
popup/
  main.ts              # boot、navigateTo、render、全域事件
  types.ts             # View、State、SUBPAGE_TITLES
  password-input.ts    # harden 類 B 欄位（popup／shell 可共用則放 shared 或 approval）
  send-flow.ts         # 送出表單、50%／全部、beginSend
  approval-host.ts     # 掛／卸 popup 審批殼、abort
  tokens-ui.ts         # 持倉卡、詳情
  settings-ui.ts       # Settings 樞紐／RPC／keys／CU
  accounts-ui.ts       # 帳戶列、manage、reveal、widget
  import-seed-flow.ts  # 助記詞匯入多步
  generate-seed-flow.ts
  combined-ui.ts
```

`main.ts` 目標 **≲800 行**（導航表＋render 編排仍會佔篇幅）。模組透過 **明確函式參數／回呼** 拿 `State`／`navigateTo`，禁止再長一串隱式全域（可保留少數 popup 單例：`currentView`、`lastState` 仍在 `main.ts`）。

### 審批殼（本輪輕）

- `approval/shell.ts`：維持單檔，但 **dispose 必須重設全部模組狀態**（已修方向）。
- 不在本輪把 CU 卡拆出去，除非拆檔不改 DOM 行為且 typecheck 立刻過。

## 順序（必須）

1. **SW 先拆**（邊界已是 command 前綴；回歸面小）
2. **popup 再拆**：`types` → `send-flow`＋`approval-host` → `import-seed` → `settings` → `tokens`／`accounts`
3. 每步 `cd wallet && npm run typecheck`
4. 全部結束 `npm run build`

## 進度（本輪已落地）

- SW：`index.ts` 只調度；命令集在 `dapp-handlers`／`ui-handlers`／`wallet-handlers`。
- Popup：`main.ts` 只保留 boot／導航／dock／全域事件；畫面拆到同目錄各 `*-ui`／`*-flow`。
- `approval/shell.ts` 本輪不切 DOM，dispose 已在先前修復。
- `wallet-handlers.ts` 仍大（帳戶／金庫命令集）；下一刀再按 vault／accounts／combined 拆。

## 驗收（重構專用）

- 行為與拆前相同：網站仍 popout；`walletSend` 仍 popup 殼內
- 連續兩次送出可進審批（gone 態不殘留）
- 拒絕／批准底欄釘住可見
- 無新 Wallet Standard 方法；pending 仍不進 storage
