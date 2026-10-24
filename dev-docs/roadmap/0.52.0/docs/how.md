# How 0.52.0

## Chooser

In `wallet/src/popup/onboarding/add-chooser.tsx`, `AddAccountChooser` renders five buttons. Each button navigates as today:

| Row | `navigateTo` | Icon | Title key | Subtitle key |
|-----|----------------|------|-----------|----------------|
| 1 | `add-generate-seed` | `IconPin` | `onboarding.createSeedWallet` | `onboarding.chooser.seed` |
| 2 | `add-generate` | `IconFlame` | `onboarding.createBurner` | `onboarding.chooser.burner` |
| 3 | `add-import` | `IconDownload` | `onboarding.importWallet` | `onboarding.chooser.import` |
| 4 | `add-watch` | `IconEye` | `onboarding.createWatch` | `onboarding.chooser.watch` |
| 5 | `add-combined` | `IconLayers` | `onboarding.createCombined` | `onboarding.chooser.combined` |

Do not change `AddImportChooser`.

## Icons

Add `IconPin`, `IconFlame`, and `IconDownload` next to the other exports in `wallet/src/popup/components/StrokeIcon.tsx`. Each uses `StrokeIcon`. Paths match `dev-docs/design-demos/0.52.0/add-account-chooser-ux.html`:

- Pin: `M12 22c4-4 6-7.5 6-11a6 6 0 1 0-12 0c0 3.5 2 7 6 11z` and a circle at `12,11` radius `2.5`
- Flame: `M12 3c2 4-2 5-1 9 3-1 6-4 6-8 4 4 4 9 1 12a7 7 0 1 1-12.5-1C8 11 10 8 12 3z`
- Download: `M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`, polyline `7 10 12 15 17 10`, line from `12,15` to `12,3`

The chooser passes size 20.

## Styles

Add a chooser block in `wallet/src/popup/styles/onboarding.css`. Do not restyle `.kind-btn` (the import chooser still uses it).

- List: column, gap 8px
- Row: flex, align center, gap 12px, padding 14px, width 100%, radius 12px, border `var(--stroke)`, background `var(--bg-elevated)`, text align left, inherit font
- Icon well: 36×36, radius 10, background `var(--fill)`, border `var(--stroke)`, muted icon color
- Title: weight 650, 14px
- Subtitle: 12px, `var(--text-muted)`, 2px below the title

## Copy

Add the five subtitle keys in `wallet/src/shared/i18n/ui-messages.ts` under the onboarding section. Wording is the Decided table in `INDEX.md`.

## Checks

`cd wallet && npm run typecheck`

Unpacked extension: open 新增帳戶 in the popup and in the sidebar. Confirm five rows, icons, and the locale subtitle. Open each row and confirm the next screen is unchanged. Open import and confirm those two rows are still title plus chevron. Do not use `test-web` for this version; the chooser is not on the dApp page.
