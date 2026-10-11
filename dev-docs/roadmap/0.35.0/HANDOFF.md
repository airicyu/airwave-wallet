# HANDOFF — 0.35.0

**狀態：** `shipped`（2026-10-12）。

## 讀檔順序

1. [AGENTS.md](../../../AGENTS.md)、[GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/how.md](./docs/how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游語言：[0.23.0](../0.23.0/INDEX.md)；殼：[0.25.0](../0.25.0/INDEX.md)

## 產品摘要

popup、側欄、審批 popout 的 `document.title` 與 `html lang` 跟 Settings locale。標題單一語文、**沒有** `Airwave — ` 前綴。sandbox／offscreen 不改。

## Track 順序

1. catalog 兩鍵＋共用 `applyWindowChrome`＋三面 HTML／boot；ConnectPage 僅 popout 寫窗名；approval shell 殼內不賦 title
2. features、changelog、版本號、手驗

## 禁區

GUIDELINES pending／custody／不廣播。不改 sandbox／offscreen。不用 `notranslate`。不改 `approval.review` 畫面英文。殼內不改錢包 `document.title`。不要 commit，除非使用者要求。

## 待拍板

無。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。讀 AGENTS.md、dev-docs/roadmap/GUIDELINES.md、dev-docs/roadmap/0.35.0/HANDOFF.md、INDEX.md、docs/how.md。
popup／側欄／popout：document.title 只 t(locale, key)，禁止 Airwave — 前綴；html lang = settings.locale。
window.title.wallet＝錢包／钱包／Wallet；window.title.approval＝審批／审批／Approval。
document.title 只由擁有該 document 的殼寫：App 只寫錢包窗名；isInWalletShellHost 時 approval shell 禁止賦 title；ConnectPage 僅 popout 寫 page.connect。
popout 記住現行 title key，切語言不退回「審批」。靜態 HTML 標題不混語。不要改 sandbox／offscreen。不要 notranslate。不要改 approval.review 英文。不新增 command／storage key。不要 commit。
```

## 完成檢查

- [x] 設計審查無未關閉 HIGH（第 2 輪，2026-10-12）
- [x] Track 1–2 碼與版本檔已寫；typecheck／build 通過
- [x] INDEX 驗收已勾；使用者 2026-10-12 同意出貨
- [x] `shipped`；已清 backlog 該列與 `approval-window-title-i18n.md`
