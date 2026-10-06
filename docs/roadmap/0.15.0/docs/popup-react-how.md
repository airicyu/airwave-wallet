# 0.15.0 — Popup React HOW

產品語意以 [INDEX](../INDEX.md) 為準。本檔寫 **怎麼掛、state 從哪來、審批怎麼橋、檔案長什麼樣子**。

## 依賴與建置

在 `wallet/`：

```bash
npm install react react-dom
npm install -D @vitejs/plugin-react
```

`vite.config.ts`：plugins 陣列為 `@vitejs/plugin-react()` 與既有 `crx({ manifest })`（順序以能 build 為準；勿拿掉 crx）。

`tsconfig.json`：`"jsx": "react-jsx"`。`"types"` 含 `chrome`；因本倉庫 React 19.3 **沒有**套件內建 `.d.ts`，另含 `react`／`react-dom`（對應 `@types/*`）。

React 19 若套件已內建型別則不必加 `@types`。本版 typecheck 在拿掉 `@types/react`／`@types/react-dom` 後出現 `TS7016`，INDEX 已同意補回這兩個 **devDependency**（僅型別）。

```bash
npm install -D @types/react @types/react-dom
```


## HTML

`src/popup/index.html` 結構意向：

```html
<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Airwave</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

今日 `main.ts` 對 `../popout/style.css` 的 import 改到 React 入口 `main.tsx`（或 App）繼續 import，避免 popout 共用樣式斷掉。

## 入口與目錄意向

```text
popup/
  index.html          # 薄 root
  main.tsx            # createRoot
  App.tsx             # 鎖定／建庫／殼；依 View 分支
  types.ts            # State、View（可留或微調 export，語意不變）
  style.css           # 不重寫主題
  state/              # getState、storage.onChanged、navigate helpers（可選）
  components/         # 頂欄、底欄、共用列（functional）
  home/
  accounts/
  settings/
  onboarding/
  send/               # 送出表單＋ ApprovalHost 橋接元件
  lib/                # 純函式：format、icon SVG 字串、類 B harden（可無 DOM）
```

0.14.0 的資料夾職責可對應遷移；檔名改 `.tsx` 時保留領域名。**禁止**保留今日 `lib/dom.ts` 那種在**模組頂層** `document.getElementById(...)` 綁死節點、並當作全頁畫面權威的模式；出貨前刪除該主路徑。

## State 鏡像

```text
SW wallet.getState  ──refresh──►  React state（State）
chrome.storage.onChanged(local 且下列四 key) ──►  refresh()
```

觸發 refresh 的 local key **僅**：

- `airwave.accounts.v1`
- `airwave.activeAccountId.v1`
- `airwave.settings.v1`
- `airwave.connections.v1`

- Pending **不**進此 state。
- `activeWalletSendRequestId` 只是 UI 導航用的記憶體欄，權威仍是 SW Map。
- 持倉列資料仍經 `wallet.getHomeTokens`（與今日相同），可放在 Home 相關 state，不是 pending。

## 導航

`navigateTo(view)`：

1. 若從 `send-approval` 離開且該 request 尚未 settled → `ui.abortPending`（同現行）。
2. 更新 `currentView`（及需要清的表單／reveal 明文）。
3. React 依 `currentView` 條件渲染；不要手動 `hidden` 一整棵與 React 樹打架的平行 DOM。

## 審批橋接（強制）

`mountApprovalShell` **不會**建立 DOM。它對 `root` 用 `elementIdPrefix + baseId` 查節點，缺則 throw。popup 必須使用 `elementIdPrefix: "appr-"`。

### 必備 id（prefix `appr-` 後）

與今日 `popup/index.html` 的 `#approval-root` 內骨架一致；對照 `approval/shell.ts` `mountApprovalShell` 的 `q` 清單：

`view-unlock`、`view-gone`、`gone-lead`、`view-legacy`、`view-sign`、`unlock-password`、`unlock-error`、`btn-unlock`、`legacy-origin`、`legacy-kind`、`legacy-detail`、`legacy-error`、`sign-origin`、`sign-body`、`sign-error`、`sign-page-title`、`sign-avatar`、`sign-label`、`sign-addr`、`btn-copy-pk`、`sign-reject`、`sign-approve`、`sign-dock`、`legacy-reject`、`legacy-approve`、`btn-close-expired`。

結構／class 對齊現 HTML（`unlock-screen`、`approval-sign-shell`、`approval-dock` 等），以便沿用 CSS。

### React 與殼的所有權

1. 進入 `send-approval`：先讓 `#approval-root`（或同等）含完整骨架出現在 DOM。
2. `useEffect` 內對該 root 呼叫 `mountApprovalShell`；cleanup 呼叫回傳的 dispose（內部即 `disposeApprovalShell`）。
3. **mount 之後到 dispose 之前**，React **不得**再更新該子樹的屬性或子節點（殼會改 `hidden`／內文）。推薦做法（擇一即可）：
   - 骨架字串一次 `dangerouslySetInnerHTML` 寫入 host，之後該 host 不再接收會改子樹的 React props；或
   - host 以 `key={requestId}` 整段重掛，且父層因 `getState` refresh 而 re-render 時不傳入會觸發骨架 reconcile 的 children。
4. 禁止 HOW 舊示例那種空的 `<div id="approval-root" />` 就 mount。
5. `pagehide`／`beforeunload`／離 view：對齊今日 `abortWalletSendOnPopupUnload`（`ui.abortPending`＋teardown）。

### 意向碼（骨架不可省略）

```tsx
// 示意：APPROVAL_ROOT_HTML 為含全部 appr-* 的 markup 字串（自今日 index.html 搬入）
function ApprovalBridge({ requestId, callbacks }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !requestId) return;
    const dispose = mountApprovalShell(
      { requestId, host: "popup", elementIdPrefix: "appr-", callbacks },
      el,
    );
    return dispose;
  }, [requestId]);
  return (
    <div
      ref={rootRef}
      id="approval-root"
      className="approval-root"
      dangerouslySetInnerHTML={{ __html: APPROVAL_ROOT_HTML }}
    />
  );
}
```

元件檔名可自訂；函式名不強制叫 `ApprovalHost`。

## 類 B 密碼

受控 `<input type="text" className="wallet-pwd-masked" autoComplete="off" />`，掛載後套用與今日 `hardenWalletPasswordInput`／`hardenSensitiveTextInput` 同等屬性（可用 `useEffect` 對 ref，或封成 `<WalletPasswordInput />`）。禁止 `type="password"`。

## 明確不做

- 不把 `approval/shell.ts` 改成 JSX
- 不上 Router／Zustand
- 不改 `shared/commands.ts` 的 command 字串
- 不保留 `dom.ts` 模組頂層 el 總表當畫面權威
