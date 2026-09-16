# Straatbeeld — task-first UX implementation plan

Related: provai-hackathon-overview (vault reference) · provai-hackathon-team-build (vault reference) · provai-hackathon-setup (vault reference).

## Decision and scope

The working MVP has verified data and transactions, but usability is not yet validated. This plan replaces the earlier dashboard-first presentation and the assumption that every source/registry field should be immediately visible. It preserves the underlying product scope, Ray’s visual identity, canonical contracts, authentication, evidence and persisted reviews. Implementation now exists on codex/task-first-ux; see ux-verification.md for what has actually been checked. The plan remains the acceptance specification.

Target user: a municipal employee who understands local businesses but does not need database, AI or registry expertise. Primary task: find a local business, understand a possible change, inspect relevant evidence, decide and export approved changes. Secondary task: browse businesses in a street without reviewing a proposal.

Success: a first-time user can check Amplifon’s opening hours and export approved changes without explanations of the interface. They can explain what they approved, where the information came from and that the official KBO was not changed.

Current baseline: merged main at01d61316; Ray may have newer local work. Merge current main into both work branches before implementation. Repo: rayorole/hackathon. Local integration checkout: /Users/jochemgroeneweg/dev/hackathon-integration. Preserve newer work, never reset or replace Ray’s scaffold.

## Information hierarchy

| Layer | Contents | Default presentation |
| --- | --- | --- |
| Do the task | Business name/local address, proposed field, current and proposed values, concrete reason, decision | Visible and prominent |
| Make an informed decision | Relevant excerpts, publisher/link, retrieval date, local versus enterprise scope, conflicting sources, meaningful uncertainty | Visible beside or immediately below the proposal, before decision controls |
| Inspect the full record | Identifiers, full parent company record, legal status, all evidence, complete audit, dataset metadata | Clearly labelled disclosure sections or secondary pages |

Never collapse a conflict, missing support, wrong-location warning or old/unknown source date that could change the decision. Progressive disclosure reduces reading burden; it must not manufacture certainty. The original evidence remains accessible. Colour is supplementary to readable labels.

## Navigation and routes

Main navigation: **Start · Zaken · Wijzigingen (N) · Historiek**. N means pending proposals, not all unresearched businesses. Keep the existing URLs to avoid unnecessary routing work:

| Entry | Existing route | Purpose |
| --- | --- | --- |
| Start | /overzicht | Resume useful work or find a business |
| Zaken — Lijst | /straatbeeld | Browse/search local businesses |
| Zaken — Kaart | /kaart | Same business search in geographic form |
| Wijzigingen | /nazicht | Review pending proposed changes |
| Historiek | /historiek | Inspect decisions and export approved changes |
| Over deze gegevens | /bronnen | Coverage, source inventory, attribution and limitations |

Lijst/Kaart are tabs within Zaken; both highlight the same main navigation entry. Keep map attribution visible on the map. Move the source inventory link to a quiet utility area. Remove /toestanden from employee navigation and command search; retain the development preview route. Leave account/logout accessible.

A visible search field labelled “Zoek een zaak of straat” is the ordinary entry point. Command search remains an optional keyboard shortcut, not the only discoverable search. Show Schoten as context; no municipality chooser while only one municipality is supported.

## Page specifications

### Start

One heading: “Wat wilt u controleren?” A short task summary uses actual pending proposals: “1 wijziging wacht op controle” or “Geen wijzigingen om te beoordelen”. Primary action “Bekijk wijziging” / “Bekijk wijzigingen”; when empty, “Zoek een zaak”. Show a search field and at most three pending items with business, address and changed field. Include “Alle wijzigingen bekijken” only when there are more items.

Remove the decorative introduction, four statistic cards, confidence charts, full street list and history table from this page. Keep existing chart components available for a later secondary overview; do not spend the hackathon redesigning analytics. Do not turn 542 businesses without researched activity evidence into 542 urgent tasks.

Coverage appears as one quiet but readable sentence: “U bekijkt een deel van de geregistreerde zaken in Schoten.” Link “Over deze gegevens” for the exact sample counts and dates. The global explanation of municipal working data versus official KBO is given once, with a short reminder at the approval/export action where it matters.

### Zaken — list

Heading “Zaken in Schoten”. Search, optional street selection and Lijst/Kaart toggle precede the results. Default columns: **Zaak · Adres · Open wijziging**. Combine name and business type only when type adds meaning. The change column says “Openingsuren controleren”, “2 wijzigingen” or “Geen open wijziging”. No open proposal is not proof of accurate contact data or active trading.

Default 10–25 rows using the current table component. Keep pagination and total. Advanced filters live behind “Filters”; show applied filters as removable chips. Hide column customization and row-selection checkboxes until there is an actual bulk action. Identifiers remain searchable, including formatted numbers and leading zeros, without becoming default columns.

