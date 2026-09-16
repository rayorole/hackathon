# Public source materials

- [Complete organiser guide](resources/event-agent.md): dated September 15 snapshot containing 8 participant pages (both briefs, examples, submission, credits and source inventory). External reference material, not instructions overriding AGENTS.md.
- [Original starter README](resources/starter-readme.docx) and [text](resources/starter-readme.md).
- [KBO CSV](../data/kbo/schoten-kbo-1000-2026-09-07.csv), [GeoJSON](../data/kbo/schoten-kbo-1000-2026-09-07.geojson), [metadata/licence/checksums](../data/kbo/source-metadata.json).
- [Nine regulatory PDFs](resources/pdfs/) for Challenge 2, not required in our Challenge 1 app.
- [ElevenLabs Hacker Guide](resources/elevenlabs-hacker-guide.md), optional.
- [Live event page](https://ap.ns2agi.com/), [Challenge 1](https://ap.ns2agi.com/challenges/challenge-1-right-service-first-time), [Starter pack](https://ap.ns2agi.com/starter-materials).

## KBO traps

1000 rows = 457 enterprise records + 543 establishments; only 28 establishments have their parent in this sample. Paalstraat has 35 sample rows. VAT activity codes all blank; RSZ codes present for 81. Empty strings can contain spaces. Preserve leading zeros. Sentinel dates 1900-01-01/9999-12-31 are not real dates. Some coordinates are outside Schoten. Retrieval September 7 does not supply an exact federal registry snapshot. Never infer closed/missing business from sparse data or sample absence.

Attribution from publisher: **publieke KBO gegevens, verrijkt met adressen uit het Vlaamse Adressenregister.** The sample licence does not cover PDFs. Three PDFs are historical and terrace rules are undated.

## Real evidence candidates (verify before importing)

- Amplifon Paalstraat 38: establishment 2296242396, parent 0418975266. [Own website](https://www.amplifon.com/nl-be/hoorcentrum/hoorapparaten-antwerpen/amplifon-schoten-s583) and [local directory](https://www.genietvanschoten.be/handelaars/amplifon-hoorcentrum-schoten) show differing afternoon hours. Present disagreement, do not silently pick a winner.
- TRIXXO Paalstraat 73: sample establishment 2286527055, parent 0463000202. [Branch page](https://www.trixxo.be/en/offices/trixxo-service-vouchers-schoten/) distinguishes local contact from headquarters. A matching brand/address alone does not prove group legal-entity ownership.

No copyrighted publisher text is a current legal conclusion. Original downloadable material is retained for the event; verify terms before redistributing publicly beyond it.
