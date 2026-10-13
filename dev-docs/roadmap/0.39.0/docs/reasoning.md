# 0.39.0 reasoning

## 側欄關閉

**為何 SW port 斷線：** 側欄文件 `pagehide` 送出的 `ui.resolvePending` 不可靠（文件正在消失）。Popout 已證明 **SW 在表面關閉時結束 pending** 才是權威；側欄應對齊。

**為何只 sign tx 兩種：** Backlog 點名網站待簽畫面。`connect`／`signMessage` 在側欄關閉時自動拒絕會改變 0.25.0 以來使用者「關側欄回 popup、連線請求仍等逾時」的邊界，需另版單獨產品決策。`walletSend` 走 popup 內路徑，不在側欄待簽契約內。

**為何 sign-and-send 走 `finishSignAndSendWindowClosed`：** 與 popout 關窗同一狀態機；已廣播必須 `BROADCAST_UNCONFIRMED`，不可假裝未送出。

**否決：** 在 `rejectOrdinaryDappPending` 內特判 sign-and-send — 會混淆「使用者按拒絕」與「視窗關閉」，且該函式註解已排除此 kind。

**側欄 unload 不再 reject：** `pagehide` 走 `ui.resolvePending` 會讓 sign-and-send 變 `"User rejected"`，且會在關側欄時拒絕 connect，與「僅 sign tx 由 SW 拒絕」驗收衝突。關閉側欄只留 SW port 斷線處理 sign tx。

## AI 模型設定

**為何 apodex 預設：** 產品手測後報告步品質可接受；與舊版 DeepSeek Flash 並列為固定項，不強制 migrate 已存 Flash 使用者。

**為何勾確認才存自訂 id：** 使用者明確要與 RPC 列一致，避免打字中途或失焦寫入半個 id；OpenRouter key 列可保留失焦提交（既有行為），本版只改模型「其他」列。

**為何 normalize 放行合法自訂：** 舊版 allowlist 會把自訂 id 打回預設，與「其他」產品句矛盾。讀取時只擋 **非法** 字串，不擋 **非 preset** 字串。

**否決：** 失焦自動存模型 id（與使用者決策相反）。向 OpenRouter 拉模型列表（非目標、複雜度高）。

## 兩功能同版

兩軌無 storage 衝突、無同一檔案大改衝突（shell pending vs settings UI）。同 minor 出貨減少版本碎片。
