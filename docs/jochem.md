> **Integration direction, updated 16 September:** Ray continues frontend/page design on `main`. This branch is backend groundwork, not the shared application base. Do not merge the whole scaffold into main or ask Ray to switch to it. Port backend logic selectively behind the existing frontend API/auth boundary. See `docs/integration.md`.

# Jochem — data, evidence and server

Backend changes intended for integration must be based on current main and preserve Ray’s frontend and auth. Selectively port this prototype’s backend logic; see integration.md.

## Your files

`apps/web/src/server/**`, `apps/web/src/app/api/**`, `supabase/**`, `scripts/**`, `data/**`. Coordinate shared types/client/config. Leave Ray's pages/components/styles alone.

## First deliverables

1. Supabase schema and fictional seed are already applied and verified. Use existing ignored credentials and `npm run db:check`; do not reapply the initial migration.
2. Build importer for `data/kbo/schoten-kbo-1000-2026-09-07.geojson`. Trim whitespace blanks, preserve leading zeros, distinguish parent enterprises and establishments, normalize sentinel dates, retain provenance. Parent lookup may initially be missing.
3. Return at least one real Paalstraat case through the same Detail contract. The sample is only 1000 rows; do not claim completeness. No need to import a national registry.
4. Add source fetching/extraction for 10–20 selected premises. Preserve exact evidence/source references. Treat missing evidence as unknown. Replace the refresh stub with actual retrieval only when implemented.
5. Integrate approved human corrections as an overlay; source refresh retains immutable evidence/review history. Add real authentication/authorization before any publicly hosted server API.

## Existing baseline

A minimal `straatbeeld_cases` persistence envelope stores each typed Detail document alongside municipality/street/version. A single compare-and-swap update atomically stores proposal state and review history. This is an intentional hackathon schema, not a production normalized registry. Import read model can evolve while API shape stays stable. Supabase service key is backend-only; RLS/privilege boundary blocks direct anonymous access. No update bypasses revision checks.

Optional Intelead reuse is controlled by Jochem and organiser eligibility. Never upload its private source, credentials or full database. If exporting a permitted minimal data slice, carry its actual source date; available local snapshot was August 4. The public official VKBO endpoint is independently available.

## Acceptance

Real sample data returns through list/detail; persistent review rejects stale versions; unapproved changes never export; refreshed data cannot erase human decisions. API does not expose privileged writes publicly. `npm run check`, build, and a real browser-to-DB workflow pass before marking done.
