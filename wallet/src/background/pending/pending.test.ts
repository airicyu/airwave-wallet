/**
 * Pending-id insert rules: a second insert must not replace an in-flight record.
 * Does not open approval windows or sign.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { PendingRecord } from "../../shared/protocol/index.ts";
import { addPending, getPending, pendingInsertError, removePending, setPendingUiHost } from "./pending.ts";

function record(origin: string, message: number[]): PendingRecord {
  return {
    kind: "signMessage",
    tabId: 1,
    frameId: 0,
    origin,
    payload: { message },
    createdAt: 1,
    uiHost: "popout",
  };
}

test("a second insert with the same id keeps the first payload", () => {
  const id = "pending-replace-test";
  removePending(id);
  assert.equal(addPending(id, record("https://first.example", [1])), true);
  assert.equal(addPending(id, record("https://second.example", [2])), false);
  assert.equal(pendingInsertError(id), "REQUEST_ID_IN_USE");
  const kept = getPending(id);
  assert.equal(kept?.origin, "https://first.example");
  assert.deepEqual((kept?.payload as { message: number[] }).message, [1]);
  removePending(id);
});

test("changing the approval host leaves the payload in place", () => {
  const id = "pending-host-test";
  removePending(id);
  assert.equal(addPending(id, record("https://first.example", [1])), true);
  setPendingUiHost(id, "sidebar");
  const kept = getPending(id);
  assert.equal(kept?.uiHost, "sidebar");
  assert.deepEqual((kept?.payload as { message: number[] }).message, [1]);
  removePending(id);
});

test("an empty id is rejected and can be told apart from an in-use id", () => {
  assert.equal(addPending("", record("https://first.example", [1])), false);
  assert.equal(pendingInsertError(""), "INVALID_REQUEST_ID");
});

test("a non-string id and an id longer than 80 characters are rejected", () => {
  const sample = record("https://first.example", [1]);
  assert.equal(addPending(123 as unknown as string, sample), false);
  assert.equal(pendingInsertError(123 as unknown as string), "INVALID_REQUEST_ID");
  const longId = "x".repeat(81);
  assert.equal(addPending(longId, sample), false);
  assert.equal(pendingInsertError(longId), "INVALID_REQUEST_ID");
});

test("an id can be inserted again after the pending record is removed", () => {
  const id = "pending-reuse-test";
  removePending(id);
  assert.equal(addPending(id, record("https://first.example", [1])), true);
  removePending(id);
  assert.equal(addPending(id, record("https://first.example", [2])), true);
  removePending(id);
});
