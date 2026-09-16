import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeSample,
  realDate,
  registryId,
  makeCase,
} from "../../../scripts/lib/kbo";
import { detailSchema, type Detail } from "../src/index";
const sample = JSON.parse(
  readFileSync(
    new URL(
      "../../../data/kbo/schoten-kbo-1000-2026-09-07.geojson",
      import.meta.url,
    ),
    "utf8",
  ),
);
const source: Detail["sources"][number] = {
  id: "sample",
  url: "https://example.com/sample",
  publisher: "test",
  kind: "registry",
  retrievedAt: "2026-09-06T22:38:02.128Z",
  observedAt: null,
  registrySnapshotDate: null,
  cached: true,
  isDemo: false,
};
test("sample separates establishments from enterprises and preserves provenance without inferring activity", () => {
  const n = normalizeSample(sample, source);
  assert.equal(n.cases.length, 543);
  assert.equal(n.enterpriseCount, 457);
  assert.equal(n.cases.filter((d) => d.establishment.parent).length, 28);
  for (const d of n.cases) {
    detailSchema.parse(d);
    assert.equal(d.establishment.activityAssessment, "insufficient");
    assert.equal(d.establishment.proposals.length, 0);
    assert.equal(d.sources[0].registrySnapshotDate, null);
    assert.equal(d.reviews.length, 0);
    for (const e of d.evidence)
      assert(d.sources.some((s) => s.id === e.sourceId));
  }
  const a = n.cases.find((d) => d.establishment.id === "2296242396")!;
  assert.equal(a.establishment.parentEnterpriseId, "0418975266");
  assert.equal(a.establishment.parent, null);
  assert.equal(a.establishment.address.street, "Paalstraat");
  assert(!a.evidence.some((e) => e.field === "cessationDate"));
});
test("blank and sentinel dates remain unknown; leading zero IDs survive", () => {
  for (const s of [
    " ",
    "1900-01-01T00:00:00Z",
    "9999-12-31",
    "2026-02-30",
    "garbage",
  ])
    assert.equal(realDate(s), null);
  assert.equal(realDate(" 2020-01-01T00:00:00Z "), "2020-01-01");
  assert.equal(registryId(" 0418975266 "), "0418975266");
  assert.throws(() => registryId(418975266));
});
test("parent evidence retains separate retrieval date and enterprise scope", () => {
  const n = normalizeSample(sample, source),
    p = n.properties.get("2296242396")!;
  const parentSource = {
    ...source,
    id: "live",
    retrievedAt: "2026-09-16T09:00:00.000Z",
    cached: false,
  };
  const parent = {
    Ondernemingsnr: "0418975266",
    Maatschappelijke_naam: "Parent",
    KBO_Straat: "Seat street",
    KBO_Huisnr: "40",
    KBO_Busnr: "1",
    KBO_Postcode: "1702",
    KBO_Gemeente: "Dilbeek",
    Rechtstoestand: "Normale toestand",
  };
  const d = makeCase(p, source, { properties: parent, source: parentSource });
  assert.equal(
    d.establishment.parent?.registeredAddress?.municipality,
    "Dilbeek",
  );
  assert.equal(d.establishment.address.municipality, "Schoten");
  assert.equal(d.sources.length, 2);
  assert.equal(d.establishment.registryStatus, null);
  assert.equal(d.establishment.parent?.registryStatus, "Normale toestand");
  assert.throws(() =>
    makeCase(p, source, {
      properties: { ...parent, Ondernemingsnr: "0000000001" },
      source: parentSource,
    }),
  );
});
