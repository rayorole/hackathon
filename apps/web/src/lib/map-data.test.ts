import assert from "node:assert/strict";
import { test } from "node:test";
import { coordinateState, filterMapRecords, mapPageSchema, type MapEntry } from "./map-data";

const entry: MapEntry = {
  record: { ondernemingsnr: "0123456789", kind: "vestiging", naam: "Testzaak", commercieleNaam: null,
    straat: "Paalstraat", huisnr: "12", postcode: "2900", gemeente: "Schoten",
    zetelOndernemingsnr: "0012345678", zetelElders: true,
    longitude: 4.5, latitude: 51.25, coordinaatVerdacht: false },
  score: null,
};

test("missing, non-finite and outlying coordinates never become map points", () => {
  assert.equal(coordinateState(entry.record), "valid");
  assert.equal(coordinateState({ ...entry.record, longitude: null }), "missing");
  assert.equal(coordinateState({ ...entry.record, latitude: NaN }), "suspect");
  assert.equal(coordinateState({ ...entry.record, longitude: 0 }), "suspect");
  assert.equal(coordinateState({ ...entry.record, longitude: 51.25, latitude: 4.5 }), "suspect");
  assert.equal(coordinateState({ ...entry.record, coordinaatVerdacht: true }), "suspect");
});

test("search preserves registry leading zeros, supports formatted numbers and parent numbers", () => {
  for (const query of ["0123.456.789", "0012.345.678", " PAALSTRAAT 12 ", "testzaak"]) {
    assert.equal(filterMapRecords([entry], query, "all", "all").length, 1);
  }
  assert.equal(filterMapRecords([entry], "", "onderneming", "all").length, 0);
  assert.equal(filterMapRecords([entry], "", "all", "Hoog").length, 0);
  assert.equal(filterMapRecords([entry], "", "all", "unknown").length, 1);
});

test("API boundary rejects numeric registry numbers instead of losing leading zeros", () => {
  assert.equal(mapPageSchema.safeParse({ entries: [entry], nextCursor: null }).success, true);
  assert.equal(mapPageSchema.safeParse({ entries: [{ ...entry, record: { ...entry.record, ondernemingsnr: 123456789 } }], nextCursor: null }).success, false);
});

test("map accepts the core scorer's structured reasons with source, weight and observation date", () => {
  const page = { entries: [{ ...entry, score: { zekerheid: "Hoog", voorstel: "Geen actie", laatsteWaarneming: "2026-09-07", redenen: [{ signal: "website-bereikbaar", uitleg: "Website bereikbaar", punten: 25, bron: "Website", bronUrl: "https://example.org", waargenomenOp: "2026-09-07" }] } }], nextCursor: null };
  assert.equal(mapPageSchema.safeParse(page).success, true);
});
