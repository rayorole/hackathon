# AGENTS.md — KBO Evidence Desk

Repo context for coding agents and teammates. Derived from the PROV-AI participant guide
(`agent.md`, snapshot 15 September 2026, 11:43 CEST). Where this file states an event rule it
cites the source page; where it states a team decision it says so.

---

## 1. What we are building

**KBO Evidence Desk** — a back-office tool for a *local economy officer* (medewerker lokale
economie) in the Province of Antwerp. It cross-checks business-register records against public
sources so the officer can inspect evidence, correct records, and approve changes before
anything is published.

We are entered in **Challenge 1 · Find the Real Businesses**.

The officer's own question, from the guidance page, is our north star:

> "Welke ondernemingen zijn actief in deze straat, en waarop baseren we dat?"

### Judged on exactly three criteria

Nothing else is scored. Every feature must map to one of these ([Challenge 1 brief](https://app.notion.com/p/81cc08b966924dfa9a34e4694866d392)):

1. **Betrouwbare bedrijfsdata** — find missing or inaccurate records, flag potentially inactive
   entries, enrich with evidence and confidence.
2. **Bruikbaar en betrouwbaar voor medewerkers** — records easy to find, inspect and correct,
   **with officer approval before publication**.
3. **Actueel en herbruikbaar** — show how data stays up to date, and how the approach adapts to
   another municipality or province.

If a proposed feature does not serve one of these three, do not build it today.

---

## 2. Hard rules — do not violate

These are published event rules, not preferences.

- **Officer-facing interface text is in Dutch.** Team discussion, code, comments, commit
  messages and technical docs may be English. Every label, column header, status, button and
  message an officer would read is Dutch. ([Submission & Practical FAQ](https://app.notion.com/p/e6d93aeee23740439c2ff3968942db47), "Which language do we work in?")
- **Nothing leaves the tool without officer approval.** No auto-publish, no auto-send. The
  officer ticks *bevestigen* or *afwijzen* per row; only confirmed changes are written as
  accepted.
- **Never invent data.** If a contact, coordinate or activity status is unknown, render
  `onbekend` / `niet gevonden`. The guidance is explicit: show *contactgegevens onbekend*
  rather than inventing details.
- **Every claim carries its evidence.** Source URL + what was observed + observation date.
  A confidence score with no traceable signals behind it is worse than no score.
- **Attribution required** on the KBO data, in the UI footer and on the final video frame:
  *"publieke KBO gegevens, verrijkt met adressen uit het Vlaamse Adressenregister."*
  Licence: [Modellicentie Gratis Hergebruik v1.0](https://data.vlaanderen.be/id/licentie/modellicentie-gratis-hergebruik/v1.0). It covers the KBO sample only, not the RAG PDFs.
- **Label what is mocked.** In the UI and in the video. The FAQ asks for this directly.
- **No secrets in the repo.** API keys and personal partner codes live in `.env.local`, which is
  gitignored. Never paste a key into a file, an issue, or a chat.

---

## 3. Deadline

**16:30 Europe/Brussels, Wednesday 16 September 2026.** Late submissions are not accepted.

One 3-minute YouTube pitch video (Dutch or English), publicly accessible, link submitted via
the [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSeqs2xIbsuPM4ddiuov11qoehQfs3mn9ZECKnKCjKAHzXYYGA/viewform). Team name + challenge number on the first frame. Test the link in a
private window before submitting. A working demo is an optional bonus.

Team schedule (our decision, not an event rule):

| Time | What |
|---|---|
| until 15:15 | Build. Hard stop. |
| 15:15–16:00 | Record the video |
| 16:00–16:15 | Upload, check in a private window |
| by 16:15 | Submit the form — 15 minutes of buffer, not zero |

---

## 4. Domain model — get this right

This is the intellectual core of Challenge 1, and the part most teams will get wrong.

**Onderneming (enterprise)** — the legal entity: company, association or sole trader with a
registry number. Carries `Rechtsvorm`, `Rechtstoestand`, legal status, bankruptcy, dissolution.

**Vestigingseenheid (establishment unit)** — a physical place where that enterprise operates: a
shop, office, workshop. One enterprise may have several, in several municipalities.

**They are different records and must stay distinguishable and connected.**
Establishments carry their parent enterprise number in `Ondernemingsnr_maatsch_zetel`.
The **maatschappelijke zetel** (registered seat) may be in an entirely different municipality.

Consequences for our code and UI:

- Legal status belongs to the enterprise, never to the establishment. Do not render a
  `Rechtstoestand` on an establishment row as if it were the establishment's own.
- **Only 28 of 543 establishments have their parent enterprise inside the 1,000-row sample.**
  "Zetel elders — niet in deze dataset" is a normal, expected state. Design for it; it is not
  an error condition.
- Contact details may belong to the local establishment *or* to a central office elsewhere.
  Always show *which*, and its source. Finding the right contact is a useful optional feature;
  no specific contact fields are mandatory.

---

## 5. The data, and what is wrong with it

`data/raw/KBO/` — optional starter sample, real VKBO data (Digitaal Vlaanderen, *VKBO
ondernemingen en vestigingseenheden V3*), filtered to municipality = Schoten, retrieved
**7 September 2026**.

| File | Contents |
|---|---|
| `schoten-kbo-1000-2026-09-07.csv` | 1,000 rows, 30 register fields + longitude/latitude. Start here |
| `schoten-kbo-1000-2026-09-07.geojson` | Same records, unchanged API response — adds `Telefoonnummer`, `Email`, `KBO_NISCODE`, `Datum_stopzetting`, `Zoeknaam`, point geometry (WGS 84) |
| `source-metadata.json` | Provenance, licence, row counts, URL of the next page of records |

**Known limitations — surface these in the UI and say them out loud in the video.**
Knowing your data's limits is a criterion-1 strength, not a weakness to hide.

- Partial sample: the first 1,000 records of a paged response. Not the complete Schoten
  register, and **not a list of 1,000 verified active businesses**.
- Mixes **457 legal entities and 543 establishment units** in one table.
- **Import registry numbers as text** — they have leading zeros that spreadsheets and
  `parseInt` will destroy. Parse as string, always. This is a real bug source.
- Activity fields are sparse: **the VAT activity code is empty on every row**; an RSZ code
  exists on 81 rows only. Do not build a feature that depends on NACE codes being present.
- Some coordinates need validation — a few points fall well outside Schoten. Validate against
  the bounding box in `config/municipality.json` and flag outliers rather than plotting them
  silently.
- **Placeholder dates in the GeoJSON: `1900-01-01` and `9999-12-31` mean "not set" and
  "open-ended".** Never render or compare these as real dates.
- The exact federal KBO snapshot date is not supplied; the publisher lags the federal register
  by one to three days.

**Demo street:** `Paalstraat` has the most records in the sample (35). Use it for the walkthrough.

We may use, adapt or replace this data, and may pick any municipality or region inside the
Province of Antwerp. Our decision: stay with Schoten — the sample is real and its limits are
documented, which makes for an honest demo.

---

## 6. Architecture

Turborepo, npm workspaces.

```
apps/web        Next.js (App Router) + React Query + Tailwind — the officer UI, in Dutch
apps/api        Hono + Drizzle + Postgres — REST surface, ingest and enrich scripts
packages/core   Zod schemas, the scoring function, KBO parsing — shared by both
config/         municipality.json — the portability story lives here
data/raw/       starter pack, gitignored
data/derived/   precomputed evidence, gitignored
```

**Why a separate API.** Tom's persona explicitly wants to "trace decisions, export data or
connect through an API, and adapt the tool for other municipalities." The REST surface is
evidence for criterion 3, not architecture for its own sake. Mention it in the video.

**Postgres via `DATABASE_URL`.** Supabase hosted (we have credits), but nothing in the code
knows that — any Postgres works. Drizzle over Prisma: no codegen step, no Windows engine
binaries, migrations are readable SQL.

**Scoring lives in `packages/core/src/score.ts` and must stay pure.** Signals in, score and
reasons out. No I/O, no fetch, no database. It is the one piece we can unit-test in seconds and
the one piece the jury will ask about.

**Portability is a config file, not a rewrite.** `config/municipality.json` holds NIS code,
name, bounding box and source list. Swapping municipality must not require a code change —
that is criterion 3, demonstrated rather than asserted.

---

## 7. The officer's screen

Mirror the table from the guidance page. These exact Dutch column headers:

| Adres | Onderneming / vestiging | Register | Bewijs van activiteit | Laatste waarneming | Zekerheid | Voorstel |
|---|---|---|---|---|---|---|

- `Zekerheid`: **Hoog / Middel / Laag** — words, not a bare number. Show the contributing
  signals on expand.
- `Voorstel`: e.g. *Geen actie* · *Ter controle: mogelijk niet meer actief* · *Nazicht:
  vestiging ontbreekt of adres verkeerd*.
- Per row: **bevestigen** / **afwijzen**. Every decision appends to an audit log with who,
  what, when, and the evidence as it stood at decision time.
- `Laatste waarneming` is a real observation date or `—`. Never a guess.

---

## 8. Conventions

- TypeScript strict. No `any` in `packages/core`.
- Registry numbers are `string`. There is no exception to this.
- Dates as ISO `YYYY-MM-DD` strings in the domain layer; format for display at the edge only.
- Zod-validate anything crossing a boundary — file parse, HTTP request, model output.
- Evidence objects always carry `{ source, sourceUrl, observation, observedAt }`. If you cannot
  fill all four, it is not evidence.
- Dutch UI strings live in `apps/web/src/lib/nl.ts`, not scattered inline — so a non-coding
  teammate can fix the officer's language without touching components.

---

## 9. Working agreement for agents

- Read this file before proposing a feature. Map it to one of the three criteria in your
  proposal, or argue why it is worth the time anyway.
- Prefer finishing one complete officer workflow over starting three. The FAQ is explicit:
  show "one working task" from the officer's question to a reviewed result with visible
  evidence.
- When unsure about an event rule, say so and cite the source page. Do not invent a form URL,
  deadline, judging weight or official decision.
- Local economy officers are on site as mentors and sit on the jury. A focused question to a
  mentor beats twenty minutes of guessing about how the work actually happens.
