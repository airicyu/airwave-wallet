# HOW — 0.29.0 Mainnet RPC 必填與首次短引導

契約以 [INDEX](../INDEX.md) 為準。

## 就緒判斷

```ts
function isMainnetRpcReady(cfg: ClusterRpcConfig): boolean {
  const active = cfg.active.trim();
  if (!active) return false;
  if (active === PUBLIC_RPC_BY_CLUSTER.mainnet) return false;
  return isAllowedCustomRpc(active) && cfg.urls.includes(active);
}
```

`effectiveRpcUrl("mainnet", cfg)`：就緒則回 `cfg.active.trim()`，否則 `""`。  
`effectiveRpcUrl("devnet", cfg)`：維持 0.27.0（有自訂用自訂，否則官方 devnet）。

讀取時若 mainnet `active` 是官方公用 URL：當成沒有（`active: ""`，必要時從 `urls` 去掉該字面），不要寫回官方公用當後備。

Mainnet `effectiveRpcUrl` 對照（皆不 fetch 官方節點）：

| cfg | 結果 |
|-----|------|
| `active === ""` | `""` |
| `active` 等於 `PUBLIC_RPC_BY_CLUSTER.mainnet` | `""`（並把該字面當未設定） |
| `active` 不合法（非 0.27.0 `isAllowedCustomRpc`） | `""` |
| `active` 合法但不在 `urls` | `""` |
| `active` 合法且在 `urls` | 該 URL |

空字串 **禁止**傳入 `solanaRpcForUrl`、`simulateTransactionRpc`、`createSolanaRpc`、`createSolanaRpcSubscriptions`。

Mainnet 刪到零條：`{ urls: [], active: "" }`。列表 **不含**官方公用列。寫入時機與 0.27.0 相同（立刻選／刪，文字失焦或確認）。

## 失敗 code

`MAINNET_RPC_UNSET`。catalog `error.code.MAINNET_RPC_UNSET`＝繁「Mainnet 尚未設定 RPC」／簡「Mainnet 尚未设置 RPC」／en「Mainnet RPC is not set」。

`cluster === "mainnet"` 且未就緒時，下列命令若仍進 SW：**不**建 RPC、不 `fetch`、不 WebSocket，回 `MAINNET_RPC_UNSET`（UI 能擋則不發）：

- `wallet.getHomeTokens`
- `wallet.getHomeActivity`（僅當 `resolveHeliusApiTarget` 為 null；有 Helius 則走 0.28.0 enhanced＋`before`，不改組 URL）
- `wallet.beginSend`
- `wallet.listClosableTokenAccounts`／`wallet.planCloseEmpty`／`wallet.commitCloseEmpty`
- `ui.simulatePendingTx`（未就緒時不要對空 URL 模擬；審批殼仍可開，outcome 用既有 `rpc`）
- 核准後錢包內廣播／收回租金送出（未就緒根本不進確認）
- `dapp.signAndSendTransaction` **核准後**廣播（pending 仍可開；核准後不送、只回發起 tab／frame 此 code）

`dapp.signTransaction` 核准仍只簽。

**例外：** `wallet.getHomeActivity` 在 Helius target 有值時不走本 code，維持 0.28.0。

## Settings

`rpcGuideDismissed`：布林，預設 false。`patchSettings` 可寫。

Mainnet `RpcClusterCard`：`rows` **不含** `PUBLIC_RPC_BY_CLUSTER.mainnet`。加入自訂與刪除與 0.27.0 相同（失焦／確認寫入）。  
Devnet 卡維持內建列。

網路列 Mainnet 摘要：就緒＝active URL；否則 `settings.rpc.mainnetUnset`（繁「未設定」／簡「未设置」／en「Not set」）。

## 首次引導

尚無金庫時順序：**語言 → 密碼 → RPC 引導 → 新增帳戶**。

語言屏：三列 endonym（`繁體中文`／`简体中文`／`English`），標題與「下一步」跟目前選取的 locale 走 catalog。預選 `localeFromChromeUi()`（Chrome `getUILanguage`，不是 `navigator.language`）。主按鈕 `patchSettings({ locale })` 成功後才進設密碼。

設密碼成功（`createVault` empty）之後：若 `rpcGuideDismissed !== true` 且 Mainnet RPC 未就緒，下一屏是 RPC 引導，不是新增帳戶。

已有金庫、帳戶從 0 變成 ≥1（建立種子／Burner／匯入／觀察／Combined）且尚未 dismissed、Mainnet 未就緒：仍出 RPC 引導一次。

條件：`rpcGuideDismissed !== true` 且 `!isMainnetRpcReady(mainnet cfg)`。不看目前 cluster。

畫面：無頂欄帳戶 pill。語言／密碼／RPC 同一北極光底與產品頭（圖＋Airwave Wallet 置頂）。RPC 文案靠左：標題 `rpcGuide.title`、正文只說必須填 Mainnet RPC。連外鈕 `rpcGuide.heliusLink` 開 `https://www.helius.dev/`（新分頁），**不**寫 dismissed。底列兩鈕：`rpcGuide.skip`（ghost）＋`rpcGuide.setRpc`（主）。**只有**這兩鈕寫 `rpcGuideDismissed: true`。關閉 popup 不寫 dismissed；已解鎖且條件仍在，每次開啟都導回此屏。略過後：無帳戶則新增帳戶，否則 Home。設定 RPC → `settings-rpc`。從 `settings-rpc` 返回且帳戶數 0：進新增帳戶。

## Home

`cluster === "mainnet"` 且未就緒：Tokens 不發 `wallet.getHomeTokens`。短句 `home.mainnetRpcRequired`＋按鈕 `home.goSetRpc`（點了 `navigateTo("settings-rpc")`，**不**改 `rpcGuideDismissed`）。  
Activity：無 Helius 時同一短句，不要 403。有 Helius 時照 0.18.0／0.28.0 打 enhanced。

## Catalog 新鍵（須三語非空）

| key | 繁中 |
|-----|------|
| `settings.rpc.mainnetUnset` | 未設定 |
| `setup.pickLanguage` | 請選擇語言 |
| `setup.passwordLead` | 請設定用來鎖定錢包的密碼 |
| `rpcGuide.title` | 設定 Mainnet RPC |
| `rpcGuide.body` | Mainnet 必須填你自己的 RPC，才能查餘額與送出。 |
| `rpcGuide.heliusLink` | 向 Helius 免費申請 API key |
| `rpcGuide.setRpc` | 設定 RPC |
| `rpcGuide.skip` | 略過 |
| `home.mainnetRpcRequired` | Mainnet 需要你自己的 RPC 才能查餘額與送出。 |
| `home.goSetRpc` | 設定 RPC |
| `error.code.MAINNET_RPC_UNSET` | Mainnet 尚未設定 RPC |

簡中／英文同義。專有名詞 RPC、Mainnet、Helius、Jupiter、JSON-RPC 不翻譯。
