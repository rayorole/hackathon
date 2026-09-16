import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFixtures } from "../src/fixtures";
import { applyReview } from "../src/demo";
import {
  mergeAnalysis,
  type SourceDocument,
} from "../../../scripts/lib/source-analysis";
import { budgeted } from "../../../scripts/lib/ai-budget";
const doc: SourceDocument = {
  source: {
    id: "real-source",
    url: "https://example.com/business",
    publisher: "test",
    kind: "website",
    retrievedAt: "2026-09-16T09:00:00.000Z",
    observedAt: null,
    registrySnapshotDate: null,
    cached: false,
    isDemo: false,
  },
  text: "Our local telephone is 03 123 45 67. Welcome to our business.",
};
const input = {
  claims: [
    {
      sourceId: "real-source",
      field: "telephone",
      value: "03 123 45 67",
      excerpt: "Our local telephone is 03 123 45 67.",
    },
  ],
};
test("analysis rejects invented quotes/values and unknown source IDs", () => {
  const d = createFixtures()[0];
  assert.throws(() =>
    mergeAnalysis(d, [doc], {
      claims: [{ ...input.claims[0], excerpt: "This quote does not exist." }],
    }),
  );
  assert.throws(() =>
    mergeAnalysis(d, [doc], {
      claims: [{ ...input.claims[0], value: "fake" }],
    }),
  );
  assert.throws(() =>
    mergeAnalysis(d, [doc], {
      claims: [{ ...input.claims[0], sourceId: "invented" }],
    }),
  );
});
test("refresh preserves reviewed proposals, evidence and history, and deduplicates unchanged observations", () => {
  const d = mergeAnalysis(createFixtures()[0], [doc], input),
    p = d.establishment.proposals.find((p) => p.field === "telephone")!;
  const reviewed = applyReview(
    d,
    {
      proposalId: p.id,
      expectedRevision: 0,
      decision: "approve",
      correctedValue: "03 123 45 67",
    },
    "review",
    "2026-09-16T10:00:00.000Z",
  ).detail;
  const next = mergeAnalysis(reviewed, [doc], input);
  assert.deepEqual(next, reviewed);
  const changedDoc = {
    source: { ...doc.source, id: "changed" },
    text: "Our local telephone is 03 999 99 99.",
  };
  const changed = mergeAnalysis(reviewed, [changedDoc], {
    claims: [
      {
        ...input.claims[0],
        sourceId: "changed",
        value: "03 999 99 99",
        excerpt: changedDoc.text,
      },
    ],
  });
  assert.deepEqual(changed.reviews, reviewed.reviews);
  assert.deepEqual(
    changed.establishment.proposals.slice(
      0,
      reviewed.establishment.proposals.length,
    ),
    reviewed.establishment.proposals,
  );
  assert(changed.evidence.some((e) => e.observedValue === "03 999 99 99"));
  const newProposal = changed.establishment.proposals.at(-1)!;
  assert.equal(newProposal.before, "03 123 45 67");
  assert.equal(newProposal.baselineReviewId, "review");
  assert.equal(newProposal.reviewState, "pending");
});
test("persistent budget reserves before calls, retains uncertain spend and blocks beyond $10", async () => {
  const dir = await mkdtemp(join(tmpdir(), "straatbeeld-budget-")),
    file = join(dir, "budget.json");
  try {
    await writeFile(
      file,
      JSON.stringify({
        limitCents: 1000,
        reservedCents: 980,
        knownActualUsd: 0,
        calls: 0,
      }),
    );
    await assert.rejects(
      budgeted(file, async () => {
        throw new Error("timeout");
      }),
    );
    assert.equal(JSON.parse(await readFile(file, "utf8")).reservedCents, 990);
    await budgeted(file, async () => ({ value: "ok", actualUsd: 0.001 }));
    let called = false;
    await assert.rejects(
      budgeted(file, async () => {
        called = true;
        return { value: "bad", actualUsd: 0 };
      }),
    );
    assert.equal(called, false);
    assert.equal(JSON.parse(await readFile(file, "utf8")).calls, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("budget lock prevents concurrent paid calls", async () => {
  const dir = await mkdtemp(join(tmpdir(), "straatbeeld-budget-")),
    file = join(dir, "budget.json");
  let release!: () => void;
  const pending = new Promise<void>((r) => (release = r));
  let entered!: () => void;
  const ready = new Promise<void>((r) => (entered = r));
  try {
    await writeFile(
      file,
      JSON.stringify({
        limitCents: 1000,
        reservedCents: 0,
        knownActualUsd: 0,
        calls: 0,
      }),
    );
    const first = budgeted(file, async () => {
      entered();
      await pending;
      return { value: "ok", actualUsd: 0.001 };
    });
    await ready;
    await assert.rejects(
      budgeted(file, async () => ({ value: "bad", actualUsd: 0 })),
    );
    release();
    await first;
    assert.equal(JSON.parse(await readFile(file, "utf8")).calls, 1);
  } finally {
    release?.();
    await rm(dir, { recursive: true, force: true });
  }
});

test("numbered-source selection copies original excerpts and rejects invalid references", async () => {
  const { groundSelection, sourceSnippets } =
    await import("../../../scripts/lib/source-analysis");
  const valid = {
    sourceId: doc.source.id,
    snippetIndex: 0,
    field: "telephone",
    value: "03 123 45 67",
  };
  const result = groundSelection([doc], {
    claims: [
      valid,
      { ...valid, snippetIndex: 999 },
      { ...valid, sourceId: "unknown" },
      { ...valid, value: "invented" },
      valid,
    ],
  });
  assert.equal(result.claims.length, 1);
  assert.equal(result.claims[0].excerpt, sourceSnippets(doc.text)[0]);
});
