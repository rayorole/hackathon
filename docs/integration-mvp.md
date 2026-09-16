# Straatbeeld: shared MVP integration

Ray owns page design; Jochem owns the canonical data/API. This integration is based on Ray's main, with the existing canonical backend added to the same Next.js app. Keep the page routes and UI components; adapt presentation to `packages/contracts`, never invent legal or activity facts in the UI.

## Run

`npm install`, copy `apps/web/.env.example` to `.env.local`, fill the existing Supabase project's public and server keys, then `npm run dev` (port 3000). Current integration walkthrough uses port 3101. API calls are same-origin; `apps/api` is an unused earlier scaffold and is not needed to run this MVP. Never run its `db:push` over the canonical database.

The already-applied `straatbeeld_cases` migration is included for reproducibility. Do not replay it or seed over reviewed cases. RLS denies browser table access; server endpoints verify the authenticated user's `app_metadata.role === "officer"` before using the server key. Never put that role in editable user metadata or expose the server key in public env.

## Registration

`/register` creates a Supabase account. Email confirmation and a server-managed officer role are required before dossiers become accessible. Unapproved accounts go to `/access-pending`. Configure the actual app URL and `/auth/callback` in Supabase's Auth redirect allowlist. Keep production URL and local test URLs explicit. A project administrator grants officer access to the intended confirmed user; signup cannot self-grant access.

## Production deployment

- Vercel project: `rayoroles-projects/straatbeeld`, production URL `https://straatbeeld.vercel.app`. GitHub `rayorole/hackathon`, production branch `main`, Next.js root directory `apps/web`, Node.js 24, with workspace files outside the root included.
- Production environment uses the existing Supabase project: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Vercel Secret), and `DATA_BACKEND=supabase`. Never commit environment files. `.vercelignore` excludes local dependencies, caches, credentials and scratch data from CLI uploads.
- UI and canonical API routes deploy together. The database and authentication remain hosted on Supabase; the inactive `apps/api` scaffold needs no separate deployment.
- Required Auth configuration: site URL `https://straatbeeld.vercel.app` and allowed redirect `https://straatbeeld.vercel.app/auth/callback`, preserving existing local URLs. This must be verified in the Supabase dashboard before relying on production registration emails.
- Paid AI refresh is not configured on Vercel: no OpenAI key or local budget ledger is uploaded. Existing evidence, decisions, exports and missing-business reports use the live database. Enabling paid refresh requires the shared atomic budget described below.
- Verified after deployment: health endpoint reports Supabase, login and illustration return 200, protected pages redirect to login, and anonymous workspace/candidate API requests return JSON 401. Authenticated workflows require an officer session.

## Contract and pages

- `GET /api/establishments`: canonical summaries and coverage; municipality/street filters.
- `GET /api/establishments/:id`: canonical full dossier, evidence, sources, proposals and reviews.
- `POST /api/reviews`: proposalId, expectedRevision, decision (`approve`/`reject`), optional correctedValue on approval, optional note. Server records reviewerId. Concurrent changes return 409; reload before another decision.
- `POST /api/establishments/:id/refresh`: bounded source recheck; returns full detail and Dutch status. Only explicitly configured targets currently supported.
- `GET /api/export`: current approved values only, with source URLs; no direct register publication.
- `GET /api/workspace`: authenticated batch of canonical dossiers for the MVP views (current sample 543 real establishments). This intentionally favors one bounded request over hundreds of detail calls; paginate for a larger dataset.
- `GET /api/locations`: supplied sample coordinates with basic geographic range checks. Coordinates are not field-verified. The map shows the selected address and lets the officer open its dossier; it is not a business-activity heatmap.

`officer-data.ts` is the presentation adapter. `officer-desk.tsx` retains Ray's page components and styling while using real data and saved decisions. Source dates are retrieval dates, not invented observation dates. The `toestanden` page remains explicitly a UI-state preview. The dataset is partial, not complete municipal coverage.

## AI budget

All paid refresh calls must use the SAME existing ledger on Jochem's machine (`AI_BUDGET_FILE` in his ignored environment). Do not initialize a second $10 ledger on another laptop. Ray can design without an OpenAI key; live refresh should use the designated backend. The ledger is a local-process deployment design, not a distributed/serverless quota. No hosted multi-instance deployment until the budget reservation is made shared and atomic.

## Verify

`npm test`, `npm run lint -w @kbo/web`, `npm run typecheck -w @kbo/web`, `npm run build -w @kbo/web`.

Browser acceptance: registration → email confirmation → administrator grants officer role → sign-in → real Paalstraat search → source and parent details → select proposal → edit/approve/reject → reload history → approved-only CSV → refresh → sign-out. Unauthorized API calls must return JSON 401/403, not a login HTML document.

## Control workflow additions

- Pending proposal queues are sorted by traceable evidence: conflict first, then missing/local support or observations older than 180 days, then unknown observation dates. Retrieval dates do not replace observation dates. Registry-only cases without proposals do not become urgent work.
- The dossier compares values from the newest two retained snapshots of the same source URL, field and scope. A first fetch or absent extraction does not imply change, disappearance or closure. Comparisons appear only when values differ. Existing source retention is used; unchanged live fetches do not create synthetic snapshots.
- `GET/POST /api/candidates` lists/reports a missing-business candidate; `POST /api/candidates/:id/review` performs an officer decision with `expectedRevision`. All routes use the existing officer guard. Reporter/reviewer identity and timestamps are server-owned. URLs must be HTTP(S), are stored as evidence links, and are never fetched from this flow.
- Reports require name, municipal address, publisher, URL, observation and observation date. Candidates are stored separately in `straatbeeld_candidates`; their UUID is not a registry number. Pending reports appear under Wijzigingen, approved supplemental businesses under Zaken, and decisions under Historiek. Registry data, existing proposal exports and map coordinates are unchanged. Confirmation does not assert KBO registration or legal status.
- The additive candidates migration is applied to the configured project. RLS is enabled; only service_role has select/insert/update, and browser roles have no table access. Optimistic concurrency prevents repeated decisions; request IDs and an active name/address fingerprint prevent repeated submissions.
- Automated coverage includes priority, source comparison, candidate boundary validation, immutable evidence and stale decisions. Browser acceptance still requires the user's authenticated session.
