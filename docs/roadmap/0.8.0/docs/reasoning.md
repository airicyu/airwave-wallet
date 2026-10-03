# WHY — 0.8.0 變更錢包密碼

## 為何要目前密碼而不是只信 session

Session 證明「這個瀏覽器工作階段解鎖過」，不能證明「此刻操作者知道密碼」。只換箱不驗目前密碼，等於任何能操作已解鎖 popup 的人都可把金庫改成自己的密碼。故 `decryptVault(currentPassword)` 為硬門檻。

## 為何鎖定時不提供改密

鎖定屏已是「輸入目前密碼」；再做一份改密會與解鎖搶焦點。先解鎖再進 Settings，改密仍再驗一次目前密碼（Reveal 同款：解鎖不夠，匯出仍要密碼）。

## 為何新 salt

同一密碼重用 salt 會讓密文可被對照。`encryptVault` 已每次新 salt；改密必須走它，禁止 `encryptVaultWithKey` 沿用舊 key 只改密碼字串（舊 key 仍由舊密碼 derive）。

## 為何最短 8

與現況 `createVault` UI 一致：原字串 `length >= 8`，**不** trim。本版不發明強度政策（無大寫／數字規則），以免兩套規則。

## 為何先刪舊 session 再寫 vault

若先寫新密文、session 仍留舊工作金鑰，SW 在 `remove` 前被殺時，hydrate 會當成仍解鎖，`persistVaultFromSession`（`encryptVaultWithKey`）會把新 blob 蓋回舊密碼可解。故 **先 `session.remove`，再寫 local**。`remove` 之後到記憶體換成新 key 之前，禁止把舊 key persist 回 session。hydrate 時 session salt 必須等於 vault salt，否則丟 session。

`remove` 後、寫 vault 前被殺：local 仍舊密文、session 空 → 用舊密碼再解鎖，改密視同未完成。寫 vault 後、persist 新 session 前被殺：須用新密碼解鎖。

## 畫面原則

本版類 B **覆寫** [`design-principles.md`](../../../design-principles.md) 第 9 節「錢包密碼可用 `type=password`」的字面：以本 INDEX 為準。

## 為何 Settings 要樞紐

改密三欄若與 Helius URL 同屏，錄影與 demo 會同時露出 API 秘密與密碼打碼欄。第一層只列入口。網路與 RPC 已分 storage（`cluster` vs `rpcByCluster`），用 seg tab 選網路會讓人以為在切 RPC 清單；故網路用兩列單選，RPC 用兩張卡。

## 為何禁止 `type=password`

Chrome 把該型別當「可存進 Google 密碼管理器」的主訊號。`autocomplete="new-password"` 會邀請儲存。產品要求錢包密碼**不要**進 Google，解鎖也不靠一鍵填入。CSS 打碼 + `type=text` 是可用手段，不是保證。

## 否決

| 方案 | 為何否 |
|------|--------|
| 忘記密碼／助記詞恢復 | 本產品不把助記詞當金庫主密；無詞的 Burner 無法恢復 |
| 只信 session、表單只填新密碼 | 已解鎖裝置等於可奪金庫 |
| 改 KDF 參數 | 遷移格式屬另一 backlog |
| 改密也 `type=password` 求「比較像密碼欄」 | 與「不進 Google」衝突 |
| API keys Reveal 再要錢包密碼 | 與金庫無關；增加摩擦且仍可能把錢包密碼送進 PM |
