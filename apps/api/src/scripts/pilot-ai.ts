/** Opt-in live pilot. Saves research locally; never imports records or approves changes. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { BusinessRecord, realDate } from '@kbo/core';
import { investigate } from '../ai/research.js';

const root = new URL('../../../../', import.meta.url);
const config = z.object({ naam: z.string(), demoStraat: z.string(), boundingBox: z.object({ minLon: z.number(), maxLon: z.number(), minLat: z.number(), maxLat: z.number() }) }).parse(JSON.parse(await readFile(new URL('config/municipality.json', root), 'utf8')));
const query = new URL('https://geo.api.vlaanderen.be/VKBO/ogc/features/v1/collections/Vkbo/items');
query.search = new URLSearchParams({ limit: '5', f: 'application/geo+json', 'filter-lang': 'cql2-text', filter: `KBO_Gemeente = '${config.naam.replaceAll("'", "''")}' AND KBO_Straat = '${config.demoStraat.replaceAll("'", "''")}'` }).toString();
const response = await fetch(query, { signal: AbortSignal.timeout(20_000) });
if (!response.ok) throw new Error('Registry pilot source unavailable');
const collection = z.object({ features: z.array(z.object({ properties: z.record(z.string(), z.unknown()), geometry: z.object({ coordinates: z.array(z.number()) }).nullable() })) }).parse(await response.json());
const s = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const pilot: unknown[] = [];
await mkdir(new URL('data/derived/', root), { recursive: true });
for (const feature of collection.features) {
  const p = feature.properties;
  if (p.KBO_Gemeente !== config.naam || p.KBO_Straat !== config.demoStraat) throw new Error('Registry filter was not respected');
  const parent = s(p.Ondernemingsnr_maatsch_zetel);
  const kind = parent ? 'vestiging' : 'onderneming';
  const longitude = feature.geometry?.coordinates[0] ?? null, latitude = feature.geometry?.coordinates[1] ?? null;
  const b = config.boundingBox;
  const record = BusinessRecord.parse({ ondernemingsnr: p.Ondernemingsnr, kind, zetelOndernemingsnr: parent, zetelElders: !!parent,
    naam: s(p.Maatschappelijke_naam), commercieleNaam: s(p.Commerciele_naam), rechtsvorm: kind === 'onderneming' ? s(p.Rechtsvorm) : null,
    rechtstoestand: kind === 'onderneming' ? s(p.Rechtstoestand) : null,
    straat: s(p.KBO_Straat), huisnr: s(p.KBO_Huisnr), busnr: s(p.KBO_Busnr), postcode: s(p.KBO_Postcode), gemeente: s(p.KBO_Gemeente),
    arStraat: s(p.AR_straat), arHuisnr: s(p.AR_huisnr), arPostcode: s(p.AR_postcode), naceRsz: s(p.NACE_hoofdact_RSZ), omschrijvingRsz: s(p.Omschrijving_hoofdact_RSZ),
    telefoon: s(p.Telefoonnummer), email: s(p.Email), datumInschrijving: realDate(s(p.Datum_inschrijving)), startdatum: realDate(s(p.Startdatum)), datumStopzetting: realDate(s(p.Datum_stopzetting)),
    longitude, latitude, coordinaatVerdacht: longitude === null || latitude === null || longitude < b.minLon || longitude > b.maxLon || latitude < b.minLat || latitude > b.maxLat });
  const started = Date.now();
  try {
    const research = await investigate(record, AbortSignal.timeout(120_000));
    pilot.push({ record, ...research });
    console.log(JSON.stringify({ record: record.ondernemingsnr, status: 'completed', sources: research.result.sources.length, findings: research.result.findings.length, proposal: research.result.proposal.kind, elapsedMs: Date.now() - started }));
  } catch (error) {
    const localMessages = ['Het citaat is niet teruggevonden in de bron.', 'Onbekende bron bij waarneming.', 'Dubbele bronidentificatie.'];
    const reason = error instanceof Error && localMessages.includes(error.message) ? error.message : error instanceof z.ZodError ? error.issues.map(issue => ({ path: issue.path, code: issue.code })) : error instanceof Error ? error.name : 'unknown';
    pilot.push({ record, error: reason });
    console.log(JSON.stringify({ record: record.ondernemingsnr, status: 'failed', reason, elapsedMs: Date.now() - started }));
  }
  await writeFile(new URL('data/derived/ai-pilot.json', root), JSON.stringify({ sourceUrl: query.href, retrievedAt: new Date().toISOString(), published: false, approved: false, records: pilot }, null, 2));
}
