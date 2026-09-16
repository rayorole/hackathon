import test from "node:test";
import assert from "node:assert/strict";
import { createFixtures } from "../src/fixtures";
import { detailSchema, reviewRequestSchema } from "../src/index";
import { applyReview, approvedCsv } from "../src/demo";
test("fixtures validate, have unique IDs and resolvable evidence references", () => {
  const ds = createFixtures();
  assert.equal(new Set(ds.map((d) => d.establishment.id)).size, 3);
  for (const d of ds) {
    detailSchema.parse(d);
    assert.equal(d.establishment.isDemo, true);
    for (const p of d.establishment.proposals)
      for (const id of p.evidenceIds)
        assert.ok(d.evidence.some((e) => e.id === id));
    for (const e of d.evidence)
      assert.ok(d.sources.some((s) => s.id === e.sourceId));
  }
});
test("only latest approved decisions export, without changing registry facts", () => {
  const d = createFixtures()[0],
    p = d.establishment.proposals[0];
  assert.equal(approvedCsv([d]).split("\r\n").length, 1);
  const a = applyReview(
    d,
    {
      proposalId: p.id,
      expectedRevision: 0,
      decision: "approve",
      correctedValue: "Gecontroleerd",
    },
    "r1",
    "2026-09-16T09:00:00Z",
  );
  assert.match(approvedCsv([a.detail]), /Gecontroleerd/);
  assert.equal(
    a.detail.establishment.registryStatus,
    d.establishment.registryStatus,
  );
  const b = applyReview(
    a.detail,
    { proposalId: p.id, expectedRevision: 1, decision: "reject" },
    "r2",
    "2026-09-16T09:01:00Z",
  );
  assert.equal(approvedCsv([b.detail]).split("\r\n").length, 1);
  assert.equal(b.detail.reviews.length, 2);
  assert.equal(d.reviews.length, 0);
});
test("stale review revisions are rejected", () => {
  const d = createFixtures()[0];
  assert.throws(
    () =>
      applyReview(
        d,
        {
          proposalId: "demo-proposal-1",
          expectedRevision: 4,
          decision: "approve",
        },
        "r",
        "2026-09-16T09:00:00Z",
      ),
    /gewijzigd/,
  );
});
test("rejection cannot smuggle a correction", () => {
  assert.equal(
    reviewRequestSchema.safeParse({
      proposalId: "p",
      expectedRevision: 0,
      decision: "reject",
      correctedValue: "x",
    }).success,
    false,
  );
});
test("unknown input fields are rejected", () => {
  assert.equal(
    reviewRequestSchema.safeParse({
      proposalId: "p",
      expectedRevision: 0,
      decision: "approve",
      reviewedAt: "spoofed",
    }).success,
    false,
  );
});
test("CSV protects against spreadsheet formulas and respects filters", () => {
  const d = createFixtures()[0];
  const a = applyReview(
    d,
    {
      proposalId: "demo-proposal-1",
      expectedRevision: 0,
      decision: "approve",
      correctedValue: "=1+1",
    },
    "r",
    "2026-09-16T09:00:00Z",
  );
  assert.match(approvedCsv([a.detail]), /'=1\+1/);
  assert.equal(
    approvedCsv([a.detail], { municipality: "Elsewhere" }).split("\r\n").length,
    1,
  );
});
