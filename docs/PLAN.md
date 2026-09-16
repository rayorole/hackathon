# KBO Evidence Desk — Challenge 1 build plan

Deadline: submissions close 16:30 Europe/Brussels. Stop building 15:15, record 15:15–16:00, upload + form by 16:15.

## The product

An **officer review queue** over the Schoten business register. For each record we gather
public evidence, score confidence, and hand the officer a one-screen verdict they can
approve, correct, or reject. Nothing is published without officer approval.

Framing for the pitch: we do not "fix the register". We make the register's uncertainty
*visible and actionable* for one officer, one record at a time.

## Mapping to the three criteria

| Criterion | What we ship |
|---|---|
| Reliable business data | Per-record signals (website live, name match, address match, geo-in-municipality, activity-code present) rolled into a 0–100 confidence score + an "likely inactive" flag |
| Useful & trustworthy for officers | Queue sorted by lowest confidence; detail view showing every signal with its source URL and retrieved-at timestamp; Approve / Correct / Reject writes an append-only audit log; nothing auto-publishes |
| Fresh & reusable | `config/municipality.json` drives NIS code, bounding box, and source list — swap the file to run another municipality; every evidence item carries a retrieved-at date so staleness is visible |

## Architecture

- Next.js App Router, TypeScript, Tailwind.
- **No database.** 1,000 records is small: JSON on disk in `data/derived/`, append-only
  JSONL for the audit log. Supabase is the stated scale path (we have credits) but is
  not on the critical path today.
- `scripts/ingest.ts` — parse KBO CSV + GeoJSON into one normalised record shape,
  splitting the 457 legal entities from the 543 establishment units and linking them.
- `scripts/enrich.ts` — batch evidence gathering, writes `data/derived/evidence.json`.
  Precomputed for the whole set; the UI also supports live re-enrich on one record for
  the demo.
- `src/lib/score.ts` — pure, unit-testable scoring. Every point of the score traces to a signal.

## Honesty in the video

Name the sample's limits out loud — first 1,000 of a paged response, VAT activity code
empty on every row, RSZ code on 81 rows only, some coordinates outside Schoten. Judges
reward knowing your data. Say plainly what is real and what is mocked.

## Attribution

KBO data: Flemish Modellicentie Gratis Hergebruik v1.0 — attribution required, put it in
the footer and on the last video frame.
