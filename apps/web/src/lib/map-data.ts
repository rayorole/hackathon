import { z } from "zod";
import { BusinessRecord, Evidence, Zekerheid, realDate } from "@kbo/core";
import municipality from "../../../../config/municipality.json";

export { municipality };
export const mapRecordSchema = BusinessRecord.pick({
  ondernemingsnr: true, kind: true, naam: true, commercieleNaam: true,
  straat: true, huisnr: true, postcode: true, gemeente: true,
  zetelOndernemingsnr: true, zetelElders: true,
  longitude: true, latitude: true, coordinaatVerdacht: true,
});
export const mapScoreSchema = z.object({
  zekerheid: Zekerheid,
  voorstel: z.string(),
  redenen: z.array(z.object({ signal: z.string(), uitleg: z.string(), punten: z.number(), bron: z.string(), bronUrl: z.string().nullable(), waargenomenOp: z.string() })),
  laatsteWaarneming: z.string().nullable(),
});
export const mapEntrySchema = z.object({ record: mapRecordSchema, score: mapScoreSchema.nullable() });
export const mapPageSchema = z.object({ entries: z.array(mapEntrySchema), nextCursor: z.string().nullable() });
export const mapDetailSchema = z.object({
  record: BusinessRecord,
  zetel: BusinessRecord.nullable().optional(),
  bewijs: z.array(Evidence),
  score: mapScoreSchema.nullable(),
});
export type MapEntry = z.infer<typeof mapEntrySchema>;
export type MapDetail = z.infer<typeof mapDetailSchema>;
export type MapKind = "all" | "onderneming" | "vestiging";
export type MapConfidence = "all" | "unknown" | "Hoog" | "Middel" | "Laag";
export type MapBounds = [number, number, number, number];
export const municipalityBounds: MapBounds = [municipality.boundingBox.minLon, municipality.boundingBox.minLat, municipality.boundingBox.maxLon, municipality.boundingBox.maxLat];

export function coordinateState(record: MapEntry["record"]): "valid" | "missing" | "suspect" {
  const { longitude: lon, latitude: lat } = record;
  if (lon === null || lat === null) return "missing";
  const [west, south, east, north] = municipalityBounds;
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || record.coordinaatVerdacht || lon < west || lon > east || lat < south || lat > north) return "suspect";
  return "valid";
}

export function recordAddress(record: MapEntry["record"]) {
  return [record.straat, record.huisnr].filter(Boolean).join(" ");
}

export function filterMapRecords(entries: MapEntry[], query: string, kind: MapKind, confidence: MapConfidence) {
  const text = query.trim().toLocaleLowerCase("nl-BE");
  const digits = text.replace(/[.\s-]/g, "");
  return entries.filter(({ record, score }) => {
    const searchable = [record.naam, record.commercieleNaam, recordAddress(record), record.postcode, record.gemeente].filter(Boolean).join(" ").toLocaleLowerCase("nl-BE");
    const numberMatch = /^\d+$/.test(digits) && [record.ondernemingsnr, record.zetelOndernemingsnr].some(n => n?.replace(/[.\s-]/g, "").includes(digits));
    const knownConfidence = mapConfidence(score);
    return (!text || searchable.includes(text) || numberMatch) && (kind === "all" || record.kind === kind) && (confidence === "all" || confidence === knownConfidence);
  });
}

export function inMapBounds(record: MapEntry["record"], bounds: MapBounds) {
  if (coordinateState(record) !== "valid") return false;
  const [west, south, east, north] = bounds;
  return record.longitude! >= west && record.longitude! <= east && record.latitude! >= south && record.latitude! <= north;
}

export function mapConfidence(score: MapEntry["score"]): Exclude<MapConfidence, "all"> {
  return score && score.redenen.length > 0 && score.redenen.every(r => r.bron.trim() && r.uitleg.trim() && r.bronUrl && /^https?:\/\//.test(r.bronUrl) && realDate(r.waargenomenOp)) ? score.zekerheid : "unknown";
}

export function displayObservationDate(value: string | null) {
  const date = realDate(value);
  if (!date) return "—";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("nl-BE");
}
