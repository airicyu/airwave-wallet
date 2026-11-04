# Airwave test-web

最小 dApp，手驗 Airwave 擴充的 Wallet Standard 流程。

## 前置

1. `cd wallet && npm install && npm run build`
2. Chrome → 擴充功能 → 開發人員模式 → **載入未封裝** → 選 `wallet/dist`
3. 點擴充 popup：建立錢包、**解鎖**（或僅新增觀察帳戶亦可連線，但簽名需 signing 帳戶且解鎖）

## 執行

```bash
cd test/test-web
npm install
npm run dev
```

From the repo root: `bun run test-web`.

開啟 http://localhost:5173

## 手驗步驟（0.2.0）

1. **Connect** → popout 批准 → log 顯示地址
2. **Sign message** → 批准 → log 顯示 `Signature base58:`
3. **Sign transaction** → 批准 → log 顯示 `Signed tx base58:`（錢包只簽名，本頁不廣播）
4. **Sign and send transaction** → 批准後由 **dApp** 對 signed bytes 呼叫 `sendRawTransaction`（devnet）；log 顯示 `Broadcast signature:` 與 `Confirmed:`
5. **signAndSendTransaction（錢包代送）** → 呼叫 Wallet Standard `solana:signAndSendTransaction`（0 lamport 自轉、devnet）；popout 批准後確認中→已確認→關窗；log 顯示 `signAndSendTransaction ok:` 與 signature base58
6. **Devnet airdrop (1 SOL)** → 無需 popout 簽名；log 顯示 signature 與餘額變化（僅 devnet RPC； faucet 有速率限制）
7. **Disconnect** → log 顯示 `Disconnected`、狀態為未連線 → **Sign message** 應失敗或需重連 → 再 **Connect** 成功
8. 任一路徑 **拒絕** 或關閉 popout → log 顯示錯誤、可重試
9. popup **切換帳戶** → 本頁 log 出現 `account change` 與新地址（不必重按 Connect）
10. （選）popup 將 active 換成 **觀察帳戶** → Sign message／Sign transaction 應失敗（read-only）；airdrop 仍可對該地址領 devnet SOL

11. **Sign transaction（v1）** → 核准畫面為 `CU limit` + 優先費（無 `CU price`）；優先費顯示交易內 `5000` → 批准 → log `v1 signTransaction returned:`
12. **Sign transaction（v1，省略優先費）** → 優先費顯示設定預設（出廠 `5000`）→ 拒絕
13. **Sign transaction（v1，優先費 0）** → 優先費顯示 `0` → 拒絕
14. **Sign transaction（v1，省略 CU limit）** → 模擬失敗通知；核准仍可按 → 拒絕
15. **Sign transaction（v1，已有簽章）** → `CU limit` 與優先費輸入皆停用 → 拒絕
16. **signAndSendTransaction（v1，錢包代送）** → 費用卡同步驟 11；無 cluster 不符 → 批准 → log `v1 signAndSendTransaction ok:`

e2e 劇本見 `test/e2e/scenarios/07-v1-sign.md`（本機 RPC：`?rpc=http://127.0.0.1:8899`）。
