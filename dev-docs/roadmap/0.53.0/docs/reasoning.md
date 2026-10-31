# Why 0.53.0

A Solana transaction does not name its network. The `chain` string on a sign request is optional, and [0.47.1](../../0.47.1/INDEX.md) already fills a missing one from the wallet. A dApp can omit `chain` and still submit bytes whose blockhash was taken from the other network. The wallet will sign those bytes. `signTransaction` returns them to the dApp, which can broadcast them where that blockhash is still accepted.

`isBlockhashValid` answers a narrower question: is this hash still in that cluster's recent list. One `valid` and one `invalid`, with `valid` on the other cluster, is the case this version blocks. Both invalid is not that case. An expired hash and a durable-nonce hash look the same to this method, and the simulation card already tells the user when the wallet's own RPC cannot simulate. This version does not add a second reading of that result.

The official Mainnet node is still not a general RPC. [0.29.0](../../0.29.0/INDEX.md) stands for every other call. A wallet that never saved a Mainnet URL still needs one Mainnet answer for this probe, so this version allows that single method against the official URL, and lets Debug mode replace only that fallback.
