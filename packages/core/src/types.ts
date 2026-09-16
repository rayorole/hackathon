import { z } from "zod";

/**
 * Registry numbers keep their leading zeros. They are strings everywhere,
 * with no exception — see AGENTS.md §5.
 */
export const RegistryNumber = z.string().min(1);

/** Placeholder dates the VKBO GeoJSON uses for "not set" / "open-ended". */
export const PLACEHOLDER_DATES = ["1900-01-01", "9999-12-31"] as const;

/** Returns null for placeholder or empty dates, so they never render as real ones. */
export function realDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  if ((PLACEHOLDER_DATES as readonly string[]).includes(iso)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso
    ? iso : null;
}

export const RecordKind = z.enum(["onderneming", "vestiging"]);
export type RecordKind = z.infer<typeof RecordKind>;

/** One normalised register record — an enterprise or an establishment unit. */
export const BusinessRecord = z.object({
  ondernemingsnr: RegistryNumber,
  kind: RecordKind,
  /** Parent enterprise number. Filled for establishments, null for legal entities. */
  zetelOndernemingsnr: RegistryNumber.nullable(),
  /** True when the parent enterprise is not present in our dataset (517 of 543 cases). */
  zetelElders: z.boolean(),

  naam: z.string().nullable(),
  commercieleNaam: z.string().nullable(),

  rechtsvorm: z.string().nullable(),
  /** Legal status lives on the enterprise only. Null on establishments, always. */
  rechtstoestand: z.string().nullable(),

  straat: z.string().nullable(),
  huisnr: z.string().nullable(),
  busnr: z.string().nullable(),
  postcode: z.string().nullable(),
  gemeente: z.string().nullable(),

  /** Address as matched to the Flemish address register; compare with the KBO address. */
  arStraat: z.string().nullable(),
  arHuisnr: z.string().nullable(),
  arPostcode: z.string().nullable(),

  naceRsz: z.string().nullable(),
  omschrijvingRsz: z.string().nullable(),

  telefoon: z.string().nullable(),
  email: z.string().nullable(),

  datumInschrijving: z.string().nullable(),
  startdatum: z.string().nullable(),
  datumStopzetting: z.string().nullable(),

  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  /** Set when the point falls outside the municipality bounding box. */
  coordinaatVerdacht: z.boolean(),
});
export type BusinessRecord = z.infer<typeof BusinessRecord>;

/**
 * A single observation about a record. All four fields are required:
 * if you cannot fill them, it is not evidence (AGENTS.md §8).
 */
export const Evidence = z.object({
  signal: z.string(),
  source: z.string(),
  sourceUrl: z.string().url().nullable(),
  observation: z.string(),
  observedAt: z.string(),
  /** How this observation moves confidence. */
  direction: z.enum(["bevestigt", "weerlegt", "neutraal"]),
});
export type Evidence = z.infer<typeof Evidence>;

export const Zekerheid = z.enum(["Hoog", "Middel", "Laag"]);
export type Zekerheid = z.infer<typeof Zekerheid>;

export const Voorstel = z.enum([
  "Geen actie",
  "Ter controle: mogelijk niet meer actief",
  "Nazicht: vestiging ontbreekt of adres verkeerd",
  "Nazicht: adres wijkt af van adressenregister",
  "Nazicht: contactgegevens onbekend",
  "Nazicht: onvoldoende bewijs",
]);
export type Voorstel = z.infer<typeof Voorstel>;

export const Beoordeling = z.enum(["open", "bevestigd", "afgewezen"]);
export type Beoordeling = z.infer<typeof Beoordeling>;

/** An append-only audit entry. Nothing is published without one of these. */
export const AuditEntry = z.object({
  ondernemingsnr: RegistryNumber,
  beoordeling: Beoordeling,
  medewerker: z.string(),
  opmerking: z.string().nullable(),
  /** The evidence exactly as it stood when the officer decided. */
  bewijsSnapshot: z.array(Evidence),
  beslistOp: z.string(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;
