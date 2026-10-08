# HANDOFF — 0.23.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)、[docs/design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/how.md](./docs/how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 概念稿（非正式）：[`docs/design-demos/i18n-type-ux.html`](../../design-demos/i18n-type-ux.html)
6. 上游：[0.22.0](../0.22.0/INDEX.md)、[0.8.0](../0.8.0/INDEX.md)

## 產品摘要

Settings 第一列選 `zh-Hant`／`zh-Hans`／`en`，立刻寫入既有 settings；popup／popout／審批／解鎖同一 `t(locale, key)` catalog。字體方案 B。無第三方 i18n。預設繁中。法律本文不譯。產品圖 `icon128`：解鎖與首次建立密碼置中 64px，關於 40px；Home 與簽署主畫面不放。

## Track

1 locale＋util＋字體 → 2 收字串＋語言頁 → 3 版面／原則檔／typecheck＋build

## 禁區

GUIDELINES pending／custody／不廣播。不改 vault。不新增 command／storage key。不引 i18next。不跟瀏覽器語言。不譯 legal 本文、dApp、test-web。不要改 `../solibra-wallet`。文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/design-principles.md、docs/roadmap/0.23.0/HANDOFF.md、INDEX.md、docs/how.md、docs/reasoning.md。跟 Track：Settings.locale 三碼，缺省 zh-Hant；shared ui-i18n.ts + ui-messages.ts，t(locale,key,vars)，禁止 i18next 與畫面 if locale 拼句；Settings 樞紐第一列語言、settings-locale 三列單選立刻 patchSettings，摘要 endonym；popup/popout/approval/cards/runtime/onboarding/copy-pk-feedback/settings-logic chrome 收進 catalog；SW 不 t；持倉／模擬／送出進度／收回租金／ix 解讀標籤改 code 或 kind，UI render 再 t；command 只認 code 不展示中文 message；法律 markdown 不譯；body 字體 Segoe UI, Microsoft JhengHei UI, PingFang TC；解鎖與確認中標題去掉 0.02em letter-spacing。產品圖 public/icon128.png：解鎖（popup 與 popout／審批鎖定）與首次建立密碼置中 64px，關於版本列上 40px；Home 頂欄與簽署主畫面不放；頂欄鎖按鈕維持線稿。不新增 command/storage key。Track 3 才改 design-principles 第 1、3、6、8 節。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 完成檢查

- [x] 設計審查無未關 HIGH（第 3 輪複審，2026-10-08）
- [x] INDEX 狀態 `in progress` 後實作 Track 1–3（typecheck＋build 通過；擴充手驗待本機）
- [x] changelog／version 對齊 `0.23.0`
- [x] 使用者同意出貨（2026-10-08）：`shipped`、已刪 `backlog/wallet-ui-i18n.md`
