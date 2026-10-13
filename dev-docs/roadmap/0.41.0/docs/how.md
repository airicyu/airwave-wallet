# 0.41.0 — HOW

## UI 結構（兩頁共用 pattern）

```text
screen-body（可捲）
  field（名稱，optional）
  [seed only] seed-backup-warn
  draft-toolbar（flex-end）
    dice-btn（45px 圓、透明底、紫色骰子 → regenerateDraft）
  [seed only] word-grid word-grid-ro（12 格唯讀）
  label.onboarding.solanaPubkey（助記詞與拋棄式都顯示）
  addr-row
    addr-row-pk（shortAddr，title=全文）
    icon-btn copy（公鑰）
shell-dock
  primary → create / generate
```

助記詞頁 **無** `seed-backup-toolbar` 複製鈕。`.draft-toolbar { justify-content: flex-end; }`。拋棄式頁名稱欄與骰子之間多 `padding-top: 10px`（避免與名稱欄下距折疊）。`.dice-btn` 見 INDEX 色與尺寸。點擊時骰子 SVG 先上跳、左右微晃，再落回原位；圓框不動。動畫未結束再按，取消目前動畫並從第一幀重播。

## 助記詞重骰

`rollGenerateSeedDraft(prevLabel?)` → 新 `words` + `pk`；`err` 清空。重骰進行中 disable 骰子與殼底主按鈕；完成後才可建立。建立只送與畫面公鑰同一組的 mnemonic。

## Burner draft

- `createBurnerDraft()` on mount。
- `rollBurnerDraft()` → 新 keypair；更新 `pk` 並清空 inline 錯誤。進行中 disable 骰子與殼底主按鈕。`onPrimary` 的 `secretKeyBase58` 必須對應該畫面公鑰。
- `onPrimary`：`wallet.generateAccount({ label?, secretKeyBase58 })`（base58 含 secret bytes，與既有 import 路徑同形）。
- `useEffect` cleanup on unmount：zeroize draft secret reference（不 persist）。

## SW `handleGenerateAccount`

若 `secretKeyBase58` 存在：decode → `loadedAccountFromSecretBytes` → 入 vault（與現邏輯相同），**不**再 `generateRandomLoadedAccount`。解碼失敗（空字串、壞 base58、長度不對）回 `BAD_SECRET`（或同等既有碼），不得改走隨機產生。仍檢查 `WALLET_LOCKED`、`ACCOUNT_EXISTS`、label。

若省略該欄：現行行為。

## i18n

新增 `onboarding.regenerateDraft`（繁／簡／en）。
