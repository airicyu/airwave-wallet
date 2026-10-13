/**
 * Sidebar sign-tx pending lookup for shell close reject.
 * Does not send bridge results or touch Chrome APIs.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { PendingRecord } from "../../shared/commands.ts";
import { addPending, removePending } from "./pending.ts";
import {
  findOldestSidebarSignTxPendingId,
  findSidebarDappApprovalRequestId,
} from "./reject-dapp-pending.ts";

function sidebarRecord(kind: PendingRecord["kind"], createdAt: number): PendingRecord {
  return {
    kind,
    tabId: 1,
    frameId: 0,
    origin: "https://example.com",
    payload: {},
    createdAt,
    uiHost: "sidebar",
  };
}

test("findOldestSidebarSignTxPendingId ignores connect and picks oldest sign tx", () => {
  removePending("sb-connect");
  removePending("sb-sign-old");
  removePending("sb-sign-new");
  removePending("sb-send");
  assert.equal(addPending("sb-connect", sidebarRecord("connect", 1)), true);
  assert.equal(addPending("sb-sign-old", sidebarRecord("signTransaction", 10)), true);
  assert.equal(addPending("sb-sign-new", sidebarRecord("signTransaction", 20)), true);
  assert.equal(addPending("sb-send", sidebarRecord("signAndSendTransaction", 5)), true);
  assert.equal(findOldestSidebarSignTxPendingId(), "sb-send");
  assert.equal(findSidebarDappApprovalRequestId(), "sb-connect");
  removePending("sb-connect");
  removePending("sb-sign-old");
  removePending("sb-sign-new");
  removePending("sb-send");
});
