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
const dayPattern =
  "maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vrij|vr|za|zo";
const dayIndex = (day: string) =>
  ({ ma: 0, di: 1, wo: 2, do: 3, vr: 4, za: 5, zo: 6 })[
    day.slice(0, 2) as "ma"
  ];
export function openingHours(text: string | null | undefined) {
  if (!text) return null;
  const input = text.toLowerCase().replace(/\u00a0/g, " ");
  const markers = [
    ...input.matchAll(
      new RegExp(
        `\\b(${dayPattern})\\b(?:\\s*(?:t\\/?m|tem|tot(?: en met)?|[-–])\\s*\\b(${dayPattern})\\b)?`,
        "g",
      ),
    ),
  ];
  if (!markers.length) return null;
  const rows: {
    day: string;
    periods: string[];
    closed: boolean;
    appointment: boolean;
  }[] = weekDays.map((day) => ({
    day,
    periods: [],
    closed: false,
    appointment: false,
  }));
  let recognized = false;
  markers.forEach((marker, index) => {
    const segment = input
      .slice(
        marker.index! + marker[0].length,
        markers[index + 1]?.index ?? input.length,
      )
      .split(/service[- ]?uur|eerste beschikbare/)[0];
    const periods = [
      ...segment.matchAll(
        /\b([01]?\d|2[0-3])[:u.]([0-5]\d)\s*[-–]\s*([01]?\d|2[0-3])[:u.]([0-5]\d)\b/g,
      ),
    ].map(
      (m) =>
        `${m[1].padStart(2, "0")}:${m[2]} – ${m[3].padStart(2, "0")}:${m[4]}`,
    );
    const closed = /\bgesloten\b/.test(segment);
    const appointment = /\b(?:na|op) afspraak\b/.test(segment);
    const start = dayIndex(marker[1]),
      end = marker[2] ? dayIndex(marker[2]) : start;
    if (
      start === undefined ||
      end === undefined ||
      end < start ||
      (!periods.length && !closed && !appointment)
    )
      return;
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
  return recognized
    ? {
        rows,
        text,
        notes: [...text.matchAll(/service[- ]?uur[^.!?\n]*/gi)].map((match) =>
          match[0].trim(),
        ),
      }
    : null;
}
