# Straatbeeld: shared MVP integration

Ray owns page design; Jochem owns the canonical data/API. This integration is based on Ray's main, with the existing canonical backend added to the same Next.js app. Keep the page routes and UI components; adapt presentation to `packages/contracts`, never invent legal or activity facts in the UI.

## Run

`npm install`, copy `apps/web/.env.example` to `.env.local`, fill the existing Supabase project's public and server keys, then `npm run dev` (port 3000). Current integration walkthrough uses port 3101. API calls are same-origin; `apps/api` is an unused earlier scaffold and is not needed to run this MVP. Never run its `db:push` over the canonical database.

The already-applied `straatbeeld_cases` migration is included for reproducibility. Do not replay it or seed over reviewed cases. RLS denies browser table access; server endpoints verify the authenticated user's `app_metadata.role === "officer"` before using the server key. Never put that role in editable user metadata or expose the server key in public env.

## Registration

`/register` creates a Supabase account. Email confirmation and a server-managed officer role are required before dossiers become accessible. Unapproved accounts go to `/access-pending`. Configure the actual app URL and `/auth/callback` in Supabase's Auth redirect allowlist. Keep production URL and local test URLs explicit. A project administrator grants officer access to the intended confirmed user; signup cannot self-grant access.

## Contract and pages

- `GET /api/establishments`: canonical summaries and coverage; municipality/street filters.
- `GET /api/establishments/:id`: canonical full dossier, evidence, sources, proposals and reviews.
- `POST /api/reviews`: proposalId, expectedRevision, decision (`approve`/`reject`), optional correctedValue on approval, optional note. Server records reviewerId. Concurrent changes return 409; reload before another decision.
- `POST /api/establishments/:id/refresh`: queues a source recheck for the shared municipal worker; returns full detail and Dutch status. See `docs/municipal-monitoring.md`.
- `GET /api/export`: current approved values only, with source URLs; no direct register publication.
- `GET /api/workspace`: authenticated batch of canonical dossiers for the MVP views (current sample 543 real establishments). This intentionally favors one bounded request over hundreds of detail calls; paginate for a larger dataset.
- `GET /api/locations`: supplied sample coordinates with basic geographic range checks. Coordinates are not field-verified. The map shows the selected address and lets the officer open its dossier; it is not a business-activity heatmap.

`officer-data.ts` is the presentation adapter. `officer-desk.tsx` retains Ray's page components and styling while using real data and saved decisions. Source dates are retrieval dates, not invented observation dates. The `toestanden` page remains explicitly a UI-state preview. The dataset is partial, not complete municipal coverage.

## AI budget

Paid research uses the shared Supabase budget with atomic reservations and a fixed $50 total cap, including previous local usage. Do not initialize a second budget. Ray needs only the existing Supabase environment for the UI; the hosted research worker is independent of his Vercel account. See `docs/municipal-monitoring.md` for activation status and operator instructions.

## Verify

`npm test`, `npm run lint -w @kbo/web`, `npm run typecheck -w @kbo/web`, `npm run build -w @kbo/web`.

Browser acceptance: registration → email confirmation → administrator grants officer role → sign-in → real Paalstraat search → source and parent details → select proposal → edit/approve/reject → reload history → approved-only CSV → refresh → sign-out. Unauthorized API calls must return JSON 401/403, not a login HTML document.

## Municipal monitoring branch

`codex/municipal-monitoring` extends this integration with periodic municipality-wide enrollment, research status and versioned proposals. `docs/municipal-monitoring.md` is the current worker/API handoff. Streets remain search filters.
