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

## Visual refinement following user review

The first task-first implementation was rejected visually: excessive loose prose and insufficient structure. The refined branch now uses a consistent teal/neutral treatment with structured opening-hours tables, source cards, before/proposed comparison, business identities, approved contact rows, registry grids, decision receipts and audit history. Start, business directory/filter toolbar, review queue, history/export, source provenance, map detail and account screens share this language. Empty states keep their explanation and action together. Navigation resets the vertical viewport while retaining search/street/page parameters.

The hours renderer is presentation-only. It recognizes explicit Dutch weekday ranges and day-specific intervals; unknown days stay “Niet vermeld”, explicit closure stays “Gesloten”, appointment conditions and service-hour notes remain visible. Contradictory repeated days defer to the original text. Source schedules use the actual excerpt when it can be parsed, not a guessed reconciliation. Original text remains expandable; all evidence IDs and stored values are unchanged. No AI, schema, API, auth-role or budget changes.

Verification for this visual revision: 29 tests (including four new schedule regression cases), type checking, lint and production build. Brave desktop inspection covered Start, business list with retained Paalstraat/page 2, two-source schedule comparison, history, export scope, provenance, loaded map and registration. The 393px viewport check covered the business review and sign-in screen. The earlier branch's live-save/export verification remains documented above; this visual pass did not write new reviews or initiate paid research. The shared opening-hours proposal was already approved by another session during the walkthrough (13:18:37); its approved rendering was inspected without resetting it. Access-pending appearance uses the same account shell but was not re-entered with a pending-role account. Municipal-user aesthetic/usability acceptance remains open.
