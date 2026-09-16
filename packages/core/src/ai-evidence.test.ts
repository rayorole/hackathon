import assert from "node:assert/strict";
import { test } from "node:test";
import { ResearchExtraction, SourceSnapshot, validateResearch } from "./ai-evidence.js";

const source = { id: "s1", url: "https://example.org/contact", title: "Contact", text: "Onze vestiging: Paalstraat 12. E-mail: info@example.org", observedAt: "2026-09-16", retrievedAt: "2026-09-16T10:00:00.000Z", hash: "abc" };
const extraction = {
  summary: "Een adres gevonden.",
  findings: [{ sourceId: "s1", quote: "Onze vestiging: Paalstraat 12.", observation: "Het adres is Paalstraat 12.", signal: "adres-komt-overeen" as const, direction: "bevestigt" as const, scope: "vestiging" as const }],
  uncertainties: [],
  proposal: { kind: "correctie" as const, reason: "Adres vermeld op website.", field: "huisnr" as const, value: "12", sourceIds: ["s1"] },
};
test("resolves source metadata exclusively from validated snapshots", () => {
  const result = validateResearch(extraction, [source], "vestiging");
  assert.equal(result.findings[0]?.sourceUrl, source.url);
  assert.equal(result.findings[0]?.observedAt, source.observedAt);
  assert.equal(result.proposal.kind, "correctie");
});
test("unknown sources and fabricated quotations are rejected", () => {
  assert.throws(() => validateResearch({ ...extraction, findings: [{ ...extraction.findings[0], sourceId: "invented" }] }, [source], "vestiging"));
  assert.throws(() => validateResearch({ ...extraction, findings: [{ ...extraction.findings[0], quote: "Permanent gesloten" }] }, [source], "vestiging"));
});
test("unsupported replacement values become review flags", () => {
  const result = validateResearch({ ...extraction, proposal: { ...extraction.proposal, value: "666" } }, [source], "vestiging");
  assert.equal(result.proposal.kind, "nazicht");
  assert.equal(result.proposal.field, null);
  assert.equal(result.proposal.value, null);
});
test("central office findings cannot correct an establishment", () => {
  const result = validateResearch({ ...extraction, findings: [{ ...extraction.findings[0], scope: "centraal" }] }, [source], "vestiging");
  assert.equal(result.findings[0]?.scope, "centraal");
  assert.equal(result.proposal.kind, "nazicht");
});
test("refuted findings cannot supply a replacement value", () => {
  assert.equal(validateResearch({ ...extraction, findings: [{ ...extraction.findings[0], direction: "weerlegt" }] }, [source], "vestiging").proposal.kind, "nazicht");
});
test("source URLs and observation dates must be valid public HTTP metadata", () => {
  for (const url of ["javascript:alert(1)", "file:///private", "http://localhost/a", "http://127.0.0.1/a", "https://user:pass@example.org"]) assert.equal(SourceSnapshot.safeParse({ ...source, url }).success, false);
  for (const observedAt of ["", "1900-01-01", "9999-12-31", "2026-02-30"]) assert.equal(SourceSnapshot.safeParse({ ...source, observedAt }).success, false);
});
test("legal status fields are excluded from model proposals", () => {
  assert.equal(ResearchExtraction.safeParse({ ...extraction, proposal: { ...extraction.proposal, field: "rechtstoestand" } }).success, false);
});
test("a replacement cannot be a fragment of a different value", () => {
  assert.equal(validateResearch({ ...extraction, proposal: { ...extraction.proposal, value: "2" } }, [source], "vestiging").proposal.kind, "nazicht");
});
test("contradicting local findings require review rather than a field correction", () => {
  const result = validateResearch({ ...extraction, findings: [...extraction.findings, { ...extraction.findings[0], direction: "weerlegt" }] }, [source], "vestiging");
  assert.equal(result.proposal.kind, "nazicht");
  assert.equal(result.findings.length, 2);
});
test("an unrelated cited source cannot support a correction", () => {
  const result = validateResearch({ ...extraction, proposal: { ...extraction.proposal, sourceIds: ["s1", "s2"] } }, [source, { ...source, id: "s2" }], "vestiging");
  assert.equal(result.proposal.kind, "nazicht");
});
test("AI extraction cannot infer recent activity without an event-date contract", () => {
  assert.equal(ResearchExtraction.safeParse({ ...extraction, findings: [{ ...extraction.findings[0], signal: "recente-activiteit" }] }).success, false);
});
