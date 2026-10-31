# 0.53.0 handoff

## Done this session

The contract is a draft. `INDEX.md`, `docs/reasoning.md`, and `docs/how.md` are written. Design review round 2 passed: no open HIGH. L2 and L3 (hide the strip in `send-status-mode`; which path shows the Mainnet strip) are in `docs/how.md`. No product code for this version.

## Next session

The design gate has passed. Track 1 and Track 2 are implemented in the working tree. Run INDEX hand-tests in an unpacked extension before ship.

Read `INDEX.md`, then `docs/reasoning.md`, then `docs/how.md`. The picture is `dev-docs/design-demos/unversioned/sign-cluster-mismatch-ux.html`. On conflict, the INDEX wins.

Track 1, then Track 2. The former unversioned cleanup is part of this version.

## Paste-ready

```text
Implement Airwave 0.53.0 Track 1 only. Read dev-docs/roadmap/0.53.0/INDEX.md, docs/reasoning.md, and docs/how.md. Paint the Home Devnet strip on the sign-transaction approval when the wallet cluster is devnet. Do not probe blockhashes and do not add the debug field. Do not commit.
```
