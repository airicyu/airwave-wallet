import assert from "node:assert/strict";
import test from "node:test";
import { resolveDappSignChain } from "./dapp-sign-chain.ts";

test("missing chain uses the selected cluster", () => {
  assert.deepEqual(resolveDappSignChain(undefined, "devnet"), { ok: true, chain: "solana:devnet" });
  assert.deepEqual(resolveDappSignChain(undefined, "mainnet"), { ok: true, chain: "solana:mainnet" });
  assert.deepEqual(resolveDappSignChain("", "mainnet"), { ok: true, chain: "solana:mainnet" });
  assert.deepEqual(resolveDappSignChain("  ", "devnet"), { ok: true, chain: "solana:devnet" });
});

test("a matching chain is kept", () => {
  assert.deepEqual(resolveDappSignChain("solana:mainnet", "mainnet"), {
    ok: true,
    chain: "solana:mainnet",
  });
});

test("a different accepted chain mismatches", () => {
  const result = resolveDappSignChain("solana:mainnet", "devnet");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "CHAIN_MISMATCH");
});

test("an unknown chain is unsupported", () => {
  const result = resolveDappSignChain("solana:testnet", "devnet");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INVALID_CHAIN");
});
