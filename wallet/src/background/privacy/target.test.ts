/**
 * Narrow tests for privacy signingTarget: combined main resolution.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { AccountMeta, CombinedAccountMeta } from "../../shared/protocol";
import { signingTarget } from "./target";

const signing: AccountMeta = {
  id: "main-1",
  label: "Main",
  publicKeyBase58: "11111111111111111111111111111112",
};

const watch: AccountMeta = {
  id: "watch-1",
  label: "Watch",
  kind: "readOnly",
  publicKeyBase58: "22222222222222222222222222222223",
};

const combined: CombinedAccountMeta = {
  id: "combined-1",
  label: "Combined",
  kind: "combined",
  mainPubkey: "11111111111111111111111111111112",
  subPubkeys: ["11111111111111111111111111111112", "22222222222222222222222222222223"],
};

test("combined resolves the local signing main", () => {
  const target = signingTarget([signing, watch, combined], combined.id);
  assert.deepEqual(target, { accountId: "main-1", address: signing.publicKeyBase58 });
});

test("combined with watch-only main is watch", () => {
  const watchMain: CombinedAccountMeta = {
    ...combined,
    mainPubkey: watch.publicKeyBase58,
    subPubkeys: [watch.publicKeyBase58],
  };
  assert.equal(signingTarget([watch, watchMain], watchMain.id), "watch");
});

test("missing active is missing", () => {
  assert.equal(signingTarget([signing], null), "missing");
});
