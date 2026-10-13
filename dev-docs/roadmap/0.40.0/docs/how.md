# 0.40.0 — HOW（連線確認 UI）

## ConnectPage 結構

```text
flow-page
  top-bar（Back → reject）
  flow-page-body.connect-consent
    connect-hero（置中欄）
      connect-site-mark
      connect-host
      connect-origin
      connect-bridge（裝飾線，aria-hidden）
      connect-account
        avatar
        connect-acct-name
        connect-acct-addr
  footer.approval-dock（reject / connect primary）
```

## 站點字串

- `connectHostLabel(origin)`：`new URL(origin).hostname`，去掉前綴 `www.`（大小寫不敏感）；parse 失敗則回傳原 `origin` 字串。
- `connectSiteMark(origin)`：`connectHostLabel` 第一字元大寫；空則 `?`。

## 帳戶

- 與 Home widget 相同：`displayAccountName(label, getExposedPublicKey(meta))`；avatar 字用 `avatarLetter(顯示名)`。
- 無 active：名稱 `—`，無地址列。

## 狀態載入

既有 `ui.getPending`＋`wallet.getState`；在 `ready` 時一併存 `accounts`、`activeAccountId`（僅 connect 同意畫面需要）。

## 自動批准

`reconnectWhileLocked` 解鎖後自動 `approve` 邏輯 **不變**；使用者可能只看到極短閃過的新 UI。
