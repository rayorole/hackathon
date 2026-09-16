# Evidence assistant

The real record detail on `/kaart` exposes **Onderzoek dit dossier**. Research produces a structured report, source passages, an evidence-count chart and a pending proposal. Follow-up conversation uses assistant-ui and the saved research revision. The chart counts observations, not probabilities.

## Configuration

Set `OPENAI_API_KEY` in the root `.env.local` (server only). `OPENAI_MODEL` defaults to `gpt-5-mini`. The API uses the OpenAI Responses provider through AI SDK 7; the frontend uses assistant-ui's matching AI SDK runtime. No Vercel deployment or assistant-ui cloud account is needed.

`DATABASE_URL` must be reachable from the Hono process. For an IPv4 network use the exact Session pooler host from Supabase's Connect dialog, port 5432 and the project-specific username. Never guess the pooler cluster index. Authentication continues to use the existing officer middleware and server-owned `app_metadata.role`.

Run from the repository root:

```powershell
npm run db:migrate:ai -w @kbo/api
npm run dev
```

The migration creates the base KBO tables on an empty database, then the research/accepted-correction tables and RLS protections. For an existing base schema it only adds the AI migration. All these tables are accessed through the authenticated backend; no public Data API policies are granted. The reviewed SQL is in `apps/api/drizzle`.

Real records must already be in the `records` table. The starter sample is not bundled in this repository. The existing ingest script normalizes local starter files into `data/derived/records.json`; it does not itself populate Postgres. Never substitute the UI's fictional demo records into research.

## Boundaries

- At most three fetched source pages and two provider web-search tool calls per research stage; 120-second overall deadline.
- Successful results cached for 24 hours; explicit refresh creates a new immutable revision.
- One active run per record and per officer; at most 20 research starts per officer/hour. Conversation bounded to 20 messages, 24,000 characters total and 10 requests/minute per API process.
- Source retrieval checks and pins public DNS addresses, revalidates redirects, caps response size, excludes scripts, and records retrieval timestamps/hashes.
- Quotes are verified against source snapshots; the model cannot supply trusted URLs or observation dates. Retrieval date does not establish recent business activity. Automatic `recente-activiteit` extraction is disabled until source event dates are supported.
- Central-office/unknown findings retain scope in the report and audit; only findings matched to the record kind enter the legacy evidence view or score.
- Confirmation/rejection is an authenticated application operation, never a model tool. Decisions lock the record/revision, reject stale proposals and support idempotent retries.
- Accepted corrections overlay the original registry record. The import is preserved and no result is automatically published or sent.
- Confidence is a documented heuristic with duplicate removal and a per-source cap; displayed contributions include the cap.

## Verification

```powershell
npm run test -w @kbo/api
npx tsx --test packages/core/src/*.test.ts
npm run typecheck
npm run lint -w @kbo/web
npm run build
```

API tests use PGlite, the real schema/migrations and a clearly labeled fake researcher. They do not call OpenAI or the configured production database.

Optional commands below spend API credit:

```powershell
npm run ai:smoke -w @kbo/api
npm run ai:pilot -w @kbo/api
```

The smoke test checks live web search plus structured output without business records. The pilot fetches five current official VKBO records for the configured demo street and saves an unapproved local report to `data/derived/ai-pilot.json`. It does not import records, create officer decisions or publish anything. It is a fresh retrieval, not the dated 7 September starter sample.

## Deployment notes

Use a persistent Hono process with a reverse-proxy timeout longer than 120 seconds. The current synchronous run records failure on disconnect/timeout and expires interrupted runs after three minutes. Multiple API replicas share database run constraints; conversation throttling is per process and should move to shared storage before scaling. Recheck all remote source passages with an officer before accepting a correction.

## Verification performed on 16 September 2026

- 38 tests passed: 14 API/source/streaming tests, 18 core tests and 6 existing map tests. Typecheck, web ESLint and production build passed.
- Live GPT-5 mini Responses calls, provider web search and Zod structured output passed. Discovery handles both inline citations and consulted URLs returned by the provider tool.
- Five actual current VKBO records on Paalstraat completed the isolated pilot: 0409952088 (4 verified findings), 2286527055 (3), 2296242396 (5), 2293373077 (5), 0211384081 (7). All five results are review flags; no corrections or activity conclusions were approved. These counts verify passage presence, not factual truth or correct entity attribution.
- The real model sometimes paraphrased a passage as a quote. Per-claim validation now excludes that finding, retains separately verified passages, and replaces the summary/proposal with a conservative review flag when the analysis is incomplete. Regression test added.
- Server rendering of the research report with actual pilot output confirmed source cards, chart markup and review controls. Browser interaction was not verified because no browser automation surface was available.
- Production dependency audit reports no vulnerabilities after updating Drizzle ORM to 0.45.2. Four existing moderate development-tool advisories remain in the Drizzle Kit/esbuild chain; no forced major dependency change was made.
- Migration applied successfully through the authenticated Supabase connector, and RLS confirmed on all six KBO tables. No public Data API policies is intentional for backend-only access. The pre-existing disabled leaked-password-protection setting remains unchanged; see [Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

**Remaining environment limitations:** the supplied session-pooler hostname resolves, but TCP connections from this machine to ports 5432 and 6543 time out. The local Hono process therefore cannot reach hosted Postgres on this network. The original Schoten starter files are absent and the KBO `records` table is empty. The fresh pilot stays in gitignored local storage and does not silently replace the dated starter dataset. A live authenticated, persisted officer walkthrough requires network/database connectivity and actual imported KBO records.
