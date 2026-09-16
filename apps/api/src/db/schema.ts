import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Registry numbers are text primary keys. They carry leading zeros and are never
 * numeric — see AGENTS.md §5.
 */
export const records = pgTable(
  "records",
  {
    ondernemingsnr: text("ondernemingsnr").primaryKey(),
    kind: text("kind").notNull(), // 'onderneming' | 'vestiging'
    zetelOndernemingsnr: text("zetel_ondernemingsnr"),
    zetelElders: boolean("zetel_elders").notNull().default(false),

    naam: text("naam"),
    commercieleNaam: text("commerciele_naam"),
    rechtsvorm: text("rechtsvorm"),
    rechtstoestand: text("rechtstoestand"),

    straat: text("straat"),
    huisnr: text("huisnr"),
    busnr: text("busnr"),
    postcode: text("postcode"),
    gemeente: text("gemeente"),

    arStraat: text("ar_straat"),
    arHuisnr: text("ar_huisnr"),
    arPostcode: text("ar_postcode"),

    naceRsz: text("nace_rsz"),
    omschrijvingRsz: text("omschrijving_rsz"),

    telefoon: text("telefoon"),
    email: text("email"),

    datumInschrijving: text("datum_inschrijving"),
    startdatum: text("startdatum"),
    datumStopzetting: text("datum_stopzetting"),

    longitude: doublePrecision("longitude"),
    latitude: doublePrecision("latitude"),
    coordinaatVerdacht: boolean("coordinaat_verdacht").notNull().default(false),
  },
  (t) => [index("records_straat_idx").on(t.straat), index("records_kind_idx").on(t.kind)],
);

/** One observation about a record. All four evidence fields are required. */
export const evidence = pgTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    ondernemingsnr: text("ondernemingsnr")
      .notNull()
      .references(() => records.ondernemingsnr, { onDelete: "cascade" }),
    signal: text("signal").notNull(),
    source: text("source").notNull(),
    sourceUrl: text("source_url"),
    observation: text("observation").notNull(),
    observedAt: text("observed_at").notNull(),
    direction: text("direction").notNull(), // bevestigt | weerlegt | neutraal
  },
  (t) => [index("evidence_record_idx").on(t.ondernemingsnr)],
);

/** Cached score, recomputed from evidence. Never the source of truth. */
export const scores = pgTable("scores", {
  ondernemingsnr: text("ondernemingsnr")
    .primaryKey()
    .references(() => records.ondernemingsnr, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  zekerheid: text("zekerheid").notNull(),
  voorstel: text("voorstel").notNull(),
  redenen: jsonb("redenen").notNull(),
  laatsteWaarneming: text("laatste_waarneming"),
  berekendOp: timestamp("berekend_op", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Append-only. Rows are never updated or deleted — a changed mind is a new row.
 * This table is the proof that nothing is published without officer approval.
 */
export const audit = pgTable(
  "audit",
  {
    id: text("id").primaryKey(),
    ondernemingsnr: text("ondernemingsnr").notNull(),
    beoordeling: text("beoordeling").notNull(), // open | bevestigd | afgewezen
    medewerker: text("medewerker").notNull(),
    opmerking: text("opmerking"),
    /** The evidence exactly as it stood when the officer decided. */
    bewijsSnapshot: jsonb("bewijs_snapshot").notNull(),
    beslistOp: timestamp("beslist_op", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_record_idx").on(t.ondernemingsnr)],
);
