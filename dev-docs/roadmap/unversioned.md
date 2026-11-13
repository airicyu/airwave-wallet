# Unversioned changes

When the latest version is `shipped` and the next version is not opened yet, write **code** changes here and add one sentence under `Next` at the top of the root [`changelog.md`](../../changelog.md). Both places are the same batch.

Docs, privacy policy, and terms are not tracked here.

Opening a version, or continuing one that is already `in progress`, moves this batch into that version. The open version ships it. This file then has nothing current, and the changelog has no `Next` section.

## Current

- Private token amounts use the mint's decimals. A 6-decimal balance such as 0.4 USDC is no longer shown as raw base units on the private list, the Unshield picker, or the Unshield amount. Send, Shield, Unshield, and private Send use the same smaller balance line so the label and amount stay on one line.
