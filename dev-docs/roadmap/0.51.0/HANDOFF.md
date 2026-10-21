# 0.51.0 handoff

## Done

Track 1 is in the working tree. Create combined uses the manage layout. Draft module is `wallet/src/popup/accounts/combined-logic.ts`. `cd wallet && npm run typecheck` passed. The unpacked-extension hand-test has not been run.

## Next

Implementation review, then the hand-test in INDEX. Do not ship until the user says ship.

## Paste-ready

```text
Implement Airwave 0.51.0 Track 1 from dev-docs/roadmap/0.51.0/INDEX.md and docs/how.md.
The create-combined page matches the manage layout: name field, main-wallet card, member sheet.
Add members via add-combined-add, paste, and local. Draft is module state and clears when leaving those four views.
Still call wallet.createCombinedAccount. Do not add memberNames.
Then run: cd wallet && npm run typecheck
```
