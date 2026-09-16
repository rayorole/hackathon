import assert from "node:assert/strict";
import { test } from "node:test";
import { createFixtures } from "../../../../packages/contracts/src/fixtures";
import { applyReview } from "../../../../packages/contracts/src/demo";
import {
  approvedChanges,
  evidenceGroups,
  matchesBusiness,
  proposalPresentation,
} from "./review-presentation";

test("decision evidence includes conflicting evidence not cited by the proposal and preserves dates and scope", () => {
  const d = createFixtures()[0],
    p = d.establishment.proposals[0],
    base = d.evidence[0];
  d.sources.push({
    ...d.sources[0],
    id: "other-source",
    url: "https://example.org/other",
    observedAt: null,
  });
  d.evidence.push({
    ...base,
    id: "unreferenced-conflict",
    sourceId: "other-source",
    field: p.field,
    scope: "enterprise",
    assessment: "conflicts",
    observedValue: "different",
    excerpt: "A different value for the same field",
  });
  const view = proposalPresentation(d, p.id)!;
  assert.equal(view.hasConflict, true);
  assert.equal(view.compareSources, true);
  assert.ok(
    view.evidence.some(
      (e) =>
        e.evidenceIds.includes("unreferenced-conflict") &&
        e.scope === "enterprise" &&
        e.source?.observedAt === null,
    ),
  );
  assert.equal(
    d.establishment.proposals[0].evidenceIds.includes("unreferenced-conflict"),
    false,
  );
});
test("grouping keeps every evidence reference and does not combine different scopes", () => {
  const d = createFixtures()[0],
    e = d.evidence[0];
  d.evidence.push(
    { ...e, id: "duplicate" },
    {
      ...e,
      id: "parent-scope",
      scope: e.scope === "enterprise" ? "local" : "enterprise",
    },
  );
  const grouped = evidenceGroups(d);
  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped[0].evidenceIds, [e.id, "duplicate"]);
  assert.equal(d.evidence.length, 3);
});
test("missing or enterprise-only support stays uncertain and cannot become local confirmation", () => {
  const d = createFixtures()[0],
    p = d.establishment.proposals[0];
  d.evidence = d.evidence.map((e) => ({ ...e, scope: "enterprise" }));
  assert.equal(proposalPresentation(d, p.id)!.needsLocalCheck, true);
  d.evidence = [];
  assert.equal(proposalPresentation(d, p.id)!.needsLocalCheck, true);
});
test("approved working values and export counts exclude superseded rejected reviews", () => {
  const d = createFixtures()[0],
    p = d.establishment.proposals[0];
  const approved = applyReview(
    d,
    {
      proposalId: p.id,
      expectedRevision: p.revision,
      decision: "approve",
      correctedValue: "corrected",
    },
    "approval",
    "2026-09-16T10:00:00Z",
  ).detail;
  assert.equal(approvedChanges([approved]).length, 1);
  assert.equal(
    proposalPresentation(approved, p.id)!.approvedValue,
    "corrected",
  );
  assert.equal(approvedChanges([approved], "Not this street").length, 0);
  const rejected = applyReview(
    approved,
    { proposalId: p.id, expectedRevision: p.revision + 1, decision: "reject" },
    "rejection",
    "2026-09-16T10:01:00Z",
  ).detail;
  assert.equal(approvedChanges([rejected]).length, 0);
  assert.equal(proposalPresentation(rejected, p.id)!.approvedValue, null);
});
test("search matches names, streets and formatted string identifiers without removing leading zeros", () => {
  const d = createFixtures()[0];
  d.establishment.id = "0123456789";
  d.establishment.parentEnterpriseId = "0012345678";
  for (const q of ["0123.456.789", "0012.345.678", "Paalstraat", "demo"])
    assert.equal(matchesBusiness(d, q), true);
  assert.equal(matchesBusiness(d, "unrelated"), false);
});

test("repeat fetches share a decision excerpt while retaining full source history", () => {
  const detail = createFixtures()[0],
    original = detail.evidence[0];
  detail.sources.push({
    ...detail.sources[0],
    id: "repeat-source",
    retrievedAt: "2026-09-16T12:00:00Z",
  });
  detail.evidence.push({
    ...original,
    id: "repeat-evidence",
    sourceId: "repeat-source",
  });
  const view = proposalPresentation(
    detail,
    detail.establishment.proposals[0].id,
  )!;
  assert.equal(view.evidence.length, 1);
  assert.deepEqual(view.evidence[0].evidenceIds, [
    original.id,
    "repeat-evidence",
  ]);
  assert.equal(view.evidence[0].source?.id, "repeat-source");
  assert.equal(evidenceGroups(detail).length, 2);
  assert.equal(detail.sources.length, 2);
});
