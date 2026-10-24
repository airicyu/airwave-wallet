# 0.52.0 — Add-account chooser rows

- **Status:** `shipped`
- **Upstream:** [0.51.0](../0.51.0/INDEX.md) shipped. Account creation flows stay as they are. The chooser idea shipped from the backlog and that note was removed. The layout reference is [`dev-docs/design-demos/0.52.0/add-account-chooser-ux.html`](../../design-demos/0.52.0/add-account-chooser-ux.html).
- **Changelog:** one paragraph under `0.52.0`. The former [`unversioned.md`](../unversioned.md) batch is included in that paragraph.

## Product

The **新增帳戶** screen lists the same five destinations, each as an icon, a title, and one subtitle. Popup and sidebar use that one list. Tapping a row still opens the same next screen.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| What changes | `AddAccountChooser` only. `AddImportChooser` stays title + chevron. Downstream generate, import, watch, and combined screens stay. |
| Order | Unchanged: seed, burner, import, watch, combined. |
| Row | A full-width button. Leading 36×36 icon well (radius 10, fill, stroke). Then a title and one subtitle. No chevron. Gap between rows is 8px. Row padding is 14px, radius 12. |
| Popup and sidebar | One component and one CSS block. No second density and no width-specific padding. |
| Icons | New `IconPin` (seed) and `IconFlame` (burner) and `IconDownload` (import), using the paths in the design demo, drawn with the existing `StrokeIcon` (stroke, `currentColor`, 20px inside the well). Watch reuses `IconEye`. Combined reuses `IconLayers`. |
| Titles | Existing keys: `onboarding.createSeedWallet`, `onboarding.createBurner`, `onboarding.importWallet`, `onboarding.createWatch`, `onboarding.createCombined`. |
| Subtitles | New catalog keys, not hard-coded in JSX. `onboarding.chooser.seed`: zh-Hant「產生新的 12 詞助記詞」, zh-Hans「产生新的 12 词助记词」, en「Create a new 12-word seed phrase」. `onboarding.chooser.burner`: 「本機暫用，不長期保管」/「本机暂用，不长期保管」/「Temporary on this device」. `onboarding.chooser.import`: 「助記詞或密鑰」/「助记词或密钥」/「Seed phrase or secret key」. `onboarding.chooser.watch`: 「只讀地址，無法簽名」/「只读地址，无法签名」/「Read-only address, cannot sign」. `onboarding.chooser.combined`: 「合併多帳戶資產視圖」/「合并多账户资产视图」/「One view of several accounts」. |
| Navigation | Same `navigateTo` targets: `add-generate-seed`, `add-generate`, `add-import`, `add-watch`, `add-combined`. |
| Commands | The chooser adds no command, storage key, or permission. |
| Folded in | First-run `rpcGuide.heliusLink` asks for an RPC endpoint from Helius and does not call it free. Settings ends with Debug mode settings: `debugModeEnabled` defaults off. While on, the page edits `jupiterApiUrl` (default `https://api.jup.ag`) and `openRouterApiUrl` (OpenRouter base URL, default `https://openrouter.ai`). Debug off ignores those stored bases. An empty base still uses the built-in origin. Chat (`/api/v1/chat/completions`) and Decisions (`/api/alpha/decisions`) are appended to the OpenRouter base. |

## Out of scope

- Changing which account kinds can be created
- Redesigning generate, import, watch, or combined forms, including `AddImportChooser`
- A phone frame or a notes column in the extension

## Tracks

### Track 1 — Chooser rows

- **Does:** replace the five `kind-btn` rows with icon, title, and subtitle; add the three glyphs; add the five subtitle strings
- **Does not:** the out-of-scope list
- **Acceptance:** rows below; `cd wallet && npm run typecheck`

## Acceptance

- [x] The add-account screen shows five rows in the order above, each with the named icon, the existing title, and the subtitle for the current locale
- [x] Popup and sidebar use the same row layout
- [x] Each row still opens its current next screen
- [x] The import chooser (seed phrase / secret key) is still title + chevron
- [x] `cd wallet && npm run typecheck`. This version has no `test-web` step; the chooser is not on the dApp page
- [x] Unpacked extension: open 新增帳戶 in the popup and in the sidebar, read the five subtitles, and open each row once

## Anchors

| Path | Role |
|------|------|
| `wallet/src/popup/onboarding/add-chooser.tsx` | Chooser to change |
| `wallet/src/popup/components/StrokeIcon.tsx` | New pin, flame, and download glyphs |
| `wallet/src/shared/i18n/ui-messages.ts` | Subtitle strings |
| `wallet/src/popup/styles/onboarding.css` | Row styles |
| `dev-docs/design-demos/0.52.0/add-account-chooser-ux.html` | Layout reference |

## Still to decide

(none)
