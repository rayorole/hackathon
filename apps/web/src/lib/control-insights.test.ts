import test from "node:test";
import assert from "node:assert/strict";
import { createFixtures } from "../../../../packages/contracts/src/fixtures";
import { controlPriority, sourceChanges } from "./control-insights";

const now = "2026-09-16T12:00:00.000Z";
test("priority ranks conflicting evidence first and retains traceable evidence IDs", () => {
  const d = createFixtures()[1];
  const p = controlPriority(d, d.establishment.proposals[0].id, now);
  assert.equal(p.level, "high");
  assert.ok(p.reasons.some(r => r.code === "conflict" && r.evidenceIds.includes(d.evidence[0].id)));
});
test("an unknown observation date never becomes a recent observation from retrieval time", () => {
  const d = createFixtures()[0];
  const p = controlPriority(d, d.establishment.proposals[0].id, now);
  assert.ok(p.reasons.some(r => r.code === "unknown-date"));
  d.sources[0].observedAt = "2026-09-15T12:00:00.000Z";
  assert.equal(controlPriority(d, d.establishment.proposals[0].id, now).level, "normal");
});
test("missing parent does not turn a registry-only case into an urgent proposal", () => {
  const d = createFixtures()[2]; d.establishment.proposals = [];
  assert.equal(controlPriority(d, undefined, now).level, "normal");
});
test("source comparison matches URL, field and scope and ignores unchanged values", () => {
  const d = createFixtures()[0]; d.evidence[0].observedValue = "old";
  d.sources.push({ ...d.sources[0], id: "new", retrievedAt: "2026-09-17T08:00:00.000Z" });
  d.evidence.push({ ...d.evidence[0], id: "new-evidence", sourceId: "new", observedValue: "new" });
  const result = sourceChanges(d);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].before, ["old"]);
  assert.deepEqual(result[0].after, ["new"]);
  assert.equal(result[0].previousSource.id, d.sources[0].id);
  d.evidence[1].observedValue = "old";
  assert.equal(sourceChanges(d).length, 0);
});
test("first fetch, absent extraction and different scope never imply changed or deleted data", () => {
  const d = createFixtures()[0];
  assert.equal(sourceChanges(d).length, 0);
  d.sources.push({ ...d.sources[0], id: "new", retrievedAt: "2026-09-17T08:00:00.000Z" });
  assert.equal(sourceChanges(d).length, 0);
  d.evidence.push({ ...d.evidence[0], id: "new-evidence", sourceId: "new", scope: "enterprise", observedValue: "new" });
  assert.equal(sourceChanges(d).length, 0);
});