Opening a row opens the business detail below. Keep search, street, pagination and originating view when returning. A no-results state says “Geen zaken gevonden voor ‘…’” with “Zoekopdracht wissen”; a failed request has a retry, not an empty dataset message.

### Business detail

Use a focused content area with a clear “Terug naar zaken” link. Avoid a narrow permanent panel competing with a wide table. One shared business-detail/review component should serve entry from list, queue and map. Recommended low-risk routing: keep existing routes and encode selected establishment and proposal in query parameters; do not introduce a new routing framework.

Top: business name and local address. Next: “Te controleren” with actual pending changes, then current contact information. Identify whether each displayed contact value is officer-approved, merely found in a source or unknown; never silently promote rejected/source-only values into the approved working data.

Secondary sections: “Officiële bedrijfsgegevens”, “Alle bronnen”, “Eerdere beslissingen”. Registry section contains establishment ID, parent ID/name, parent registered address and separate legal statuses. If the parent is elsewhere and that distinction matters to the proposal, show the short warning up front: “Dit gaat over de winkel in Schoten; het hoofdkantoor ligt in Dilbeek.” Missing parent data stays unknown, never becomes evidence the local business is missing or closed.

### Wijzigingen — queue and decision

Queue heading “Wijzigingen controleren”, actual pending count and compact items containing name/address, field and concrete reason. Open the first item only after the user chooses “Begin met controleren”; selecting any other item stays possible. Do not mix non-actionable missing research into the queue.

One proposal at a time. Reading order:

1. Business name and local address.
2. “Openingsuren controleren” (or the actual field).
3. “In onze werklijst” versus “Voorgesteld”. Unknown stays “Niet bekend”. Use proposal.before for the comparison; separately label any newer approved effective value when reviewing an older proposal.
4. A short grounded reason. Do not invent “gewijzigd” or “verouderd” if the actual situation is merely a newly found value.
5. Relevant source excerpt(s), publisher, clickable source, retrieval date and local applicability. Conflicts appear together; no misleading single-source summary.
6. “Goedkeuren” as primary action; “Waarde aanpassen”, “Afwijzen” and “Later bekijken” secondary. These remain reachable without scrolling past the complete evidence archive.
7. Expandable full sources, official record and previous decisions.

“Waarde aanpassen” reveals an inline input and optional note. “Afwijzen” reveals a small inline reason field (optional to match the existing contract) and “Afwijzing opslaan”; avoid stacking modals. Retain entered text after errors. Disable duplicate submit while saving. On success show “[Veld] opgeslagen in de werklijst” or “Voorstel afgewezen”, then a deliberate “Volgende wijziging” button; no automatic advance that prevents checking the result. “Later bekijken” does not persist a rejection or falsely claim a saved snooze state.

If edits are unsaved, changing business/proposal offers keep editing or discard. On409 retain the draft, explain “Deze wijziging is intussen beoordeeld”, reload the current revision and require a fresh decision. Never silently retry a stale approval. A revised human decision is another audited review, not destructive undo.

### Actual Amplifon example

The pending opening-hours proposal says afternoon opening13:30 while another retrieved Amplifon excerpt says13:00. Surface this as “De bronnen noemen verschillende middaguren” with both exact excerpts and sources. Preserve “op afspraak”. Do not call either value correct merely because it comes from a particular publisher. The employee may adjust and approve, reject or defer after checking.

The phone approval and email rejection currently in history are explicitly labelled MVP tests. Preserve those notes. Do not present the rejected email as an approved contact value. Do not create or claim a new discrepancy for demonstration purposes.

### Evidence presentation rules

Deduplicate identical excerpts visually by source ID + excerpt; never delete underlying evidence or audit records. For the selected proposal, show its referenced supporting evidence and any available same-field conflicting evidence even when the conflicting evidence is not in proposal.evidenceIds. Group by publisher and URL; retain scope and dates. Long relevant quotes can expand, but the conflicting value and enough context to interpret it must remain visible.

Do not use an LLM to generate new UI summaries on page load. Prefer deterministic display of canonical values, field labels and source text. Automatic conflict detection needs grounded evidence and conservative field-specific rules; do not compare arbitrary sentence strings and call differences a contradiction. If reliable classification cannot be implemented within the timebox, show all same-field snippets together with neutral wording “Vergelijk deze bronnen” and explicitly display the known relevant different values. Any curated display annotation must cite actual evidence IDs and pass a test; never substitute hard-coded claims for live records.

Retrieval date label: “Bron opgehaald op16 september2026”. An observed date, when present, has a separate label. Unknown dates remain unknown. Website availability, a registry entry and approval of a phone number do not establish current physical activity.

### Zaken — map

