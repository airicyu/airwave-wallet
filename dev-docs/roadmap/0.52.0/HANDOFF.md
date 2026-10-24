# 0.52.0 handoff

Read `INDEX.md`, then `docs/reasoning.md`, then `docs/how.md`. The layout picture is `dev-docs/design-demos/0.52.0/add-account-chooser-ux.html`. Do not implement until status is `in progress`.

## Product

Replace the five add-account rows with icon, title, and subtitle. Same five destinations. Popup and sidebar share one list. Import sub-chooser stays as it is.

## Tracks

1. Chooser rows: `add-chooser.tsx`, three glyphs in `StrokeIcon.tsx`, subtitle keys, `onboarding.css`. Then `cd wallet && npm run typecheck` and the unpacked-extension check in the INDEX.

## Do not

- Change generate, import, watch, or combined forms
- Change `AddImportChooser`
- Add a command or storage key
- Fold unversioned Debug mode settings or the Helius guide sentence into this version

## Paste-ready

```text
Implement Airwave 0.52.0 only. Read AGENTS.md, dev-docs/roadmap/GUIDELINES.md, dev-docs/roadmap/0.52.0/INDEX.md, docs/reasoning.md, docs/how.md. Follow the Decided table. Add-account chooser becomes icon + title + subtitle for seed, burner, import, watch, combined. New IconPin, IconFlame, IconDownload. Reuse IconEye and IconLayers. Subtitles are onboarding.chooser.* in ui-messages. Same navigateTo targets. Do not change AddImportChooser or downstream forms. No new command. Do not fold unversioned.md. Acceptance: cd wallet && npm run typecheck, then the unpacked popup and sidebar check in the INDEX.
```
