# Task-first UX — implementation and verification

Implemented on `codex/task-first-ux`, based on the integrated main revision01d61316. This branch is intentionally not merged into main. The backend, Supabase permissions/schema and shared AI budget remain unchanged.

## Changed experience

- Four primary entries: Start, Zaken, Wijzigingen, Historiek. Sources are a utility link; developer state previews are excluded from navigation and command search.
- Start offers the real pending task and ordinary visible search, without statistics, charts or full street/history lists.
- Business list has name, local address and open change. URL query parameters retain search, street and page; map and list share search context.
- All entry points open the same focused business view. The proposal comparison and relevant excerpts precede the decision controls. Original evidence, official records and audit are accessible through disclosures.
- Decision evidence includes same-field evidence not cited by the AI proposal. Conflicting Amplifon hours from both sources remain visible. The comparison warning does not assert which source is right.
- Inline adjust/reject controls preserve drafts. Internal navigation asks before discarding. Browser Back retains the draft and offers resume; unloading warns about unsaved work. Concurrent409 reviews retain input and require the officer to acknowledge the refreshed state.
- Approved contact data is separated from source-only/rejected values. Historical decisions remain available. Export explicitly selects a street or all Schoten and counts only currently approved proposals.
- Map popup is compact and opens the same detail. Existing coordinates/clusters, attribution and missing-location list behaviour remain.

## Verified

`npm run check`:25 tests, TypeScript and lint pass. `npm run build`: production build passes.

New tests exercise unreferenced conflicting evidence, source dates/scope, visual deduplication without deleting references, missing/local applicability, exclusion of superseded rejected reviews and formatted identifier search.

Brave, authenticated live project: Start layout, focused opening-hours comparison including13:30 and13:00 source excerpts, approved phone versus rejected email separation, inline edit and preserve-on-navigation confirmation, Paalstraat search27, pagination, list→map→detail→back→list restoring page2 and query, compact map selection, parent/company registry disclosure, stored history and explicit-scope CSV download. Parsed `straatbeeld-ux-check.csv`: one approved telephone value with source references, rejected email absent. The approved phone was re-saved unchanged through the new inline controls with an explicit UX regression note, creating a third audit entry. No paid AI calls were made. The original integration had already verified review persistence and authentication; the new controls use that same canonical mutation API.

## Remaining human validation

A municipal employee has not yet performed the three-minute usability test. Responsive review, evidence/actions, the mobile drawer and Start were visually checked at393px in Brave device mode; desktop was restored afterward. An actual concurrent browser409 was not induced in this walkthrough; automated mutation/conflict tests pass, and the normal live save plus full reload passed. Ray’s machine must fetch this branch to view it; do not tell him main already contains the UX changes.

Run locally with existing ignored environment and `npm run dev`. The current preview uses http://localhost:3101. Keep AI paid refresh on Jochem’s designated backend and existing ledger. Do not overwrite the shared database or reinitialize budget state.
