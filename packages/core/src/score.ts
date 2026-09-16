import type { BusinessRecord, Evidence, Voorstel, Zekerheid } from "./types.js";

/**
 * Confidence scoring.
 *
 * Pure by contract: signals in, score and reasons out. No I/O, no fetch, no database.
 * Every point of the score must trace back to a named signal the officer can inspect —
 * a number with no reasons behind it is worse than no number (AGENTS.md §2).
 */

export interface SignalWeight {
  signal: string;
  /** Points added when the evidence confirms, subtracted when it refutes. */
  gewicht: number;
  /** Dutch explanation shown to the officer. */
  uitleg: string;
}

export const SIGNAL_WEIGHTS: readonly SignalWeight[] = [
  {
    signal: "website-bereikbaar",
    gewicht: 25,
    uitleg: "Een bereikbare website op naam van de onderneming",
  },
  {
    signal: "vermelding-kaartdienst",
    gewicht: 20,
    uitleg: "Vermelding met openingsuren op een kaartdienst",
  },
  {
    signal: "naam-komt-overeen",
    gewicht: 15,
    uitleg: "De gevonden naam komt overeen met het register",
  },
  {
    signal: "adres-komt-overeen",
    gewicht: 15,
    uitleg: "Het gevonden adres komt overeen met het register",
  },
  {
    signal: "adres-in-adressenregister",
    gewicht: 10,
    uitleg: "Het KBO-adres komt overeen met het Vlaamse Adressenregister",
  },
  {
    signal: "contactgegevens-aanwezig",
    gewicht: 10,
    uitleg: "Telefoonnummer of e-mailadres beschikbaar in het register",
  },
  {
    signal: "recente-activiteit",
    gewicht: 5,
    uitleg: "Recente publieke activiteit waargenomen",
  },
] as const;

const WEIGHT_BY_SIGNAL = new Map(SIGNAL_WEIGHTS.map((w) => [w.signal, w]));

export interface ScoreReason {
  signal: string;
  uitleg: string;
  punten: number;
  bron: string;
  bronUrl: string | null;
  waargenomenOp: string;
}

export interface ScoreResult {
  /** 0–100. Clamped. */
  score: number;
  zekerheid: Zekerheid;
  voorstel: Voorstel;
  /** Every contributing signal, so the officer can see how we got here. */
  redenen: ScoreReason[];
  /** Signals we had no evidence for either way. */
  ontbrekendeSignalen: string[];
  /** Most recent observation date across all evidence, or null. */
  laatsteWaarneming: string | null;
}

/** Stopzetting on the register is decisive and overrides the evidence score. */
function isStopgezet(record: BusinessRecord): boolean {
  return record.datumStopzetting !== null;
}

export function scoreRecord(record: BusinessRecord, bewijs: Evidence[]): ScoreResult {
  const redenen: ScoreReason[] = [];
  let score = 0;

  for (const e of bewijs) {
    const weight = WEIGHT_BY_SIGNAL.get(e.signal);
    if (!weight || e.direction === "neutraal") continue;

    const punten = e.direction === "bevestigt" ? weight.gewicht : -weight.gewicht;
    score += punten;
    redenen.push({
      signal: e.signal,
      uitleg: weight.uitleg,
      punten,
      bron: e.source,
      bronUrl: e.sourceUrl,
      waargenomenOp: e.observedAt,
    });
  }

  const gezien = new Set(bewijs.map((e) => e.signal));
  const ontbrekendeSignalen = SIGNAL_WEIGHTS.filter((w) => !gezien.has(w.signal)).map(
    (w) => w.signal,
  );

  score = Math.max(0, Math.min(100, score));

  const waarnemingen = bewijs.map((e) => e.observedAt).filter(Boolean).sort();
  const laatsteWaarneming = waarnemingen.length ? waarnemingen[waarnemingen.length - 1]! : null;

  const zekerheid: Zekerheid = score >= 60 ? "Hoog" : score >= 30 ? "Middel" : "Laag";

  return {
    score,
    zekerheid,
    voorstel: bepaalVoorstel(record, score, zekerheid),
    redenen,
    ontbrekendeSignalen,
    laatsteWaarneming,
  };
}

function bepaalVoorstel(
  record: BusinessRecord,
  score: number,
  zekerheid: Zekerheid,
): Voorstel {
  if (isStopgezet(record)) return "Ter controle: mogelijk niet meer actief";
  if (record.coordinaatVerdacht) return "Nazicht: vestiging ontbreekt of adres verkeerd";

  const kboStraat = record.straat?.trim().toLowerCase() ?? null;
  const arStraat = record.arStraat?.trim().toLowerCase() ?? null;
  if (kboStraat && arStraat && kboStraat !== arStraat) {
    return "Nazicht: adres wijkt af van adressenregister";
  }

  if (zekerheid === "Laag") return "Ter controle: mogelijk niet meer actief";

  if (!record.telefoon && !record.email && score < 60) {
    return "Nazicht: contactgegevens onbekend";
  }

  return "Geen actie";
}
