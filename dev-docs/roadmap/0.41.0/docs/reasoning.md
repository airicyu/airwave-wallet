# 0.41.0 — reasoning

## 為何移除助記詞複製

整組 12 詞一鍵進剪貼簿風險高（誤觸、惡意讀取、錄影）。公鑰非秘密，可複製。

## 為何骰子靠右

沿用原助記詞 copy 的 toolbar 位置；紫色圓形骰子與一般灰 icon 區隔，表示「換一組」而非複製。

## 為何 Burner 擴充 generateAccount

避免「先建假帳戶再刪」；單次 command 帶 draft secret 與現有 custody 一致。向後相容無 payload 路徑。

## 為何重骰未完成不可建立

重骰是 async。若畫面已換成下一組公鑰、送出的仍是上一組 secret，使用者會存到不是自己剛看到的地址。進行中鎖骰子與主按鈕，且送出內容必須與當時公鑰同一組。

## 為何解碼失敗不改走隨機

帶了 `secretKeyBase58` 卻解不開，代表這次請求要入庫的就是那把鑰匙。改走隨機會讓預覽地址與入庫地址分叉。

## 設計閘門

實作前以 [`create-wallet-draft-ux.html`](../../design-demos/0.41.0/create-wallet-draft-ux.html) 對齊版面；同意後才改產品 CSS。
