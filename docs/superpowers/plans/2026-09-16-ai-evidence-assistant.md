# AI evidence assistant — proposal for approval

Status: approved and implemented on 16 September 2026; verification and setup notes are in `docs/ai-integration.md`. Default model: `gpt-5-mini`.

## Goal and design

Help an officer investigate one real KBO record, inspect dated public evidence, and approve or reject a concrete correction. Start with 5–10 real records on Paalstraat. This serves reliable business data (criterion 1), officer review (criterion 2), and repeatable, traceable refreshes driven by municipality configuration (criterion 3).

Recommended stack: assistant-ui for the record-side assistant, Vercel AI SDK for streaming and typed model calls, OpenAI Responses for the model and web search, existing Hono API for orchestration, existing Postgres for evidence and decisions. Keep confidence scoring pure in packages/core.

The user approved this design and implementation sequence, including structured cards and charts. No automated publication is included.

## Research and existing code

- assistant-ui's supplied llms.txt links to its current AI SDK v7 integration: `@assistant-ui/react`, `@assistant-ui/ai-sdk`, `ai@^7`, `@ai-sdk/react@^4`, and `@ai-sdk/openai`. Its examples use `useChatRuntime`, `AssistantRuntimeProvider`, `streamText`, and UI message streams. Verify and pin mutually compatible package versions during implementation.
- The AI SDK OpenAI provider supports Responses and provider web-search tools. `generateText` with `Output.object` supports Zod-validated structured extraction. Schema compliance does not establish factual correctness.
- OpenAI web search provides citations and consulted source URLs. Use these for discovery; preserve actual supporting passages before treating a discovered claim as evidence.
- `apps/api/src/server.ts` already authenticates /api routes and exposes street, record, evidence and audit data. The decision route appends an audit snapshot but has no versioned correction proposal or atomic accepted-change operation.
- `apps/web/src/components/officer-desk.tsx` uses demo records and session-local decisions. `map-record-detail.tsx` already loads real API data. Start the AI workflow from the real map record detail, not a fictional demo row.
- `packages/core/src/score.ts` currently maps low confidence to possible inactivity and sums repeated signals. Fix these before new evidence affects confidence.
- `Evidence.sourceUrl` and its database column currently allow null; AI-generated evidence must have a valid public source URL and observation date.
- `openai` is installed in the web workspace, but the API workspace has no model SDK. The API enrichment script is referenced by package.json but its file is absent. Avoid maintaining two separate enrichment implementations.
- Existing uncommitted map/UI edits are present. Re-read those files during implementation and preserve unrelated work.

## Options considered

1. **assistant-ui + AI SDK + OpenAI (recommended):** purpose-built chat state and streaming, typed extraction, custom evidence cards, a provider boundary we can reuse later. Adds dependencies but fits the requested libraries and TypeScript stack.
2. **Direct OpenAI SDK + existing shadcn controls:** fewer orchestration dependencies; suitable for a single research button, but requires more custom chat/stream handling.
3. **Autonomous research across all records:** potentially broader coverage but excessive latency, cost and verification risk for the first working demo. Defer bulk scanning and scheduling.

## Officer workflow

1. Open an actual enterprise or establishment from the map. Select **Onderzoek deze vestiging** (enterprise wording changes by record kind).
2. The API loads the authoritative record and parent relationship. The browser supplies a record ID, not trusted register data or model instructions.
3. A bounded research run searches the name, street and municipality. Prefer the business's own site and relevant official sources. Same-name businesses and central offices remain separate candidates.
4. Retrieve up to three public source pages. Extract proposed observations against their saved text. Display each source URL, supporting passage, observation date, entity scope, and uncertainties. Search snippets alone remain unverified leads.
5. Show a Dutch summary and typed proposal such as an address or contact correction, or a request for further investigation. A discrepancy without a supported replacement remains a review flag, not a fabricated field update.
6. The officer can ask **Waarom dit voorstel?**, **Welke bronnen spreken elkaar tegen?**, or **Wat ontbreekt nog?** Follow-up answers use the saved evidence for this record. New research is an explicit action.
7. The officer edits a proposed value if necessary and clicks **Bevestigen** or **Afwijzen**. Persist the exact proposal and evidence revision reviewed, actor, timestamp and decision. Acceptance creates an accepted correction overlay; it does not overwrite the imported KBO snapshot or publish externally.

## Integration boundaries

- Browser: assistant-ui primitives inside existing shadcn Sheet/panel and controls, using semantic theme tokens. Dutch copy in `apps/web/src/lib/nl.ts`. No second design system and no assistant cloud service required.
- Transport: AI SDK UI message stream from Hono, with the current session bearer token refreshed per request, abort support and existing CORS restrictions. Do not reuse a JSON-only response handler for streaming.
- API: `POST /api/record/:nr/research` creates a bounded research run and pending proposal; `POST /api/record/:nr/assistant` streams explanations using server-loaded evidence. Research returns a persisted run ID/status; interrupted runs remain visible and never silently become successful.
- Decisions: extend `/api/record/:nr/beoordeling` to reference proposal ID/revision. Compare the submitted revision transactionally, reject stale reviews, and apply an idempotency key to avoid duplicate decisions from retries.
- Model access: `ai` plus `@ai-sdk/openai` in apps/api. Use an explicit Responses model configured by `OPENAI_MODEL`; a documented small model such as `gpt-5.6-luna` is a candidate, subject to a smoke test for account access, web search and structured output. Do not claim model access or cost until tested.
- Secrets: replacement `OPENAI_API_KEY` only in the gitignored root `.env.local` or deployment secret store, never a NEXT_PUBLIC variable. The disclosed key was not used or saved during this research.
- Storage: research runs, immutable source snapshots, proposals, and accepted correction overlays. Record model ID, prompt version, retrieval time, source hash, schema version and usage with the run. Evidence includes the required four fields plus supporting quote and source snapshot reference.
- Refresh: explicit **Opnieuw controleren** creates a new revision and compares observations. Cache successful runs for 24 hours unless explicitly refreshed. Municipality name, source configuration and geographical checks come from config. Scheduled scans are outside this first scope.

