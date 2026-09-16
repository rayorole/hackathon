/**
 * Ingest the KBO starter sample into normalised BusinessRecords.
 *
 * Handles, deliberately and visibly, every documented limitation of the sample
 * (AGENTS.md §5). The summary it prints at the end is material for the video:
 * knowing your data's limits is a criterion-1 strength.
 *
 *   npm run ingest
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import { BusinessRecord, realDate } from "@kbo/core";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const RAW = join(ROOT, "data", "raw", "KBO");
const DERIVED = join(ROOT, "data", "derived");
const CONFIG = JSON.parse(readFileSync(join(ROOT, "config", "municipality.json"), "utf8"));

const CSV = join(RAW, "schoten-kbo-1000-2026-09-07.csv");
const GEOJSON = join(RAW, "schoten-kbo-1000-2026-09-07.geojson");

/** Empty string, whitespace and literal "null" all mean absent. */
function s(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const t = String(value).trim();
  return t === "" || t.toLowerCase() === "null" ? null : t;
}

function num(value: unknown): number | null {
  const t = s(value);
  if (t === null) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function insideBoundingBox(lon: number | null, lat: number | null): boolean {
  if (lon === null || lat === null) return false;
  const b = CONFIG.boundingBox;
  return lon >= b.minLon && lon <= b.maxLon && lat >= b.minLat && lat <= b.maxLat;
}

function main() {
  if (!existsSync(CSV)) {
    console.error(`Starter data not found at ${CSV}`);
    console.error("Unzip the starter pack into data/raw/ so that data/raw/KBO/ exists.");
    process.exit(1);
  }

  // Registry numbers carry leading zeros — parse every field as a string, never
  // let Papa coerce. This is the single most common way to corrupt this dataset.
  const csv = Papa.parse<Record<string, string>>(readFileSync(CSV, "utf8"), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  // The GeoJSON is the unchanged API response and carries fields the CSV drops:
  // phone, email, cessation date.
  const extras = new Map<string, Record<string, unknown>>();
  if (existsSync(GEOJSON)) {
    const gj = JSON.parse(readFileSync(GEOJSON, "utf8")) as {
      features: { properties: Record<string, unknown> }[];
    };
    for (const f of gj.features) {
      const nr = s(f.properties["Ondernemingsnr"]);
      if (nr) extras.set(nr, f.properties);
    }
  } else {
    console.warn("No GeoJSON found — telefoon, email and stopzettingsdatum will be absent.");
  }

  const records: BusinessRecord[] = [];
  const seen = new Set<string>();

  for (const row of csv.data) {
    const ondernemingsnr = s(row["Ondernemingsnr"]);
    if (!ondernemingsnr || seen.has(ondernemingsnr)) continue;
    seen.add(ondernemingsnr);

    const extra = extras.get(ondernemingsnr) ?? {};
    const zetel = s(row["Ondernemingsnr_maatsch_zetel"]);
    // A filled parent number marks an establishment unit; blank marks a legal entity.
    const kind = zetel ? "vestiging" : "onderneming";

    const longitude = num(row["longitude"]);
    const latitude = num(row["latitude"]);

    records.push({
      ondernemingsnr,
      kind,
      zetelOndernemingsnr: zetel,
      zetelElders: false, // resolved in a second pass once every number is known
      naam: s(row["Maatschappelijke_naam"]),
      commercieleNaam: s(row["Commerciele_naam"]),
      rechtsvorm: s(row["Rechtsvorm"]),
      // Legal status is recorded on legal entities only. Never copy it onto an
      // establishment, even if the column happens to be populated.
      rechtstoestand: kind === "onderneming" ? s(row["Rechtstoestand"]) : null,
      straat: s(row["KBO_Straat"]),
      huisnr: s(row["KBO_Huisnr"]),
      busnr: s(row["KBO_Busnr"]),
      postcode: s(row["KBO_Postcode"]),
      gemeente: s(row["KBO_Gemeente"]),
      arStraat: s(row["AR_straat"]),
      arHuisnr: s(row["AR_huisnr"]),
      arPostcode: s(row["AR_postcode"]),
      naceRsz: s(row["NACE_hoofdact_RSZ"]),
      omschrijvingRsz: s(row["Omschrijving_hoofdact_RSZ"]),
      telefoon: s(extra["Telefoonnummer"]),
      email: s(extra["Email"]),
      datumInschrijving: realDate(s(row["Datum_inschrijving"])),
      startdatum: realDate(s(row["Startdatum"])),
      datumStopzetting: realDate(s(extra["Datum_stopzetting"])),
      longitude,
      latitude,
      coordinaatVerdacht: !insideBoundingBox(longitude, latitude),
    });
  }

  // Second pass: an establishment's parent is "elders" when it is not in our data.
  const known = new Set(records.map((r) => r.ondernemingsnr));
  for (const r of records) {
    r.zetelElders = r.kind === "vestiging" && !!r.zetelOndernemingsnr && !known.has(r.zetelOndernemingsnr);
  }

  for (const r of records) BusinessRecord.parse(r);

  writeFileSync(join(DERIVED, "records.json"), JSON.stringify(records, null, 2));

  const ondernemingen = records.filter((r) => r.kind === "onderneming").length;
  const vestigingen = records.filter((r) => r.kind === "vestiging").length;
  const straten = new Map<string, number>();
  for (const r of records) {
    if (r.straat) straten.set(r.straat, (straten.get(r.straat) ?? 0) + 1);
  }
  const topStraten = [...straten].sort((a, b) => b[1] - a[1]).slice(0, 5);

  console.log(`\nIngested ${records.length} records -> data/derived/records.json\n`);
  console.log(`  ondernemingen (legal entities):    ${ondernemingen}`);
  console.log(`  vestigingen (establishments):      ${vestigingen}`);
  console.log(`  parent seat outside this dataset:  ${records.filter((r) => r.zetelElders).length}`);
  console.log(`  suspect coordinates:               ${records.filter((r) => r.coordinaatVerdacht).length}`);
  console.log(`  with phone or email:               ${records.filter((r) => r.telefoon || r.email).length}`);
  console.log(`  with an RSZ activity code:         ${records.filter((r) => r.naceRsz).length}`);
  console.log(`  with a cessation date:             ${records.filter((r) => r.datumStopzetting).length}`);
  console.log(`\n  busiest streets: ${topStraten.map(([k, v]) => `${k} (${v})`).join(", ")}\n`);
}

main();
