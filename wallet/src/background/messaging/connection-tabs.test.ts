/**
 * Pure tab-url classification and connection tab-id pruning.
 * Does not call Chrome or write storage.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConnectionsMap } from "../../shared/storage-keys.ts";
import { classifyTabUrl, dropTabFromOrigin, forgetTab, pruneTabId } from "./connection-tabs.ts";

function map(): ConnectionsMap {
  return {
    "https://a.example": { accountId: "acc", connectedAt: 1, tabIds: [7, 8] },
    "https://b.example": { accountId: "acc", connectedAt: 1, tabIds: [7] },
  };
}

test("a different http origin drops the tab only from other rows", () => {
  const pruned = pruneTabId(map(), 7, classifyTabUrl("https://b.example/swap"));
  assert.equal(pruned.changed, true);
  assert.deepEqual(pruned.next["https://a.example"].tabIds, [8]);
  assert.deepEqual(pruned.next["https://b.example"].tabIds, [7]);
  assert.equal(pruned.next["https://a.example"].accountId, "acc");
});

test("about and a missing url do not change tab ids", () => {
  for (const url of [undefined, "", "about:blank"]) {
    const pruned = pruneTabId(map(), 7, classifyTabUrl(url));
    assert.equal(pruned.changed, false);
    assert.deepEqual(pruned.next["https://a.example"].tabIds, [7, 8]);
    assert.deepEqual(pruned.next["https://b.example"].tabIds, [7]);
  }
});

test("leaving the web and closing the tab drop the id from every row", () => {
  for (const klass of [classifyTabUrl("chrome://newtab/"), { kind: "left-web" as const }]) {
    const pruned = pruneTabId(map(), 7, klass);
    assert.deepEqual(pruned.next["https://a.example"].tabIds, [8]);
    assert.deepEqual(pruned.next["https://b.example"].tabIds, []);
    assert.ok(pruned.next["https://b.example"]);
  }
  const closed = forgetTab(map(), 7);
  assert.deepEqual(closed.next["https://a.example"].tabIds, [8]);
  assert.deepEqual(closed.next["https://b.example"].tabIds, []);
  assert.ok(closed.next["https://a.example"]);
});

test("moving from A to B does not add the tab to B", () => {
  const start: ConnectionsMap = {
    "https://a.example": { accountId: "acc", connectedAt: 1, tabIds: [7] },
    "https://b.example": { accountId: "acc", connectedAt: 1, tabIds: [] },
  };
  const pruned = pruneTabId(start, 7, classifyTabUrl("https://b.example/swap"));
  assert.deepEqual(pruned.next["https://a.example"].tabIds, []);
  assert.deepEqual(pruned.next["https://b.example"].tabIds, []);
  assert.ok(pruned.next["https://b.example"]);
});

test("a notify drop removes the tab from that origin only", () => {
  const start = map();
  const left = dropTabFromOrigin(start, "https://a.example", 7);
  assert.deepEqual(left.next["https://a.example"].tabIds, [8]);
  assert.deepEqual(left.next["https://b.example"].tabIds, [7]);
  assert.equal(dropTabFromOrigin(start, "https://a.example", 9).changed, false);
});

test("the same origin keeps the tab id", () => {
  const pruned = pruneTabId(map(), 7, classifyTabUrl("https://a.example/path?x=1"));
  assert.equal(pruned.changed, true);
  assert.deepEqual(pruned.next["https://a.example"].tabIds, [7, 8]);
  assert.deepEqual(pruned.next["https://b.example"].tabIds, []);
});
