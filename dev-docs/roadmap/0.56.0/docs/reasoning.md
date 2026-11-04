# 0.56.0 reasoning

`signMessage` signs whatever bytes the site sends. `signOffchainMessage` exists so the wallet builds a version 1 preamble that cannot be a transaction, while the user still reads the UTF-8 statement. The approval stays on the Sign message screen because the user is agreeing to that statement, not to the feature name.

`signIn` is a different request. The site sends fields, and the wallet composes the SIWS statement. The approval shows that statement in the message card. That screen is separate from Sign message. Feature `1.1.0` signs either the statement text or the same text inside a version 1 off-chain message. The site sets `useOffchainMessage`. The screen does not ask the user to pick.

`signMessage` stays. Sites that do not speak the new features keep the current path, including hex and the transaction-as-message refusal.

Design review L3 stays open and non-blocking. The installed `@solana/wallet-standard-features` `signIn` type is a rest parameter that returns an array, the same shape as `signMessage`. HOW keeps one output per input. Do not change it to a single object to close L3.