## Evidence and scoring rules

- A server-generated retrieval timestamp means “we observed this page then”; it does not prove that the page's claim or business activity is recent. Store a source-stated event date separately, nullable.
- Extraction returns source IDs and quotes. Resolve URLs and dates from saved source metadata, not model-generated strings. Verify quoted text against normalized source text; unmatched claims remain unverified and do not contribute to scoring.
- Preserve explicit unknown and conflicting states. “No source found” is not evidence of closure. Website availability and contact details alone do not establish current local activity.
- Match evidence to the local establishment, enterprise or central office. Registry joins use exact string IDs. AI may suggest a match but cannot create a definitive parent relationship from a similar name.
- Revise scoring to distinguish evidence sufficiency from activity conclusion. Deduplicate source/signal contributions; preserve contradictions; cap correlated signals from one source. Thresholds are documented heuristics, not calibrated probabilities.
- Legal status is never inferred from website text or written onto an establishment. Automatic publication and model-accessible approval tools are excluded.
- Treat web pages and chat input as untrusted. The server owns the system prompt, tool registry, record scope and approval permissions; do not blindly consume client-supplied system messages or frontend tool definitions from documentation examples.

## Implementation sequence and verification

### 1. Evidence contracts and honest confidence

Files: `packages/core/src/types.ts`, `packages/core/src/score.ts`, new `packages/core/src/ai-evidence.ts`, focused core tests.

Define source snapshots, typed proposals, evidence references and review revisions with Zod. Add an insufficient-evidence proposal state. Test empty evidence, duplicate signals, conflicting sources, missing URLs/dates, placeholder dates, leading-zero identifiers and enterprise/establishment separation. Keep scoring free of I/O.

### 2. Research service and persistence

Files: `apps/api/package.json`, new `apps/api/src/ai/{provider,research,sources,extract}.ts`, `apps/api/src/db/schema.ts`, a reviewed SQL migration, new `apps/api/src/routes/research.ts`, API environment example.

Implement discovery → source retrieval → schema-constrained extraction → validation → pending proposal. Initial bounds: one record, three source pages, maximum four model/tool rounds per stage, one concurrent run per officer, explicit timeouts and capped input/output sizes. Reject local/private-network URLs including redirects, credentials in URLs and non-HTTP schemes. Fetch failures and blocked pages are displayed as unavailable sources; never bypass them.

Persist run state before model calls, completion/failure afterward. Cache and retry without duplicate proposals. Test invalid model output, fabricated citations, same-name businesses, no result, prompt injection text, 429 responses, timeout and cancellation. Usage is logged without credentials or authorization headers. Report measured token/search usage after the pilot rather than inventing a budget estimate.

### 3. Record assistant and real review

Files: `apps/web/package.json`, new `apps/web/src/components/ai/{record-assistant,evidence-card,proposal-card}.tsx`, new `apps/web/src/lib/assistant-transport.ts`, `apps/web/src/components/map-record-detail.tsx`, `apps/web/src/lib/nl.ts`, new API assistant route, existing decision route and database schema/migration.

Build the record-side assistant with source cards and saved-evidence follow-ups. Keep drafts disabled for acceptance until validation completes. Use the existing signed-in officer identity. Confirm/reject through the application API; never through an LLM tool. In one database transaction, validate proposal revision, write the audit snapshot and accepted overlay when appropriate. Rejection leaves accepted data unchanged. Evidence changes require a fresh review.

Test unauthorized research/decision calls, transport token refresh, record switching without context leakage, stale proposal conflicts, duplicate submissions and accepted/rejected outcomes after reload. All visible strings, including errors and generated narrative, are Dutch.

### 4. Pilot and demo readiness

Run typecheck, lint for touched web code, core/API tests and the production build. Manually investigate 5–10 actual Paalstraat records and check every displayed source passage. Confirm one end-to-end reviewed outcome, including persistence after reload; if no genuine correction is supported, demonstrate an honest insufficient-evidence result. Label saved prior research with its actual date, and keep fictional fixtures explicitly marked as demo data.

Acceptance: the officer can distinguish register facts, source observations and AI suggestions; every scored claim has a retrievable source snapshot; no-source results never imply closure; only an explicit officer action creates an accepted correction; run provenance supports a later refresh in another configured municipality.

## Scope boundary

First delivery is a complete per-record workflow, not a replacement of every demo dashboard. No vector database, PDF RAG, voice interface, autonomous fleet of agents, bulk enrichment of all 1,000 rows or automatic scheduled publication. If the hackathon timebox is tight, finish source research, evidence cards and persistent review before conversational follow-ups.

## Sources consulted

- [assistant-ui documentation index](https://www.assistant-ui.com/llms.txt)
- [assistant-ui AI SDK v7 integration](https://www.assistant-ui.com/docs/runtimes/ai-sdk/v7)
- [AI SDK structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [AI SDK OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)
- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [OpenAI structured outputs and limitations](https://developers.openai.com/api/docs/guides/structured-outputs)

Markdown documentation was fetched directly when the web reader rejected its content type. No paid model request, dependency installation, application code modification or database change was performed.
