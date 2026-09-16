/** Presentation only: never writes normalized values back into the evidence. */
export const weekDays = [
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
];
const aliases = [
  ["maandag", "ma", "monday", "mon", "lundi", "lun", "montag", "mo"],
  ["dinsdag", "di", "tuesday", "tue", "tues", "mardi", "mar", "dienstag"],
  ["woensdag", "wo", "wednesday", "wed", "mercredi", "mer", "mittwoch", "mi"],
  ["donderdag", "do", "thursday", "thu", "thur", "thurs", "jeudi", "jeu", "donnerstag"],
  ["vrijdag", "vrij", "vr", "friday", "fri", "vendredi", "ven", "freitag", "fr"],
  ["zaterdag", "za", "saturday", "sat", "samedi", "sam", "samstag", "sa"],
  ["zondag", "zo", "sunday", "sun", "dimanche", "dim", "sonntag", "so"],
];
const dayPattern = aliases.flat().sort((a, b) => b.length - a.length).join("|");
const dayIndex = (day: string) => aliases.findIndex((names) => names.includes(day));
export function openingHours(text: string | null | undefined) {
  if (!text) return null;
  const input = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u00a0/g, " ");
  const markers = [
    ...input.matchAll(
      new RegExp(
        `\\b(${dayPattern})\\b(?:\\s*(?:t\\/?m|tem|tot(?: en met)?|to|through|au|a|bis|[-–])\\s*\\b(${dayPattern})\\b)?`,
        "g",
      ),
    ),
  ];
  if (!markers.length) return null;
  const rows: {
    day: string;
    date?: string;
    periods: string[];
    closed: boolean;
    appointment: boolean;
  }[] = weekDays.map((day) => ({
    day,
    periods: [],
    closed: false,
    appointment: false,
  }));
  const datedRows: typeof rows = [];
  let recognized = false;
  let incomplete = false;
  markers.forEach((marker, index) => {
    const segment = input
      .slice(
        marker.index! + marker[0].length,
        markers[index + 1]?.index ?? input.length,
      )
      .split(/service[- ]?uur|eerste beschikbare/)[0];
    const periods = [
      ...segment.matchAll(
        /\b([01]?\d|2[0-3])[:uh.]([0-5]\d)\s*[-–—]\s*([01]?\d|2[0-3])[:uh.]([0-5]\d)\b/g,
      ),
    ].map(
      (m) =>
        `${m[1].padStart(2, "0")}:${m[2]} – ${m[3].padStart(2, "0")}:${m[4]}`,
    );
    const closed = /\b(?:gesloten|closed|fermee?|geschlossen)\b/.test(segment);
    const appointment = /\b(?:(?:na|op) afspraak|by appointment|sur rendez-vous|nach vereinbarung)\b/.test(segment);
    const start = dayIndex(marker[1]),
      end = marker[2] ? dayIndex(marker[2]) : start;
    if (
      start < 0 ||
      end < 0 ||
      end < start ||
      (closed && periods.length > 0) ||
      (!periods.length && !closed && !appointment)
    ) {
      incomplete = true;
      return;
    }
    const date = segment.match(/^\s*\.?\s*(\d{1,2}\/\d{1,2}(?:\/\d{4})?)(?=\s|$)/)?.[1];
    if (date) {
      if (datedRows.some((row) => row.date === date)) incomplete = true;
      datedRows.push({ day: weekDays[start], date, periods, closed, appointment });
      recognized = true;
      return;
    }
    for (let d = start; d <= end; d++) {
      // Repeated/contradictory days cannot be safely normalized.
      if (rows[d].periods.length || rows[d].closed || rows[d].appointment) {
        rows[d] = { ...rows[d], periods: ["Zie brontekst"], closed: false };
        continue;
      }
      rows[d] = { ...rows[d], periods, closed, appointment };
    }
    recognized = true;
  });
  return recognized && !incomplete && !(datedRows.length && datedRows.length !== markers.length)
    ? {
        rows: datedRows.length ? datedRows : rows,
        text,
        notes: [...text.matchAll(/service[- ]?uur[^.!?\n]*/gi)].map((match) =>
          match[0].trim(),
        ),
      }
    : null;
}
