# HOW — 0.26.0

## Track 6 — local schema 遷移

鍵：`airwave.schemaGeneration`（number）。目標：`CURRENT_SCHEMA_GENERATION`（本版＝1）。

`ensureLocalMigrated()`（單例 Promise）：

1. 讀世代；非 ≥0 整數當 0。
2. 若 `from > CURRENT`：return。
3. 若 `from < CURRENT`：只允許 `0 → 1`＝`set({ airwave.schemaGeneration: 1 })`，不讀寫其它 STORAGE 鍵。
4. 失敗 throw；呼叫端 command 回 `STORAGE_MIGRATION_FAILED`，並把 gate 清掉以便重試。

`background/index.ts`：模組載入 `void ensureLocalMigrated()`；`dispatch` 在 `session.ensureHydrated` **之前** `await ensureLocalMigrated()`。dapp／ui／wallet／shell 皆走這條。Popup 的 `onChanged` 不聽此鍵、不寫此鍵。

# HOW — 0.26.0

## Track 3 — 解鎖聚焦

`WalletPasswordInput` 可選 `autoFocus`：mount 時 `focus()`。`LockedScreen`、`UnlockForm` 開啟。審批殼 `showUnlockScreen`：僅當該 view **從 hidden→可見** 時 `unlockPassword.focus()`；解鎖失敗清空後再 `focus()`。`loadPending` 若本來就在解鎖畫面，不要再 focus。

## Track 4 — 類型圖示

`accountVisualKind(meta)`：combined → `combined`；`accountKind === "readOnly"` → `readOnly`；否則 `signing`。

圖：鑰匙／眼睛／疊卡。色：`--ok`／`--warn`／`#c084fc`。React：`AccountKindMark`。Vanilla：`paintAccountKindMark(el, kind)` 寫入 SVG。Widget 與 `signAvatar` 用 mark 取代字母。Accounts：名稱左 18px mark；種類徽章刪除。

Catalog：`accounts.kindSigning` 簽名錢包／签名钱包／Signing；`accounts.kindReadOnly` 唯讀／只读／Read-only；`accounts.kindCombined` 聚合錢包帳戶／聚合钱包账户／Combined。

## Track 5 — 拖曳排序

`wallet.reorderAccounts` payload `{ orderedIds: string[] }`。讀目前 accounts；若長度不同、有重複、或 id 集合不等於現有 → `INVALID_ORDER`。否則依 `orderedIds` 重排 `writeAccounts`。不改 `activeAccountId`、不 `notifyAccountChanged`。

UI：pointer 在 `.account-card-main`（排除內部 button）。該區 `user-select: none`；pointerdown（非按鈕）`preventDefault` 並清 selection。移動 ≥6px 進入拖曳，取消這次 click 的切帳戶。拖曳中目標列上緣或下緣畫 `.account-drop-line`。`pointerup` 送 command。

## Track 1 — 匯入方案預覽觸發

---

## Track 2 — Combined 持倉展開

視覺：[combined-token-expand-ux.html](../../../design-demos/combined-token-expand-ux.html)。資料仍 0.5.0 `members`。

| 元素 | 規則 |
|------|------|
| 外框 | 一列一個 `token-block`：上為 `token-card`，展開時下接 `token-member-panel`，中間一條 `stroke-soft` |
| Chevron | 卡最右 34×34。收合時圖示旋轉 −90°（朝右），展開 0°（朝下）。`token.expandMembers`／`token.collapseMembers` |
| 點擊 | chevron：`stopPropagation`＋toggle `expandedTokenRowIds`。卡片其餘：`onOpenDetail`。成員面板：無 click handler |
| 成員列 | 行1 短地址 ellipsis ＋ `Math.round(percent)%`；行2 `uiAmountLabel`＋該 token `symbol` ellipsis；3px 條 `width = clamp(percent, 0, 100)%` |
| 排序 | 畫面前用 `sortCombinedTokenMembers`：`uiAmount` 大者在上；相同則 `pubkey.localeCompare(..., "en", { numeric: true, sensitivity: "base" })` |
| 字體 | 數量＝`.token-qty`；地址＝`--mono`；面板繼承 body |

`wallet/scripts/gen-ui-messages.mjs` 加上述兩 key 後重跑產生器。

## Track 1 — 匯入方案預覽觸發

繼承 [0.6.0 seed-import-how](../../0.6.0/docs/seed-import-how.md)。本節只寫 popup **何時**發 preview、如何避免過期回應蓋列。命令與路徑公式以 0.6.0 為準。

## 觸發

| 事件 | snapshot | 接著 |
|------|----------|------|
| 詞格「下一步」成功 | 當下詞＋預設 `kind:"phantom"` | 進入 pick，列為 phantom 0–19 |
| 點方案鈕 | `{ ...目前 draft, kind: 該鈕, selected: null }` | 立刻 `runPreview(snapshot)`。**不要**把 `runPreview` 放進 `setDraft` updater |
| 自訂 path `blur` | `{ ...目前 draft, customPath: input.value }` | 同上 |

## `runPreview`

1. `startedGen = snapshot.previewGen + 1`
2. **一次** `setDraft`：`kind`／`customPath`／`selected` 用 snapshot，`previewGen = startedGen`，`busy: true`，清 `err`
3. `requestSeedPreview` 仍用 snapshot 的舊 `previewGen`（函式內自己 `+1` 得到同一 `startedGen`），payload：`mnemonic`、`pathKind: snapshot.kind`、僅 custom 帶 `customPath`
4. 回應回來：僅當 `prev.previewGen === gen` 才合併 `pathPreview`／`preview`／`busy`／`err`。否則丟棄

禁止第二步只寫 `previewGen`／`busy` 而靠另一次 updater 寫 `kind`：後者若回傳未含新 `previewGen` 的物件，會把世代號打回舊值，步驟 4 永遠不相等，列就停在上一方案。

## 顯示

- `path-line` 顯示 SW 回的 `pathPreview`（模板，`{n}` 不替換）
- 20 列 `#index`＋公鑰縮寫。busy 且列仍空時可顯示讀取中；切方案時舊列可留到新列到達，但新列到達後必須換掉
