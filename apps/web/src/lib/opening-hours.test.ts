import { test } from "node:test";
import assert from "node:assert/strict";
import { openingHours } from "./opening-hours";
test("Dutch weekday range preserves split periods and appointment qualifier", () => {
  const hours = openingHours(
    "ma tem vrij 9u00-12u30 en 13u30-17u30 na afspraak",
  )!;
  assert.equal(hours.rows.length, 7);
  assert.deepEqual(hours.rows[0].periods, ["09:00 – 12:30", "13:30 – 17:30"]);
  assert.equal(hours.rows[4].appointment, true);
  assert.equal(hours.rows[5].closed, false);
  assert.deepEqual(hours.rows[5].periods, []);
});
test("Partial source does not invent Monday or merge service hours into Sunday", () => {
  const hours = openingHours(
    "Dinsdag 09:00 - 12:30 13:00 - 17:00 Woensdag 09:00 - 12:30 13:00 - 17:00 Zaterdag Gesloten Zondag Gesloten Service-uur: 11:00 - 12:00",
  )!;
  assert.deepEqual(hours.rows[0].periods, []);
  assert.equal(hours.rows[1].periods[1], "13:00 – 17:00");
  assert.equal(hours.rows[6].closed, true);
  assert.deepEqual(hours.rows[6].periods, []);
  assert.deepEqual(hours.notes, ["Service-uur: 11:00 - 12:00"]);
});
test("Unstructured and invalid hours keep the original text fallback", () => {
  assert.equal(openingHours("Op afspraak via telefoon"), null);
  assert.equal(openingHours("Maandag 29:00 - 31:00"), null);
  assert.equal(openingHours(null), null);
});
test("Repeated day claims are not silently reconciled", () => {
  const hours = openingHours("Maandag 09:00-12:00 Maandag 10:00-12:00")!;
  assert.deepEqual(hours.rows[0].periods, ["Zie brontekst"]);
});
