# Solibra Wallet 反省筆記

> 來源專案：本倉庫根的上一層 `../solibra-wallet`（已失敗的 Solana Chrome Extension 錢包嘗試）  
> 目的：在 `airwave-wallet` 重做之前，先把踩過的坑寫清楚，避免重蹈覆轍。  
> 相關文件：
> - [full-picture.md](./full-picture.md)（整盤產品／架構總覽）
> - [../research/extension-message-flow.html](../research/extension-message-flow.html)（多 runtime 訊息流）

---

## 一句話結論

多 runtime（inject / content / background / popup / popout）+ 用訊息協定傳資料，**方向是對的**。  
Solibra 死在三件事疊加：

1. **請求生命週期沒有單一權威**（靠 storage + 多份 Zustand 碰運氣）
2. **持久 state 同步用手寫 hydrate，而不是 `chrome.storage.onChanged`**
3. **密鑰託管是安全劇場**（硬編碼密碼、無真正 lock/unlock）

外加產品面未完成（助記詞、RPC、origin allowlist、Wallet Standard 能力不完整），就算修了訊息鏈也難以上線。

---

## 當時做對了什麼（不要推倒重來時丟掉）

| 做法 | 為什麼對 |
|------|----------|
| 分層：inject → content → background → popout 審批 | Chrome 強制隔離；這是標準錢包拓撲 |
| 簽名在擴充 UI，不在 page script | 信任邊界正確 |
| Command + `requestId`（uuid）信封 | 比裸字串協定好維護 |
| Wallet Standard scaffolding | dApp 相容的正確入口之一 |
| 交易 simulation 審批 UI | 產品方向正確 |
| 簽名訊息時拒絕可解析成 `VersionedMessage` 的 payload | 基本防釣魚意識 |
| 落盤用 PBKDF2 + AES-GCM | 演算法選擇合理（前提是密碼是真的） |

**反省重點不是「不該做 event bus」，而是 bus / state / custody 的職責沒劃清。**

---

## 教訓 1：跨 runtime 通訊 — Event bus 對，權威模型錯

### 舊做法問題

- Background 把 operation 寫進 `operationStore`（Zustand + `chrome.storage`）
- 再開 popout，讓 popout **自己 hydrate 去找** request
- 結果回傳預設 **broadcast 所有 tab**
- Inject 用輪詢 + 單一 `#operationRequestId` 等結果 → 並發會互踩

典型壞結果：`LoadingOperationScreen` 輪詢條件寫錯（`undefined` vs `null`）、rehydrate 錯 store、審批窗卡死。這不是 polish bug，是**請求配送模型不合格**。

### 重做規則（airwave）

```
inject  ──request──► content ──► background(SW)     ← ★ 唯一 pending 權威
                              │
                              ├─ Map<requestId, { tabId, frameId, origin, payload }>
                              ├─ 打開 popout（只帶 requestId）
                              │
popout  ──get/approve/reject──► background
                              │
background ──result（只回原 tab）──► content ──► inject ──► dApp
```

1. **SW 持有 pending**；UI 不問 storage「有沒有我的包裹」
2. **回包給 `sender.tab.id`**，預設禁止廣播全 tab
3. **Bus 傳命令/事件**；不要用 bus 喊「請大家 rehydrate store」
4. Content 校驗 `origin`；不要只信 `postMessage` 的 `from` 欄位
5. 謹慎 `all_frames: true`（每個 iframe 都注入會放大混亂）

詳見：[extension-message-flow.html](../research/extension-message-flow.html)

---

## 教訓 2：State — Zustand + storage 可以，手寫 sync 是錯路

### 原初痛點（真實且正確的觀察）

> 在一邊改了 store（例如 settings），別的 runtime 不生效。

因為每個 runtime 各有一份 JS 記憶體；Zustand 改的是**本窗口鏡像**，不是全域真相。

### 當時走歪的補救

為每個 mutation 呼叫 `syncStoreAcrossRuntime` → 對方 `persist.rehydrate()`。  
結果：協定半殘（有送沒接）、時序競態、settings/keys/operation 同一套路、極混亂又不同步。

### 正確模型：先分三類 state

| 類型 | 例子 | 放哪 | 怎麼同步 |
|------|------|------|----------|
| **持久配置** | RPC、帳戶索引、已連線站點、加密後的 keybox | `chrome.storage.local` | **`chrome.storage.onChanged` 更新各 runtime 鏡像** |
| **會話/短暫** | pending 簽名、解鎖後的金鑰材料 | SW 記憶體 / `storage.session` | **不要** persist 到 local + 多端 Zustand |
| **純 UI** | loading、表單、動畫 | 本窗口 React/Zustand | **不要**跨 runtime 同步 |

### 重做規則（airwave）

1. **Source of truth = `chrome.storage`**（對持久配置而言）
2. 各 runtime 的 Zustand = **本地響應式快取**，不是跨進程資料庫
3. 改設定：`storage.set` → 各方靠 `onChanged` 更新；**刪除 RefreshXxxStore 主路徑**
4. Pending operation **禁止**進「持久 Zustand persist」那套路
5. 可選進階：只有 background 允許寫 storage（單一寫入口）；初期直寫 + onChanged 通常夠用
6. inject/content **不需要**完整 settings/keys 鏡像；要資料就問 SW

