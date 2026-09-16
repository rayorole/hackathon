> **Authoritative integration direction:** Jochem’s `packages/contracts` data model and documented API are the source of truth. Ray retains his frontend/page designs on `main` and adapts its API calls and view models to this contract. Preserve authentication without changing payload shapes. Do not merge the entire scaffold. See `docs/integration.md`.

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

## Real KBO import implemented

`npm run db:import:kbo` validates/checksums and previews the sample without writes.
`npm run db:import:kbo -- --parents --write` additionally looks up missing Paalstraat parents through official VKBO and inserts missing cases into the dedicated project. Existing cases are never overwritten, including their evidence, parent snapshots and review history. Subsequent source updates need a separate version-checked refresh operation; rerunning this importer does not update existing records.

Imported 543 establishments from 1000 rows (457 enterprise records retained as parent lookup input). Paalstraat contains 27 establishments, distinct from its 35 total sample rows. 28 parent links exist within the sample; 21 Paalstraat parents were fetched live, six remain unresolved. Amplifon establishment `2296242396` links to enterprise `0418975266` at a separate registered address in Dilbeek. Real cases have no proposed corrections until actual evidence supports them. Legal status is not copied from parent onto establishment; registration does not establish current activity.

`data/derived/parents/` retains original fetched parent responses/provenance locally and is ignored by Git. The shared Supabase case includes its exact source URL and retrieval time. Registry snapshot date remains unknown. Source dates and meaningful contact/activity/date facts are retained as evidence; sentinel dates and whitespace-only fields become unknown. Bus numbers are preserved as evidence because the unchanged address contract has no bus field. Coordinates are not currently exposed by that contract.

Live list/export excludes fictional demo cases. Direct demo detail and fixture mode remain available for UI testing. The live list still caps at1000 and never claims municipality completeness.
