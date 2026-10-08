# HOW — 0.22.0

實作路徑。契約以 [INDEX](../INDEX.md) 為準。

## 顯示名稱與頭像

共用純函式（建議 `wallet/src/popup/lib/format.ts`，簽署殼從 `approval/format.ts` 對齊或抽 shared）：

- `displayAccountName(label, pubkey): string`：`label.trim()` 非空則回 trim 後字串；否則 `pubkey.slice(0, 4)`；兩者皆空則名稱列顯示 `—`（頭像仍 `?`）。
- `avatarPrefix(displayName): string`：若顯示名稱是 `—` 或空則 `?`；否則 `displayName.slice(0, 2)`。不 `toUpperCase`。

Home `WalletWidget` 與簽署殼頂欄帳戶 widget 用這兩函式。Accounts 列表卡片仍用單字母 `avatarLetter`，本版不改。

寫入 `label`：所有產生／匯入／觀察／combined／`renameAccount` 的輸入 `maxlength=15`。SW trim 後長度 `> 15` 或空 → `INVALID_LABEL`。不自動把舊帳戶截成 15。

## Home 頂欄 pill

`#bar-home`：

1. `.bar-wallet`（pill）：`flex: 0 1 auto`，禁止 `flex: 1` 撐滿。單列 `align-items: center`：圓形 `.avatar`（36×36、`border-radius: 50%`）｜`.bar-wallet-name`（ellipsis）｜pill 內 `#btn-widget-copy`。不渲染 `#widget-addr`。
2. `settings.cluster === "devnet"` 時，pill **後面**一顆非互動 `.cluster-badge` 文案 `Devnet`。`mainnet` 不插入該節點。
3. spacer。
4. 鎖定、選單。

點 `.bar-wallet` 進 Accounts。複製鈕 `stopPropagation`。成功：圖示 `IconCheck`、`title`／`aria-label`「已複製」，1.6s 還原「複製」與 `IconCopy`。`clipboard.writeText` 失敗不改圖示。

簽署複製同一套計時與文案：popout `#btn-copy-pk`、popup `ApprovalHost` `#appr-btn-copy-pk`。

## 刷新冷卻

`#btn-refresh-assets`：`title`／`aria-label`「重新整理」。按下 → `setHomeAssetsForce(true)` 且 `disabled` 3 秒（`Date.now()` 起算）。外圈 SVG 弧 3s。冷卻中鈕 `disabled` 時弧仍須可見（禁止整顆 `opacity` 低到看不出弧；可只把圖示變淡、弧保持 `--accent`）。`useRef` 存 timer；離開 `home-token` 或 `activeAccountId` 變更則 `clearTimeout` 並 `disabled=false`。不進 storage。

## Activity Orb

`wallet/src/shared/home-activity.ts`：刪 `solscanTxUrl`／`isSolscanTxUrl`／`solscanUrl`。

```ts
export function orbTxUrl(signature: string, cluster: "mainnet" | "devnet"): string {
  const sig = encodeURIComponent(signature);
  const q = cluster === "devnet" ? "devnet" : "mainnet-beta";
  return `https://orb.helius.dev/tx/${sig}?cluster=${q}`;
}
export function isOrbTxUrl(url: string): boolean {
  return url.startsWith("https://orb.helius.dev/tx/");
}
```

列型別欄 `orbUrl`。`HomeActivityList`：`title`／`aria-label`「在 Orb 開啟」；`preventDefault` 後僅當 `isOrbTxUrl` 才 `chrome.tabs.create`。圖示與 32×32 熱區不變。

## 收回租金確認中

`currentView === "close-empty-sending"`：

- `#top-bar` `hidden`（或 shell class 對齊 `.send-status-mode` 藏頂欄）。
- 無 dock、非 Home（tab bar 本就 hidden）。
- 內容：與 `SEND_STATUS_AURORA_SVG` **同一份** dash-ring markup／class（可抽 `wallet/src/shared/send-status-mark.ts` 或 popup 複製同一 SVG 字串，禁止第二套配色時序）。
- 標題「確認中」、說明「等待鏈上確認」。
- `handleBack` 在 sending 仍 no-op。結束進 `close-empty-result`。

結果頁與 commit 語意不改。

## Kit phase 1

`simulatePhase1ForLimit`（`sign-tx-simulate.ts`）：

1. 仍對副本 `writeCuToTransactionBytes(txBytes, CU_LIMIT_MAX, 0)`。失敗則用原 bytes。
2. **不得**把探針寫入 `workingTx`。
3. factory 的 message 取自**該探針 bytes 的解編**（與現碼寫入 CU 同一條 Kit 解編路徑，含 lookup tables）。禁止另組一筆「無 CB 的 close 式」message 去對齊 `planCloseEmpty`。
4. `estimateResourceLimitsFactory({ rpc: createSolanaRpc(settings.rpcUrl) })`。呼叫必須包進既有模擬的 15s 上限（`SIM_TIMEOUT_MS`／`SimDeadline`）；逾時當失敗並 fallback，不得讓第一次進殼無限等。
5. 讀 factory 回傳的 **`computeUnitLimit`**（與 0.21 `close-empty-service.ts` 同一欄）。僅當該值可轉成**有限、非負整數**才當消耗；NaN／非有限／缺欄走 fallback。**不要**讀 `unitsConsumed`（那是 0.11 `simulateTransaction` 的欄）。忽略 loaded accounts data size。不要把非法值送進 `suggestedLimitFromPhase1`。
6. 合法整數：`return suggestedLimitFromPhase1(units, originalLimit)`。
7. throw／逾時／解編失敗／沒有可用整數：有 `originalLimit` 則用之；否則 `estimateCuLimitFromCompiledIxs`（0.11.0 fallback）。
8. 禁止 `estimateAndSetResourceLimitsFactory`。禁止改 `computeCloseEmptyUnitLimit`。

RPC 永遠 `settings.rpcUrl`。不新增 command。

## CSS 變數

Devnet 徽章：`--warn: #e8b84a`（popup `style.css` 若無則加）。`--warn-bg: #3a2e14`。
