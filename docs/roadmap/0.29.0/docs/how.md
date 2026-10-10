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

## 失敗 code

`MAINNET_RPC_UNSET`。catalog `error.code.MAINNET_RPC_UNSET`＝繁「Mainnet 尚未設定 RPC」／簡「Mainnet 尚未设置 RPC」／en「Mainnet RPC is not set」。

須在 mainnet 未就緒時**不 fetch**、回此 code（或 UI 根本不發命令）的路徑：Home tokens／餘額、錢包送出組交易與廣播、收回租金掃描／commit、phase 1 估 CU 所打的 JSON-RPC、`getSignaturesForAddress` 那條 Activity 後備。  
**例外：** Activity 在 `resolveHeliusApiTarget` 有值時仍走 enhanced，不因 RPC 未設定而改打官方 RPC。

網站簽交易：未就緒仍可開審批殼；模擬不要打官方節點，結果用既有 `rpc` outcome，notice 可用同一失敗句，不新增評估卡。

## Settings

`rpcGuideDismissed`：布林，預設 false。`patchSettings` 可寫。

Mainnet `RpcClusterCard`：`rows` **不含** `PUBLIC_RPC_BY_CLUSTER.mainnet`。加入自訂與刪除與 0.27.0 相同（失焦／確認寫入）。  
Devnet 卡維持內建列。

網路列 Mainnet 摘要：就緒＝active URL；否則 `settings.rpc.mainnetUnset`（繁「未設定」／簡「未设置」／en「Not set」）。

## 首次引導

在「帳戶列表從 0 變為至少 1」的成功回調（建立種子／Burner／匯入／觀察／Combined 任一）。不要在 `createVault` 設密碼、帳戶仍 0 時出。

條件：`rpcGuideDismissed !== true` 且 `!isMainnetRpcReady(mainnet cfg)`。不看目前 cluster：即使人在 Devnet 也出這一屏一次（Mainnet 之後仍要 RPC）。

畫面：無頂欄帳戶 pill 也可，須符合頁殼（中間捲、底列主按鈕）。標題 `rpcGuide.title`（繁「設定 Mainnet RPC」）。正文 `rpcGuide.body`：必須自備 JSON-RPC；Helius API 與 Jupiter 選填、不能代替 RPC。主按鈕 `rpcGuide.setRpc` → `settings-rpc`。次按鈕 `rpcGuide.skip` → 寫 `rpcGuideDismissed: true` 後 Home。主按鈕也寫 `rpcGuideDismissed: true`（避免填完回來又全屏）。

不放外連。

## Home

`cluster === "mainnet"` 且未就緒：Tokens 不發 `getHomeTokens`。短句 `home.mainnetRpcRequired`（繁「Mainnet 需要你自己的 RPC 才能查餘額與送出。」）＋按鈕 `home.goSetRpc`（繁「設定 RPC」）。  
Activity：無 Helius 時同一短句，不要 403。有 Helius 時照 0.18.0／0.28.0 打 enhanced。

## Catalog 新鍵（須三語非空）

| key | 繁中 |
|-----|------|
| `settings.rpc.mainnetUnset` | 未設定 |
| `rpcGuide.title` | 設定 Mainnet RPC |
| `rpcGuide.body` | Mainnet 沒有可用的官方公用節點，必須填你自己的 JSON-RPC。Helius API 與 Jupiter API key 是選填，不能代替 RPC。 |
| `rpcGuide.setRpc` | 設定 RPC |
| `rpcGuide.skip` | 稍後 |
| `home.mainnetRpcRequired` | Mainnet 需要你自己的 RPC 才能查餘額與送出。 |
| `home.goSetRpc` | 設定 RPC |
| `error.code.MAINNET_RPC_UNSET` | Mainnet 尚未設定 RPC |

簡中／英文同義。專有名詞 RPC、Mainnet、Helius、Jupiter、JSON-RPC 不翻譯。
