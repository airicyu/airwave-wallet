# Reasoning — 0.26.0

0.6.0 已規定切標準／CLI 要重跑預覽。手測見到鈕的選中態會變、下面 20 個地址不變。

現碼把 `void runPreview(next)` 寫在 `setDraft` updater 裡。Updater 必須是純函式；裡面再 `setDraft` 會與「return 一份沒加 `previewGen` 的 next」打架：世代號被蓋回，preview 回應因 `prev.previewGen !== gen` 被丟棄。畫面只剩 `kind` 變了。

不改 SW：同一助記詞、`phantom` vs `cli` 路徑深度不同，公鑰本來就該不同。問題在 UI 沒把新回應畫上。

Combined 展開：chevron 墊在 USD 底下且 padding 2px，熱區幾乎等於字形，手指容易點到整張卡（進詳情）。成員又把地址、長數量、% 用 ` · ` 拼成 nowrap 一行，360px 會溢出。改成 34px 獨立鈕、明細改兩行＋比例條，不改 `members` 資料。畫面排序改持倉大→小，避免仍按 `subPubkeys` 插入序。概念稿曾只用 Segoe UI、數量 0.75rem，會與產品 body（JhengHei／PingFang）及 `.token-qty` 0.78rem 不一致，已對齊。

解鎖聚焦：popup 一開常落在文件而非密碼欄。類型圖：字母頭像看不出 kind，文字徽章佔寬。拖曳：寫入序難改，主區當把手避免再加「排序」文案。Widget 取代頭像是因為 28–36px 圈放不下頭像再疊徽章。聚合色不用 `--accent`，以免與使用中徽章同義。

Storage 遷移這版只蓋戳：將來改形狀才加 `1→2` 函式。獨立鍵比把所有 `v1` 改名安全。世代高於本碼不降級，避免較新擴充寫過的資料被舊碼踩。
