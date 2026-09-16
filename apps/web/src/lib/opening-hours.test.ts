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

test("French dated INNO schedule stays dated and is presented in Dutch", () => {
  const hours = openingHours("Mercredi 16/09 09:30 - 20:00 Jeudi 17/09 09:30 - 20:00 Vendredi 18/09 09:30 - 21:00 Sam 19/09 09:30 - 20:00 Dimanche 20/09 Fermé Lundi 21/09 Fermé Mardi 22/09 09:30 - 20:00")!;
  assert.equal(hours.rows.length, 7);
  assert.deepEqual(hours.rows[0], { day: "Woensdag", date: "16/09", periods: ["09:30 – 20:00"], closed: false, appointment: false });
  assert.equal(hours.rows[4].day, "Zondag");
  assert.equal(hours.rows[4].closed, true);
  assert.equal(hours.rows[5].closed, true);
});
test("English and German schedules localize ranges and qualifiers", () => {
  assert.deepEqual(openingHours("Monday to Friday 09:00-17:00 Saturday closed Sunday by appointment")!.rows[4].periods, ["09:00 – 17:00"]);
  assert.equal(openingHours("Montag bis Freitag 09:00-17:00 Samstag geschlossen Sonntag nach Vereinbarung")!.rows[6].appointment, true);
});
test("Unrecognized days in a partially parsed schedule retain the raw fallback", () => {
  assert.equal(openingHours("Monday 09:00-17:00 Tuesday 29:00-31:00"), null);
});

test("Contradictory closure or repeated dates keep the evidence fallback", () => {
  assert.equal(openingHours("Monday closed 09:00-17:00"), null);
  assert.equal(openingHours("Mercredi 16/09 09:00-17:00 Mercredi 16/09 10:00-18:00"), null);
});
