import assert from "node:assert/strict";
import { test } from "node:test";
import { formatOrganicScoreLabel } from "./organic-score-label.ts";

test("formatOrganicScoreLabel skips non-positive and non-finite", () => {
  assert.equal(formatOrganicScoreLabel(undefined), undefined);
  assert.equal(formatOrganicScoreLabel(null), undefined);
  assert.equal(formatOrganicScoreLabel(0), undefined);
  assert.equal(formatOrganicScoreLabel(-1), undefined);
  assert.equal(formatOrganicScoreLabel(Number.NaN), undefined);
});

test("formatOrganicScoreLabel rounds and caps at 99+", () => {
  assert.equal(formatOrganicScoreLabel(0.6), "1");
  assert.equal(formatOrganicScoreLabel(87.4), "87");
  assert.equal(formatOrganicScoreLabel(100), "100");
  assert.equal(formatOrganicScoreLabel(1000), "99+");
});
