# Development mock RPC, Jupiter, and OpenRouter — backlog

Not scheduled in any version INDEX. **Not a contract.** After it is scheduled, that version's INDEX wins.

## Current

Balance, token, swap, and any OpenRouter-backed reads hit live endpoints. A development build cannot run a full pass with canned data when those endpoints are down, rate-limited, or would spend real requests.

## Intent

A development-only switch supplies mock responses for the Solana RPC, the Jupiter API, and the OpenRouter API. With it on, the wallet can walk the flows that depend on those three sources using fixture data, without a live network call to them.

- The switch is for development builds. A production build does not include the mock path.
- Each of the three sources has its own fixtures. A flow that needs more than one of them can run with all three mocked together.
- Amounts in fixtures stay chain integer units as strings (`BigInt`), matching the standing number rule.
- Mock data never stands in for the vault, signing, or a user password.

## Decide before scheduling

- How the switch is turned on (build flag, storage key, or both).
- Which methods and response shapes each fixture must cover for a full pass.
- Whether a single flow can mix a live source with a mocked one.

## Out of scope

- Mocking the vault, key material, or signature results
- Shipping fixtures or the switch in a production build
- A general network interceptor for hosts other than RPC, Jupiter, and OpenRouter