Keep the working MapLibre map and clustering. Share query/street/selection with the list. Default controls: search, Lijst/Kaart, zoom and a way back to the municipality. Move optional filters behind “Filters”. Avoid an empty confidence classification control as a prominent feature when the canonical data does not justify those classifications.

Selected point shows only name, local address, concrete open-change count and “Bekijk zaak”. That action opens the same business detail, rather than another complete dossier compressed into the map rail. Missing coordinates stay in the results list with “Locatie niet beschikbaar”; they are never plotted at a guessed point. Keep attribution and the note that the outline is an approximate viewing area, not an official boundary, accessible.

### Historiek and export

Default columns: **Zaak · Wijziging · Beslissing · Datum**. Expand a row for current/before/proposed value, reviewer, note, sources and revision. Human-readable business name leads; identifiers remain accessible. Distinguish event history from the latest effective approved result.

Button “Goedgekeurde wijzigingen exporteren”. Before downloading, show the selected municipality/street scope and explain “Alleen de laatste goedgekeurde wijzigingen staan in dit bestand.” Use the actual backend export filtering; table row selection must not imply an export scope the API does not support. Displayed counts, if included, come from the same latest-per-proposal rule as export. Export failure preserves filters and offers retry. Zero eligible rows gets an honest empty explanation, not an apparent success with invented contents.

### Sources, account and exceptional states

Over deze gegevens groups data origin, sample size, source inventory, separate retrieval/observation dates, missing parent/location coverage and licence. Keep technical identifiers/citations here readable. Source outages distinguish cached earlier evidence from newly fetched material. “Bronnen opnieuw controleren” is contextual to a business; unsupported targets explain that source checking is not configured, and Ray’s machine must not initialize an independent AI budget.

Registration/login stay simple. Pending access says “Uw account is aangemaakt. Een beheerder moet u toegang geven.” Keep recheck/logout; do not expose role machinery as a user task. Authentication failures return to login appropriately, never masquerade as zero businesses. Preserve server authorization and current password-entry handoff.

## Copy and visual rules

| Current term | Preferred in ordinary workflow |
| --- | --- |
| Record / dossier | Zaak / gegevens van deze zaak |
| Nazicht | Wijzigingen controleren |
| Bewijs van activiteit | Waarom stellen we dit voor? (only when discussing the proposal) |
| Hoog / Middel / Laag | Concrete reason or precise uncertainty |
| Registry scope | Gaat over deze winkel / gaat over het hoofdkantoor |
| Confirm | Goedkeuren / wijziging opslaan |
| Export CSV | Goedgekeurde wijzigingen exporteren |

Do not replace meaningful domain distinctions with vague friendly wording. Official details still name vestigingseenheid, onderneming and KBO with short explanations. All user-facing copy stays Dutch.

Preserve Ray’s colours/components. Use ordinary readable body text (roughly14–16px), strong contrast, sensible line lengths and spacing. No tiny grey disclaimers for critical caveats. One clear primary action per task surface. Avoid repeated disclaimer banners, nested cards and duplicate counts. Keyboard operation, visible focus, labelled controls and expanded states are required. Test at normal zoom, narrow laptop width and mobile width; content order remains decision → evidence → supporting record.

## Work ownership and implementation entry points

Two branches from latest merged main: Ray `codex/ux-officer-flow`, Jochem `codex/ux-evidence-adapter`. Names are proposed working branches, not created by this plan. Ray remains the sole owner of shared UI orchestration while the implementation is active.

| Owner | Files/work | Deliverable |
| --- | --- | --- |
| Ray | officer-sidebar.tsx, desk-routes.ts, nl.ts, desk-command-bar.tsx | Four-item navigation, labels, visible search, utility links |
| Ray | officer-desk.tsx, desk-data-table.tsx, new focused detail/review components as needed | Calm Start, compact lists, focused review, history and contextual export |
| Ray | evidence-map.tsx, map-record-detail.tsx | Map/list continuity and compact map selection; preserve canvas |
| Jochem | lib/officer-data.ts, new pure lib/review-presentation.ts and tests | Grounded proposal comparison, source grouping, effective-value labels, related conflicting evidence |
| Jochem | packages/contracts and server/API only if a demonstrated blocker needs it | Preserve existing mutation/export/authorization behaviour; no planned schema migration |
| Joint | Browser walkthrough and merge verification | Real user can complete the demo task |

All UI paths above are relative to apps/web/src/components unless a lib path is specified. Jochem sends Ray the typed adapter interface before Ray wires it. Proposed pure output: business identity; selected proposal ID/revision; before/proposed values; effective approved field value with status; decisionEvidence[] with original evidence/source IDs, excerpt, URL, publisher, dates, scope; warnings[] with evidence references; remaining sources and history. Reuse existing canonical objects where possible, not a second domain model. Ray imports the helper, not its implementation details.

