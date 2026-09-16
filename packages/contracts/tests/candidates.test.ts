import test from "node:test";
import assert from "node:assert/strict";
import { candidateRequestSchema, candidateReviewRequestSchema, createCandidate, decideCandidate } from "../src/candidates";
const input = { id: "d8bfa797-272f-43f5-84ab-0879de651493", name: "Testzaak", address: { street: "Paalstraat", houseNumber: "1", postalCode: "2900", municipality: "Schoten" }, source: "Handelaarsgids", sourceUrl: "https://example.com/business", observation: "Winkel op dit adres vermeld", observedAt: "2026-09-16" };
test("candidate boundary requires evidence and refuses client-supplied approval and unsafe URLs", () => {
  assert.ok(candidateRequestSchema.safeParse(input).success);
  for (const patch of [{ observation: "" }, { sourceUrl: "javascript:alert(1)" }, { status: "approved" }, { observedAt: "1900-01-01" }, { address: { ...input.address, street: " " } }]) assert.equal(candidateRequestSchema.safeParse({ ...input, ...patch }).success, false);
});
test("new candidate remains pending without fabricated registry identifiers", () => {
  const c = createCandidate(candidateRequestSchema.parse(input), "officer", "2026-09-16T12:00:00.000Z");
  assert.equal(c.status, "pending"); assert.equal(c.review, null); assert.equal(c.createdBy, "officer");
  assert.equal("establishment" in c, false);
  assert.throws(() => createCandidate(candidateRequestSchema.parse({ ...input, observedAt: "2026-09-17" }), "officer", "2026-09-16T12:00:00.000Z"));
});
test("candidate review preserves original evidence, records actor and rejects stale or repeated decisions", () => {
  const c = createCandidate(candidateRequestSchema.parse(input), "reporter", "2026-09-16T12:00:00.000Z");
  const request = candidateReviewRequestSchema.parse({ expectedRevision: 0, decision: "approve", note: "Gecontroleerd" });
  const accepted = decideCandidate(c, request, "reviewer", "2026-09-16T13:00:00.000Z");
  assert.equal(accepted.status, "approved"); assert.equal(accepted.review?.reviewerId, "reviewer");
  assert.equal(accepted.observation, input.observation); assert.equal(c.status, "pending");
  assert.throws(() => decideCandidate(accepted, request, "reviewer", "2026-09-16T14:00:00.000Z"));
  assert.equal(decideCandidate(c, { ...request, decision: "reject" }, "reviewer", "2026-09-16T14:00:00.000Z").status, "rejected");
});
