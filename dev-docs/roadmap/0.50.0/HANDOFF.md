# 0.50.0 handoff

## Done this session

Moved flat `wallet/src/shared` files into the domain folders named in `INDEX.md`. Split `PopupMarkup.tsx`, `home-tokens-service.ts`, `sign-tx-body.ts`, `usePopupAppState.ts`, and `CombinedManage.tsx`. `npm run typecheck --prefix wallet` passed. No design review (the user skipped that gate). `ui-messages.ts` stays one catalog with prefix comments. Popup and popout CSS live under `styles/`.

## Next session

Do not split large files unless the user puts that in an INDEX. Acceptance in `INDEX.md` is still unchecked until the user confirms. Do not treat this handoff as the contract.