Ray owns officer-desk.tsx throughout; Jochem must not independently patch it. Dependencies/lockfile changes get one owner (Jochem) and should be unnecessary for this plan. Do not run concurrent formatting over each other’s files. Merge adapter first, then Ray’s consuming UI; small intermediate commits keep the real data path operational.

## Delivery order and timeboxes

Planning baseline12:29 Brussels; deadline16:30, target submission16:15, scope freeze15:00 unchanged. Estimates below are effort bounds, not a rigid personal timetable; streams overlap.

1. **Align and start (about10 minutes):** Ray saves current work and incorporates main. Agree one proposal-detail layout and adapter fields. Both own their files. Preserve the working app as rollback reference.
2. **First usable slice (about45–60 minutes in parallel):** Ray builds focused review and simpler navigation; Jochem implements evidence grouping/comparison and tests. Merge and walk Amplifon end-to-end before polishing other pages.
3. **Complete the everyday flow (about30–40 minutes):** Ray simplifies Start/list/history, then compact map selection. Jochem checks effective values/export counts, invalid/unknown/conflicting evidence and source failure behaviour. No broad new enrichment.
4. **Acceptance and fixes (about20–30 minutes):** verify the merged app on both machines and do a short first-time-user test. Stop on the largest decision-blocking issues first.
5. **Before15:00:** freeze the demo path and move to officer feedback, rehearsal, recording/upload and submission. If behind, cut the optional work below. Do not consume the video/submission margin.

Priority P0: focused review, visible material conflicts, correct effective values, simple navigation, useful Start, retained search context, history/export correctness. P1: compact map selection, richer optional filters, refined empty/access states where existing ones already work. P2 after hackathon: analytics overview, advanced column preferences, extensive onboarding, broad discovery, role administration UI and distributed budget storage.

The map already works: if its redesign cannot finish safely, retain its current route behind Zaken’s secondary view and concentrate on the review path. No new design system, dependency migration, database migration, bulk approval or hosted release is needed to complete this UX plan.

## Acceptance and verification

Functional regression: npm run check and npm run build; current19 tests remain green. Add targeted tests for grouped-source preservation, unreferenced same-field conflict visibility, unknown dates, parent/local separation and approved versus rejected effective values. Do not add snapshot tests that merely mirror markup.

| Scenario | Pass condition |
| --- | --- |
| First visit | User identifies search and pending review action without reading registry explanations |
| Search Paalstraat | Finds27 real establishments; search and position survive opening/back navigation and list/map switch |
| Review opening hours | User sees actual different source hours, source dates and local context before approving; can open originals |
| Review a field | Before/proposed/current approved values are not conflated; exact ID/revision is posted |
| Adjust or reject | Draft survives errors; duplicate submit blocked; action is persisted and accurately reflected in history |
| Concurrent review |409 is explained, draft retained, fresh review required; no hidden overwrite |
| Insufficient evidence | No “closed”, “inactive”, “verified” or urgent task is fabricated from missing research |
| Source archive | Every original source/excerpt and relevant audit note remains accessible despite visual grouping |
| Parent outside municipality | Local shop remains distinct from parent’s registered office and legal status |
| Export | Scope is visible and matches server filtering; only latest approved changes export, with provenance |
| Map | Real points still render; unknown locations remain in list; selected business opens the same detail |
| Access | Confirmed officer can use app; sign-out blocks data and writes; pending user sees clear next step |
| Accessibility | Keyboard search/review/disclosures work; visible focus and labels; no inaccessible or clipped critical text |

Test instruction to a fresh participant: “Zoek Amplifon in de Paalstraat, controleer de voorgestelde openingsuren en exporteer de goedgekeurde wijzigingen.” Observe without coaching. Target ≤3 minutes excluding registration and external source loading. Ask afterward: what did you change, why, and did you change the KBO? Record wrong turns and uncertainty; fix the largest friction. This is an acceptance target, not a result already achieved.

Use the shared database consciously: prefer read-only checks for existing decisions; any necessary new writes are clearly labelled test decisions and remain auditable. Do not approve questionable real information simply to make the walkthrough succeed. Paid refresh stays centralized on Jochem’s existing ledger with the $10 total cap.

## Completion checklist

- [ ] Ray and Jochem agree the file split and consuming adapter interface.
- [ ] Focused proposal review and evidence disclosures implemented.
- [ ] Conflicting hours remain visible without opening the complete source archive.
- [ ] Start, navigation, list and history simplified.
- [ ] Search/back context and map/list entry verified.
- [ ] All critical source/registry/audit data remains reachable.
- [ ] Automated checks and browser regression pass on merged work.
- [ ] First-time-user test completed; findings recorded honestly.
- [ ] Both machines run the same merged revision and dedicated database configuration.
- [ ] Demo frozen, video and submission completed by existing deadlines.
