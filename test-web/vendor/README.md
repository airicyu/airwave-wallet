# vendor

`bubble-harness.js` 是從旁邊倉庫 `../bubble-harness` 的 `bun run build` 產物手動 copy 來的，供 `sign-risk.html` POC 本機使用，**不是** npm 依賴。

`sign-risk` 經 `src/sign-risk-harness.ts` import 此檔。Host tools：`decode_message`、`get_accounts`、`simulate`，以及 `sign-risk-rpc-tools.ts` 的扁平 `rpc_get_*`（allowlist 執行層仍在 `sign-risk-rpc.ts`）。  
Loop 觀測用 `runAgentLoop({ onEvent })`；空 final 用 `retryEmptyFinal`／`result.finalText`（見 `bubble-harness.d.ts`）。類型手寫對齊 `../bubble-harness/src/types.ts`。

更新：

```bash
cd ../bubble-harness
bun run build
copy dist\bubble-harness.js ..\airwave-wallet\test-web\vendor\
```

（路徑依本機 `airwave/` 並排目錄為準。`bubble-harness.d.ts` 若 API 有變一併對齊 types。）
