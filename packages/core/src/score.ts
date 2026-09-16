import type { BusinessRecord, Evidence, Voorstel, Zekerheid } from "./types.js";
import { realDate } from "./types";
import { PublicSourceUrl } from "./ai-evidence";

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
  /** Actual allocated contribution after the correlated-source cap. */
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
  return realDate(record.datumStopzetting) !== null;
}

export function scoreRecord(record: BusinessRecord, bewijs: Evidence[]): ScoreResult {
  const redenen: ScoreReason[] = [];
  const seen = new Set<string>();
  const valid = bewijs.filter((e) => e.source.trim() && e.observation.trim()
    && PublicSourceUrl.safeParse(e.sourceUrl).success
    && e.observedAt.length === 10 && realDate(e.observedAt) === e.observedAt);
  const sourceReasons = new Map<string, ScoreReason[]>();

  for (const e of valid) {
    const weight = WEIGHT_BY_SIGNAL.get(e.signal);
    if (!weight || e.direction === "neutraal") continue;

    // Pages on the same host are correlated; www is not an independent source.
    const source = new URL(e.sourceUrl!).hostname.toLowerCase().replace(/^www\./, "");
    const key = `${source}|${e.signal}|${e.direction}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const punten = e.direction === "bevestigt" ? weight.gewicht : -weight.gewicht;
    const reason: ScoreReason = {
      signal: e.signal,
      uitleg: weight.uitleg,
      punten,
      bron: e.source,
      bronUrl: e.sourceUrl,
      waargenomenOp: e.observedAt,
    };
    redenen.push(reason);
    const groupKey = `${source}|${e.direction}`;
    const group = sourceReasons.get(groupKey) ?? [];
    group.push(reason);
    sourceReasons.set(groupKey, group);
  }

  // A transparent heuristic, not a calibrated probability. One site adds at most 30
  // points per direction, so repeated pages cannot establish high confidence alone.
  for (const group of sourceReasons.values()) {
    const total = group.reduce((sum, reason) => sum + Math.abs(reason.punten), 0);
    if (total <= 30) continue;
    // Allocate the cap proportionally in whole points. Largest remainders get
    // the remaining points; signal IDs break ties independently of input order.
    const allocations = group.map((reason) => {
      const exact = Math.abs(reason.punten) * 30 / total;
      return { reason, sign: Math.sign(reason.punten), points: Math.floor(exact), fraction: exact - Math.floor(exact) };
    }).sort((a, b) => b.fraction - a.fraction || a.reason.signal.localeCompare(b.reason.signal));
    let remaining = 30 - allocations.reduce((sum, allocation) => sum + allocation.points, 0);
    for (const allocation of allocations) {
      allocation.reason.punten = allocation.sign * (allocation.points + (remaining > 0 ? 1 : 0));
      remaining -= 1;
    }
  }

  const gezien = new Set(valid.filter((e) => e.direction !== "neutraal").map((e) => e.signal));
  const ontbrekendeSignalen = SIGNAL_WEIGHTS.filter((w) => !gezien.has(w.signal)).map(
    (w) => w.signal,
  );

  const score = Math.max(0, Math.min(100, redenen.reduce((sum, reason) => sum + reason.punten, 0)));

  const waarnemingen = valid.map((e) => e.observedAt).sort();
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

  if (zekerheid === "Laag") return "Nazicht: onvoldoende bewijs";

  if (!record.telefoon && !record.email && score < 60) {
    return "Nazicht: contactgegevens onbekend";
  }

  return "Geen actie";
}
