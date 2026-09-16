import { test } from "node:test";
import assert from "node:assert/strict";
import { createFixtures } from "../src/fixtures";
import { acceptedFields, renewPendingBaselines } from "../src/index";
import { applyReview, approvedCsv } from "../src/demo";
import {
  mergeAnalysis,
  type SourceDocument,
} from "../../../scripts/lib/source-analysis";
import {
  matchDirectory,
  parseDirectory,
  publicHtml,
} from "../../../scripts/lib/discovery";
function changed(d: ReturnType<typeof createFixtures>[number], value: string) {
  const doc: SourceDocument = {
    source: {
      id: "source:" + value,
      url: "https://example.com",
      publisher: "Test",
      kind: "website",
      retrievedAt: "2026-09-16T12:00:00.000Z",
      observedAt: null,
      registrySnapshotDate: null,
      cached: false,
      isDemo: false,
    },
    text: "Our telephone is " + value + ".",
  };
  return mergeAnalysis(d, [doc], {
    claims: [
      { sourceId: doc.source.id, field: "telephone", value, excerpt: doc.text },
    ],
  });
}
test("renewed approval exports one current value; rejection preserves prior approval", () => {
  let d = changed(createFixtures()[0], "03 111 11 11");
  const first = d.establishment.proposals.at(-1)!;
  d = applyReview(
    d,
    { proposalId: first.id, expectedRevision: 0, decision: "approve" },
    "first",
    "2026-09-16T12:01:00.000Z",
  ).detail;
  d = changed(d, "03 222 22 22");
  const second = d.establishment.proposals.at(-1)!;
  const rejected = applyReview(
    d,
    { proposalId: second.id, expectedRevision: 0, decision: "reject" },
    "reject",
    "2026-09-16T12:02:00.000Z",
  ).detail;
  assert.equal(
    acceptedFields(rejected).find((x) => x.proposal.field === "telephone")
      ?.review.effectiveValue,
    "03 111 11 11",
  );
  const approved = applyReview(
    d,
    { proposalId: second.id, expectedRevision: 0, decision: "approve" },
    "second",
    "2026-09-16T12:03:00.000Z",
  ).detail;
  assert.equal(
    acceptedFields(approved).filter((x) => x.proposal.field === "telephone")
      .length,
    1,
  );
  assert(approvedCsv([approved]).includes("03 222 22 22"));
  assert(!approvedCsv([approved]).includes("03 111 11 11"));
  const stale = structuredClone(d);
  stale.reviews.push({
    ...stale.reviews.at(-1)!,
    reviewId: "concurrent",
    revision: 2,
  });
  assert.throws(
    () =>
      applyReview(
        stale,
        { proposalId: second.id, expectedRevision: 0, decision: "approve" },
        "bad",
        "2026-09-16T12:04:00.000Z",
      ),
    /intussen/,
  );
  const rebased = renewPendingBaselines(stale);
  const latest = rebased.establishment.proposals.at(-1)!;
  assert.equal(latest.baselineReviewId, "concurrent");
  assert.notEqual(latest.id, second.id);
  assert.doesNotThrow(() =>
    applyReview(
      rebased,
      { proposalId: latest.id, expectedRevision: 0, decision: "approve" },
      "rebased",
      "2026-09-16T12:05:00.000Z",
    ),
  );
});
test("superseded pending proposals cannot be reviewed and repeated source is idempotent", () => {
  let d = changed(createFixtures()[0], "03 111 11 11");
  const old = d.establishment.proposals.at(-1)!;
  d = changed(d, "03 222 22 22");
  assert.throws(
    () =>
      applyReview(
        d,
        { proposalId: old.id, expectedRevision: 0, decision: "approve" },
        "bad",
        "2026-09-16T12:03:00.000Z",
      ),
    /recenter/,
  );
  assert.deepEqual(changed(d, "03 222 22 22"), d);
});
test("directory requires both matching name and exact local address", () => {
  const d = createFixtures()[0];
  d.establishment.name = "Amplifon";
  d.establishment.address = {
    street: "Paalstraat",
    houseNumber: "38",
    postalCode: "2900",
    municipality: "Schoten",
  };
  const base = {
    name: "Amplifon Hoorcentrum Schoten",
    address: "Paalstraat 38, 2900 Schoten",
    url: "https://www.genietvanschoten.be/handelaars/amplifon",
    publisher: "Directory",
  };
  assert.equal(matchDirectory(d, [base]).length, 1);
  for (const patch of [
    { address: "Paalstraat 380, 2900 Schoten" },
    { name: "Unrelated" },
    { address: "Paalstraat 38, 1000 Brussel" },
  ])
    assert.equal(matchDirectory(d, [{ ...base, ...patch }]).length, 0);
  assert.equal(parseDirectory("<html>Directory unavailable</html>").length, 0);
});
test("public fetch rejects private hosts, credentials, HTTP and nonstandard ports before network", async () => {
  for (const u of [
    "http://www.genietvanschoten.be",
    "https://127.0.0.1",
    "https://user:password@www.genietvanschoten.be",
    "https://www.genietvanschoten.be:3000",
  ])
    await assert.rejects(publicHtml(u), /approved/);
});
