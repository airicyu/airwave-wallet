# 0.33.0 — 為何信任欄固定佔位、且不信任代幣自帶的勾

## 問題

[0.10.0](../../0.10.0/INDEX.md) 起預期變動只顯示 `symbol` 與差額。SPL 的 `symbol` 在 phase-2 是 mint 縮寫（`EPjF…Dt1v`），使用者無法一眼认出 USDC。Home 持倉已用 Jupiter Tokens v2 補名稱與 verified，簽署審批尚未復用。

若在代幣圖旁或 symbol 後加「勾」，詐騙代幣可在**自己的 icon 像素**或 **symbol 字串**裡畫勾（`USDC✓`），冒充 Jupiter verified。

## 決策

1. **最左獨立信任欄，永遠佔位**  
   已驗證與未驗證各有一枚**錢包繪製的盾形 SVG**，與代幣圖分離、不重疊。攻擊方無法控制左欄像素，只能偽造右側圓圖與文字。

2. **不用 Unicode 勾當信任標**  
   Home 列上綠色 `✓`（`token-verified`）在持倉情境尚可接受；簽署差額涉及資產得失，本版在**預期變動**改用盾形。Home 版面 [0.12.0](../../0.12.0/INDEX.md) 已定「不改」，故不在本版統一全產品。

3. **未驗證時不採信 symbol**  
   只有 Jupiter `isVerified === true` 時，主標才用清洗後的 `symbol`；否則主標與差額尾綴都用 mint 縮寫。以 `isVerified` 為準，不以 symbol 形似 USDC 為準。

4. **verified 才顯示 mint 次行**  
   方便老手核對 mint；未驗證列以 mint 為主標，不重複一行。

5. **Jupiter 只在 mainnet**  
   與 [0.4.0](../../0.4.0/INDEX.md) 一致：devnet 不打 Jupiter。devnet 列仍四欄，信任為未驗證盾。

6. **enrichment 在 SW、模擬成功後**  
   不增加 popup 攻擊面；不 persist 信任狀態。每 3 秒重模擬時以 mint 快取避免刷 API。

## 否決方案

| 方案 | 否決原因 |
|------|----------|
| 勾貼在代幣圖右下角 | 與假 icon 內勾無法區分 |
| 勾貼在 symbol 後 | 與 `USDC✓` emoji 詐騙同形 |
| 僅 verified 顯示左欄、未驗證留白 | 留白會被假勾佔據第一閱讀位置 |
| popup 直連 Jupiter | 重複 key 暴露面；違背 SW 聚合外部 API 現況 |
| 未驗證仍用 symbol 當主標 | 差額欄仍可被假 symbol 利用；主標規則必須收緊 |