---

## 教訓 3：Custody — 硬編碼密碼 = 架構失敗，不是「還沒做完」

Solibra 遺留：

- `lockKey: "Qwer1234!"` 寫死在 store
- 整份 keys（含 lockKey）persist 進 `chrome.storage.local`
- 無真正 lock / unlock / auto-lock 生命週期
- install 時產生 device RSA key，簽名路徑幾乎沒用上（死架構）

### 重做規則（airwave）

1. 使用者密碼 → 僅用於解鎖；**永不硬編碼、永不把明文密碼當長期 persist 欄位**
2. 解鎖後金鑰材料只活在記憶體（或嚴格限制的 session）
3. idle / 關閉後重新鎖定
4. 落盤只存加密 keybox；匯出/備份走明確 UX
5. 「加密傳輸結果給 inject」可以保留，但要綁在 **SW 中介的 session**，不要靠孤兒 popout 廣播

---

## 教訓 4：Wallet / dApp 語意 — 廣告了就要做完，或不要廣告

Solibra 常見缺口：

- `disconnect()` 空實作
- `signAllTransactions` / `signIn` throw，但 Standard 路徑會碰到
- `onlyIfTrusted` 忽略；無 approved-origins store
- 帳戶切換訊息有時不帶 pubkey，逼使用者重新 connect
- 多數站仍期待 legacy `window.solana`；只做 Standard 是產品取捨，要有意識

### 重做規則（airwave）

- Feature 表與實作一致；做不到就不要宣告
- 先做：connect / disconnect / accountChanged / signMessage / signTransaction / signAndSend
- Origin allowlist + 已連線站點管理是安全功能，不是後期美化
- 明確決定要不要 legacy provider shim

---

## 教訓 5：產品未完成也會讓專案「失敗」——但不要跟架構坑混為一談

這些是 scope / 完成度問題，不是拓撲選錯：

- 無助記詞 / 匯入私鑰 / 備份還原
- 無真實密碼引導與鎖屏
- RPC / cluster 設定未做（硬編碼 mainnet）
- 無活動紀錄、代幣深度 UI、硬體錢包等

**反省用法：** 重做時用 MVP checklist 卡範圍；但**訊息權威、state 同步、custody** 三條必須第一天就對，不能「之後再補」。

---

## Solibra → Airwave：Do / Don't 速查

### Do

- [ ] Background Service Worker = pending request hub
- [ ] 持久 state：`chrome.storage` + `onChanged` → Zustand 鏡像
- [ ] 審批 UI 只拿 `requestId`，向 SW 取 payload / 回傳決定
- [ ] 結果只回發起的 tab/frame
- [ ] 真實 unlock 生命週期；加密 keybox 落盤
- [ ] Command 信封保留（typed + requestId）
- [ ] 交易 simulation 審批保留並強化

### Don't

- [ ] 不要用多份 Zustand + 手寫 `syncStoreAcrossRuntime` / rehydrate 當主同步
- [ ] 不要把 pending operation 當「持久 shared store」
- [ ] 不要預設 broadcast 到所有 tab
- [ ] 不要硬編碼密碼或把明文密碼 persist
- [ ] 不要只信 `postMessage.from` 當信任根
- [ ] 不要在 inject 持有或解密長期私鑰
- [ ] 不要廣告未實作的 Wallet Standard features

---

## 建議的重做順序（寫碼前）

1. 定 runtime 拓撲與訊息表（已有 research HTML，可再補「pending 生命週期」一節）
2. 定 state 三分類與 storage key schema
3. 定 custody：建立錢包 / 解鎖 / 鎖定 / 簽名誰持鑰
4. 最小垂直切片：connect → approve → 回傳 pubkey（端到端可測）
5. 再加 signMessage / signTx / simulation
6. 最後才是設定頁、多帳戶、legacy shim、美化

---

## Smoking-gun 檔案（若要回看舊碼）

| 檔案 | 問題 |
|------|------|
| `solibra-wallet/src/ui/popout/page/LoadingOperationScreen.tsx` | 錯 store + 錯 null 判斷 |
| `solibra-wallet/src/store/keysStore.ts` | 硬編碼 `lockKey` |
| `solibra-wallet/src/store/asyncLocalStorage.ts` | 手寫 sync 半殘 |
| `solibra-wallet/src/background/background.ts` | 無 operation refresh；fire-and-forget popout |
| `solibra-wallet/src/ui/utils/messageUtils.ts` | 預設廣播全 tab |

---

## 給未來自己的備註

當時不是「不該學 Phantom 分層」，而是：

> 骨架抄了分層，但**信任邊界、密鑰託管、請求生命週期、state 真相**沒有收成一套可運行的錢包 runtime。

Airwave 重做時：event bus 保留，Zustand 保留，storage 保留——  
**改的是誰是真相、誰是 hub、什麼東西禁止共享。**
