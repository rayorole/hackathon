import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreRecord, SIGNAL_WEIGHTS } from "./score.js";
import { BusinessRecord, realDate, type Evidence } from "./types.js";

const record = BusinessRecord.parse({
  ondernemingsnr: "0123456789", kind: "vestiging", zetelOndernemingsnr: "0012345678",
  zetelElders: true, naam: null, commercieleNaam: null, rechtsvorm: null,
  rechtstoestand: null, straat: "Paalstraat", huisnr: "1", busnr: null,
  postcode: "2900", gemeente: "Schoten", arStraat: null, arHuisnr: null,
  arPostcode: null, naceRsz: null, omschrijvingRsz: null, telefoon: null,
  email: null, datumInschrijving: null, startdatum: null, datumStopzetting: null,
  longitude: null, latitude: null, coordinaatVerdacht: false,
});
const evidence: Evidence = { signal: "website-bereikbaar", source: "Bron", sourceUrl: "https://example.org/contact", observation: "Website bereikbaar", observedAt: "2026-09-16", direction: "bevestigt" };

test("missing evidence never proposes closure", () => {
  assert.equal(scoreRecord(record, []).voorstel, "Nazicht: onvoldoende bewijs");
  assert.equal(record.ondernemingsnr, "0123456789");
});
test("duplicate source and signal cannot inflate confidence", () => {
  assert.deepEqual(scoreRecord(record, [evidence, evidence]), scoreRecord(record, [evidence]));
});
test("correlated signals and pages from one site are capped below high confidence", () => {
  const result = scoreRecord(record, SIGNAL_WEIGHTS.map((w, i) => ({ ...evidence, signal: w.signal, sourceUrl: `https://example.org/page-${i}` })));
  assert.ok(result.score <= 30);
  assert.notEqual(result.zekerheid, "Hoog");
});
test("conflicting observations remain visible", () => {
  const result = scoreRecord(record, [evidence, { ...evidence, direction: "weerlegt" }]);
  assert.equal(result.redenen.length, 2);
  assert.equal(result.score, 0);
  assert.equal(result.voorstel, "Nazicht: onvoldoende bewijs");
});
test("missing source URLs and placeholder dates cannot contribute", () => {
  const result = scoreRecord(record, [{ ...evidence, sourceUrl: null }, { ...evidence, observedAt: "1900-01-01" }]);
  assert.equal(result.score, 0);
  assert.equal(result.laatsteWaarneming, null);
});
test("invalid calendar and placeholder dates are not real observations", () => {
  assert.equal(realDate("2026-02-30"), null);
  assert.equal(realDate("9999-12-31"), null);
  assert.equal(realDate("2024-02-29"), "2024-02-29");
});
test("displayed reason contributions include source caps and sum to the score", () => {
  const signals = SIGNAL_WEIGHTS.map((w) => ({ ...evidence, signal: w.signal }));
  for (const observations of [signals, signals.map((e) => ({ ...e, direction: "weerlegt" as const })), [...signals, { ...evidence, direction: "weerlegt" as const }]]) {
    const result = scoreRecord(record, observations);
    const sum = result.redenen.reduce((total, reason) => total + reason.punten, 0);
    assert.equal(Math.max(0, Math.min(100, sum)), result.score);
    assert.ok(result.redenen.filter((reason) => reason.punten > 0).reduce((total, reason) => total + reason.punten, 0) <= 30);
    assert.ok(result.redenen.filter((reason) => reason.punten < 0).reduce((total, reason) => total - reason.punten, 0) <= 30);
  }
});
